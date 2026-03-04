---
name: ux-explorer
description: Orchestrator skill for comprehensive UX/UI exploration. Coordinates visual regression, transition analysis, AI design critique (8 dimensions), accessibility audit, chaos testing, and narrative journey validation. Produces a single consolidated report with findings prioritized by user impact. Use when you want a complete quality picture of a UI or after major features land.
argument-hint: "[--full | --quick | --design | --a11y | --transitions | --regression | --utopian]"
---

# UX Explorer — Orchestrator

Runs a complete UX/UI quality audit by coordinating all available testing skills. Produces a single consolidated report with findings prioritized by user impact.

## What It Orchestrates

```
UX Explorer
├── visual-regression    → Pixel diff against baselines (design drift)
├── transition-auditor   → Frame analysis of all animations
├── ai-design-critique   → Visual quality, typography, color, identity (8 dimensions)
├── accessibility-deep   → axe-core + Claude Vision a11y
├── e2e-uat (chaos)      → Functional resilience + UX heuristics
└── utopian-ui-audit     → Beauty, comfort, fatigue, density, red flags
```

## Configuration

This skill reads settings from `project-context.json` in the skills root directory. All sub-skills share the same context file.

## When to Use

| Mode | When | Time |
|------|------|------|
| `--full` | Before a release, after major feature | ~40-55 min |
| `--quick` | After a PR, spot check | ~10-15 min |
| `--design` | After visual/CSS changes | ~10 min |
| `--a11y` | Focused accessibility review | ~10 min |
| `--transitions` | After adding animations | ~5 min |
| `--regression` | After dependency updates | ~5 min |
| `--utopian` | Deep aesthetic + comfort audit | ~20 min |

---

## Decision Framework

When invoked without a mode flag, use this decision tree:

```
1. Did any CSS/styling/component files change?
   YES → run visual-regression first

2. Were any animations/transitions added or changed?
   YES → run transition-auditor

3. Was this a major feature or full release?
   YES → run full suite (all skills, including utopian-ui-audit)

4. Is this a periodic quality check?
   YES → run ai-design-critique + accessibility-deep + utopian-ui-audit

5. Did any form/interaction/routing change?
   YES → run e2e-uat (chaos mode)

6. Did someone ask "does this look good / feel good / is it beautiful"?
   YES → run utopian-ui-audit (--utopian mode)
```

---

## The Utopian UI Standard

**The mother rule: every screen must be beautiful, obvious, and comfortable for long periods.
If it is "merely functional", it failed. If it is "merely beautiful", it also failed.**

### Area 1: Non-Negotiables (Iron Rules)

| Rule | Test |
|------|------|
| **One dominant intention per screen** | In 2 seconds, can you name the single primary purpose? |
| **Unquestionable visual hierarchy** | In 2 seconds: what is most important -> what comes next -> what is detail |
| **Density in layers (3 layers max)** | Layer 1 = primary action. Layer 2 = minimal context. Layer 3 = detail on demand |
| **Nothing overlaid by default** | Overlays only when truly unavoidable and brief |
| **Comfort > creativity** | Innovation only where it reduces effort |

### Area 2: Composition, Grid & Rhythm

**Squint Test** — half-close your eyes:
- The screen must read as 3-5 clear visual masses (not 12)
- Structure must remain comprehensible without reading any text

**Grid & Alignment:**
- Alignments are consistent (columns, margins, baseline)
- Spacing follows a scale (4/8/12/16/24/32px — no "magic numbers")
- Auto-fail: components misaligned by 2-3px, inconsistent shadows, irregular paddings

### Area 3: Information Density

**The three questions test** — without scrolling or hunting:
1. "What is this?"
2. "What do I do now?"
3. "What changes if I do it?"

**Progressive disclosure** is mandatory:
- Details appear only when requested
- Auto-fail: infinite scroll with equivalent-weight blocks

### Area 4: Typography for Long Sessions (30-Minute Comfort)

- Maximum 2 font families (ideal: 1 with variations)
- Coherent typographic scale (predictable steps)
- Comfortable line length, adequate line spacing
- Auto-fail: wide paragraphs without max-width, 3+ competing "almost equal" sizes

### Area 5: Color, Contrast & Visual Luxury

**Grayscale Test** — hierarchy must remain perfect without color

**Disciplined palette:**
- 1 primary color (action), 1-2 support colors, well-defined neutrals
- Auto-fail: multiple elements "calling attention" simultaneously

### Area 6: Depth, Shadows & Borders

- Shadows and elevation follow **one system** (2-4 levels)
- Consistent borders/radius
- Auto-fail: UI that looks like a collage of different libraries

### Area 7: Visual States — Where Polish Becomes AAA

Every interactive component must have impeccable states:

| State | What to check |
|-------|---------------|
| **default** | Clean, unambiguous affordance |
| **hover** | Subtle but visible feedback within 100ms |
| **pressed/active** | Tactile "press" feel |
| **focus** | Clearly visible ring (WCAG 2.4.7) |
| **disabled** | Visually distinct, not just lighter opacity |
| **loading** | Does NOT shift layout |
| **error** | Does NOT break alignment; inline, near the field |
| **empty** | Purposeful — shows next action |

Auto-fail: invisible focus, loading that shifts layout, error that breaks alignment.

---

## Validation Ritual (Apply to Each View)

Run these 6 steps per view during a `--full` or `--utopian` audit:

| Step | Name | What to do |
|------|------|-----------|
| **1** | **5-Second Test** | Open view -> state purpose and next action in 5s |
| **2** | **Squint Test** | Half-close eyes -> identify 3-5 visual masses |
| **3** | **Grayscale Test** | CSS `filter: grayscale(1)` -> confirm hierarchy works |
| **4** | **30-Minute Simulation** | Navigate primary flow 3+ times. Check fatigue, irritation |
| **5** | **Zoom + Large Font** | Test at 100% / 125% / 150% zoom -> check overlap, truncation |
| **6** | **Mobile + Touch** | 375px viewport -> operate without pinching |

---

## Red Flags — Auto-Failure Conditions

Any single red flag = the screen needs correction.

| # | Red Flag | Category |
|---|----------|----------|
| 1 | **Two primary CTAs with identical visual weight** | `ux_hierarchy` |
| 2 | **Everything has border, shadow, AND color** simultaneously | `ux_visual_noise` |
| 3 | **Numeric table without right-aligned columns** | `ux_typography` |
| 4 | **Light gray text on light background** | `ux_color_contrast` |
| 5 | **Modal used as a crutch** for small interactions | `ux_interaction` |
| 6 | **Constant visual density** — everything same weight | `ux_hierarchy` |
| 7 | **Critical information hidden** OR irrelevant info prominent | `ux_information_arch` |
| 8 | **Decorative animations** on elements seen all day | `ux_motion` |
| 9 | **Error message far from the field** that caused it | `ux_error_prevention` |
| 10 | **Loading that shifts layout** | `ux_loading_state` |
| 11 | **Persistent floating UI overlaps main content at rest** | `ux_interaction` |

---

## Full Audit Workflow (`--full`)

### Step 0: Floating UI Inventory (MANDATORY)

Before taking any screenshot, enumerate all persistent floating UI elements:

```javascript
Array.from(document.querySelectorAll('*'))
  .filter(el => {
    const s = window.getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return s.position === 'fixed' && r.width > 40 && r.height > 40;
  })
  .map(el => ({
    tag: el.tagName,
    dataAttrs: Array.from(el.attributes).filter(a=>a.name.startsWith('data-')).map(a=>a.name),
    zIndex: window.getComputedStyle(el).zIndex,
    text: el.textContent.trim().slice(0, 60),
    bounds: JSON.stringify(el.getBoundingClientRect()),
  }))
```

For each floating element: Does it overlap content? Is it dismissible?

### Step 1: Verify Dev Server

```bash
cd $PLAYWRIGHT_SKILL_DIR && node -e "require('./lib/helpers').detectDevServers().then(s => console.log(JSON.stringify(s)))"
```

**Settle time:** If `floatingUI.enabled` is true in your context, always wait for
`floatingUI.settleDelay` after navigation before screenshots.

### Step 2: Run Visual Regression

Use the `visual-regression` skill scripts.

### Step 3: Run Transition Audit

Use the `transition-auditor` skill scripts.

**Utopian motion checks:**
- Are animations <= 250ms for micro-interactions, <= 400ms for page transitions?
- Are animations informative (convey state change) or purely decorative?
- Is there any animation on elements the user sees every 30 seconds? (if yes: remove it)

### Step 4: Run AI Design Critique (8 Dimensions)

Use the `ai-design-critique` skill.

### Step 4.5: Run Utopian UI Deep Audit

For each view, execute the **Validation Ritual** (6 steps) and check against **Red Flags**.

Write `/tmp/utopian-audit.js`:

```javascript
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ctxPath = path.resolve(__dirname, '../project-context.json');
const ctx = JSON.parse(fs.readFileSync(ctxPath, 'utf8'));
const TARGET_URL = ctx.baseUrl;
const SETTLE = ctx.floatingUI?.enabled ? (ctx.floatingUI.settleDelay || 4000) : (ctx.settleDelay || 800);
const OUTPUT = '/tmp/utopian-audit';
if (!fs.existsSync(OUTPUT)) fs.mkdirSync(OUTPUT, { recursive: true });

function buildNavigator(view) {
  return async (page) => {
    if (view.navigate.shortcut) await page.keyboard.press(view.navigate.shortcut);
    else if (view.navigate.url) await page.goto(`${TARGET_URL}${view.navigate.url}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(view.waitAfter || SETTLE);
  };
}

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 80 });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(TARGET_URL, { waitUntil: 'networkidle' });

  for (const view of ctx.views) {
    const nav = buildNavigator(view);
    const slug = view.name.toLowerCase().replace(/\s+/g, '-');
    await nav(page);

    // Squint Test
    await page.addStyleTag({ content: 'body { filter: blur(4px) !important; }' });
    await page.screenshot({ path: `${OUTPUT}/${slug}-squint.png` });
    await page.evaluate(() => { const tags = document.querySelectorAll('style'); tags[tags.length - 1].remove(); });

    // Grayscale Test
    await page.addStyleTag({ content: 'html { filter: grayscale(1) !important; }' });
    await page.screenshot({ path: `${OUTPUT}/${slug}-grayscale.png` });
    await page.evaluate(() => { const tags = document.querySelectorAll('style'); tags[tags.length - 1].remove(); });

    // Zoom tests
    for (const zoom of [1.0, 1.25, 1.5]) {
      await page.evaluate((z) => { document.body.style.zoom = z; }, zoom);
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${OUTPUT}/${slug}-zoom-${Math.round(zoom * 100)}.png` });
    }
    await page.evaluate(() => { document.body.style.zoom = 1; });

    // Mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    await nav(page);
    await page.screenshot({ path: `${OUTPUT}/${slug}-mobile.png`, fullPage: true });
    await page.setViewportSize({ width: 1440, height: 900 });

    // Normal screenshot
    await nav(page);
    await page.screenshot({ path: `${OUTPUT}/${slug}-normal.png` });

    console.log(`Captured: ${view.name}`);
  }

  await browser.close();
  console.log(`\nAll utopian test screenshots ready: ${OUTPUT}/`);
})();
```

Execute:
```bash
cd $PLAYWRIGHT_SKILL_DIR && node run.js /tmp/utopian-audit.js
```

### Step 5: Run Accessibility Deep Audit

Use the `accessibility-deep` skill.

### Step 6: Run Chaos + UX Heuristics (e2e-uat)

Use the `e2e-uat` skill in chaos mode.

### Step 7: Synthesize -> Consolidated Report

Save to `.planning/ux-explorer-report-YYYY-MM-DD.md`:

```markdown
# UX Explorer Report
**Date:** YYYY-MM-DD
**Mode:** full / quick / [mode]
**Duration:** ~X minutes

## Executive Summary

**Overall Quality Score:** X.X/10

### Utopian UI Score Card (0-5 per dimension x per view)

| View | Hierarchy | Density | Typography | Color | Consistency | States | Responsive | Fatigue | **Avg** |
|------|-----------|---------|------------|-------|-------------|--------|------------|---------|---------|
| Dashboard | X | X | X | X | X | X | X | X | **X.X** |
| **Overall** | | | | | | | | | **X.X** |

> 0-2 = blocked, 3 = functional, 4 = good (VS Code tier), 5 = premium (Linear tier)

### Technical Quality Scores

| Dimension | Score | Status |
|-----------|-------|--------|
| Visual Regression | X/10 | |
| Transition Quality | X/10 | |
| Design Craft (8D) | X/10 | |
| Accessibility | X/10 | |
| Functional Resilience | X/10 | |

## Red Flags Found (Auto-Failures)
[List any red flags]

## Critical Issues (Fix Before Release)
[Blocker-level findings]

## Validation Ritual Results
| View | 5-Sec | Squint | Grayscale | Zoom 125% | Zoom 150% | Mobile |
|------|-------|--------|-----------|-----------|-----------|--------|

## Detailed Findings by Skill
[Full output from each skill]
```

---

## Quick Audit (`--quick`)

1. **Visual regression** — compare 3 key views
2. **Chrome DevTools snapshot** — screenshots of changed views
3. **axe-core quick pass** — inject on current page
4. **One transition** — most recently changed animation
5. **Quick Red Flag scan** — 2-minute visual check

Time: 10-15 minutes.

---

## Scoring System

### Utopian UI Score (0-5 per dimension)

| Dimension | Score 0-2 (blocked) | Score 3 (functional) | Score 4 (professional) | Score 5 (premium) |
|-----------|---------------------|---------------------|----------------------|-------------------|
| **Hierarchy** | No clear priority | Identifiable with effort | Clear in 2s | Instantly obvious |
| **Density** | Everything visible at once | Layers exist but bleed | 3-layer discipline | Perfect disclosure |
| **Typography** | Vibrates, fatigues | Readable but arbitrary | Coherent, comfortable | Designed for 8h use |
| **Color** | Rainbow, low contrast | Consistent, some issues | WCAG AA, disciplined | Grayscale hierarchy works |
| **Consistency** | Mix of styles | Mostly consistent | Consistent system | Full design system |
| **States** | Missing 3+ states | All major present | All 8 well-executed | Polished, intentional |
| **Responsive** | Breaks at 125% | Functional at all sizes | Clean at 150% + mobile | Optimal everywhere |
| **Fatigue** | Irritating | Usable with friction | Comfortable, low load | Flow state UX |

**Rule: if any dimension scores 0-2, the screen does not ship.**

### Technical Quality Score

| Skill | Weight |
|-------|--------|
| Visual Regression | 20% |
| Transition Quality | 15% |
| Design Craft (8D) | 25% |
| Accessibility | 25% |
| Functional Resilience | 15% |

```
Technical = (VR * 0.20) + (TA * 0.15) + (DC * 0.25) + (A11y * 0.25) + (FR * 0.15)
Overall   = (Technical * 0.60) + (UtopianAvg * 2 * 0.40)
```

---

## Tips

- **Always load real data** before auditing list views
- **Run in full-page viewport first** (1440x900), then spot-check at 1280x768
- **Dark mode deserves its own audit pass**
- **Prioritize findings by user frequency**
- **Red flags are non-negotiable** — they are correctness issues, not polish
- **Squint and grayscale tests take 2 minutes** — always run them
- **Utopian score < 3 anywhere = correction required**
- **Always run Step 0 (Floating UI Inventory)**
