/**
 * UX Audit Module for Playwright Chaos Monkey
 *
 * Provides automated UX evaluation functions that check pages against
 * proven UX research frameworks:
 *
 *   - Nielsen's 10 Usability Heuristics (NN/Group, 1994/2024)
 *   - Laws of UX (Jon Yablonski, lawsofux.com)
 *   - Microsoft's 18 Human-AI Interaction Guidelines (CHI 2019)
 *   - WCAG 2.1 AA accessibility standards
 *
 * Designed for AI-First systems and modern web applications.
 *
 * Usage:
 *   const ux = require('./ux-audit');
 *   const results = await ux.runFullAudit(page, { viewName: 'Dashboard' });
 *   // Add results as findings to chaos session:
 *   for (const finding of results.findings) {
 *     session.report.addFinding(finding);
 *   }
 *   session.report.setUXAssessment(results.assessment);
 */

// ============================================================================
// UX HEURISTICS DEFINITIONS
// ============================================================================

/**
 * Nielsen's 10 Usability Heuristics mapped to automated + visual checks.
 * Each heuristic includes what to check programmatically and visually.
 */
const NIELSEN_HEURISTICS = {
  H1: {
    id: 'H1',
    name: 'Visibility of System Status',
    description: 'Users should always know what is happening via timely, appropriate feedback.',
    aiFirstContext: 'AI agents must clearly show running/idle/error states. Progress indicators for long AI tasks.',
    autoChecks: ['loading_states', 'progress_indicators', 'status_indicators'],
  },
  H2: {
    id: 'H2',
    name: 'Match System & Real World',
    description: 'Use familiar words, phrases, concepts. Avoid internal jargon.',
    aiFirstContext: 'AI terminology should match developer mental models (not LLM internals).',
    autoChecks: ['labels_visible', 'no_error_codes'],
  },
  H3: {
    id: 'H3',
    name: 'User Control & Freedom',
    description: 'Clear emergency exits. Support undo and redo.',
    aiFirstContext: 'Easy to cancel/stop AI agents. Undo AI-generated changes.',
    autoChecks: ['cancel_buttons', 'keyboard_escape', 'back_navigation'],
  },
  H4: {
    id: 'H4',
    name: 'Consistency & Standards',
    description: 'Same words/actions mean same things. Follow platform conventions.',
    aiFirstContext: 'Consistent AI status icons, interaction patterns across views.',
    autoChecks: ['button_consistency', 'icon_consistency', 'color_usage'],
  },
  H5: {
    id: 'H5',
    name: 'Error Prevention',
    description: 'Prevent problems before they occur. Confirm destructive actions.',
    aiFirstContext: 'Confirm before stopping AI tasks. Warn about data loss.',
    autoChecks: ['destructive_confirmations', 'form_validation'],
  },
  H6: {
    id: 'H6',
    name: 'Recognition over Recall',
    description: 'Make options visible. Minimize memory load.',
    aiFirstContext: 'AI capabilities discoverable. No hidden features requiring memory.',
    autoChecks: ['labels_on_buttons', 'tooltips_on_icons', 'visible_shortcuts'],
  },
  H7: {
    id: 'H7',
    name: 'Flexibility & Efficiency',
    description: 'Shortcuts for power users. Customize frequent actions.',
    aiFirstContext: 'Keyboard shortcuts for AI invocation. Power-user AI workflows.',
    autoChecks: ['keyboard_shortcuts', 'accelerators'],
  },
  H8: {
    id: 'H8',
    name: 'Aesthetic & Minimalist Design',
    description: 'No irrelevant information. Visual elements support primary goals.',
    aiFirstContext: 'AI output presented cleanly. No information overload from AI responses.',
    autoChecks: ['information_density', 'visual_noise', 'whitespace'],
  },
  H9: {
    id: 'H9',
    name: 'Error Recognition & Recovery',
    description: 'Plain language errors. Indicate problem. Suggest solution.',
    aiFirstContext: 'AI errors explained in user terms. Actionable recovery suggestions.',
    autoChecks: ['error_messages', 'error_styling', 'recovery_actions'],
  },
  H10: {
    id: 'H10',
    name: 'Help & Documentation',
    description: 'Easy to search help. Focused on task. Concrete steps.',
    aiFirstContext: 'In-context AI capability hints. Just-in-time help for AI features.',
    autoChecks: ['tooltips', 'help_text', 'empty_states'],
  },
};

/**
 * Microsoft's 18 Human-AI Interaction Guidelines — key ones for AI-First IDEs.
 */
const AI_GUIDELINES = {
  G1:  { id: 'G1',  name: 'Make clear what AI can do', phase: 'initially' },
  G2:  { id: 'G2',  name: 'Make clear how well AI performs', phase: 'initially' },
  G3:  { id: 'G3',  name: 'Time AI services contextually', phase: 'during' },
  G4:  { id: 'G4',  name: 'Show contextually relevant AI info', phase: 'during' },
  G7:  { id: 'G7',  name: 'Support efficient AI invocation', phase: 'when_wrong' },
  G8:  { id: 'G8',  name: 'Support efficient AI dismissal', phase: 'when_wrong' },
  G9:  { id: 'G9',  name: 'Support efficient AI correction', phase: 'when_wrong' },
  G11: { id: 'G11', name: 'Make clear why AI did what it did', phase: 'when_wrong' },
  G12: { id: 'G12', name: 'Remember recent interactions', phase: 'over_time' },
  G15: { id: 'G15', name: 'Encourage granular feedback', phase: 'over_time' },
  G17: { id: 'G17', name: 'Provide global AI controls', phase: 'over_time' },
  G18: { id: 'G18', name: 'Notify users about AI changes', phase: 'over_time' },
};

// ============================================================================
// AUTOMATED UX CHECKS
// These run via page.evaluate() and return quantitative data
// ============================================================================

/**
 * Check interactive element sizes (Fitts's Law).
 * Minimum: 44x44px for touch (mobile), 24x24px for desktop.
 * @returns {Array<{selector: string, width: number, height: number, text: string}>}
 */
async function checkTouchTargets(page, { mobileMode = false } = {}) {
  const minSize = mobileMode ? 44 : 24;
  return page.evaluate((minSize) => {
    const interactiveSelectors = 'button, a, [role="button"], [role="link"], input, select, textarea, [tabindex]';
    const elements = Array.from(document.querySelectorAll(interactiveSelectors));
    const violations = [];
    for (const el of elements) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue; // hidden
      if (rect.width < minSize || rect.height < minSize) {
        violations.push({
          tag: el.tagName.toLowerCase(),
          text: (el.textContent || el.getAttribute('aria-label') || el.getAttribute('title') || '').trim().slice(0, 40),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          minRequired: minSize,
          selector: el.className ? `.${el.className.split(' ')[0]}` : el.tagName.toLowerCase(),
        });
      }
    }
    return violations.slice(0, 20); // Cap at 20 to avoid noise
  }, minSize);
}

/**
 * Check text readability — font sizes.
 * Body text should be ≥14px. Labels ≥12px.
 * @returns {Array<{text: string, fontSize: number, element: string}>}
 */
async function checkTypography(page) {
  return page.evaluate(() => {
    const textElements = Array.from(document.querySelectorAll('p, span, div, label, td, th, li, h1, h2, h3, h4, h5, h6'));
    const violations = [];
    for (const el of textElements) {
      const text = el.textContent.trim();
      if (!text || text.length < 3) continue;
      // Only check leaf-like nodes (avoid containers)
      if (el.children.length > 2) continue;
      const style = window.getComputedStyle(el);
      const fontSize = parseFloat(style.fontSize);
      if (fontSize < 12) {
        violations.push({
          text: text.slice(0, 50),
          fontSize: Math.round(fontSize),
          tag: el.tagName.toLowerCase(),
          className: el.className.split(' ')[0],
        });
      }
    }
    return violations.slice(0, 15);
  });
}

/**
 * Check for missing labels on interactive elements (H6: Recognition over Recall).
 * @returns {Array<{element: string, type: string, issue: string}>}
 */
async function checkLabels(page) {
  return page.evaluate(() => {
    const issues = [];

    // Icon-only buttons without accessible name
    const buttons = Array.from(document.querySelectorAll('button, [role="button"]'));
    for (const btn of buttons) {
      const text = btn.textContent.trim();
      const ariaLabel = btn.getAttribute('aria-label');
      const title = btn.getAttribute('title');
      const ariaLabelledBy = btn.getAttribute('aria-labelledby');
      if (!text && !ariaLabel && !title && !ariaLabelledBy) {
        const rect = btn.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          issues.push({
            element: btn.tagName.toLowerCase(),
            className: btn.className.split(' ')[0],
            type: 'button_no_label',
            issue: 'Interactive button has no accessible name (no text, aria-label, or title)',
          });
        }
      }
    }

    // Inputs without labels
    const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea, select'));
    for (const input of inputs) {
      const id = input.id;
      const ariaLabel = input.getAttribute('aria-label');
      const ariaLabelledBy = input.getAttribute('aria-labelledby');
      const placeholder = input.getAttribute('placeholder');
      const labelEl = id ? document.querySelector(`label[for="${id}"]`) : null;
      if (!ariaLabel && !ariaLabelledBy && !labelEl && !placeholder) {
        issues.push({
          element: input.tagName.toLowerCase(),
          type: input.getAttribute('type') || 'text',
          issue: 'Form input has no label or accessible name',
        });
      }
    }

    return issues.slice(0, 20);
  });
}

/**
 * Check for focus indicator visibility (H3: User Control & Freedom).
 * Tests if focused elements have visible outlines.
 * @returns {{hasFocusStyles: boolean, violations: Array}}
 */
async function checkFocusIndicators(page) {
  return page.evaluate(() => {
    // Check if the CSS has focus styles defined
    const styleSheets = Array.from(document.styleSheets);
    let hasFocusReset = false;
    let hasFocusStyles = false;

    try {
      for (const sheet of styleSheets) {
        const rules = Array.from(sheet.cssRules || []);
        for (const rule of rules) {
          if (rule.selectorText && rule.selectorText.includes(':focus')) {
            if (rule.style && rule.style.outline === 'none' || rule.style.outlineWidth === '0') {
              hasFocusReset = true;
            } else {
              hasFocusStyles = true;
            }
          }
        }
      }
    } catch (e) {
      // Cross-origin stylesheet, skip
    }

    return {
      hasFocusStyles,
      hasFocusReset,
      concern: hasFocusReset && !hasFocusStyles
        ? 'Focus outlines are reset (outline:none) without replacement — keyboard users cannot see focus'
        : null,
    };
  });
}

/**
 * Check for overflow/scrollbar issues (broken layout detection).
 * @returns {{horizontalOverflow: boolean, overflowingElements: Array}}
 */
async function checkLayoutOverflow(page) {
  return page.evaluate(() => {
    const docWidth = document.documentElement.scrollWidth;
    const viewportWidth = window.innerWidth;
    const horizontalOverflow = docWidth > viewportWidth + 2;

    const overflowing = [];
    const allElements = Array.from(document.querySelectorAll('*'));
    for (const el of allElements) {
      const rect = el.getBoundingClientRect();
      if (rect.right > viewportWidth + 2) {
        overflowing.push({
          tag: el.tagName.toLowerCase(),
          className: el.className.split(' ')[0],
          right: Math.round(rect.right),
          viewportWidth,
        });
      }
    }

    return {
      horizontalOverflow,
      documentWidth: docWidth,
      viewportWidth,
      overflowingElements: overflowing.slice(0, 10),
    };
  });
}

/**
 * Check for loading state indicators (H1: Visibility of System Status).
 * Looks for spinner, skeleton, progress bar patterns.
 * @returns {{hasLoadingIndicators: boolean, hasSkeletons: boolean, hasProgressBars: boolean}}
 */
async function checkLoadingStates(page) {
  return page.evaluate(() => {
    const spinnerSelectors = '[class*="spin"], [class*="loader"], [class*="loading"], [role="progressbar"]';
    const skeletonSelectors = '[class*="skeleton"], [class*="shimmer"], [class*="placeholder"]';
    const progressSelectors = 'progress, [role="progressbar"], [class*="progress"]';

    return {
      hasLoadingIndicators: document.querySelectorAll(spinnerSelectors).length > 0,
      hasSkeletons: document.querySelectorAll(skeletonSelectors).length > 0,
      hasProgressBars: document.querySelectorAll(progressSelectors).length > 0,
      loadingCount: document.querySelectorAll(spinnerSelectors).length,
    };
  });
}

/**
 * Check for empty state UX (H10: Help & Documentation).
 * Lists/tables with no content should show helpful empty states.
 * @returns {Array<{element: string, issue: string}>}
 */
async function checkEmptyStates(page) {
  return page.evaluate(() => {
    const issues = [];

    // Check for empty lists/tables
    const lists = Array.from(document.querySelectorAll('ul, ol, table tbody, [role="list"]'));
    for (const list of lists) {
      const children = Array.from(list.children);
      if (children.length === 0) {
        const rect = list.getBoundingClientRect();
        if (rect.width > 50 && rect.height < 10) {
          issues.push({
            element: list.tagName.toLowerCase(),
            issue: 'Empty list/table with no empty state message or illustration',
            className: list.className.split(' ')[0],
          });
        }
      }
    }

    return issues.slice(0, 10);
  });
}

/**
 * Check information density (H8: Aesthetic & Minimalist Design).
 * Very high DOM density or tiny spacing may indicate cognitive overload.
 * @returns {{domNodes: number, interactiveElements: number, density: string}}
 */
async function checkInformationDensity(page) {
  return page.evaluate(() => {
    const allNodes = document.querySelectorAll('*').length;
    const interactive = document.querySelectorAll('button, a, input, select, textarea, [role="button"]').length;
    const textNodes = document.querySelectorAll('p, span, div, label, h1, h2, h3, h4, h5, h6').length;

    const viewportArea = window.innerWidth * window.innerHeight;

    const density = allNodes > 5000 ? 'very_high'
      : allNodes > 2000 ? 'high'
      : allNodes > 500 ? 'moderate'
      : 'low';

    return {
      domNodes: allNodes,
      interactiveElements: interactive,
      textElements: textNodes,
      density,
      warning: allNodes > 3000 ? `High DOM count (${allNodes} nodes) may indicate information overload` : null,
    };
  });
}

/**
 * Check for AI-First UX patterns.
 * Looks for agent status, AI invocation, feedback mechanisms.
 * @returns {object} AI-First UX assessment
 */
async function checkAIFirstPatterns(page) {
  return page.evaluate(() => {
    // Look for agent/AI status indicators
    const agentStatusPatterns = [
      '[class*="agent"]', '[class*="status"]', '[class*="running"]',
      '[class*="idle"]', '[class*="executing"]', '[data-status]',
    ];

    // Look for AI invocation triggers
    const aiInvocationPatterns = [
      'button[aria-label*="AI"]', 'button[aria-label*="agent"]',
      '[class*="chat"]', '[class*="prompt"]', '[class*="command"]',
    ];

    // Look for cancel/stop controls
    const cancelPatterns = [
      'button[aria-label*="cancel"]', 'button[aria-label*="stop"]',
      '[class*="cancel"]', '[class*="abort"]',
    ];

    // Look for feedback mechanisms
    const feedbackPatterns = [
      '[class*="feedback"]', '[class*="rating"]', '[class*="thumbs"]',
      '[aria-label*="feedback"]',
    ];

    const countMatches = (patterns) =>
      patterns.reduce((sum, sel) => {
        try { return sum + document.querySelectorAll(sel).length; } catch (e) { return sum; }
      }, 0);

    return {
      hasAgentStatus: countMatches(agentStatusPatterns) > 0,
      hasAIInvocation: countMatches(aiInvocationPatterns) > 0,
      hasCancelControls: countMatches(cancelPatterns) > 0,
      hasFeedback: countMatches(feedbackPatterns) > 0,
      agentStatusCount: countMatches(agentStatusPatterns),
      aiInvocationCount: countMatches(aiInvocationPatterns),
    };
  });
}

/**
 * Check for visually overlapping elements — the class of bug that automated
 * overflow checks miss because the issue is intra-container, not document-level.
 *
 * Two strategies:
 *   A) Absolutely-positioned siblings: detects virtualizer items whose rendered
 *      content exceeds the fixed slot height, bleeding into the next item.
 *   B) Classic sibling bounding-box intersection: any two sibling absolute
 *      elements whose rects intersect with more than 4px of overlap.
 *
 * Catches: virtualizer with estimateSize too small, z-index stacking bugs,
 * absolutely-positioned badges/overlays placed incorrectly.
 *
 * @returns {Array<{cause, index?, overlapPx, fix}>}
 */
async function checkElementOverlap(page) {
  return page.evaluate(() => {
    const overlaps = [];
    const TOLERANCE_PX = 4; // ignore sub-pixel rendering differences

    // ── Strategy A: virtual list item content vs. its slot ──────────────────
    // Items rendered by @tanstack/virtual carry data-index and are positioned
    // absolutely within a `position: relative` parent. Their outer div has a
    // fixed `height` style but no overflow:hidden, so tall content escapes.
    const virtualItems = Array.from(document.querySelectorAll('[data-index]'));
    for (const item of virtualItems) {
      if (window.getComputedStyle(item).position !== 'absolute') continue;
      const slotRect   = item.getBoundingClientRect();
      const slotHeight = slotRect.height;
      if (slotHeight < 1) continue;

      // Measure actual rendered content height (first child = the visible card)
      const content = item.firstElementChild;
      if (!content) continue;
      const contentRect   = content.getBoundingClientRect();
      const contentHeight = contentRect.height;

      if (contentHeight > slotHeight + TOLERANCE_PX) {
        overlaps.push({
          cause:         'Virtualizer item content taller than allocated slot',
          index:         Number(item.dataset.index),
          slotHeight:    Math.round(slotHeight),
          contentHeight: Math.round(contentHeight),
          overlapPx:     Math.round(contentHeight - slotHeight),
          fix:           'Add measureElement to the virtualizer and remove the fixed height from the item container, OR increase estimateSize.',
        });
      }
    }

    // ── Strategy B: sibling absolute elements that intersect ────────────────
    // Finds any `position: relative` parent whose absolute children have
    // overlapping bounding boxes (beyond tolerance).
    const relativeContainers = Array.from(
      document.querySelectorAll('*')
    ).filter(el => window.getComputedStyle(el).position === 'relative');

    for (const container of relativeContainers) {
      const absChildren = Array.from(container.children).filter(
        c => window.getComputedStyle(c).position === 'absolute'
      );
      if (absChildren.length < 2) continue;

      for (let i = 0; i < absChildren.length - 1; i++) {
        const a = absChildren[i].getBoundingClientRect();
        const b = absChildren[i + 1].getBoundingClientRect();
        if (a.height < 1 || b.height < 1) continue; // not visible

        const xOverlap = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const yOverlap = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (xOverlap > TOLERANCE_PX && yOverlap > TOLERANCE_PX) {
          overlaps.push({
            cause:    'Sibling absolute elements intersect',
            elements: [
              `${absChildren[i].tagName.toLowerCase()}.${(absChildren[i].className || '').split(' ')[0]}`,
              `${absChildren[i + 1].tagName.toLowerCase()}.${(absChildren[i + 1].className || '').split(' ')[0]}`,
            ],
            overlapPx: Math.round(yOverlap),
            fix:       'Check z-index stacking, position offsets, or fixed heights on these siblings.',
          });
        }
      }
    }

    return overlaps.slice(0, 20);
  });
}

/**
 * Virtualizer health check — specific to @tanstack/virtual (solid/react/vue).
 *
 * Detects the two most common virtualization pitfalls that cause visual overlap:
 *   1. Fixed height on item container without measureElement  →  overflow bleeding
 *   2. estimateSize too small for variable-height content     →  mis-positioned items
 *
 * Also reports how many virtual items are currently rendered and whether any
 * carries a data-index attribute (required for measureElement to work).
 *
 * @returns {{ virtualItemCount, issues: Array, recommendation }}
 */
async function checkVirtualizerHealth(page) {
  return page.evaluate(() => {
    const issues = [];
    const virtualItems = Array.from(document.querySelectorAll('[data-index]'));

    for (const item of virtualItems) {
      if (window.getComputedStyle(item).position !== 'absolute') continue;

      const hasFixedHeight    = !!(item.style.height && !item.style.height.includes('auto'));
      const hasOverflowHidden = ['hidden', 'clip'].includes(
        window.getComputedStyle(item).overflow
      ) || ['hidden', 'clip'].includes(
        window.getComputedStyle(item).overflowY
      );
      const slotHeight    = item.getBoundingClientRect().height;
      const contentHeight = item.scrollHeight; // includes overflow

      const contentExceedsSlot = contentHeight > slotHeight + 4;

      if (hasFixedHeight && !hasOverflowHidden && contentExceedsSlot) {
        issues.push({
          index:          Number(item.dataset.index),
          fixedHeight:    item.style.height,
          contentHeight:  Math.round(contentHeight),
          slotHeight:     Math.round(slotHeight),
          overflowPx:     Math.round(contentHeight - slotHeight),
          hasDataIndex:   item.hasAttribute('data-index'),
          diagnosis:      hasFixedHeight && !hasOverflowHidden
            ? 'Fixed slot height with no overflow:hidden — content escapes into next item'
            : 'Content exceeds slot height',
          fix:            'Option A (preferred): Remove height from item container; add measureElement + data-index ref to virtualizer. ' +
                          'Option B (quick): Add overflow-hidden to item container (clips content but stops overlap).',
        });
      }
    }

    return {
      virtualItemCount: virtualItems.length,
      problematicItems: issues.length,
      issues: issues.slice(0, 10),
      recommendation: issues.length > 0
        ? 'FAIL — virtualizer has items whose content overflows the allocated slot. See issues for fix.'
        : virtualItems.length > 0
          ? 'PASS — all visible virtual items fit within their slots.'
          : 'N/A — no virtual list items detected on this view.',
    };
  });
}

/**
 * Measure perceived spacing rhythm (visual design quality).
 * Checks if spacing values follow a consistent scale.
 * @returns {object} spacing analysis
 */
async function checkSpacingRhythm(page) {
  return page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('main *, [class*="panel"] *, [class*="view"] *')).slice(0, 100);
    const paddingValues = new Set();
    const marginValues = new Set();

    for (const el of elements) {
      const style = window.getComputedStyle(el);
      ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'].forEach(p => {
        const v = parseFloat(style[p]);
        if (v > 0 && v < 200) paddingValues.add(Math.round(v));
      });
      ['marginTop', 'marginBottom'].forEach(p => {
        const v = parseFloat(style[p]);
        if (v > 0 && v < 200) marginValues.add(Math.round(v));
      });
    }

    const allSpacing = [...new Set([...paddingValues, ...marginValues])].sort((a, b) => a - b);

    // Check if values follow a consistent scale (multiples of 4 or 8)
    const base4 = allSpacing.filter(v => v % 4 === 0).length;
    const base8 = allSpacing.filter(v => v % 8 === 0).length;
    const total = allSpacing.length;

    const consistency = total === 0 ? 'unknown'
      : base8 / total >= 0.7 ? 'excellent (8px grid)'
      : base4 / total >= 0.7 ? 'good (4px grid)'
      : 'inconsistent';

    return {
      uniqueSpacingValues: allSpacing.slice(0, 20),
      spacingConsistency: consistency,
      base4Ratio: total > 0 ? Math.round((base4 / total) * 100) : 0,
      base8Ratio: total > 0 ? Math.round((base8 / total) * 100) : 0,
    };
  });
}

// ============================================================================
// FULL UX AUDIT RUNNER
// ============================================================================

/**
 * Run a comprehensive UX audit on the current page.
 * Returns structured findings ready to add to a ChaosReport.
 *
 * @param {import('playwright').Page} page
 * @param {object} options
 * @param {string} options.viewName - Name of the view being audited (e.g. 'Dashboard')
 * @param {boolean} [options.mobileMode] - If true, use mobile touch target sizes
 * @param {string} [options.screenshotPath] - Take a screenshot and reference in findings
 * @returns {Promise<{findings: Array, assessment: object, raw: object}>}
 */
async function runFullAudit(page, { viewName = 'Unknown View', mobileMode = false, screenshotPath = null } = {}) {
  const findings = [];
  const raw = {};

  // --- Take screenshot if requested ---
  if (screenshotPath) {
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
  }

  // --- Run all automated checks ---
  const [
    touchTargets,
    typography,
    labels,
    focusIndicators,
    layoutOverflow,
    loadingStates,
    emptyStates,
    density,
    aiPatterns,
    spacing,
    elementOverlap,
    virtualizerHealth,
  ] = await Promise.all([
    checkTouchTargets(page, { mobileMode }).catch(() => []),
    checkTypography(page).catch(() => []),
    checkLabels(page).catch(() => []),
    checkFocusIndicators(page).catch(() => ({})),
    checkLayoutOverflow(page).catch(() => ({})),
    checkLoadingStates(page).catch(() => ({})),
    checkEmptyStates(page).catch(() => []),
    checkInformationDensity(page).catch(() => ({})),
    checkAIFirstPatterns(page).catch(() => ({})),
    checkSpacingRhythm(page).catch(() => ({})),
    checkElementOverlap(page).catch(() => []),
    checkVirtualizerHealth(page).catch(() => ({ virtualItemCount: 0, issues: [], recommendation: 'N/A' })),
  ]);

  raw.touchTargets = touchTargets;
  raw.typography = typography;
  raw.labels = labels;
  raw.focusIndicators = focusIndicators;
  raw.layoutOverflow = layoutOverflow;
  raw.loadingStates = loadingStates;
  raw.emptyStates = emptyStates;
  raw.density = density;
  raw.aiPatterns = aiPatterns;
  raw.spacing = spacing;
  raw.elementOverlap = elementOverlap;
  raw.virtualizerHealth = virtualizerHealth;

  // ---- Generate findings from raw data ----

  // Touch targets (Fitts's Law / H6)
  if (touchTargets.length >= 3) {
    findings.push({
      severity: 'minor',
      category: 'ux_touch_target',
      title: `${touchTargets.length} interactive elements below minimum size in ${viewName}`,
      description: `${touchTargets.length} buttons/links are smaller than the ${mobileMode ? '44px (mobile)' : '24px (desktop)'} minimum touch target size, violating Fitts's Law.`,
      expected: `All interactive elements ≥ ${mobileMode ? '44x44px' : '24x24px'}`,
      actual: `Found ${touchTargets.length} elements: ${touchTargets.slice(0, 3).map(t => `${t.text || t.selector}(${t.width}x${t.height}px)`).join(', ')}`,
      trigger: `UX Audit — Touch Target Check on ${viewName}`,
      heuristic: 'Fitts\'s Law: Target size must be proportional to usage frequency',
      uxContext: viewName,
      uxScore: touchTargets.length > 5 ? 2 : 3,
      screenshot: screenshotPath,
      suggestedFix: `Increase minimum size to ${mobileMode ? '44x44px' : '24x24px'} using padding. In Tailwind: add 'min-h-[44px] min-w-[44px]' or 'p-3' to small buttons.`,
    });
  } else if (touchTargets.length > 0) {
    findings.push({
      severity: 'cosmetic',
      category: 'ux_touch_target',
      title: `${touchTargets.length} interactive element(s) slightly below optimal size in ${viewName}`,
      description: `A few interactive elements are below recommended size.`,
      expected: 'All interactive elements at optimal touch target size',
      actual: touchTargets.map(t => `${t.text || t.selector}(${t.width}x${t.height}px)`).join(', '),
      trigger: `UX Audit — Touch Target Check on ${viewName}`,
      heuristic: 'Fitts\'s Law',
      uxContext: viewName,
      uxScore: 4,
      screenshot: screenshotPath,
    });
  }

  // Typography
  if (typography.length > 0) {
    findings.push({
      severity: 'minor',
      category: 'ux_typography',
      title: `Text below 12px minimum size in ${viewName}`,
      description: `${typography.length} element(s) have font sizes below 12px, harming readability.`,
      expected: 'All text ≥ 12px (ideally ≥ 14px for body content)',
      actual: typography.map(t => `"${t.text.slice(0, 20)}" = ${t.fontSize}px`).join('; '),
      trigger: `UX Audit — Typography Check on ${viewName}`,
      heuristic: 'H8: Aesthetic & Minimalist Design / Cognitive Load',
      uxContext: viewName,
      uxScore: 3,
      screenshot: screenshotPath,
      suggestedFix: 'Set minimum font size to 12px in global CSS. Use text-xs (12px) as minimum in Tailwind.',
    });
  }

  // Missing labels
  if (labels.length > 0) {
    const iconOnlyButtons = labels.filter(l => l.type === 'button_no_label');
    const unlabeledInputs = labels.filter(l => l.type !== 'button_no_label');

    if (iconOnlyButtons.length > 0) {
      findings.push({
        severity: 'major',
        category: 'ux_interaction',
        title: `${iconOnlyButtons.length} icon-only button(s) without accessible label in ${viewName}`,
        description: `Icon-only buttons force users to remember what each icon means (recall > recognition), violating H6.`,
        expected: 'All buttons have accessible name via text, aria-label, or title attribute',
        actual: `${iconOnlyButtons.length} unlabeled buttons: ${iconOnlyButtons.map(b => b.className).join(', ')}`,
        trigger: `UX Audit — Label Check on ${viewName}`,
        heuristic: 'H6: Recognition over Recall — users should not have to remember icon meanings',
        uxContext: viewName,
        uxScore: 2,
        screenshot: screenshotPath,
        suggestedFix: 'Add aria-label or title attribute to icon-only buttons. Add tooltips on hover. Consider pairing icon with text for critical actions.',
      });
    }

    if (unlabeledInputs.length > 0) {
      findings.push({
        severity: 'major',
        category: 'accessibility',
        title: `${unlabeledInputs.length} input(s) without label in ${viewName}`,
        description: 'Form inputs without labels fail accessibility requirements and confuse screen readers.',
        expected: 'All inputs have associated label elements or aria-label attributes',
        actual: `${unlabeledInputs.length} unlabeled inputs found`,
        trigger: `UX Audit — Label Check on ${viewName}`,
        heuristic: 'H6: Recognition over Recall / WCAG 2.1 SC 1.3.1',
        uxContext: viewName,
        uxScore: 2,
        screenshot: screenshotPath,
        suggestedFix: 'Add <label for="id"> or aria-label attribute to each input element.',
      });
    }
  }

  // Focus indicators
  if (focusIndicators.concern) {
    findings.push({
      severity: 'major',
      category: 'accessibility',
      title: `Keyboard focus indicators removed in ${viewName}`,
      description: focusIndicators.concern,
      expected: 'Focused elements should have clearly visible focus ring (WCAG 2.1 SC 2.4.7)',
      actual: 'focus: { outline: none } applied without replacement focus style',
      trigger: `UX Audit — Focus Indicator Check on ${viewName}`,
      heuristic: 'H3: User Control & Freedom / WCAG 2.1 SC 2.4.7',
      uxContext: viewName,
      uxScore: 2,
      screenshot: screenshotPath,
      suggestedFix: 'Replace outline:none with custom focus ring using box-shadow or ring utility. In Tailwind: use focus:ring-2 focus:ring-blue-500.',
    });
  }

  // Layout overflow
  if (layoutOverflow.horizontalOverflow) {
    findings.push({
      severity: 'major',
      category: 'ux_layout',
      title: `Horizontal scroll detected in ${viewName}`,
      description: `Content exceeds viewport width (${layoutOverflow.documentWidth}px > ${layoutOverflow.viewportWidth}px). This forces unwanted scrolling and breaks the layout.`,
      expected: 'All content fits within viewport width without horizontal scroll',
      actual: `Document width: ${layoutOverflow.documentWidth}px, Viewport: ${layoutOverflow.viewportWidth}px`,
      trigger: `UX Audit — Layout Overflow Check on ${viewName}`,
      heuristic: 'H8: Aesthetic & Minimalist Design / Layout integrity',
      uxContext: viewName,
      uxScore: 2,
      screenshot: screenshotPath,
      suggestedFix: 'Add overflow-x: hidden to main container. Check for fixed-width elements. Use max-w-full or w-full in Tailwind.',
    });
  }

  // Information density
  if (density.density === 'very_high') {
    findings.push({
      severity: 'minor',
      category: 'ux_cognitive_load',
      title: `Very high DOM density (${density.domNodes} nodes) in ${viewName}`,
      description: density.warning || 'High DOM node count suggests potential information overload or missing virtualization.',
      expected: 'DOM node count < 3000 for typical views',
      actual: `${density.domNodes} DOM nodes, ${density.interactiveElements} interactive elements`,
      trigger: `UX Audit — Information Density Check on ${viewName}`,
      heuristic: "Miller's Law: 7±2 items in working memory / H8: Aesthetic & Minimalist",
      uxContext: viewName,
      uxScore: 3,
      screenshot: screenshotPath,
      suggestedFix: 'Implement virtual scrolling for long lists (e.g. @tanstack/virtual). Progressive disclosure for complex data.',
    });
  }

  // AI-First patterns
  const aiScore = [
    aiPatterns.hasAgentStatus,
    aiPatterns.hasAIInvocation,
    aiPatterns.hasCancelControls,
    aiPatterns.hasFeedback,
  ].filter(Boolean).length;

  if (aiScore === 0) {
    findings.push({
      severity: 'major',
      category: 'ux_ai_clarity',
      title: `No AI status or control patterns detected in ${viewName}`,
      description: 'This view appears to lack AI-First UX patterns: no agent status indicators, no AI invocation controls, no cancel/stop controls, no feedback mechanisms.',
      expected: 'AI-First system should clearly show agent status and provide easy AI controls',
      actual: 'No AI-specific UX elements detected (no status, invocation, cancel, or feedback UI)',
      trigger: `UX Audit — AI-First Pattern Check on ${viewName}`,
      heuristic: 'MS G1: Make clear what AI can do / G2: Make clear how well AI performs / G7: Support efficient AI invocation',
      uxContext: viewName,
      uxScore: 2,
      screenshot: screenshotPath,
      suggestedFix: 'Add agent status badge (running/idle/error), AI invocation button with keyboard shortcut, stop/cancel button during AI execution, and thumbs-up/down feedback for AI output.',
    });
  } else if (aiScore < 3) {
    const missing = [];
    if (!aiPatterns.hasAgentStatus) missing.push('agent status indicators');
    if (!aiPatterns.hasAIInvocation) missing.push('AI invocation controls');
    if (!aiPatterns.hasCancelControls) missing.push('cancel/stop controls');
    if (!aiPatterns.hasFeedback) missing.push('feedback mechanisms');

    findings.push({
      severity: 'minor',
      category: 'ux_ai_feedback',
      title: `Incomplete AI-First UX patterns in ${viewName}`,
      description: `${viewName} is missing some AI-First UX signals.`,
      expected: 'Complete AI-First UX: status + invocation + cancel + feedback',
      actual: `Missing: ${missing.join(', ')}`,
      trigger: `UX Audit — AI-First Pattern Check on ${viewName}`,
      heuristic: 'MS Guidelines G1, G7, G8, G15: AI visibility and control',
      uxContext: viewName,
      uxScore: 3,
      screenshot: screenshotPath,
      suggestedFix: `Add missing AI-First elements: ${missing.join(', ')}.`,
    });
  }

  // Empty states
  if (emptyStates.length > 0) {
    findings.push({
      severity: 'cosmetic',
      category: 'ux_empty_state',
      title: `${emptyStates.length} list(s) with no empty state in ${viewName}`,
      description: 'Lists/tables with no items should show helpful empty state messages to guide users.',
      expected: 'Empty lists show illustrative empty state with message and call-to-action',
      actual: `${emptyStates.length} empty container(s) with no helpful content`,
      trigger: `UX Audit — Empty State Check on ${viewName}`,
      heuristic: 'H10: Help & Documentation / H8: Aesthetic Design',
      uxContext: viewName,
      uxScore: 4,
      screenshot: screenshotPath,
      suggestedFix: 'Add empty state component with icon, message, and primary action button (e.g. "No tasks yet — Create your first task →").',
    });
  }

  // Spacing rhythm
  if (spacing.spacingConsistency === 'inconsistent') {
    findings.push({
      severity: 'cosmetic',
      category: 'ux_spacing',
      title: `Inconsistent spacing rhythm in ${viewName}`,
      description: `Spacing values don't follow a consistent scale (${spacing.base4Ratio}% are 4px multiples, ${spacing.base8Ratio}% are 8px multiples). Inconsistent spacing creates visual noise.`,
      expected: 'Spacing follows a consistent 4px or 8px grid system (≥70% of values)',
      actual: `Unique spacing values: ${(spacing.uniqueSpacingValues || []).slice(0, 10).join(', ')}px`,
      trigger: `UX Audit — Spacing Rhythm Check on ${viewName}`,
      heuristic: 'H4: Consistency & Standards / Aesthetic-Usability Effect',
      uxContext: viewName,
      uxScore: 4,
      screenshot: screenshotPath,
      suggestedFix: 'Use only Tailwind spacing scale values (multiples of 4px). Audit custom CSS for arbitrary spacing values.',
    });
  }

  // Element overlap (sibling absolute elements + virtualizer content overflow)
  if (elementOverlap.length > 0) {
    const worstOverlap = Math.max(...elementOverlap.map(o => o.overlapPx || 0));
    const severity = worstOverlap >= 10 ? 'major' : 'minor';
    findings.push({
      severity,
      category: 'ux_layout',
      title: `${elementOverlap.length} element overlap(s) detected in ${viewName}`,
      description:
        `${elementOverlap.length} element(s) visually overlap their neighbors. ` +
        `Most common cause: a virtualizer using a fixed slot height that is smaller than the ` +
        `actual rendered card content, causing each item's text/badges to bleed into the next row.`,
      expected: 'No elements overlap — every item occupies its own visual space',
      actual: elementOverlap
        .slice(0, 3)
        .map(o => `[${o.cause}] +${o.overlapPx}px${o.index != null ? ` (item #${o.index})` : ''}`)
        .join('; '),
      trigger: `UX Audit — Element Overlap Check on ${viewName}`,
      heuristic: 'H8: Aesthetic & Minimalist Design — layout integrity',
      uxContext: viewName,
      uxScore: severity === 'major' ? 1 : 2,
      screenshot: screenshotPath,
      suggestedFix:
        elementOverlap.some(o => o.cause && o.cause.includes('Virtualizer'))
          ? 'Virtualizer fix: (1) add `measureElement: el => el.getBoundingClientRect().height` to createVirtualizer, ' +
            '(2) add `ref={el => queueMicrotask(() => virtualizer.measureElement(el))}` on the item div, ' +
            '(3) remove the fixed `height` from the absolute item container. ' +
            'Quick workaround: add overflow-hidden to the item container to clip the overflow.'
          : elementOverlap[0]?.fix || 'Review z-index and absolute positioning on overlapping siblings.',
      artifacts: [],
    });
  }

  // Virtualizer health (surfaced separately so the specific cause is always reported)
  if (virtualizerHealth.issues && virtualizerHealth.issues.length > 0) {
    // Only add if not already covered by elementOverlap (avoid duplicate findings)
    const alreadyCovered = elementOverlap.some(o => o.cause && o.cause.includes('Virtualizer'));
    if (!alreadyCovered) {
      findings.push({
        severity: 'major',
        category: 'ux_layout',
        title: `Virtualizer misconfiguration: ${virtualizerHealth.issues.length} item(s) overflow their slot in ${viewName}`,
        description:
          `${virtualizerHealth.issues.length} virtual list item(s) have content taller than the fixed ` +
          `slot height. The items are not yet visible in the viewport but will overlap when scrolled into view.`,
        expected: 'All virtual items use dynamic height measurement (measureElement)',
        actual: virtualizerHealth.issues
          .slice(0, 3)
          .map(i => `item #${i.index}: slot=${i.slotHeight}px content=${i.contentHeight}px (+${i.overflowPx}px)`)
          .join('; '),
        trigger: `UX Audit — Virtualizer Health Check on ${viewName}`,
        heuristic: 'H8: Aesthetic & Minimalist Design — layout integrity',
        uxContext: viewName,
        uxScore: 1,
        screenshot: screenshotPath,
        suggestedFix: virtualizerHealth.issues[0]?.fix ||
          'Add measureElement to the virtualizer and remove fixed height from item containers.',
        artifacts: [],
      });
    }
  }

  // ---- Compute UX Score for this view ----
  const uxScores = findings
    .filter(f => f.uxScore != null && f.uxContext === viewName)
    .map(f => f.uxScore);

  const avgScore = uxScores.length > 0
    ? Math.round((uxScores.reduce((a, b) => a + b, 0) / uxScores.length) * 10) / 10
    : 5.0;

  const aiFirstScore = aiScore >= 3 ? 4.5
    : aiScore >= 2 ? 3.5
    : aiScore >= 1 ? 2.5
    : 1.5;

  const assessment = {
    views: [{
      name: viewName,
      heuristics: avgScore,
      lawsOfUX: avgScore,
      aiFirst: aiFirstScore,
      overall: Math.round(((avgScore + avgScore + aiFirstScore) / 3) * 10) / 10,
    }],
    overall: {
      heuristics: avgScore,
      lawsOfUX: avgScore,
      aiFirst: aiFirstScore,
      score: Math.round(((avgScore + avgScore + aiFirstScore) / 3) * 10) / 10,
    },
    highlights: findings.length === 0 ? ['All automated UX checks passed'] : [],
    topImprovements: findings
      .filter(f => f.severity === 'major' || f.severity === 'blocker')
      .slice(0, 5)
      .map(f => `[${f.category}] ${f.title}`),
  };

  return { findings, assessment, raw };
}

// ============================================================================
// VISUAL UX EVALUATION GUIDE
// (For AI agents to use when evaluating screenshots)
// ============================================================================

/**
 * Returns a structured prompt template for AI visual UX evaluation.
 * Use this when you have a screenshot and want the AI to assess it qualitatively.
 *
 * @param {string} viewName - Name of the view
 * @param {string} systemContext - e.g. "AI-First meta-IDE for orchestrating coding agents"
 * @returns {string} Evaluation prompt
 */
function getVisualEvaluationPrompt(viewName, systemContext = 'AI-First web application') {
  return `
You are a senior UX designer conducting a heuristic evaluation of a ${systemContext}.
Evaluate the "${viewName}" view screenshot using this framework:

## EVALUATE THESE DIMENSIONS (rate each 1-5, where 1=failing, 5=excellent)

### Visual Hierarchy
- Are the most important elements visually dominant?
- Is there a clear F-pattern or Z-pattern reading flow?
- Do headers, subheaders, and body text form a clear typographic scale?

### Information Architecture  
- Is related content grouped together (Law of Proximity)?
- Is the navigation structure clear and predictable (Jakob's Law)?
- Is information chunked appropriately (Miller's Law: 7±2 items per group)?

### Interaction Design
- Are interactive elements visually distinct from non-interactive ones?
- Is the primary action clearly the most prominent?
- Are destructive actions visually differentiated from safe actions?

### Aesthetic Quality
- Is the design clean without visual noise (H8: Aesthetic & Minimalist)?
- Is whitespace used effectively to create breathing room?
- Is the color palette purposeful and limited?

### AI-First Specific
- Is the AI agent status visible? (running/idle/error)
- Can users easily invoke and stop AI actions?
- Is AI output clearly distinguished from user content?
- Are AI limitations or confidence signals communicated?

## OUTPUT FORMAT

For each issue found, specify:
- **Severity**: blocker/major/minor/cosmetic
- **Category**: ux_layout/ux_hierarchy/ux_ai_clarity/ux_interaction/ux_typography/ux_spacing/ux_feedback
- **Heuristic**: Which Nielsen heuristic or Law of UX is violated
- **Issue**: What is wrong
- **Expected**: What it should look like
- **Suggestion**: Specific, actionable design recommendation

Also provide an overall UX Score (1-5) and 3 top improvement suggestions prioritized by impact.
`.trim();
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Automated checks (run via Playwright)
  checkTouchTargets,
  checkTypography,
  checkLabels,
  checkFocusIndicators,
  checkLayoutOverflow,
  checkLoadingStates,
  checkEmptyStates,
  checkInformationDensity,
  checkAIFirstPatterns,
  checkSpacingRhythm,
  checkElementOverlap,       // ← NEW: sibling absolute-element overlap detection
  checkVirtualizerHealth,    // ← NEW: @tanstack/virtual slot vs content height check

  // Full audit runner
  runFullAudit,

  // Visual evaluation helper
  getVisualEvaluationPrompt,

  // Reference data
  NIELSEN_HEURISTICS,
  AI_GUIDELINES,
};
