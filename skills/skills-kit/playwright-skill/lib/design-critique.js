/**
 * AI Design Critique Library for Claude Code UX Testing
 *
 * Provides structured design analysis prompts and screenshot collection
 * for Claude Vision-powered design critique sessions.
 *
 * NOTE: This module does NOT call AI APIs directly.
 * It captures screenshots and generates structured prompts for Claude (the agent)
 * to analyze using its built-in vision capabilities.
 *
 * Usage:
 *   const dc = require('./lib/design-critique');
 *   const screenshots = await dc.collectViewScreenshots(page, VIEWS);
 *   // Claude then analyzes each screenshot using the generated prompt
 */

const fs = require('fs');
const path = require('path');

const CRITIQUE_DIR = path.join(process.cwd(), '.testing', 'design-critique');

// ─────────────────────────────────────────────────────────────────────────────
// Design Dimensions Definition
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The 6 design dimensions used for critique scoring.
 * Each scored 1–10 with specific evaluation criteria.
 */
const DESIGN_DIMENSIONS = {
  typography: {
    name: 'Typography',
    weight: 1.0,
    criteria: [
      'Clear typographic scale (4–5 distinct sizes max, not random)',
      'Font weight communicates hierarchy (bold=headings, regular=body)',
      'Line-height comfortable for reading (1.4–1.6 body, 1.1–1.2 headings)',
      'No text clipped, truncated unexpectedly, or too small to read',
      'Consistent font family usage across similar elements',
    ],
    benchmarks: {
      excellent: 'VS Code, Linear — precise type scale, intentional hierarchy',
      good:      'Consistent but generic type treatment',
      poor:      '6+ different font sizes, random bold/italic, unclear hierarchy',
    },
  },
  color: {
    name: 'Color & Contrast',
    weight: 1.2,
    criteria: [
      'Consistent primary accent (not 3 different shades of the same blue)',
      'Color is communicative, not just decorative',
      'WCAG AA contrast: 4.5:1 body text, 3:1 large text & UI elements',
      'Status colors consistent (error=red, success=green, warning=amber)',
      'Dark mode preserves semantic meaning, not just inverted colors',
    ],
    benchmarks: {
      excellent: 'GitHub, Linear — color system with clear semantic meaning',
      good:      'Mostly consistent, minor deviations',
      poor:      'Multiple accent colors, low contrast, no color system',
    },
  },
  spacing: {
    name: 'Spacing & Rhythm',
    weight: 1.0,
    criteria: [
      'Systematic spacing (multiples of 4px or 8px)',
      'Adequate breathing room between unrelated sections',
      'Related elements grouped via proximity (Law of Proximity)',
      'Consistent internal padding within similar components',
      'No elements visually touching or overlapping',
    ],
    benchmarks: {
      excellent: 'Vercel, Stripe — every gap feels intentional',
      good:      'Mostly consistent spacing with minor irregularities',
      poor:      'Arbitrary margins, elements touching, inconsistent density',
    },
  },
  components: {
    name: 'Component Consistency',
    weight: 1.0,
    criteria: [
      'Consistent border-radius across all cards, buttons, inputs',
      'All interactive states present: hover, focus, active, disabled',
      'Icons from consistent family (same weight, same style)',
      'Button hierarchy clear: primary > secondary > ghost/link',
      'Form elements share consistent visual treatment',
    ],
    benchmarks: {
      excellent: 'shadcn/ui, Radix — every component feels from the same system',
      good:      'Mostly consistent with minor deviations',
      poor:      'Mix of styles, missing states, inconsistent icons',
    },
  },
  identity: {
    name: 'Visual Identity',
    weight: 0.8,
    criteria: [
      'Distinct visual personality (not a Bootstrap default)',
      'Aesthetic appropriate for domain (IDE = technical, focused, serious)',
      'Professional quality that inspires trust and confidence',
      'Design choices are intentional and coherent',
      'Would not be confused with a generic template',
    ],
    benchmarks: {
      excellent: 'Raycast, Arc — immediately distinctive, premium feel',
      good:      'Professional, clearly a real product',
      poor:      'Generic Bootstrap/Material look, could be any SaaS app',
    },
  },
  layout: {
    name: 'Layout & Composition',
    weight: 1.0,
    criteria: [
      'Clear visual hierarchy (eye knows where to go first)',
      'Reading pattern is natural (F-pattern for data, Z-pattern for landing)',
      'Grid system maintained (elements align across the page)',
      'Gestalt principles applied: proximity, similarity, continuity',
      'Whitespace is active (groups/separates) not passive (leftover)',
    ],
    benchmarks: {
      excellent: 'Notion, Linear — every element in the right place',
      good:      'Clear structure, minor alignment inconsistencies',
      poor:      'Random placement, no visible grid, confusing hierarchy',
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Prompt Generation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a structured design critique prompt for a specific view.
 *
 * @param {string} viewName - Name of the view being critiqued
 * @param {string} [context] - Additional context about this view's purpose
 * @returns {string} Prompt string for Claude Vision analysis
 */
function generateCritiquePrompt(viewName, context = '', productDescription = '') {
  const criteriaList = Object.values(DESIGN_DIMENSIONS)
    .map(d => `**${d.name}:** ${d.criteria.slice(0, 2).join(' | ')}`)
    .join('\n');

  return `You are a senior UI/UX designer and creative director with 15+ years experience designing developer tools (VS Code themes, IDE UIs, dev dashboards, CLI tools).

Perform a professional design critique of this "${viewName}" screen.${productDescription ? ` Product: ${productDescription}.` : ''}
${context ? `\nContext: ${context}\n` : ''}
## Evaluation (score each 1–10)

${criteriaList}

---

### 1. Typography (1–10)
Score: ___/10

Strengths:
- [specific positive]

Issues:
- [specific problem — reference visible element]

Action Items:
- [concrete CSS/Tailwind fix, e.g.: "Use text-sm (14px) for list items — currently appearing ~11px"]

---

### 2. Color & Contrast (1–10)
Score: ___/10

Strengths:
Issues:
Action Items:

---

### 3. Spacing & Rhythm (1–10)
Score: ___/10

Strengths:
Issues:
Action Items:

---

### 4. Component Consistency (1–10)
Score: ___/10

Strengths:
Issues:
Action Items:

---

### 5. Visual Identity (1–10)
Score: ___/10

Strengths:
Issues:
Action Items:

---

### 6. Layout & Composition (1–10)
Score: ___/10

Strengths:
Issues:
Action Items:

---

## Overall Score: ___/10

**One-line verdict:** [What this view does best and its biggest weakness]

## Top 3 Priority Improvements (by visual impact)

1. **[Area]**: [Specific change with concrete values]
   _Example: "Reduce to 4 type sizes using Tailwind: text-xl (view title), text-base (section headers), text-sm (list items), text-xs (metadata). Currently 7+ sizes create visual noise."_

2. **[Area]**: [Specific change]

3. **[Area]**: [Specific change]

## What's Working Well (PRESERVE these)
- [Element or pattern to keep]
- [Element or pattern to keep]

---
Be specific: reference actual elements visible in the screenshot, suggest concrete Tailwind classes or CSS values, and describe the user impact of each issue.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Screenshot Collection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Navigate to each view and capture screenshots with their analysis prompts.
 *
 * @param {object} page    - Playwright page
 * @param {Array}  views   - Array of { name, navigate(page), context?, waitFor? }
 * @param {object} [options]
 * @param {number} [options.settleDelay=800] - ms to wait after navigation
 * @param {boolean} [options.fullPage=false] - Full page or viewport
 * @returns {Array<{ viewName, screenshotPath, base64, prompt }>}
 */
async function collectViewScreenshots(page, views, options = {}) {
  fs.mkdirSync(CRITIQUE_DIR, { recursive: true });

  const screenshots = [];

  for (const view of views) {
    console.log(`  📸 Capturing: ${view.name}`);

    try {
      if (view.navigate) {
        await view.navigate(page);
      }

      if (view.waitFor) {
        await page.waitForSelector(view.waitFor, { timeout: 5000 }).catch(() => {});
      }

      await page.waitForTimeout(options.settleDelay ?? 800);

      // Sanitize name for filesystem
      const safeName = view.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const filename = `critique-${safeName}.png`;
      const screenshotPath = path.join(CRITIQUE_DIR, filename);

      await page.screenshot({
        path: screenshotPath,
        fullPage: options.fullPage ?? false,
      });

      const buffer = fs.readFileSync(screenshotPath);

      screenshots.push({
        viewName: view.name,
        screenshotPath,
        base64: buffer.toString('base64'),
        prompt: generateCritiquePrompt(view.name, view.context ?? ''),
      });

      console.log(`     Saved: ${screenshotPath}`);

    } catch (err) {
      console.error(`  ⚠️  Failed to capture ${view.name}: ${err.message}`);
      screenshots.push({
        viewName: view.name,
        error: err.message,
        prompt: generateCritiquePrompt(view.name),
      });
    }
  }

  return screenshots;
}

// ─────────────────────────────────────────────────────────────────────────────
// Report Generation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a consolidated design critique report.
 *
 * @param {Array} critiques - Array of { viewName, scores, topIssues, actionItems, rawCritique }
 * @returns {string} Markdown report
 */
function generateReport(critiques) {
  const validCritiques = critiques.filter(c => c.scores && !c.error);

  // Compute averages
  const computeAvg = (key) => {
    const vals = validCritiques.map(c => c.scores[key] ?? 5);
    return vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
  };

  const dimKeys = Object.keys(DESIGN_DIMENSIONS);
  const dimAvgs = Object.fromEntries(dimKeys.map(k => [k, +computeAvg(k).toFixed(1)]));
  const overallAvg = validCritiques.length > 0
    ? +(validCritiques.reduce((s, c) => s + (c.overallScore ?? 5), 0) / validCritiques.length).toFixed(1)
    : 0;

  // Grade
  const grade =
    overallAvg >= 9 ? '🏆 Premium (Linear/Raycast tier)' :
    overallAvg >= 8 ? '🌟 High Quality (VS Code tier)' :
    overallAvg >= 7 ? '✅ Professional Developer Tool' :
    overallAvg >= 6 ? '⚠️ Functional, Needs Polish' :
    '❌ Needs Significant Work';

  let md = `# Design Critique Report\n\n`;
  md += `**Date:** ${new Date().toISOString()}\n`;
  md += `**Overall Score:** ${overallAvg}/10 — ${grade}\n`;
  md += `**Views Analyzed:** ${validCritiques.length}\n\n`;

  // Score matrix
  md += `## Scores by Dimension\n\n`;
  md += `| View | Typo | Color | Spacing | Components | Identity | Layout | Overall |\n`;
  md += `|------|------|-------|---------|-----------|---------|--------|--------|\n`;

  validCritiques.forEach(c => {
    const s = c.scores ?? {};
    md += `| ${c.viewName} | ${s.typography ?? '?'} | ${s.color ?? '?'} | ${s.spacing ?? '?'} | ${s.components ?? '?'} | ${s.identity ?? '?'} | ${s.layout ?? '?'} | ${c.overallScore ?? '?'}/10 |\n`;
  });

  // Dimension averages
  md += `| **Average** | **${dimAvgs.typography}** | **${dimAvgs.color}** | **${dimAvgs.spacing}** | **${dimAvgs.components}** | **${dimAvgs.identity}** | **${dimAvgs.layout}** | **${overallAvg}/10** |\n\n`;

  // Weakest dimensions
  const sorted = dimKeys
    .map(k => ({ key: k, name: DESIGN_DIMENSIONS[k].name, avg: dimAvgs[k] }))
    .sort((a, b) => a.avg - b.avg);

  md += `## Priority Areas (Weakest First)\n\n`;
  sorted.forEach((d, i) => {
    const icon = d.avg < 6 ? '❌' : d.avg < 7.5 ? '⚠️' : '✅';
    md += `${i + 1}. ${icon} **${d.name}**: ${d.avg}/10\n`;
  });

  // Consolidated action items
  const allActions = validCritiques.flatMap(c => c.actionItems ?? []);
  if (allActions.length > 0) {
    md += `\n## Consolidated Action Items\n\n`;
    const unique = [...new Set(allActions)];
    unique.slice(0, 15).forEach((action, i) => {
      md += `${i + 1}. ${action}\n`;
    });
  }

  // Per-view details
  md += `\n## Detailed Critique by View\n\n`;
  validCritiques.forEach(c => {
    md += `---\n\n### ${c.viewName}\n\n`;
    md += c.rawCritique ?? '_Critique not available_';
    md += `\n\n`;
  });

  return md;
}

/**
 * Parse a Claude critique response to extract scores.
 * Looks for patterns like "Score: 8/10" in the critique text.
 *
 * @param {string} critiqueText - Raw Claude response
 * @returns {{ scores: object, overallScore: number, actionItems: string[] }}
 */
function parseCritique(critiqueText) {
  const scores = {};
  const dimensionPatterns = [
    { key: 'typography', pattern: /Typography[^]*?Score:\s*(\d+)\/10/i },
    { key: 'color',      pattern: /Color[^]*?Score:\s*(\d+)\/10/i },
    { key: 'spacing',    pattern: /Spacing[^]*?Score:\s*(\d+)\/10/i },
    { key: 'components', pattern: /Component[^]*?Score:\s*(\d+)\/10/i },
    { key: 'identity',   pattern: /Identity[^]*?Score:\s*(\d+)\/10/i },
    { key: 'layout',     pattern: /Layout[^]*?Score:\s*(\d+)\/10/i },
  ];

  dimensionPatterns.forEach(({ key, pattern }) => {
    const match = critiqueText.match(pattern);
    if (match) scores[key] = parseInt(match[1]);
  });

  // Overall score
  const overallMatch = critiqueText.match(/Overall Score:\s*(\d+)\/10/i);
  const overallScore = overallMatch ? parseInt(overallMatch[1]) : 0;

  // Extract action items (lines starting with common indicators)
  const actionItems = [];
  const lines = critiqueText.split('\n');
  lines.forEach(line => {
    const trimmed = line.trim();
    if (
      (trimmed.startsWith('- ') || trimmed.match(/^\d+\./)) &&
      (trimmed.includes('Use ') || trimmed.includes('Add ') || trimmed.includes('Change ') ||
       trimmed.includes('Replace ') || trimmed.includes('Increase ') || trimmed.includes('Reduce '))
    ) {
      actionItems.push(trimmed.replace(/^[-\d.]+\s*/, '').trim());
    }
  });

  return { scores, overallScore, actionItems };
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  DESIGN_DIMENSIONS,
  generateCritiquePrompt,
  collectViewScreenshots,
  generateReport,
  parseCritique,
  CRITIQUE_DIR,
};
