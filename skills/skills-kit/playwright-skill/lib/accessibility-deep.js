/**
 * Accessibility Deep Audit Library for Claude Code UX Testing
 *
 * Combines automated axe-core analysis (injected from CDN — no npm dep needed)
 * with programmatic checks for touch targets, focus indicators, images,
 * form labels, and heading hierarchy.
 *
 * Designed to catch issues in two categories:
 *   1. Automated: what code can detect reliably
 *   2. Visual: what Claude Vision can catch from screenshots
 *
 * Usage:
 *   const a11y = require('./lib/accessibility-deep');
 *   const result = await a11y.runFullAudit(page, { viewName: 'Dashboard' });
 *   console.log(result.summary); // { axeViolations, touchTargetIssues, ... }
 */

const fs = require('fs');
const path = require('path');

const A11Y_DIR = path.join(process.cwd(), '.testing', 'accessibility');

// Pinned axe-core version for reproducibility
const AXE_CORE_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.8.3/axe.min.js';

// WCAG tag sets
const WCAG_AA_TAGS  = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'];
const WCAG_AAA_TAGS = [...WCAG_AA_TAGS, 'wcag2aaa', 'wcag21aaa'];

// ─────────────────────────────────────────────────────────────────────────────
// axe-core Runner
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Inject axe-core from CDN and run a full accessibility analysis.
 *
 * @param {object} page           - Playwright page
 * @param {object} [options]
 * @param {string[]} [options.tags] - WCAG tag set (default: AA)
 * @param {string}   [options.scope] - CSS selector to limit scope (default: document)
 * @returns {object} axe results with violations and incomplete arrays
 */
async function runAxe(page, options = {}) {
  // Inject axe-core if not already present
  const axeLoaded = await page.evaluate(() => typeof window.axe !== 'undefined').catch(() => false);
  if (!axeLoaded) {
    await page.addScriptTag({ url: AXE_CORE_CDN });
    // Wait for axe to be ready
    await page.waitForFunction(() => typeof window.axe !== 'undefined', { timeout: 10000 });
  }

  const tags  = options.tags ?? WCAG_AA_TAGS;
  const scope = options.scope ?? 'document';

  const results = await page.evaluate(
    async ({ tags, scope }) => {
      const context = scope === 'document' ? document : document.querySelector(scope) || document;
      try {
        return await window.axe.run(context, {
          runOnly: { type: 'tag', values: tags },
          resultTypes: ['violations', 'incomplete'],
          reporter: 'v2',
        });
      } catch (e) {
        return { error: e.message, violations: [], incomplete: [] };
      }
    },
    { tags, scope }
  );

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// Specific Checks
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check interactive element touch target sizes.
 * WCAG 2.5.5 recommends 44x44px for mobile; 24px is a reasonable desktop minimum.
 *
 * @param {object} page
 * @param {number} [minSize=24] - Minimum width and height in pixels
 * @returns {Array<{ tag, text, ariaLabel, width, height, x, y }>}
 */
async function checkTouchTargets(page, minSize = 24) {
  return page.evaluate((min) => {
    const selectors = [
      'button:not([disabled])',
      'a[href]',
      'input:not([type="hidden"])',
      'select',
      'textarea',
      '[role="button"]:not([disabled])',
      '[role="link"]',
      '[role="checkbox"]',
      '[role="radio"]',
      '[role="tab"]',
      '[role="menuitem"]',
    ].join(', ');

    const elements = Array.from(document.querySelectorAll(selectors));
    const small = [];

    elements.forEach(el => {
      const rect = el.getBoundingClientRect();
      // Skip invisible elements
      if (rect.width === 0 || rect.height === 0) return;
      // Skip elements hidden off-screen (negative coords far away)
      if (rect.right < 0 || rect.bottom < 0) return;

      if (rect.width < min || rect.height < min) {
        small.push({
          tag:       el.tagName.toLowerCase(),
          text:      el.textContent?.trim().slice(0, 60) ?? '',
          ariaLabel: el.getAttribute('aria-label') ?? '',
          role:      el.getAttribute('role') ?? '',
          width:     Math.round(rect.width),
          height:    Math.round(rect.height),
          x:         Math.round(rect.x),
          y:         Math.round(rect.y),
        });
      }
    });

    return small;
  }, minSize);
}

/**
 * Check focus indicator visibility for all focusable elements.
 * Elements without any visible :focus style are flagged.
 *
 * @param {object} page
 * @returns {{ totalFocusable: number, issuesFound: number, issues: Array }}
 */
async function checkFocusIndicators(page) {
  return page.evaluate(() => {
    const focusableSelectors = [
      'button:not([disabled])',
      'a[href]',
      'input:not([disabled]):not([type="hidden"])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[role="button"]:not([aria-disabled="true"])',
    ].join(', ');

    const elements = Array.from(document.querySelectorAll(focusableSelectors));
    const issues = [];

    elements.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return; // invisible

      // Check for focus-related CSS on the element and its :focus state
      const styles   = window.getComputedStyle(el);
      const outline  = styles.outline;
      const outlineW = parseFloat(styles.outlineWidth);
      const shadow   = styles.boxShadow;
      const ring     = styles.getPropertyValue('--tw-ring-shadow');

      // Heuristic: if outline is "none" or 0px, and no box-shadow, no ring — likely no focus style
      // Note: this is checked at rest, not in :focus state — an approximation
      const hasBasicOutline = outline !== 'none' && outlineW > 0;
      const hasShadow       = shadow !== 'none' && shadow !== '';
      const hasRing         = ring && ring !== '' && ring !== 'none';

      // Check for Tailwind focus classes
      const classes = el.className || '';
      const hasTailwindFocus = /focus:/.test(classes) || /focus-visible:/.test(classes);

      // Also check for inline styles with focus
      const hasInlineFocusStyle = el.getAttribute('style')?.includes('outline') ?? false;

      if (!hasBasicOutline && !hasShadow && !hasRing && !hasTailwindFocus && !hasInlineFocusStyle) {
        issues.push({
          tag:       el.tagName.toLowerCase(),
          text:      el.textContent?.trim().slice(0, 60) ?? '',
          ariaLabel: el.getAttribute('aria-label') ?? '',
          id:        el.id ?? '',
          classes:   classes.slice(0, 100),
          issue:     'No visible focus indicator detected at rest (Tailwind focus classes may be present)',
        });
      }
    });

    return {
      totalFocusable: elements.length,
      issuesFound: issues.length,
      issues: issues.slice(0, 20), // Cap at 20 to avoid huge output
    };
  });
}

/**
 * Check images for missing alt text.
 *
 * @param {object} page
 * @returns {Array<{ tag, src, size, issue }>}
 */
async function checkImages(page) {
  return page.evaluate(() => {
    const selectors = ['img', '[role="img"]', 'svg:not(button svg):not(a svg)'];
    const elements = Array.from(document.querySelectorAll(selectors.join(', ')));
    const issues = [];

    elements.forEach(el => {
      const rect        = el.getBoundingClientRect();
      const alt         = el.getAttribute('alt');
      const ariaLabel   = el.getAttribute('aria-label');
      const ariaHidden  = el.getAttribute('aria-hidden');
      const ariaLabelBy = el.getAttribute('aria-labelledby');
      const role        = el.getAttribute('role');

      // Skip invisible elements
      if (rect.width === 0 || rect.height === 0) return;
      // Skip elements that are explicitly decorative (aria-hidden or alt="")
      if (ariaHidden === 'true' || alt === '') return;
      // Skip presentational role
      if (role === 'presentation') return;

      if (!alt && !ariaLabel && !ariaLabelBy) {
        issues.push({
          tag:  el.tagName.toLowerCase(),
          src:  (el.getAttribute('src') ?? el.getAttribute('data-src') ?? '').slice(0, 80),
          size: `${Math.round(rect.width)}×${Math.round(rect.height)}px`,
          issue: 'Missing alt attribute or aria-label',
        });
      }
    });

    return issues;
  });
}

/**
 * Check form inputs for proper labels.
 *
 * @param {object} page
 * @returns {Array<{ tag, type, id, placeholder, issue }>}
 */
async function checkFormLabels(page) {
  return page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input, select, textarea'));
    const issues = [];

    inputs.forEach(el => {
      // Skip inputs that don't need labels
      if (['hidden', 'submit', 'reset', 'button', 'image'].includes(el.type)) return;

      const id           = el.id;
      const ariaLabel    = el.getAttribute('aria-label');
      const ariaLabelBy  = el.getAttribute('aria-labelledby');
      const placeholder  = el.getAttribute('placeholder');
      const title        = el.getAttribute('title');
      const hasLabel     = id ? !!document.querySelector(`label[for="${id}"]`) : false;
      const isWrapped    = el.closest('label') !== null;

      if (!hasLabel && !isWrapped && !ariaLabel && !ariaLabelBy && !title) {
        issues.push({
          tag:         el.tagName.toLowerCase(),
          type:        el.type ?? '',
          id:          id ?? '',
          placeholder: placeholder?.slice(0, 60) ?? '',
          issue:       placeholder
            ? 'Placeholder used as label — disappears on focus (WCAG 1.3.5 failure)'
            : 'No label, aria-label, or title — completely inaccessible',
        });
      }
    });

    return issues;
  });
}

/**
 * Validate heading hierarchy for logical structure.
 *
 * @param {object} page
 * @returns {{ totalHeadings: number, hierarchy: number[], issues: Array }}
 */
async function checkHeadingHierarchy(page) {
  return page.evaluate(() => {
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    const levels   = headings.map(h => parseInt(h.tagName[1]));
    const issues   = [];

    let prevLevel = 0;

    levels.forEach((level, i) => {
      if (prevLevel > 0 && level > prevLevel + 1) {
        issues.push({
          index:     i,
          level,
          prevLevel,
          text:      headings[i].textContent?.trim().slice(0, 60) ?? '',
          issue:     `H${prevLevel} → H${level}: skipped level(s)`,
        });
      }
      prevLevel = level;
    });

    const h1Count = levels.filter(l => l === 1).length;
    if (h1Count === 0 && headings.length > 0) {
      issues.push({ issue: 'No H1 found — page lacks a primary heading', level: 0, prevLevel: 0, index: -1 });
    }
    if (h1Count > 1) {
      issues.push({ issue: `Multiple H1 elements (${h1Count}) — should be exactly one`, level: 1, prevLevel: 0, index: -1 });
    }

    return {
      totalHeadings: headings.length,
      hierarchy:     levels,
      issues,
    };
  });
}

/**
 * Check for color-only status indicators (elements that use only color to communicate state).
 * This is a heuristic check — Claude Vision will provide the definitive analysis.
 *
 * @param {object} page
 * @returns {Array<{ selector, issue }>}
 */
async function checkColorOnlyIndicators(page) {
  return page.evaluate(() => {
    const suspects = [];

    // Status dots / badges — small colored circles with no text
    const statusDots = Array.from(document.querySelectorAll(
      '[class*="status"], [class*="badge"], [class*="dot"], [class*="indicator"]'
    ));

    statusDots.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      if (rect.width > 30 || rect.height > 30) return; // Not a small indicator

      const text       = el.textContent?.trim() ?? '';
      const ariaLabel  = el.getAttribute('aria-label') ?? '';
      const title      = el.getAttribute('title') ?? '';
      const ariaDescBy = el.getAttribute('aria-describedby') ?? '';

      if (!text && !ariaLabel && !title && !ariaDescBy) {
        suspects.push({
          selector: el.className?.slice(0, 80),
          size:     `${Math.round(rect.width)}×${Math.round(rect.height)}`,
          issue:    'Small colored element with no text label or aria-label — possible color-only indicator',
        });
      }
    });

    return suspects.slice(0, 10);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Full Audit Pipeline
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run the complete accessibility audit for the current page state.
 *
 * @param {object} page
 * @param {object} [options]
 * @param {string}  [options.viewName='Page']
 * @param {string}  [options.screenshotPath]    - Where to save the screenshot
 * @param {boolean} [options.fullPage=false]    - Full page screenshot
 * @param {number}  [options.minTouchTarget=24] - Minimum touch target px
 * @param {boolean} [options.wcagAAA=false]     - Include AAA rules
 * @returns {AuditResult}
 */
async function runFullAudit(page, options = {}) {
  const viewName   = options.viewName ?? 'Page';
  const minTarget  = options.minTouchTarget ?? 24;
  const wcagTags   = options.wcagAAA ? WCAG_AAA_TAGS : WCAG_AA_TAGS;

  fs.mkdirSync(A11Y_DIR, { recursive: true });

  const safeName       = viewName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const screenshotPath = options.screenshotPath
    ?? path.join(A11Y_DIR, `${safeName}-a11y.png`);

  // Screenshot for visual analysis
  await page.screenshot({ path: screenshotPath, fullPage: options.fullPage ?? false });

  // Run all checks
  console.log(`    Running axe-core...`);
  const axeResults  = await runAxe(page, { tags: wcagTags }).catch(e => ({
    error: e.message, violations: [], incomplete: [],
  }));

  console.log(`    Checking touch targets (min ${minTarget}px)...`);
  const touchTargets = await checkTouchTargets(page, minTarget).catch(() => []);

  console.log(`    Checking focus indicators...`);
  const focusability = await checkFocusIndicators(page).catch(() => ({ totalFocusable: 0, issuesFound: 0, issues: [] }));

  console.log(`    Checking images...`);
  const images       = await checkImages(page).catch(() => []);

  console.log(`    Checking form labels...`);
  const formLabels   = await checkFormLabels(page).catch(() => []);

  console.log(`    Checking heading hierarchy...`);
  const headings     = await checkHeadingHierarchy(page).catch(() => ({ totalHeadings: 0, hierarchy: [], issues: [] }));

  console.log(`    Checking color-only indicators...`);
  const colorOnly    = await checkColorOnlyIndicators(page).catch(() => []);

  // Normalize axe violations
  const axeViolations = (axeResults.violations ?? []).map(v => ({
    id:          v.id,
    impact:      v.impact,
    description: v.description,
    help:        v.help,
    helpUrl:     v.helpUrl,
    nodes:       v.nodes?.length ?? 0,
    tags:        v.tags ?? [],
  }));

  // Build findings array
  const findings = [];

  // axe critical and serious
  axeViolations
    .filter(v => v.impact === 'critical' || v.impact === 'serious')
    .forEach(v => {
      findings.push({
        severity:    v.impact === 'critical' ? 'blocker' : 'major',
        category:    'accessibility',
        source:      'axe-core',
        id:          v.id,
        title:       v.description,
        help:        v.help,
        helpUrl:     v.helpUrl,
        affectedElements: v.nodes,
      });
    });

  // axe moderate and minor
  axeViolations
    .filter(v => v.impact === 'moderate' || v.impact === 'minor')
    .forEach(v => {
      findings.push({
        severity: 'minor',
        category: 'accessibility',
        source:   'axe-core',
        id:       v.id,
        title:    v.description,
        help:     v.help,
        helpUrl:  v.helpUrl,
        affectedElements: v.nodes,
      });
    });

  // Touch targets
  if (touchTargets.length > 0) {
    findings.push({
      severity: touchTargets.length >= 5 ? 'major' : 'minor',
      category: 'ux_touch_target',
      source:   'touch-target-check',
      title:    `${touchTargets.length} interactive elements below ${minTarget}px minimum`,
      elements: touchTargets.slice(0, 8),
    });
  }

  // Focus indicators
  if (focusability.issuesFound > 0) {
    findings.push({
      severity: focusability.issuesFound >= 5 ? 'major' : 'minor',
      category: 'accessibility',
      source:   'focus-indicator-check',
      title:    `${focusability.issuesFound} elements may lack visible focus indicator`,
      note:     'Verify by manually tabbing through the page — Tailwind focus classes may not be detectable at rest',
      elements: focusability.issues.slice(0, 5),
    });
  }

  // Images
  if (images.length > 0) {
    findings.push({
      severity: 'major',
      category: 'accessibility',
      source:   'image-alt-check',
      title:    `${images.length} image(s) missing alt text or aria-label`,
      elements: images,
      wcag:     '1.1.1 Non-text Content',
    });
  }

  // Form labels
  if (formLabels.length > 0) {
    findings.push({
      severity: 'major',
      category: 'accessibility',
      source:   'form-label-check',
      title:    `${formLabels.length} form input(s) missing proper labels`,
      elements: formLabels,
      wcag:     '1.3.1 Info and Relationships',
    });
  }

  // Heading hierarchy
  if (headings.issues.length > 0) {
    findings.push({
      severity: 'minor',
      category: 'accessibility',
      source:   'heading-hierarchy-check',
      title:    `Heading hierarchy issues: ${headings.issues.map(h => h.issue).join('; ')}`,
      wcag:     '1.3.1 Info and Relationships',
    });
  }

  // Color-only (informational — needs Claude Vision to confirm)
  if (colorOnly.length > 0) {
    findings.push({
      severity: 'minor',
      category: 'accessibility',
      source:   'color-only-heuristic',
      title:    `${colorOnly.length} possible color-only status indicator(s) — verify with Claude Vision`,
      elements: colorOnly,
      wcag:     '1.4.1 Use of Color',
      note:     'This is a heuristic — Claude should visually confirm each case',
    });
  }

  // Summary
  const summary = {
    axeViolations:    axeViolations.length,
    axeCritical:      axeViolations.filter(v => v.impact === 'critical').length,
    axeSerious:       axeViolations.filter(v => v.impact === 'serious').length,
    axeModerate:      axeViolations.filter(v => v.impact === 'moderate').length,
    touchTargetIssues: touchTargets.length,
    focusIssues:      focusability.issuesFound,
    imageIssues:      images.length,
    formIssues:       formLabels.length,
    headingIssues:    headings.issues.length,
    colorOnlyHints:   colorOnly.length,
    totalFindings:    findings.length,
  };

  console.log(`    Found: ${findings.length} findings (${summary.axeCritical} critical, ${summary.axeSerious} serious)`);

  return {
    viewName,
    screenshotPath,
    screenshotBase64: fs.readFileSync(screenshotPath).toString('base64'),
    summary,
    findings,
    raw: {
      axeViolations,
      axeIncomplete: (axeResults.incomplete ?? []).slice(0, 10),
      touchTargets,
      focusability,
      images,
      formLabels,
      headings,
      colorOnly,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Report Generation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a consolidated accessibility audit report in Markdown.
 *
 * @param {Array}  results - Array of runFullAudit() outputs
 * @param {object} [options]
 * @returns {string} Markdown report
 */
function generateReport(results, options = {}) {
  const allFindings  = results.flatMap(r => r.findings ?? []);
  const blockers     = allFindings.filter(f => f.severity === 'blocker');
  const majors       = allFindings.filter(f => f.severity === 'major');
  const minors       = allFindings.filter(f => f.severity === 'minor');

  const wcagStatus =
    blockers.length > 0 ? '❌ Critical WCAG Violations' :
    majors.length > 0   ? '⚠️ WCAG Issues Found' :
    '✅ No Critical Issues';

  let md = `# Accessibility Deep Audit\n\n`;
  md += `**Date:** ${new Date().toISOString()}\n`;
  md += `**WCAG 2.1 AA Status:** ${wcagStatus}\n`;
  md += `**Total Findings:** ${blockers.length} critical / ${majors.length} serious / ${minors.length} minor\n\n`;

  // Per-view summary
  md += `## Summary by View\n\n`;
  md += `| View | Axe (C/S/M) | Touch | Focus | Images | Forms | Total |\n`;
  md += `|------|-------------|-------|-------|--------|-------|-------|\n`;

  results.forEach(r => {
    const s = r.summary;
    md += `| ${r.viewName} | ${s.axeCritical}/${s.axeSerious}/${s.axeModerate} | ${s.touchTargetIssues} | ${s.focusIssues} | ${s.imageIssues} | ${s.formIssues} | ${s.totalFindings} |\n`;
  });

  // Findings by severity
  const groups = [
    { label: '🔴 Critical (Blocker)', items: blockers },
    { label: '🟡 Serious (Major)',    items: majors },
    { label: '🔵 Minor',              items: minors },
  ];

  md += `\n## Findings\n\n`;

  for (const { label, items } of groups) {
    if (items.length === 0) continue;
    md += `### ${label} (${items.length})\n\n`;

    items.forEach(f => {
      md += `**${f.title}**\n`;
      md += `- Source: \`${f.source ?? 'manual'}\`\n`;
      if (f.wcag)    md += `- WCAG: ${f.wcag}\n`;
      if (f.help)    md += `- Fix: ${f.help}\n`;
      if (f.helpUrl) md += `- Reference: [${f.id}](${f.helpUrl})\n`;
      if (f.note)    md += `- Note: ${f.note}\n`;

      if (f.elements?.length > 0) {
        md += `- Affected elements:\n`;
        f.elements.slice(0, 3).forEach(el => {
          const desc = el.text || el.ariaLabel || el.placeholder || el.src || el.issue || '';
          md += `  - \`${el.tag ?? el.selector ?? '?'}\`: ${desc}\n`;
        });
      }
      md += `\n`;
    });
  }

  // WCAG Quick Fix Code Snippets
  md += `## Quick Fix Examples\n\n`;
  md += `\`\`\`html\n`;
  md += `<!-- Fix: Icon button without accessible name -->\n`;
  md += `<button aria-label="Toggle dark mode" title="Toggle dark mode">\n`;
  md += `  <SunIcon class="w-4 h-4" aria-hidden="true" />\n`;
  md += `</button>\n\n`;
  md += `<!-- Fix: Status indicator without text -->\n`;
  md += `<span class="status-dot running" aria-label="Agent is running">\n`;
  md += `  <span class="sr-only">Running</span>\n`;
  md += `</span>\n\n`;
  md += `<!-- Fix: Input without label -->\n`;
  md += `<label for="project-name">Project name</label>\n`;
  md += `<input id="project-name" type="text" placeholder="My project" />\n`;
  md += `\`\`\`\n`;

  return md;
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  runAxe,
  checkTouchTargets,
  checkFocusIndicators,
  checkImages,
  checkFormLabels,
  checkHeadingHierarchy,
  checkColorOnlyIndicators,
  runFullAudit,
  generateReport,
  AXE_CORE_CDN,
  WCAG_AA_TAGS,
  WCAG_AAA_TAGS,
  A11Y_DIR,
};
