---
name: ai-design-critique
description: AI-powered design critique using Claude Vision. Analyzes UI screenshots against 9 design dimensions — typography, color, spacing, component consistency, visual identity, layout/composition, information density, visual states/polish, and digital art direction (composition, gestalt, motion choreography, proportional harmony). Produces scored critique reports with specific, actionable improvements. Use after major visual changes or for periodic design quality review.
argument-hint: "[view-name | --all | --full-page | --dark-mode | --utopian]"
---

# AI Design Critique

Performs professional design critique using Claude's visual analysis. This is **not** a usability test — it evaluates **visual craft, aesthetic quality, and design coherence**. Use alongside `e2e-uat` for complete quality coverage.

## How This Differs From `e2e-uat`

| `e2e-uat` | `ai-design-critique` |
|-----------|---------------------|
| Functional correctness | Visual quality & polish |
| Usability heuristics | Design craft & aesthetic |
| Interaction patterns | Typography hierarchy |
| AI-First guidelines | Color palette coherence |
| System behavior | Visual identity & brand feel |
| Chaos/resilience | 30-minute comfort & fatigue |

Run **both** for a complete picture of quality.

## The 8 Design Dimensions

Each scored **0-5** (mapped to 0-10 in consolidated reports):

| # | Dimension | Key Questions |
|---|-----------|--------------|
| 1 | **Typography** | Coherent scale (not random sizes)? Weight communicates hierarchy? Comfortable for 30 min? |
| 2 | **Color & Contrast** | Grayscale hierarchy survives? WCAG contrast? Disciplined palette? Dark mode rebalanced? |
| 3 | **Spacing & Rhythm** | 4/8px grid system? Breathing room? Progressive disclosure in layout? |
| 4 | **Component Consistency** | Same radius/shadow/icon weight? All 8 states present? No "collage of libraries"? |
| 5 | **Visual Identity** | Distinct personality? Domain-appropriate aesthetic? Intentional, not Bootstrap-default? |
| 6 | **Layout & Composition** | Squint test passes? 3-5 visual masses? One dominant intention? |
| 7 | **Information Density & Disclosure** | 3-layer discipline? Nothing overlaid by default? Anti-emptiness? Progressive disclosure? |
| 8 | **Visual States & Interaction Polish** | All 8 states impeccable? No layout-shifting loaders? Error alignment preserved? |

## Configuration

This skill reads settings from `project-context.json` in the skills root directory:

```json
{
  "name": "My Project",
  "description": "Brief product description for critique prompts",
  "baseUrl": "http://localhost:3000",
  "settleDelay": 800,
  "benchmarkProducts": ["Linear", "VS Code", "Raycast"],
  "views": [...],
  "floatingUI": {
    "enabled": false,
    "selector": null,
    "settleDelay": 0
  },
  "darkMode": {
    "enabled": true,
    "toggle": { "selector": "[data-theme-toggle]" }
  }
}
```

## Design Benchmark

The evaluation target is derived from `benchmarkProducts` in your project context. If not specified, defaults to professional web application standards:

- **Score 0-2** = Blocked — do not ship. Requires correction.
- **Score 3** = Functional, no major visual issues. Improvement needed before premium feel.
- **Score 4** = Looks like a professional product (VS Code tier).
- **Score 5** = Premium product (Linear/Raycast tier).

---

## Workflow

### Step 0: Floating UI Inventory (run before screenshots)

Before taking any screenshot, enumerate all persistent floating UI elements currently
active in the app. This step **cannot be skipped** — Portal-mounted components are
**invisible to CSS class selectors** but **visible in every screenshot** the user
sees. Missing them produces audits of a "clean" state that does not match reality.

**Run in browser console or via `evaluate_script`:**
```javascript
Array.from(document.querySelectorAll('*'))
  .filter(el => {
    const s = window.getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return s.position === 'fixed' && r.width > 40 && r.height > 40;
  })
  .map(el => ({
    tag: el.tagName,
    dataAttrs: Array.from(el.attributes).filter(a=>a.name.startsWith('data-')).map(a=>a.name).join(', '),
    text: el.textContent.trim().slice(0, 80),
    zIndex: window.getComputedStyle(el).zIndex,
    position: JSON.stringify(el.getBoundingClientRect()),
  }))
```

**For each element found, record:**
- Does it overlap any main content at rest? -> RF-11 if yes
- Is it dismissible? -> Required if visible by default
- Does it obscure interactive elements? -> Blocker severity

**Project-specific floating UI:** If `floatingUI.enabled` is true in your project context,
wait for `floatingUI.settleDelay` milliseconds before screenshotting to allow dynamic
floating elements to appear.

### Mandatory Pre-Analysis Tests (run before every critique)

Before analyzing the screenshots, you MUST run two quick structural tests:

#### Test 1: Squint Test
Apply a CSS blur to simulate the half-closed-eyes effect:
```javascript
// In the audit script — capture blurred version
await page.addStyleTag({ content: 'body { filter: blur(5px) !important; }' });
await page.screenshot({ path: `${OUTPUT}/squint.png` });
await page.evaluate(() => document.querySelectorAll('style')[document.querySelectorAll('style').length - 1].remove());
```
**Evaluate:** In the blurred image, are there 3-5 clear visual masses? Is the primary element still visually dominant? If everything blurs into uniform gray soup -> **Layout/Composition fails instantly.**

#### Test 2: Grayscale Test
```javascript
await page.addStyleTag({ content: 'html { filter: grayscale(1) !important; }' });
await page.screenshot({ path: `${OUTPUT}/grayscale.png` });
await page.evaluate(() => document.querySelectorAll('style')[document.querySelectorAll('style').length - 1].remove());
```
**Evaluate:** Is the information hierarchy preserved without color? Can you tell what is primary, secondary, and detail? If hierarchy collapses when color is removed -> **Color & Contrast fails.**

### Option A — Quick Critique (Chrome DevTools MCP, Single View)

For a quick critique of the currently visible page:

1. **Take full-page screenshot** using Chrome DevTools MCP:
   ```
   take_screenshot(fullPage: true)
   ```

2. **Apply squint test mentally** (blur vision) — identify 3-5 visual masses.

3. **Analyze using the 8-Dimension Design Critique Framework** below.

4. **Check the 7 Red Flags** (see end of this document).

5. **Save findings** to `.planning/design-critique-<view>.md`.

### Option B — Comprehensive Multi-View Critique (Automated)

Write to `/tmp/design-critique.js`:

```javascript
const { chromium } = require('playwright');
const dc = require('./lib/design-critique');
const fs = require('fs');
const path = require('path');

// Load project context
const ctxPath = path.resolve(__dirname, '../project-context.json');
const ctx = JSON.parse(fs.readFileSync(ctxPath, 'utf8'));
const TARGET_URL = ctx.baseUrl;
const SETTLE_DELAY = ctx.floatingUI?.enabled ? (ctx.floatingUI.settleDelay || 4000) : (ctx.settleDelay || 800);
const SQUINT_OUTPUT = '/tmp/design-critique-squint';
const GRAY_OUTPUT   = '/tmp/design-critique-grayscale';

if (!fs.existsSync(SQUINT_OUTPUT)) fs.mkdirSync(SQUINT_OUTPUT, { recursive: true });
if (!fs.existsSync(GRAY_OUTPUT))   fs.mkdirSync(GRAY_OUTPUT,   { recursive: true });

function buildNavigator(view) {
  return async (page) => {
    if (view.navigate.shortcut) {
      await page.keyboard.press(view.navigate.shortcut);
    } else if (view.navigate.url) {
      await page.goto(`${TARGET_URL}${view.navigate.url}`, { waitUntil: 'networkidle' });
    }
    await page.waitForTimeout(view.waitAfter || SETTLE_DELAY);
  };
}

const VIEWS = ctx.views.map(v => ({
  name: v.name,
  navigate: buildNavigator(v),
  context: v.context || '',
}));

// Add dark mode view if configured
if (ctx.darkMode?.enabled) {
  VIEWS.push({
    name: 'Dark-Mode-' + (ctx.views[0]?.name || 'Main'),
    navigate: async (page) => {
      // Navigate to first view
      if (ctx.views[0]) await buildNavigator(ctx.views[0])(page);
      // Toggle dark mode
      const toggle = ctx.darkMode.toggle;
      if (toggle.selector) {
        const btn = page.locator(toggle.selector).first();
        await btn.click().catch(async () => {
          if (toggle.fallback?.commandPalette) {
            await page.keyboard.press('Meta+k');
            await page.waitForTimeout(300);
            await page.getByPlaceholder('Search commands').fill(toggle.fallback.searchTerm || 'dark');
            await page.waitForTimeout(300);
            await page.keyboard.press('Enter');
          }
        });
      }
      await page.waitForTimeout(500);
    },
    context: 'Dark mode variant. Verify contrast is maintained, not just colors inverted. Dark mode should rebalance contrast, not just invert.',
  });
}

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(TARGET_URL, { waitUntil: 'networkidle' });

  // Collect normal screenshots
  const screenshots = await dc.collectViewScreenshots(page, VIEWS, {
    settleDelay: SETTLE_DELAY,
    fullPage: false,
  });

  // Collect squint + grayscale screenshots
  for (const view of VIEWS) {
    await view.navigate(page);
    await page.waitForTimeout(SETTLE_DELAY);

    // Squint
    await page.addStyleTag({ content: 'body { filter: blur(5px) !important; }' });
    await page.screenshot({ path: `${SQUINT_OUTPUT}/${view.name}.png` });
    await page.evaluate(() => { const s = document.querySelectorAll('style'); s[s.length-1].remove(); });

    // Grayscale
    await page.addStyleTag({ content: 'html { filter: grayscale(1) !important; }' });
    await page.screenshot({ path: `${GRAY_OUTPUT}/${view.name}.png` });
    await page.evaluate(() => { const s = document.querySelectorAll('style'); s[s.length-1].remove(); });
  }

  await browser.close();

  console.log('\n== DESIGN CRITIQUE SESSION ==');
  console.log(`Views collected: ${screenshots.length}\n`);
  console.log(`Squint screenshots: ${SQUINT_OUTPUT}/`);
  console.log(`Grayscale screenshots: ${GRAY_OUTPUT}/\n`);

  for (const s of screenshots) {
    console.log(`\n${'─'.repeat(70)}`);
    console.log(`VIEW: ${s.viewName}`);
    console.log(`File: ${s.screenshotPath}`);
    console.log(`Squint: ${SQUINT_OUTPUT}/${s.viewName}.png`);
    console.log(`Grayscale: ${GRAY_OUTPUT}/${s.viewName}.png`);
    console.log(`\nDesign Critique Prompt:\n${s.prompt}`);
    console.log(`\nSCREENSHOT_BASE64_START`);
    console.log(s.base64);
    console.log(`SCREENSHOT_BASE64_END`);
  }

  console.log('\nClaude: analyze each screenshot above using the 8-dimension framework.');
  console.log('For each view: read normal shot, squint shot, and grayscale shot together.');
})();
```

Execute:
```bash
cd $PLAYWRIGHT_SKILL_DIR && node run.js /tmp/design-critique.js
```

---

## Design Critique Analysis Framework (Claude's Instructions)

When analyzing a screenshot for design critique, evaluate each of the 8 dimensions systematically. **Always evaluate the normal, squint, and grayscale screenshots together.**

### Pre-Flight Check (Before Scoring)

Before scoring any dimension:

**Squint Check (2s):**
- Look at the blurred screenshot. Can you identify 3-5 clear visual masses?
- Is the primary element still the darkest/largest/most prominent blob?
- Result: PASS (structure clear) or FAIL (uniform soup — affects Dimension 6)

**Grayscale Check (2s):**
- Look at the grayscale screenshot. Is hierarchy maintained without color?
- Can you tell what is primary, secondary, detail?
- Result: PASS or FAIL (affects Dimension 2)

**5-Second Intention Test:**
- What is the single primary purpose of this screen?
- What is the first action the user should take?
- If you need more than 5s to answer -> FAIL (affects Dimension 6 and 7)

---

### Dimension 1: Typography — Score 0-5

Look at all text in the screenshot:

**Criteria:**

| Check | Pass | Fail |
|-------|------|------|
| Font size count | <= 5 distinct sizes | 6+ sizes -> visual chaos |
| Hierarchy levels | Clear H1->H2->body->caption | Headings same size as body |
| Body text size | >= 14px for primary content | < 12px anywhere = fail |
| Line-height | 1.4-1.6 for body, 1.1-1.2 for headings | "Piled up" text |
| 30-min comfort | Reads without effort for 30 minutes | Any "vibration" or squinting |
| Typographic scale | Predictable steps (12/14/16/20/24/32) | "Almost equal" sizes competing |
| Line length | Max 75-85 chars for long text | Full-width paragraphs on desktop |
| Letter-spacing | Only used purposefully (labels, caps) | Wide tracking on body text |
| Font weight | Bold = emphasis, not decoration | Random bold/italic |

**Score Anchors:**
- 0-1: Chaotic, multiple issues making reading genuinely uncomfortable
- 2: Major issues (too many sizes, or comfort problems)
- 3: Functional but no deliberate scale
- 4: Clear scale, comfortable for 30 min
- 5: Designed for 8h daily use — effortless

---

### Dimension 2: Color & Contrast — Score 0-5

**Grayscale test result must be referenced here.**

| Check | Pass | Fail |
|-------|------|------|
| Grayscale hierarchy | Structure survives without color | Hierarchy collapses -> 0 |
| Primary accent | One consistent primary color | 3+ different "blues" |
| Palette discipline | 1 action + 1-2 support + neutrals | Rainbow palette |
| Status colors | Consistent: error=red, success=green | Same color for multiple statuses |
| WCAG AA body | >= 4.5:1 contrast ratio | Light gray on light background |
| WCAG AA large text | >= 3:1 contrast ratio | Decorative borders > semantic text |
| Dark mode | Rebalanced contrast (not inverted) | Just CSS `invert()` |
| Dark mode grays | Sufficient distinction between tones | Everything becomes gray mud |
| Color meaning | Decorative vs communicative are distinct | Color only communicates, no labels |

**Score Anchors:**
- 0: Grayscale test fails AND low contrast
- 2: Contrast ok but palette chaotic
- 3: WCAG AA pass, inconsistent palette
- 4: WCAG AA pass, disciplined palette, dark mode works
- 5: Grayscale hierarchy perfect, dark mode = deliberate rebalancing

---

### Dimension 3: Spacing & Rhythm — Score 0-5

| Check | Pass | Fail |
|-------|------|------|
| Spacing scale | >=70% of values are 4px or 8px multiples | "Magic numbers" everywhere |
| Related elements | Grouped visually (Law of Proximity) | Random clustering |
| Breathing room | Adequate whitespace between sections | Sections collide |
| No touching | Elements don't touch when they shouldn't | Text against edge with no padding |
| Density appropriate | Appropriate density for the domain | Chaotic density without system |
| Consistent gaps | Similar elements have identical gaps | Some items cramped, others sparse |
| Content margins | Content never touches viewport edge | Zero margin layouts |

**Score Anchors:**
- 0-1: Arbitrary spacing, no system, elements touching
- 3: Mostly consistent, minor arbitrary values
- 4: 4/8px grid discipline, clean rhythm
- 5: Spacing feels deliberate and musical — effortless to scan

---

### Dimension 4: Component Consistency — Score 0-5

**State completeness check is mandatory here (all 8 states).**

| Check | Pass | Fail |
|-------|------|------|
| Border radius | All buttons same radius | Some rounded, some square |
| Shadow system | 2-4 elevation levels consistent | 17 different shadow values |
| Icon family | All same weight/stroke/style | Mixing outline and filled icons |
| Interactive affordance | Buttons look clickable | Flat divs that look like buttons |
| Hover state | Visible, consistent across all elements | Some hover, some don't |
| Focus ring | Visible, WCAG 2.4.7 compliant | `outline: none` without replacement |
| Active/pressed | Tactile "press" feel | No visual feedback on click |
| Disabled state | Visually distinct, not just lighter opacity | Disabled = normal but gray |
| Loading state | In-place, no layout shift | Spinner that pushes content |
| Error state | Inline, near the field, no alignment break | Error far from its input |
| Empty state | Purposeful — direction + action | Empty list with nothing |
| UI library coherence | Looks like one coherent system | Collage of multiple libraries |

**Score Anchors:**
- 0-1: Missing 3+ states, inconsistent radius/shadow
- 2: Major states missing (focus, error, loading)
- 3: All states present, some rough
- 4: All 8 states, well-executed
- 5: States feel polished and inevitable — "of course it looks like that"

---

### Dimension 5: Visual Identity — Score 0-5

| Check | Pass | Fail |
|-------|------|------|
| Deliberate design | Looks intentional, not default | Bootstrap/generic SaaS look |
| Domain fit | Aesthetic matches the product domain | Wrong aesthetic for the context |
| Personality | Has a point of view | Could be any product |
| Trust-worthy | Professional enough to trust | Looks like a student project |
| System feel | Cohesive design system | Ad-hoc, assembled |
| Polish level | Premium product impression | "It works" impression |

**Score Anchors:**
- 0-1: Generic, no identity, looks like a template
- 3: Recognizable, adequate for the domain
- 4: Professional tier (VS Code, Notion level)
- 5: Someone would screenshot this and post it as design inspiration

---

### Dimension 6: Layout & Composition — Score 0-5

**Squint test result must be referenced here.**

| Check | Pass | Fail |
|-------|------|------|
| Squint test | 3-5 clear visual masses | Uniform soup — no masses |
| Dominant intention | One clear primary purpose per screen | 3 things fighting for attention |
| Reading hierarchy | F-pattern or Z-pattern clear | Eye wanders without landing |
| Grid system | Elements align to invisible columns | Floating/misaligned elements |
| Eye path | Primary action clearly the destination | Primary CTA same weight as secondary |
| Whitespace active | Used to group and separate | Leftover space (passive) |
| Visual weight balance | Heavy elements don't compete | Two equally heavy sections fighting |

**Score Anchors:**
- 0: Squint test fails (no visual masses)
- 2: Dominant intention unclear OR multiple primary CTAs
- 3: Structure exists but needs effort to identify
- 4: Clear hierarchy, natural reading path
- 5: Feels inevitable — "of course the eye goes there first"

---

### Dimension 7: Information Density & Progressive Disclosure — Score 0-5

This dimension evaluates whether information is **layered correctly** and whether the screen respects the user's cognitive bandwidth.

**The 3-Layer Rule:**
- **Layer 1** (visible by default): Primary action / decision
- **Layer 2** (visible by default): Minimum necessary context
- **Layer 3** (on demand only): Detail, metadata, secondary info

**The Three Questions Test** (without scrolling or hunting):
1. "What is this?" -> answerable in 3s?
2. "What do I do now?" -> answerable in 3s?
3. "What changes if I do it?" -> answerable in 5s?

| Check | Pass | Fail |
|-------|------|------|
| 3-layer discipline | Layers clearly separated | Everything on Layer 1 |
| Progressive disclosure | Detail on demand (expand, tooltip, drawer) | All details always visible |
| Anti-emptiness | Low-content screens have direction | "Beautiful but indecisive" empty state |
| No default overlay | Overlays only when truly needed | Modals for trivial interactions |
| Three questions | All 3 answerable in <=5s | Requires scrolling or hunting |
| Information priority | Irrelevant info hidden | Irrelevant info prominent |
| Cognitive load | <=7 choices visible per section | 15+ options at once |
| **Floating UI at rest** (RF-11) | Fixed widgets anchored to viewport edge, never overlapping content | Floating widget physically covers content at rest |

**Score Anchors:**
- 0: Three questions unanswerable; everything dumped on one layer
- 2: Layers exist but bleed; >7 options frequently
- 3: Progressive disclosure in some areas, not others
- 4: 3-layer discipline respected; three questions answerable
- 5: Information feels curated — exactly what's needed, nothing more, nothing less

---

### Dimension 8: Visual States & Interaction Polish — Score 0-5

This dimension evaluates the **completeness and quality of every interactive state**.

**State Completeness Matrix:**

| State | Quality bar | Auto-fail condition |
|-------|------------|---------------------|
| **Default** | Clear affordance, no ambiguity | Looks like a decoration, not a button |
| **Hover** | Subtle, consistent, <100ms | No hover on interactive elements |
| **Pressed/Active** | Tactile "click" feel (darker, scaled) | Identical to hover (no depth) |
| **Focus** | WCAG 2.4.7 compliant ring | `outline: none` with no replacement |
| **Disabled** | Visually distinct, NOT just lower opacity | 30% opacity that still looks clickable |
| **Loading** | In-place, no layout shift, spinner/skeleton | Content shifts when loading starts |
| **Error** | Inline, near the source, doesn't break grid | Error message in a toast far from field |
| **Empty** | Directional — shows next action | Blank space with no guidance |

**Interaction elegance checks:**

| Check | Pass | Fail |
|-------|------|------|
| Animation purpose | Informative (conveys state change) | Decorative (spins for no reason) |
| Animation duration | <=250ms micro, <=400ms page transitions | >500ms for anything routine |
| Modal usage | Only for irreversible decisions | Modal for picking a date |
| Toast placement | Never covers primary action | Toast blocks the save button |
| Error proximity | Error message <=2 elements from its field | Error in header for field at bottom |
| Loading non-reflow | Layout identical with and without loader | Button doubles in height when loading |
| Overlay layers | Max 2 levels at once | 3+ overlapping modals/drawers |

**Score Anchors:**
- 0: Missing critical states (focus, error, or loading shifts layout)
- 2: Major states present but buggy (loading shifts, error misaligned)
- 3: All states present, some rough execution
- 4: All 8 states, well-executed, animations informative
- 5: Every interaction feels crafted — users will notice without knowing why

---

## Red Flags Checklist (7 Auto-Failures)

Check these before scoring. Any single flag = the view needs correction before continuing.

| # | Flag | Check method |
|---|------|-------------|
| **RF-1** | Two CTAs at identical visual weight with no justification | Look for 2+ buttons with same size+color+prominence |
| **RF-2** | Everything has border + shadow + color simultaneously | "Visual noise" — check any card/panel component |
| **RF-3** | Numeric data without right-aligned columns | Check any table or list with numbers |
| **RF-4** | Light gray text on light background | The "beautiful but unreadable" trap |
| **RF-5** | Modal used for simple/reversible interactions | Is it truly irreversible, or just convenient? |
| **RF-6** | Constant visual density — same weight for everything | Squint test: everything same size blob? |
| **RF-7** | Critical info hidden / irrelevant info prominent | Check information hierarchy against user task |
| **RF-11** | Persistent floating UI overlaps main content at rest — users must route around permanent chrome | Is any fixed-position element physically covering content without user action? |

---

## Output Format for Each View

```markdown
## [View Name] — Design Critique

**Overall Score: X.X/5** (X.X/10 normalized)
**One-line verdict:** [What this view does well and its biggest gap]

### Pre-Flight Tests
- Squint Test: PASS / FAIL — [description of what was seen]
- Grayscale Test: PASS / FAIL — [description of what was seen]
- 5-Second Test: PASS / FAIL — [primary purpose identified: ...]
- Red Flags: None / [RF-N: description]

---

### 1. Typography — X/5
**Strengths:**
- [specific positive]

**Issues:**
- [specific problem referencing actual element in screenshot]

**Action Items:**
- [CSS-specific fix]

---

[Repeat for dimensions 2-8]

---

## Top 3 Priority Improvements (by visual impact)

1. **[Highest impact]**: [Specific change with concrete CSS values]
2. **[Second]**: [Specific change]
3. **[Third]**: [Specific change]

## What's Working Well (preserve these)
- [Element/pattern to keep]
```

---

## Saving the Report

After analyzing all views, consolidate into `.planning/design-critique-report.md`:

Report structure:
```markdown
# Design Critique Report
**Date:** YYYY-MM-DD
**Overall Score:** X.X/5 (X.X/10 normalized, average across all views)

## Score Summary
| View | Typo | Color | Spacing | Components | Identity | Layout | Density | States | Avg |
|------|------|-------|---------|-----------|---------|--------|---------|--------|-----|
| Dashboard | X | X | X | X | X | X | X | X | X.X/5 |
...

## Red Flags Found
[Any RF violations across all views]

## Pre-Flight Test Results
| View | Squint | Grayscale | 5-Sec | Red Flags |
|------|--------|-----------|-------|-----------|
...

## Priority Improvements (Consolidated)
[Top 10 across all views, deduplicated, ordered by impact]

## Per-View Details
[Full 8-dimension critique for each view]
```
