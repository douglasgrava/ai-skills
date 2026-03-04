---
name: transition-auditor
description: Records and analyzes UI transitions and animations frame-by-frame. Captures sequential screenshots during animations, identifies key frames with significant visual changes, and provides them to Claude Vision for qualitative analysis. Detects jank, FOUC, layout instability, spatial logic errors, and timing issues. Applies Disney's 12 Principles of Animation and easing personality profiles to evaluate whether transitions have aesthetic quality — not just technical correctness.
argument-hint: "[transition-name] [--duration=600] [--interval=50] [--all]"
---

# UI Transition Auditor

Records UI animations and state transitions as frame sequences, then uses Claude Vision to evaluate transition quality, smoothness, spatial logic, and cognitive continuity.

## What It Analyzes

| Dimension | What to Look For |
|-----------|-----------------|
| **Smoothness** | Jank (sudden large diff spike after smooth sequence) |
| **Timing** | Too fast (<200ms = imperceptible), too slow (>600ms = frustrating) |
| **Spatial logic** | Movement direction makes sense (panel from right slides left to close) |
| **Layout stability** | No elements repositioning during animation |
| **FOUC** | Flash of unstyled/bare content during route transitions |
| **State clarity** | Before -> after states are visually distinct and understandable |
| **Cognitive continuity** | User can track what happened across the transition |

## Configuration

This skill reads transitions from `project-context.json` in the skills root directory:

```json
{
  "baseUrl": "http://localhost:3000",
  "transitions": [
    {
      "name": "page-switch-1-to-2",
      "setup": { "shortcut": "Meta+1" },
      "trigger": { "shortcut": "Meta+2" },
      "expectedDurationMs": "150-300",
      "setupWait": 400,
      "captureDuration": 600
    },
    {
      "name": "modal-open",
      "setup": null,
      "trigger": { "click": "[data-open-modal]" },
      "expectedDurationMs": "200-350",
      "setupWait": 200,
      "captureDuration": 500
    }
  ]
}
```

## Prerequisites

Install pngjs for frame diff computation:

```bash
cd $PLAYWRIGHT_SKILL_DIR && npm install pngjs
```

Without pngjs, the tool falls back to approximate buffer comparison (still works, less precise).

---

## Workflow

### Capture a Single Transition

Write to `/tmp/audit-transition.js`:

```javascript
const { chromium } = require('playwright');
const ta = require('./lib/transition-auditor');
const fs = require('fs');
const path = require('path');

// Load project context
const ctxPath = path.resolve(__dirname, '../project-context.json');
const ctx = JSON.parse(fs.readFileSync(ctxPath, 'utf8'));
const TARGET_URL = ctx.baseUrl;

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 0 });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(TARGET_URL, { waitUntil: 'networkidle' });

  // Use the first transition from context as an example
  const t = ctx.transitions[0];

  // Setup: navigate to start state
  if (t.setup) {
    if (t.setup.shortcut) await page.keyboard.press(t.setup.shortcut);
    else if (t.setup.click) await page.click(t.setup.click);
    await page.waitForTimeout(t.setupWait || 500);
  }

  // Capture the transition
  const result = await ta.analyzeTransition(page, t.name, {
    trigger: async () => {
      if (t.trigger.shortcut) await page.keyboard.press(t.trigger.shortcut);
      else if (t.trigger.click) await page.click(t.trigger.click);
    },
    duration: t.captureDuration || 600,
    interval: 50,       // Screenshot every 50ms (20fps)
    diffThreshold: 2,   // Frames with >2% pixel change = key frame
    fullPage: false,
  });

  // Print analysis data
  console.log('\n== TRANSITION ANALYSIS ==');
  console.log(`Name:        ${result.name}`);
  console.log(`Duration:    ${result.durationMs}ms`);
  console.log(`All frames:  ${result.totalFrames}`);
  console.log(`Key frames:  ${result.keyFrames}`);
  console.log(`Max delta:   ${result.maxDiff}% (single frame change)`);
  console.log(`Avg delta:   ${result.avgDiff}% (average change per key frame)`);
  console.log(`Smoothness:  ${result.summary.smoothness}`);
  console.log(`Speed:       ${result.summary.speed}`);
  console.log(`Jank:        ${result.summary.jank}`);

  console.log('\nKey frames:');
  result.frames.forEach(f => {
    console.log(`  [${f.timestamp}ms] ${f.label} — delta ${f.diffFromPrev}% — ${f.filePath}`);
  });

  // Output base64 images for Claude Vision
  console.log('\n== KEY FRAMES FOR CLAUDE VISION ANALYSIS ==');
  result.frames.forEach((f, i) => {
    console.log(`\nFRAME_${i}_${f.label.toUpperCase()}_START`);
    console.log(f.base64);
    console.log(`FRAME_${i}_${f.label.toUpperCase()}_END`);
  });

  await browser.close();
})();
```

Execute:
```bash
cd $PLAYWRIGHT_SKILL_DIR && node run.js /tmp/audit-transition.js
```

---

### Audit All Transitions

Write to `/tmp/audit-all-transitions.js`:

```javascript
const { chromium } = require('playwright');
const ta = require('./lib/transition-auditor');
const fs = require('fs');
const path = require('path');

// Load project context
const ctxPath = path.resolve(__dirname, '../project-context.json');
const ctx = JSON.parse(fs.readFileSync(ctxPath, 'utf8'));
const TARGET_URL = ctx.baseUrl;

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 0 });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(TARGET_URL, { waitUntil: 'networkidle' });

  const allResults = [];

  for (const t of ctx.transitions) {
    try {
      // Setup
      if (t.setup) {
        if (t.setup.shortcut) await page.keyboard.press(t.setup.shortcut);
        else if (t.setup.click) await page.click(t.setup.click);
        await page.waitForTimeout(t.setupWait || 400);
      }
      await page.waitForTimeout(300);

      const result = await ta.analyzeTransition(page, t.name, {
        trigger: async () => {
          if (t.trigger.shortcut) await page.keyboard.press(t.trigger.shortcut);
          else if (t.trigger.click) await page.click(t.trigger.click);
        },
        duration: t.captureDuration || 600,
        interval: 50,
        diffThreshold: 2,
      });

      allResults.push(result);

      // Reset state
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);

    } catch (err) {
      console.error(`  Warning: Failed to capture "${t.name}": ${err.message}`);
      allResults.push({ name: t.name, error: err.message });
    }
  }

  // Summary table
  console.log('\n\n== TRANSITION AUDIT SUMMARY ==');
  console.log('| Transition | Duration | Smoothness | Speed | Jank | Key Frames |');
  console.log('|-----------|---------|-----------|-------|------|------------|');

  allResults.forEach(r => {
    if (r.error) {
      console.log(`| ${r.name} | ERROR | — | — | — | ${r.error} |`);
    } else {
      console.log(`| ${r.name} | ${r.durationMs}ms | ${r.summary.smoothness} | ${r.summary.speed} | ${r.summary.jank} | ${r.keyFrames} |`);
    }
  });

  // Flag issues
  const janky = allResults.filter(r => r.summary?.jank === 'detected');
  const slow  = allResults.filter(r => r.summary?.speed === 'slow');
  const noAnim = allResults.filter(r => !r.error && r.keyFrames <= 2);

  if (janky.length > 0) console.log(`\nJank detected in: ${janky.map(r => r.name).join(', ')}`);
  if (slow.length > 0)  console.log(`Slow transitions: ${slow.map(r => r.name).join(', ')}`);
  if (noAnim.length > 0) console.log(`No animation detected (instant): ${noAnim.map(r => r.name).join(', ')}`);

  // Print key frames for Claude Vision
  console.log('\n\n== KEY FRAMES FOR CLAUDE VISION ==');
  allResults.filter(r => !r.error).forEach(r => {
    console.log(`\n--- ${r.name} ---`);
    r.frames?.forEach((f, i) => {
      console.log(`FRAME_${r.name}_${i}_START`);
      console.log(f.base64);
      console.log(`FRAME_${r.name}_${i}_END`);
    });
  });

  console.log('\nKey frames saved to .testing/transitions/');
  await browser.close();
})();
```

Execute:
```bash
cd $PLAYWRIGHT_SKILL_DIR && node run.js /tmp/audit-all-transitions.js
```

---

## Claude Vision Analysis Protocol

After the script runs and prints key frames, Claude should analyze them using this framework:

### Step 1: Read Key Frame Sequence

For each transition, you have:
- **Frame 0 (before)**: State before trigger
- **Frames 1..N (key frames)**: Frames where significant visual change occurred
- **Last frame (after)**: Final settled state

### Step 2: Evaluate Each Transition

For each before -> [during] -> after sequence:

**Timing (is it perceptible but not annoying?)**
- < 200ms: Too fast, user may not notice state changed
- 200-500ms: Ideal for state changes and panel opens
- 500-800ms: Acceptable for complex layout shifts
- > 800ms: Frustratingly slow for frequent actions

**Spatial Logic (does movement direction make sense?)**
- Right panel opening: should slide in from right
- Modal: should appear from center/slight scale-up
- View switch: content fade or slide
- Dropdown: appears below trigger

**Layout Stability (no content jumping)**
- Look for elements that change position mid-animation
- Check if text reflows unexpectedly
- Verify scrollbars don't appear/disappear causing layout shift

**Visual Continuity (can user follow what happened?)**
- Is there a clear visual connection between before and after states?
- Does the transition communicate directionality?
- Is there spatial memory preserved (same element, different state)?

**Smoothness (from diff metrics)**
- `maxDiff < 15%` = smooth (gradual change per frame)
- `maxDiff 15-40%` = moderate (some sharp transitions)
- `maxDiff > 40%` = jarring (nearly instantaneous content swap)
- Jank signature: small diffs -> sudden large spike -> small diffs again

### Step 3: Output Format

```markdown
## Transition: [name]

**Verdict:** PASS / NEEDS WORK / FAIL
**Duration:** Xms | **Smoothness:** smooth/moderate/jarring | **Jank:** none/detected

### Frame Analysis
- **Before** (0ms): [describe initial state]
- **Key Frame 1** (Xms, delta Y%): [describe change]
- **Key Frame N** (Xms, delta Y%): [describe change]
- **After** (Xms): [describe final state]

### Issues Found
1. **[Issue type]** — [description] — Severity: major/minor

### Recommendations
- [Specific CSS/JS fix — e.g., "Add `transition: transform 250ms ease-out` to `.panel`"]
```

## Metrics Reference

| Metric | Good | Needs Work | Poor |
|--------|------|-----------|------|
| Max frame delta | < 15% | 15-35% | > 35% (jarring) |
| Duration | 200-500ms | 500-800ms | < 150ms or > 800ms |
| Key frames | 3-8 | 2 or 9-15 | 1 (no animation) |
| Jank detected | No | — | Yes |
