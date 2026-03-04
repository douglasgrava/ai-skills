---
name: e2e-uat
description: Run E2E browser tests against any web UI to verify features work from a user perspective. Includes chaos monkey testing, UX heuristic evaluation (Nielsen + Laws of UX + MS AI Guidelines), and structured reporting. Use when testing UI features, validating a phase, or running UAT.
argument-hint: "[phase-number] or [test-name] or [--chaos] or [--ux-audit]"
disable-model-invocation: true
---

# E2E UAT — Browser-Driven Feature Verification

Automated browser testing for any web UI using Chrome DevTools MCP tools.
Tests features from the user's perspective by navigating the live app, interacting with elements, and verifying expected outcomes.

## Prerequisites

- Dev server running (URL configured in `project-context.json`)
- Chrome browser open with the app loaded (Chrome DevTools MCP connected)

## Configuration

This skill reads settings from `project-context.json` in the skills root directory:

```json
{
  "name": "My Project",
  "baseUrl": "http://localhost:3000",
  "settleDelay": 800,
  "views": [
    { "name": "Dashboard", "navigate": { "shortcut": "Meta+1" }, "waitAfter": 600 },
    { "name": "Settings", "navigate": { "url": "/settings" }, "waitAfter": 600 }
  ],
  "phaseTests": {
    "1": [
      {
        "name": "Layout Structure",
        "action": "Navigate to app root",
        "verify": "Main content area renders correctly",
        "evidence": "Full page screenshot"
      }
    ]
  }
}
```

### Project UI Map (Optional)

For detailed E2E testing, create a `reference/ui-map.md` file in this skill directory that documents your project's:
- Component structure and CSS selectors
- Keyboard shortcuts
- localStorage keys
- Widget registry
- Theme system

This is project-specific and must be created per project.

## How It Works

This skill uses **Chrome DevTools MCP tools** (already connected to your session) to:
1. Take accessibility snapshots to understand current UI state
2. Click, type, and navigate using element UIDs from snapshots
3. Take screenshots as visual evidence
4. Evaluate JavaScript for deeper state inspection

### Primary Tools Used

| Tool | Purpose |
|------|---------|
| `take_snapshot` | Get accessibility tree (element UIDs for interaction) |
| `take_screenshot` | Visual evidence of test results |
| `click` | Click buttons, links, tabs |
| `fill` | Type into inputs |
| `press_key` | Keyboard shortcuts |
| `evaluate_script` | Inspect app state, check localStorage, DOM queries |
| `navigate_page` | Navigate to URLs or reload |
| `wait_for` | Wait for text/elements to appear |

## Execution Workflow

### Step 1: Verify Dev Server

```
1. Check if the app is loaded in the browser (take_snapshot)
2. If not loaded, navigate to the baseUrl from project-context.json
3. Wait for the app to render (look for key UI elements)
```

### Step 2: Run Tests

For each test:
```
1. take_snapshot -> find current UI state and element UIDs
2. Perform the test action (click, type, keyboard shortcut)
3. take_snapshot -> verify expected outcome appeared
4. take_screenshot -> save visual evidence to /tmp/e2e/
5. Record result: PASS / FAIL with details
```

### Step 3: Report Results

Output a structured summary:
```
## E2E Test Results: Phase {N}

| # | Test | Result | Evidence |
|---|------|--------|----------|
| 1 | Layout | PASS | /tmp/e2e/01-layout.png |
| 2 | Dark Mode | FAIL: no theme toggle found | /tmp/e2e/02-dark-mode.png |

Passed: X/Y
```

### Step 4: Save Report to Disk

**After presenting findings in the conversation, always persist the report to disk.**

- For `ux-audit` runs: save to `.planning/ux-audit.md` in the project root
- For phase test runs: save to `.planning/e2e-phase-{N}-report.md` in the project root
- Create the `.planning/` directory if it doesn't exist

The saved file must contain:
1. The full issue table with severity, file, line, and description
2. Detailed findings with code examples/fix suggestions
3. Date at the top
4. Summary of pass/fail counts or issue counts by severity

## Defining Phase Tests

Define your project's tests in `project-context.json` under `phaseTests`:

```json
{
  "phaseTests": {
    "1": [
      {
        "name": "Layout Structure",
        "action": "Navigate to app root",
        "verify": "Activity Bar (left), main content area, Status Bar (bottom)",
        "evidence": "Full page screenshot"
      },
      {
        "name": "Navigation",
        "action": "Click each nav item or press shortcuts",
        "verify": "Main content switches for each activity",
        "evidence": "Screenshot per activity"
      },
      {
        "name": "Dark Mode Toggle",
        "action": "Find theme toggle, click it",
        "verify": "Theme attribute changes. Background colors change.",
        "evidence": "Screenshot in light mode, then dark mode"
      }
    ]
  }
}
```

## Testing Patterns

### Pattern: Navigate to View
```
1. press_key(shortcut) or navigate_page(url)
2. wait 500ms (or settleDelay from context)
3. take_snapshot to verify view changed
```

### Pattern: Toggle Dark Mode
```
1. take_snapshot -> find theme toggle button
2. click the toggle button
3. evaluate_script: () => document.documentElement.getAttribute('data-theme')
4. Verify returned value changed
```

### Pattern: Open Command Palette
```
1. press_key("Meta+k")
2. wait_for text of a known command
3. take_snapshot -> find search input
4. fill search input with query
5. take_snapshot -> verify filtered results
```

### Pattern: Check Element Exists
```
1. take_snapshot
2. Search snapshot text for expected element/text
3. If found -> PASS
4. If not found -> FAIL with snapshot content for debugging
```

## Error Handling

- If a test action fails (element not found), take a screenshot for diagnosis
- If the app shows a JavaScript error in console, capture it via `list_console_messages`
- If a view doesn't render, check console for errors before marking as FAIL
- Always take a screenshot on FAIL for debugging context

## Output Format

Save screenshots to `/tmp/e2e/` directory:
```bash
mkdir -p /tmp/e2e
```

File naming: `{test-number}-{test-name-slug}.png`

---

## UX Layout Evaluation (AI UX Tester Mode)

When running chaos monkey or standalone UX audits, act as a **senior UX designer** conducting a professional heuristic evaluation. Every page/view visited must be evaluated systematically using the three-framework approach below.

### Research Foundations

This evaluation framework is grounded in:
- **Nielsen's 10 Usability Heuristics** (NN/Group, Jakob Nielsen, 1994/2024) — the gold standard for usability evaluation
- **Laws of UX** (Jon Yablonski, lawsofux.com) — psychology-based design principles
- **Microsoft's 18 Human-AI Interaction Guidelines** (CHI 2019) — for AI-integrated systems

### Framework 1: Nielsen's 10 Usability Heuristics

Evaluate each heuristic on a 1-5 scale per view (1 = failing, 5 = excellent):

| # | Heuristic | What to Check | AI-First Angle |
|---|-----------|---------------|----------------|
| H1 | **Visibility of System Status** | Loading indicators, progress state | AI status must always be visible (running/thinking/done/error) |
| H2 | **Match System & Real World** | Terminology matches user mental models | AI concepts in user terms, not internals |
| H3 | **User Control & Freedom** | Cancel buttons, undo, Escape, back navigation | Stop/interrupt AI easily. Undo AI-generated changes |
| H4 | **Consistency & Standards** | Same patterns across views, platform conventions | Consistent AI status icons and interaction patterns |
| H5 | **Error Prevention** | Confirmation before destructive actions | Warn before stopping long AI tasks |
| H6 | **Recognition over Recall** | Labels visible, tooltips present | AI capabilities discoverable without memorization |
| H7 | **Flexibility & Efficiency** | Keyboard shortcuts, power-user flows | Quick AI invocation shortcuts |
| H8 | **Aesthetic & Minimalist Design** | No visual clutter, appropriate density | Clean AI output display, no info overload |
| H9 | **Error Recovery** | Plain-language errors, actionable recovery | AI errors explained with what to do next |
| H10 | **Help & Documentation** | Tooltips, inline help, empty states with guidance | In-context AI capability hints |

### Framework 2: Laws of UX (Key Laws for Web Tools)

| Law | What to Check | Impact |
|-----|--------------|--------|
| **Fitts's Law** | Buttons >= 24px desktop / 44px touch | Small buttons hard to click |
| **Hick's Law** | <= 5-7 choices visible per section | Navigation should not overwhelm |
| **Miller's Law** | Groups of <= 7 items. Chunked information | Lists must be paged or grouped |
| **Doherty Threshold** | Feedback within 400ms | Must show immediate acknowledgment |
| **Jakob's Law** | Patterns match platform conventions | Navigation, shortcuts should feel familiar |
| **Law of Proximity** | Related items grouped. Unrelated separated | Controls near their status indicators |
| **Aesthetic-Usability Effect** | Polished UI increases perceived usability | Professional typography, spacing |
| **Cognitive Load** | Minimize decisions. Smart defaults | Don't force configuration before value |
| **Serial Position Effect** | Most important items first or last | Primary actions at top |
| **Peak-End Rule** | Best experience at peak moment and end | Task completion should feel satisfying |
| **Goal-Gradient Effect** | Show progress toward completion | Progress indicators, step indicators |
| **Occam's Razor** | Simplest solution that meets the need | Don't add complexity without benefit |

### Framework 3: Microsoft's 18 Human-AI Interaction Guidelines

Critical for applications with AI features:

#### Initially (First Encounter)
| # | Guideline | Check |
|---|-----------|-------|
| G1 | **Make clear what AI can do** | Is AI capability communicated? |
| G2 | **Make clear how well AI performs** | Are limitations disclosed? |

#### During Interaction
| # | Guideline | Check |
|---|-----------|-------|
| G3 | **Time AI services contextually** | Does AI trigger at the right moment? |
| G4 | **Show contextually relevant AI info** | Is AI output relevant to current task? |
| G5 | **Match relevant social norms** | Does AI tone match user expectations? |

#### When AI is Wrong
| # | Guideline | Check |
|---|-----------|-------|
| G7 | **Support efficient AI invocation** | Easy to trigger AI? |
| G8 | **Support efficient AI dismissal** | Easy to stop/cancel? |
| G9 | **Support efficient AI correction** | Easy to edit/override AI output? |
| G10 | **Scope AI when in doubt** | Does AI gracefully decline uncertain tasks? |
| G11 | **Make clear why AI did what it did** | Is AI reasoning visible? |

#### Over Time
| # | Guideline | Check |
|---|-----------|-------|
| G12 | **Remember recent interactions** | Does context persist across sessions? |
| G15 | **Encourage granular feedback** | Can users rate/correct AI output? |
| G16 | **Convey AI action consequences** | Does UI show what AI will change? |
| G17 | **Provide global AI controls** | Master on/off for AI features? |

### Always Audit With Real Data

**Never audit list/table views in an empty or default state.** Layout bugs caused by
variable-length content are **invisible without data**.

Before starting any UX audit:
1. Ensure the app has actual records/data
2. Verify at least one record has a long title (4+ words)
3. Scroll each list to confirm items render correctly
4. If no data exists, create test records before auditing

---

### UX Audit Workflow (Per View)

For each view/page during chaos monkey or standalone UX testing:

#### Step 1: Capture Evidence
```javascript
await page.screenshot({ path: `/tmp/ux-${viewSlug}-before.png`, fullPage: true });
const uxResults = await ux.runFullAudit(page, {
  viewName: viewName,
  screenshotPath: `/tmp/ux-${viewSlug}-audit.png`,
});
```

#### Step 2: Visual Analysis (from screenshot — AI evaluates)
Using the screenshot, evaluate:
- **Visual Hierarchy**: Is there a clear F/Z reading pattern?
- **Color Usage**: Is color purposeful? Contrast adequate?
- **Typography Scale**: Clear heading/body/caption hierarchy?
- **Spacing Rhythm**: Consistent grid? Breathing room?
- **Alignment**: Are elements aligned to a grid?
- **Interaction Affordances**: Do buttons look clickable?
- **List/Card Layout Integrity**:
  - Do list items have clean separation?
  - Are card heights consistent?
  - If virtual scrolling, are visible items fully contained?

#### Step 3: Rate & Generate Findings
```javascript
for (const finding of uxResults.findings) {
  session.report.addFinding(finding);
}
session.report.setUXAssessment(uxResults.assessment);
```

### UX Severity Guide

| Severity | When to Use |
|----------|------------|
| `blocker` | Cannot use a feature at all due to UX issue |
| `major` | Significant friction — users will struggle or abandon |
| `minor` | Noticeable UX gap — users can proceed with effort |
| `cosmetic` | Polish opportunity — doesn't impede usage |

### UX Category Reference

| Category | Use For |
|----------|---------|
| `ux_layout` | Layout broken, misaligned, dead space, overflow |
| `ux_hierarchy` | Visual hierarchy unclear, equal weight on unequal items |
| `ux_cognitive_load` | Too many choices, overwhelming density |
| `ux_feedback` | Missing visual feedback for user actions |
| `ux_consistency` | Inconsistent patterns across views |
| `ux_interaction` | Interaction design gaps (no hover, no active state) |
| `ux_typography` | Text too small, poor contrast, no typographic scale |
| `ux_spacing` | Inconsistent spacing, elements touching |
| `ux_touch_target` | Buttons/links too small to click comfortably |
| `ux_color_contrast` | Text/background contrast below WCAG AA |
| `ux_information_arch` | Information architecture unclear |
| `ux_ai_clarity` | AI capabilities not communicated |
| `ux_ai_feedback` | AI status/progress not shown |
| `ux_ai_trust` | Missing confidence signals |
| `ux_ai_control` | Can't stop/override/correct AI easily |
| `ux_error_prevention` | No confirmation for destructive actions |
| `ux_empty_state` | Empty lists with no guidance |
| `ux_loading_state` | No loading indicator for >400ms operations |

---

## Chaos Monkey Mode (AI-Driven Chaos Testing)

A chaos testing mode where **you (the AI agent) are the smart monkey**. Unlike gremlins.js (purely random), you analyze the page, understand context, and deliberately choose chaotic actions to stress-test the UI.

**Key principle:** You see the page via snapshots/screenshots, understand what the user flow is, and then deliberately try to break it.

### Execution: Uses the Playwright Skill

Chaos Monkey scripts are executed via the **playwright-skill** (`$PLAYWRIGHT_SKILL_DIR`), which contains the chaos modules:

- `lib/chaos-monkey.js` — 50+ chaos scenario functions
- `lib/chaos-report.js` — `ChaosReport` class + `createChaosSession()` for auto-recording and GSD-compatible reports
- `lib/ux-audit.js` — UX evaluation module: automated checks + visual evaluation guide

Resolve `$PLAYWRIGHT_SKILL_DIR` by finding the `playwright-skill` directory relative to this skill (sibling under skills directory).

### How to Run Chaos Monkey

1. **Write a chaos test script to `/tmp/`** using the chaos-monkey module
2. **Execute via the playwright-skill**: `cd $PLAYWRIGHT_SKILL_DIR && node run.js /tmp/chaos-test.js`
3. **Read the generated `CHAOS-REPORT.md`** and present findings to the user

### AI Decision Framework

1. **Observe the page** — Take a snapshot/screenshot first
2. **Run UX Audit first** — Before chaos, capture baseline UX state
3. **Visually evaluate the screenshot** — Act as a UX designer
4. **Identify testable surfaces** — Forms? Navigation? Modals? Lists?
5. **Select appropriate chaos categories** based on what you see:
   - Page has forms -> Form Chaos + Keyboard Chaos
   - Page has modals/dialogs -> Timing Chaos + Click Chaos
   - Page has navigation/routing -> Navigation Chaos + State Chaos
   - Page has real-time data -> State Chaos + Timing Chaos
   - Page has lists/tables -> Viewport Chaos + Scroll Chaos + DOM Mutation
   - Any page -> Compound Scenarios (impatientUser, rageQuitter, distractedUser)
6. **Run scenarios progressively** — Start mild, escalate to destructive
7. **Collect evidence** — Screenshots at each stage
8. **Generate report** — Use `createChaosSession()` for auto-generated report

### Available Chaos Primitives (50+ scenarios)

#### Click Chaos
| Function | What it does |
|---|---|
| `rapidClick(page, selector, {count, interval})` | Rapid-fire clicks simulating impatient user |
| `unexpectedDblClick(page, selector)` | Double-click on elements that don't expect it |
| `clickRandomCoordinate(page)` | Click at random x,y |
| `clickDisabledElements(page)` | Force-click on disabled elements |
| `rightClickEverywhere(page)` | Right-click on interactive elements |
| `clickDuringTransition(page, trigger, target)` | Click before animation completes |
| `clickAndImmediatelyClickElsewhere(page, sel1, sel2)` | Fire-and-forget clicks |

#### Navigation Chaos
| Function | What it does |
|---|---|
| `backDuringFlow(page)` | Hit browser back during a multi-step flow |
| `refreshMidAction(page)` | Reload page at an unexpected moment |
| `navigateAwayAndBack(page, foreignUrl?)` | Navigate to about:blank then come back |
| `rapidRouteToggle(page, url1, url2, {cycles, delay})` | Rapidly toggle between routes |
| `deepLinkWithoutState(page, url)` | Navigate directly to a stateful page |
| `corruptUrl(page)` | Corrupt URL via pushState |

#### Form Chaos
| Function | What it does |
|---|---|
| `submitEmptyForm(page, formSelector?)` | Clear all inputs then submit |
| `pasteGiantText(page, selector, length?)` | Paste 100KB+ text |
| `enterMaliciousInput(page, selector)` | XSS payloads, SQL injection |
| `enterUnicodeEdgeCases(page, selector)` | Zero-width spaces, RTL, emoji, zalgo |
| `enterBoundaryNumbers(page, selector)` | MAX_SAFE_INTEGER, NaN, Infinity |
| `flickerSelect(page, selector, {cycles, delay})` | Rapidly change select option |
| `fillClearSubmit(page, formSelector?)` | Fill, clear, submit |

#### Timing Chaos
| Function | What it does |
|---|---|
| `doubleSubmit(page, selector)` | Click a button twice with no await |
| `interactWithSlowNetwork(page, context, callback)` | Add 2-5s delay to all requests |
| `offlineInteraction(page, context, callback)` | Go offline, interact, come back |
| `interactDuringLoad(page, url, selectors)` | Click elements before load completes |
| `closeModalDuringAsync(page, triggerSel, closeSel)` | Close dialog during async operation |

#### Viewport / Layout Chaos
| Function | What it does |
|---|---|
| `rapidResize(page, {cycles, delay})` | Cycle through 10 viewport sizes |
| `franticScroll(page, {actions, delay})` | Scroll frantically in random directions |
| `scrollDuringLoad(page)` | Scroll rapidly while content loads |
| `zoomChaos(page, {cycles})` | Zoom in/out via keyboard shortcuts |

#### Keyboard Chaos
| Function | What it does |
|---|---|
| `keyboardSpam(page, {count, delay})` | Spam 30 random keys |
| `escapeSpam(page, {count, delay})` | Press Escape repeatedly |
| `tabThroughPage(page, {count, delay})` | Tab 50 times rapidly |
| `randomShortcuts(page)` | Fire 10 random keyboard shortcuts |
| `typeWhileAutocompleteLoads(page, selector, text)` | Type fast + ArrowDown/Enter |

#### State Chaos
| Function | What it does |
|---|---|
| `clearLocalStorage(page)` | Wipe all localStorage |
| `clearSessionStorage(page)` | Wipe all sessionStorage |
| `corruptLocalStorage(page)` | Replace values with garbage |
| `clearCookies(context)` | Delete all cookies |
| `killWebSockets(page)` | Close all WS connections |
| `restoreWebSockets(page)` | Undo killWebSockets |
| `expireAuthToken(page)` | Corrupt auth-like storage keys |

#### Gesture Chaos
| Function | What it does |
|---|---|
| `randomDrag(page)` | Drag from random point to random point |
| `erraticHover(page, {moves, delay})` | Mouse hover erratically |
| `randomMouseWheel(page, {events})` | Mouse wheel in random directions |
| `longPress(page, selector, duration?)` | Hold mouse down for 3+ seconds |

#### Multi-tab / Focus / DOM Chaos
| Function | What it does |
|---|---|
| `multiTabConflict(page, context, callback)` | Open same page in 2 tabs with conflicting actions |
| `blurEverything(page, {cycles, delay})` | Repeatedly blur active element |
| `focusRandomElements(page)` | Force focus on non-interactive elements |
| `removeRandomElements(page, {count})` | Remove random DOM elements |
| `injectChaosElements(page)` | Inject overlay, floating div |
| `removeChaosElements(page)` | Clean up injected elements |

#### Dialog / Time / Performance Chaos
| Function | What it does |
|---|---|
| `triggerNativeDialogs(page)` | Trigger alert(), confirm(), prompt() |
| `triggerPrint(page)` | Call window.print() |
| `timeTravel(page, offsetMs?)` | Override Date to future |
| `restoreTime(page)` | Undo timeTravel |
| `cpuStress(page, durationMs?)` | Block main thread |
| `memoryStress(page, sizeMB?)` | Allocate large ArrayBuffers |
| `cleanMemoryStress(page)` | Free allocated memory |

#### Compound Scenarios (Realistic User Behaviors)
| Function | What it does |
|---|---|
| `impatientUser(page)` | Rapid clicks, Escape, Back, Forward |
| `distractedUser(page, context)` | Opens new tab, waits, closes, continues |
| `rageQuitter(page)` | 20 random clicks + keyboard spam + scroll spam |
| `fullChaosSession(page, context, {rounds, delay})` | Run N random scenarios in sequence |

#### Monitoring & Reporting
| Function | What it does |
|---|---|
| `setupErrorCollector(page)` | Collects JS errors and console.error |
| `collectHealthMetrics(page)` | Reports broken images, overflow, DOM size |

### Complete Chaos + UX Test Example

```javascript
// /tmp/chaos-test.js
const { chromium } = require('playwright');
const chaos = require('./lib/chaos-monkey');
const { createChaosSession } = require('./lib/chaos-report');
const ux = require('./lib/ux-audit');
const fs = require('fs');
const path = require('path');

// Load project context
const ctxPath = path.resolve(__dirname, '../project-context.json');
const ctx = JSON.parse(fs.readFileSync(ctxPath, 'utf8'));
const TARGET_URL = ctx.baseUrl;

function buildNavigator(view) {
  return async (page) => {
    if (view.navigate.shortcut) await page.keyboard.press(view.navigate.shortcut);
    else if (view.navigate.url) await page.goto(`${TARGET_URL}${view.navigate.url}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(view.waitAfter || ctx.settleDelay || 600);
  };
}

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 30 });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(TARGET_URL, { waitUntil: 'networkidle' });

  const session = createChaosSession({
    page, context,
    targetUrl: TARGET_URL,
    projectName: ctx.name || 'UI',
    outputPath: '/tmp/CHAOS-REPORT.md',
  });

  // Phase 1: UX Layout Evaluation
  const uxAllViews = [];
  for (const view of ctx.views) {
    await buildNavigator(view)(page);
    const screenshotPath = `/tmp/ux-${view.name.toLowerCase().replace(/\s+/g, '-')}.png`;
    const uxResults = await ux.runFullAudit(page, { viewName: view.name, screenshotPath });
    session.report.addScreenshot(screenshotPath, `UX Audit — ${view.name}`);
    for (const finding of uxResults.findings) session.report.addFinding(finding);
    uxAllViews.push(uxResults.assessment.views[0]);
  }

  // Phase 2: Chaos Monkey
  await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded' });
  await session.chaos.submitEmptyForm(page);
  await session.chaos.backDuringFlow(page);
  await session.chaos.rapidResize(page, { cycles: 6 });
  await session.chaos.keyboardSpam(page);
  await session.chaos.escapeSpam(page);
  await session.chaos.clearLocalStorage(page);
  await session.chaos.killWebSockets(page);
  await page.waitForTimeout(2000);
  await session.chaos.restoreWebSockets(page);
  await session.chaos.impatientUser(page);
  await session.chaos.rageQuitter(page);
  await session.chaos.fullChaosSession(page, context, { rounds: 15, delay: 200 });

  const reportPath = await session.finish('/tmp/chaos-final.png');
  console.log('\nReport at:', reportPath);
  await browser.close();
})();
```

Execute:
```bash
cd $PLAYWRIGHT_SKILL_DIR && node run.js /tmp/chaos-test.js
```

### Chaos Report Structure

The generated `CHAOS-REPORT.md` contains:
- YAML frontmatter (machine-readable metadata, severity counts, gaps)
- Executive Summary with severity table
- Findings Overview table
- Detailed Findings per issue
- Gaps section (for AI fix agents)
- Chaos Scenarios Executed table
- Health Metrics (Post-Chaos)
- Screenshots with timestamps
- Recommended Fix Plan per issue

### Severity Taxonomy

| Severity | When to use |
|----------|------------|
| `blocker` | JS crashes, data loss, complete feature failure |
| `major` | Feature broken but app runs, validation gaps, navigation failures |
| `minor` | Works but degraded (slow, visual glitch under stress) |
| `cosmetic` | Visual-only (z-index, overflow, spacing after extreme resize) |

### Using the Report for Fixes

The generated report is designed for direct AI consumption:
1. **Gaps section** — machine-readable list of blocker/major issues with file paths and fixes
2. **Fix Plan** — per-issue plans with affected files, problem description, and verification steps
3. **Workflow**: AI reads report -> iterates through gaps -> makes fixes -> re-runs scenario to verify

## Tips

- **take_snapshot is your primary tool** — it returns the accessibility tree with UIDs
- **Screenshots are evidence** — always take one per test
- **Console errors matter** — check `list_console_messages(types: ["error"])` if something seems wrong
- **Wait after navigation** — use settleDelay from project context
- **Reactivity** — UI updates may be instant, but wait for async data loading
