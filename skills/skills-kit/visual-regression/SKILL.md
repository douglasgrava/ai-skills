---
name: visual-regression
description: Pixel-level visual regression testing. Captures screenshots and compares with approved baselines to detect unintended visual changes after CSS, layout, or component modifications. Supports full-page and element-level comparison with AI analysis of detected differences.
argument-hint: "[view-name | --update | --list | --all]"
---

# Visual Regression Testing

Detects visual regressions by comparing current screenshots pixel-by-pixel against approved baselines. Uses `pixelmatch` for fast, precise diff computation. When differences are found, Claude reads the diff images and provides semantic analysis of what changed and whether it's a regression or intentional update.

## When to Use

- After any CSS, styling config, or theme change
- Before merging PRs that touch UI components
- After dependency updates (framework, CSS library, etc.)
- To validate a redesigned view matches intent
- As periodic design drift monitoring

## Prerequisites

Install pixel diff libraries in playwright-skill:

```bash
cd $PLAYWRIGHT_SKILL_DIR && npm install pixelmatch pngjs
```

The lib gracefully falls back to byte-level comparison if not installed, but pixelmatch gives accurate per-pixel results.

## Configuration

This skill reads views and settings from `project-context.json` in the skills root directory. Example:

```json
{
  "name": "My Project",
  "baseUrl": "http://localhost:3000",
  "settleDelay": 800,
  "views": [
    { "name": "Dashboard", "navigate": { "shortcut": "Meta+1" }, "waitAfter": 600 },
    { "name": "Settings", "navigate": { "url": "/settings" }, "waitAfter": 600 }
  ]
}
```

## File Locations

- **Baselines**: `.testing/baselines/<name>.png`
- **Current shots**: `.testing/diffs/<name>-current.png`
- **Diff images**: `.testing/diffs/<name>-diff.png`
- **Reports**: `/tmp/vr-report.md`

## Threshold Guide

| Threshold | Use Case |
|-----------|----------|
| `0` | Zero-tolerance (pixel-perfect requirement) |
| `0.5` | Standard (recommended — tolerates anti-aliasing) |
| `1.0` | Lenient (allows font rendering variation) |
| `2.0` | Dynamic content (avoid on text-heavy views) |

---

## Workflow

### Phase 1 — Create Baselines (First Run or After Approved Design Change)

Write to `/tmp/vr-baselines.js`:

```javascript
const { chromium } = require('playwright');
const vr = require('./lib/visual-regression');
const fs = require('fs');
const path = require('path');

// Load project context
const ctxPath = path.resolve(__dirname, '../project-context.json');
const ctx = JSON.parse(fs.readFileSync(ctxPath, 'utf8'));
const TARGET_URL = ctx.baseUrl;

// Build navigation functions from context
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
  name: v.name.toLowerCase().replace(/\s+/g, '-'),
  navigate: buildNavigator(v),
}));

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(TARGET_URL, { waitUntil: 'networkidle' });

  console.log('Creating baselines...\n');

  for (const view of VIEWS) {
    await view.navigate(page);
    await page.waitForTimeout(300); // settle
    const result = await vr.saveBaseline(page, view.name);
    console.log(`  ${view.name}: ${result.path}`);
  }

  await browser.close();
  console.log('\nAll baselines created in .testing/baselines/');
  console.log('Commit this directory to lock in the approved visual state.');
})();
```

Execute:
```bash
cd $PLAYWRIGHT_SKILL_DIR && node run.js /tmp/vr-baselines.js
```

---

### Phase 2 — Compare After Code Changes

Write to `/tmp/vr-compare.js`:

```javascript
const { chromium } = require('playwright');
const vr = require('./lib/visual-regression');
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
  name: v.name.toLowerCase().replace(/\s+/g, '-'),
  navigate: buildNavigator(v),
}));

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(TARGET_URL, { waitUntil: 'networkidle' });

  const results = await vr.runRegressionSuite(page, VIEWS, {
    threshold: 0.5,  // 0.5% diff tolerance
    fullPage: false,
    settleDelay: ctx.settleDelay || 400,
  });

  await browser.close();

  const report = vr.generateReport(results, { title: ctx.reportTitle || ctx.name });
  fs.writeFileSync('/tmp/vr-report.md', report);

  console.log('\n' + report);

  const failures = results.filter(r => !r.pass && !r.firstRun);
  if (failures.length > 0) {
    console.log('\n  REGRESSIONS DETECTED:');
    failures.forEach(f => {
      console.log(`  ${f.view}: ${f.diffPercent}% pixels changed`);
      if (f.currentPath)  console.log(`    Current:  ${f.currentPath}`);
      if (f.diffPath)     console.log(`    Diff:     ${f.diffPath}`);
      if (f.baselinePath) console.log(`    Baseline: ${f.baselinePath}`);
    });
    process.exit(1);
  }

  console.log('All views pass visual regression.');
})();
```

Execute:
```bash
cd $PLAYWRIGHT_SKILL_DIR && node run.js /tmp/vr-compare.js
```

---

### Phase 3 — Analyze Failures (Claude Vision Protocol)

When the comparison script reports failures, Claude should:

**Step 1: Read the images** (Read tool supports PNG/image files)
```
Read: .testing/diffs/<name>-diff.png
Read: .testing/diffs/<name>-current.png
Read: .testing/baselines/<name>.png
```

**Step 2: Classify the difference**
- **Intentional change** (new feature, approved redesign) -> update baseline
- **Regression** (CSS leak, component breakage, z-index war) -> investigate and fix
- **Noise** (anti-aliasing, font rendering) -> increase threshold

**Step 3: If regression found**
- Identify which component/file caused the change
- Cross-reference with recent git changes (`git diff HEAD~1 -- src/`)
- Fix the regression
- Re-run comparison to verify fix

**Step 4: If intentional change**
- Delete the old baseline and let it auto-recreate:
```bash
cd $PLAYWRIGHT_SKILL_DIR && node -e "
const vr = require('./lib/visual-regression');
vr.deleteBaseline('dashboard');
console.log('Baseline deleted — re-run comparison to create new baseline');
"
```

---

## Responsive Testing (Multiple Viewports)

```javascript
const VIEWPORTS = [
  { name: 'desktop',  width: 1440, height: 900 },
  { name: 'laptop',   width: 1280, height: 768 },
  { name: 'tablet',   width: 1024, height: 768 },
];

for (const vp of VIEWPORTS) {
  await page.setViewportSize({ width: vp.width, height: vp.height });
  await vr.saveBaseline(page, `dashboard-${vp.name}`);
}
```

## List Existing Baselines

```bash
cd $PLAYWRIGHT_SKILL_DIR && node -e "
const vr = require('./lib/visual-regression');
const baselines = vr.listBaselines();
console.log('Existing baselines:');
baselines.forEach(b => console.log(' ', b.name, '->', b.path));
console.log('\nTotal:', baselines.length);
"
```

## Tips

- **Commit baselines to git** — this makes visual diffs visible in PRs
- **Run in CI** — `headless: true` for automated pipelines
- **Stable viewport** — always use `1440x900` for baselines to ensure consistency
- **Wait for networkidle** — dynamic content that hasn't loaded will cause false positives
- **Exclude dynamic views** — views with real-time data need a mock data layer before regression testing
- **Dark mode** — create separate baselines for dark mode: `dashboard-dark`, `backlog-dark`, etc.
