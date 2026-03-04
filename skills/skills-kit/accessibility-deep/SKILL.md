---
name: accessibility-deep
description: Deep accessibility audit combining automated axe-core analysis (WCAG 2.1 AA) with Claude Vision for contextual issues that automated tools miss. Detects contrast issues on gradients, affordance problems, missing focus indicators, form labeling, heading hierarchy, and touch target sizing. Produces actionable reports with specific WCAG references.
argument-hint: "[view-name | --all | --wcag-aaa | --mobile]"
---

# Accessibility Deep Audit

Combines **automated axe-core testing** with **Claude Vision contextual analysis** to catch the full spectrum of accessibility issues — both what code can detect and what only visual understanding can find.

## Why Both Layers Are Needed

Automated tools (axe-core) detect ~30% of real accessibility issues. The remaining ~70% require contextual judgment:

| Issue | axe-core | Claude Vision |
|-------|----------|---------------|
| Missing alt text | yes | yes |
| WCAG contrast ratio | yes | yes + context |
| Text over gradient with poor contrast | no | yes |
| Button that LOOKS disabled but isn't semantically | no | yes |
| Touch target with correct padding in DOM but feels tiny | no | yes |
| Error state communicated only by red color (no icon/text) | no | yes |
| Placeholder used as label (disappears on focus) | yes | yes |
| Icons without accessible names | yes | yes + examples |
| Focus trap without escape mechanism | no | yes |
| Heading hierarchy correct in DOM but wrong visually | no | yes |
| Form fields not visually connected to their error message | no | yes |
| Missing skip navigation link | yes | yes |

## WCAG Coverage

| Level | Coverage |
|-------|----------|
| WCAG 2.1 A | Automated (axe-core) |
| WCAG 2.1 AA | Automated + Claude Vision |
| WCAG 2.1 AAA | Partial (run with `--wcag-aaa` flag) |
| Cognitive | Claude Vision analysis |

## Configuration

This skill reads views and settings from `project-context.json` in the skills root directory:

```json
{
  "baseUrl": "http://localhost:3000",
  "settleDelay": 800,
  "views": [
    { "name": "Dashboard", "navigate": { "shortcut": "Meta+1" }, "waitAfter": 600 },
    { "name": "Settings", "navigate": { "url": "/settings" }, "waitAfter": 600 }
  ]
}
```

---

## Workflow

### Option A — Quick Audit (Chrome DevTools MCP, Current View)

For an immediate audit of what's currently in the browser:

**Step 1: Inject and run axe-core**
```javascript
// via evaluate_script in Chrome DevTools MCP
await page.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.8.3/axe.min.js' });
const results = await page.evaluate(() => window.axe.run(document, {
  runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] }
}));
console.log(JSON.stringify(results.violations, null, 2));
```

**Step 2: Take screenshot for visual analysis**
```
take_screenshot(fullPage: true)
```

**Step 3: Combine findings** using the Visual A11y Analysis Protocol below.

---

### Option B — Full Automated Audit (All Views)

Write to `/tmp/a11y-audit.js`:

```javascript
const { chromium } = require('playwright');
const a11y = require('./lib/accessibility-deep');
const fs = require('fs');
const path = require('path');

// Load project context
const ctxPath = path.resolve(__dirname, '../project-context.json');
const ctx = JSON.parse(fs.readFileSync(ctxPath, 'utf8'));
const TARGET_URL = ctx.baseUrl;

function buildNavigator(view) {
  return async (page) => {
    if (view.navigate.shortcut) {
      await page.keyboard.press(view.navigate.shortcut);
    } else if (view.navigate.url) {
      await page.goto(`${TARGET_URL}${view.navigate.url}`, { waitUntil: 'networkidle' });
    }
    await page.waitForTimeout(view.waitAfter || ctx.settleDelay || 600);
  };
}

const VIEWS = ctx.views.map(v => ({
  name: v.name,
  navigate: buildNavigator(v),
}));

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(TARGET_URL, { waitUntil: 'networkidle' });

  const allResults = [];

  for (const view of VIEWS) {
    await view.navigate(page);
    await page.waitForTimeout(300);

    const result = await a11y.runFullAudit(page, {
      viewName: view.name,
      fullPage: false,
      minTouchTarget: 24,
    });

    allResults.push(result);

    // Print automated findings
    console.log(`\n== ${view.name} ==`);
    console.log(`Axe violations:    ${result.summary.axeViolations} (${result.summary.axeCritical} critical, ${result.summary.axeSerious} serious)`);
    console.log(`Touch targets:     ${result.summary.touchTargetIssues} elements below 24px`);
    console.log(`Focus indicators:  ${result.summary.focusIssues} elements without visible focus`);
    console.log(`Image alt text:    ${result.summary.imageIssues} images missing alt`);
    console.log(`Form labels:       ${result.summary.formIssues} inputs without labels`);
    console.log(`Heading issues:    ${result.summary.headingIssues}`);

    if (result.raw.axeViolations.length > 0) {
      console.log('\nAxe violations:');
      result.raw.axeViolations.forEach(v => {
        console.log(`  [${v.impact}] ${v.id}: ${v.description}`);
        if (v.helpUrl) console.log(`    -> ${v.helpUrl}`);
      });
    }

    // Print screenshot for Claude Vision
    console.log(`\nSCREENSHOT_BASE64_START:${result.screenshotBase64}:SCREENSHOT_BASE64_END`);
  }

  // Generate and save report
  const report = a11y.generateReport(allResults);
  fs.writeFileSync('/tmp/a11y-report.md', report);
  fs.mkdirSync('.planning', { recursive: true });
  fs.writeFileSync('.planning/accessibility-report.md', report);

  console.log('\n\n== ACCESSIBILITY REPORT ==');
  console.log(report);
  console.log('\nReport saved to: .planning/accessibility-report.md');

  await browser.close();
})();
```

Execute:
```bash
cd $PLAYWRIGHT_SKILL_DIR && node run.js /tmp/a11y-audit.js
```

---

### Mobile / Touch Audit

```javascript
// Test with mobile viewport and touch simulation
const page = await browser.newPage();
await page.setViewportSize({ width: 390, height: 844 }); // iPhone 14
await page.emulateMedia({ media: 'screen' });

const result = await a11y.runFullAudit(page, {
  viewName: 'Dashboard-Mobile',
  minTouchTarget: 44, // WCAG 2.5.5 — 44x44px for mobile
});
```

---

## Claude Vision A11y Analysis Protocol

For each screenshot, visually analyze these dimensions:

### 1. Contrast Analysis

- Is all body text clearly readable? (Look for gray text on white/light backgrounds)
- Is there any text overlaid on images or gradients that might have insufficient contrast?
- Are icon colors distinct from their backgrounds?
- Does dark mode maintain readable contrast, or does it create new contrast problems?
- Are placeholder texts too light? (Placeholders should be >= 3:1, text >= 4.5:1)

**Report if:** Any text appears difficult to read at normal viewing distance.

### 2. Interactive Element Affordances

- Do buttons LOOK like buttons? (distinct visual treatment vs body text)
- Are links distinguishable from surrounding text? (underline, color, or both)
- Do disabled states look clearly inactive? (not just lighter — should communicate "unavailable")
- Are there elements that LOOK interactive but might not be?
- Do icon-only buttons have tooltips or labels?

**Report if:** Any interactive element requires guessing whether it's clickable.

### 3. Color-Only Information

- Is error state shown ONLY through red color? (needs icon + text too)
- Are status badges relying solely on color? (green=running, red=failed needs text label)
- Is any critical information conveyed only through color change?

**Report if:** Removing color from the screenshot would make any status/state ambiguous.

### 4. Spatial Accessibility

- Is spacing between interactive elements adequate? (avoid accidental activation)
- Are any elements visually close enough to cause touch confusion?
- Does the natural reading order match the visual layout?

**Report if:** Two interactive elements are so close a user could easily hit the wrong one.

### 5. Error & Feedback Clarity

- Are error messages visually connected to their field? (not just a generic error at top)
- Is validation feedback immediately visible after the error?
- Is loading/processing state communicated beyond just "spinning"?

**Report if:** Error states are ambiguous or disconnected from their source.

---

## Output Format

```markdown
## [View Name] — Accessibility Audit

**WCAG AA Status:** PASS / Issues Found / Critical Violations
**Total Issues:** X critical, Y serious, Z moderate

### Automated Findings (axe-core)
| Severity | Rule | Description | Elements |
|----------|------|-------------|---------|
| critical | [id] | [description] | N |
| serious | [id] | [description] | N |

### Visual Findings (Claude Analysis)
| Severity | Category | Issue | Recommendation |
|----------|---------|-------|----------------|
| serious | contrast | Gray text on white sidebar (#6b7280 on #f9fafb = ~4.0:1, below 4.5:1 AA) | Use #4b5563 minimum |
| moderate | affordance | Icon-only buttons — no tooltip/label | Add aria-label and title attributes |
| minor | color-only | Status dot uses only color — no text label | Add "Running"/"Idle" text beside dot |

### Priority Fixes
1. **[Most impactful fix]** — WCAG [rule] — [specific implementation]
2. **[Second]** — ...

### WCAG Quick Fixes (copy-paste ready)
```html
<!-- Fix: Icon buttons without accessible name -->
<button aria-label="Settings" title="Settings">
  <Icon name="gear" />
</button>

<!-- Fix: Status indicator without text -->
<span class="status-dot running" aria-label="Running"></span>
<span class="sr-only">Running</span>
```
```

---

## Severity Guide

| Severity | WCAG Level | Impact | Definition |
|----------|-----------|--------|------------|
| `critical` | A violation | Blocks assistive tech completely | Missing form labels, keyboard traps |
| `serious` | AA violation | Significant barrier to access | Contrast <4.5:1, missing alt text |
| `moderate` | Best practice | Usable but degraded | Missing skip link, inconsistent focus |
| `minor` | Enhancement | Slight friction | Heading order, landmark regions |

## WCAG 2.1 AA Quick Reference

| Rule | Requirement | Common Fail |
|------|------------|-------------|
| 1.1.1 | All images need alt text | `<img>` without alt |
| 1.4.3 | 4.5:1 contrast for body, 3:1 for large text | Light gray on white |
| 1.4.11 | 3:1 for UI components | Light icon on light bg |
| 2.1.1 | All functionality via keyboard | Mouse-only interactions |
| 2.4.3 | Logical tab order | Tabs jump around screen |
| 2.4.7 | Visible focus indicator | No `:focus` style |
| 3.3.1 | Error identification | Error only shown by color |
| 4.1.2 | Name, role, value for UI | Icon button no label |
