/**
 * Transition Auditor Library for Claude Code UX Testing
 *
 * Records UI animations and state transitions as sequential screenshots,
 * identifies key frames where significant visual changes occur,
 * and provides base64 frame sequences for Claude Vision analysis.
 *
 * No external CLI tools needed — works entirely with Playwright's
 * screenshot API and optional pngjs for accurate pixel diffing.
 *
 * Usage:
 *   const ta = require('./lib/transition-auditor');
 *   const result = await ta.analyzeTransition(page, 'modal-open', {
 *     trigger: async () => page.click('.open-modal-btn'),
 *     duration: 500,
 *     interval: 50,
 *   });
 *   console.log(result.summary); // { smoothness, speed, jank }
 */

const fs = require('fs');
const path = require('path');

const TRANSITIONS_DIR = path.join(process.cwd(), '.testing', 'transitions');

// Optional: pngjs for accurate pixel diffing
let PNG;
try {
  PNG = require('pngjs').PNG;
} catch (e) {
  // Falls back to fast buffer-based comparison
}

// ─────────────────────────────────────────────────────────────────────────────
// Frame Capture
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Capture a UI transition as sequential screenshots at a fixed interval.
 *
 * Captures a "before" frame, waits for optional beforeDelay,
 * fires the trigger, then captures frames until duration elapses,
 * and a final "after" frame after the animation settles.
 *
 * @param {object} page
 * @param {object} options
 * @param {Function} [options.trigger]       - async function that initiates the transition
 * @param {number}  [options.duration=600]   - ms to capture after trigger
 * @param {number}  [options.interval=50]    - ms between frames (50ms = 20fps)
 * @param {string}  [options.selector]       - CSS selector to screenshot (default: viewport)
 * @param {boolean} [options.fullPage=false] - Full page screenshot
 * @param {number}  [options.beforeDelay=200]- ms to wait after "before" frame before triggering
 * @param {number}  [options.afterDelay=300] - ms to wait after capture ends for "after" frame
 * @returns {Array<{ timestamp: number, label: string, screenshot: Buffer }>}
 */
async function captureTransition(page, options = {}) {
  const {
    trigger,
    duration = 600,
    interval = 50,
    selector,
    fullPage = false,
    beforeDelay = 200,
    afterDelay = 300,
  } = options;

  const frames = [];

  // Helper to take a screenshot (selector or full viewport)
  const capture = async () => {
    if (selector) {
      const locator = page.locator(selector);
      const count = await locator.count();
      if (count > 0) {
        return locator.first().screenshot().catch(() => page.screenshot({ fullPage }));
      }
    }
    return page.screenshot({ fullPage });
  };

  // BEFORE frame (settled initial state)
  const beforeShot = await capture();
  frames.push({ timestamp: 0, label: 'before', screenshot: beforeShot });

  if (beforeDelay > 0) await page.waitForTimeout(beforeDelay);

  // Fire trigger
  const startTime = Date.now();
  if (trigger) {
    await trigger();
  }

  // Capture frames during animation
  while (Date.now() - startTime < duration) {
    await page.waitForTimeout(interval);
    const elapsed = Date.now() - startTime;
    const shot = await capture();
    frames.push({
      timestamp: elapsed,
      label: `frame-${elapsed}ms`,
      screenshot: shot,
    });
  }

  // AFTER frame (settled final state)
  if (afterDelay > 0) await page.waitForTimeout(afterDelay);
  const afterShot = await capture();
  const finalTimestamp = Date.now() - startTime + afterDelay;
  frames.push({ timestamp: finalTimestamp, label: 'after', screenshot: afterShot });

  return frames;
}

// ─────────────────────────────────────────────────────────────────────────────
// Frame Diffing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate the visual difference between two screenshot buffers.
 * Returns percentage of pixels that changed (0–100).
 *
 * Uses pngjs for accurate per-pixel comparison if available,
 * otherwise falls back to a fast approximate buffer comparison.
 */
function frameDiff(buf1, buf2) {
  if (PNG) {
    return _pngDiff(buf1, buf2);
  }
  return _bufferDiff(buf1, buf2);
}

function _pngDiff(buf1, buf2) {
  try {
    const img1 = PNG.sync.read(buf1);
    const img2 = PNG.sync.read(buf2);

    if (img1.width !== img2.width || img1.height !== img2.height) {
      return 100; // Completely different viewports
    }

    let diffPixels = 0;
    const totalPixels = img1.width * img1.height;

    // Compare RGB channels (skip alpha)
    for (let i = 0; i < img1.data.length; i += 4) {
      const rDiff = Math.abs(img1.data[i]     - img2.data[i]);
      const gDiff = Math.abs(img1.data[i + 1] - img2.data[i + 1]);
      const bDiff = Math.abs(img1.data[i + 2] - img2.data[i + 2]);
      // Pixel is "changed" if any channel differs by > 10 (out of 255)
      if (rDiff > 10 || gDiff > 10 || bDiff > 10) diffPixels++;
    }

    return (diffPixels / totalPixels) * 100;
  } catch (e) {
    return _bufferDiff(buf1, buf2); // Fallback on parse error
  }
}

function _bufferDiff(buf1, buf2) {
  // Skip PNG header (first 8 bytes are always identical)
  const start = 8;
  const minLen = Math.min(buf1.length, buf2.length) - start;

  if (minLen <= 0) return 100;

  let diffBytes = 0;
  for (let i = start; i < minLen + start; i++) {
    if (buf1[i] !== buf2[i]) diffBytes++;
  }

  const lengthPenalty = Math.abs(buf1.length - buf2.length);
  const total = Math.max(buf1.length, buf2.length) - start;
  return ((diffBytes + lengthPenalty) / total) * 100;
}

// ─────────────────────────────────────────────────────────────────────────────
// Key Frame Extraction
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract key frames from a sequence — frames where significant change occurs.
 * Always includes the first (before) and last (after) frames.
 *
 * @param {Array}  frames     - Output from captureTransition()
 * @param {number} [threshold=2] - Min % diff to be considered a key frame
 * @returns {Array} Key frames with diffFromPrev metadata added
 */
function extractKeyFrames(frames, threshold = 2) {
  if (frames.length === 0) return [];
  if (frames.length === 1) return [{ ...frames[0], diffFromPrev: 0, isKeyFrame: true }];

  const keyFrames = [];

  // Always include the "before" frame
  keyFrames.push({ ...frames[0], diffFromPrev: 0, isKeyFrame: true });

  for (let i = 1; i < frames.length; i++) {
    const diff = frameDiff(frames[i - 1].screenshot, frames[i].screenshot);
    const isLast = i === frames.length - 1;
    const isKeyFrame = diff >= threshold || isLast;

    if (isKeyFrame) {
      keyFrames.push({
        ...frames[i],
        diffFromPrev: +diff.toFixed(2),
        isKeyFrame: true,
      });
    }
  }

  // Deduplicate consecutive near-identical key frames (diff < 0.5%)
  const deduped = [keyFrames[0]];
  for (let i = 1; i < keyFrames.length; i++) {
    const prevDiff = frameDiff(keyFrames[i - 1].screenshot, keyFrames[i].screenshot);
    if (prevDiff >= 0.5 || i === keyFrames.length - 1) {
      deduped.push(keyFrames[i]);
    }
  }

  return deduped;
}

// ─────────────────────────────────────────────────────────────────────────────
// Jank Detection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Detect animation jank — a sudden spike in per-frame diff after smooth frames.
 * Jank signature: small diffs → large spike → small diffs.
 *
 * @param {Array<number>} diffValues - Per-frame diff percentages
 * @returns {{ hasJank: boolean, jankFrames: number[] }}
 */
function detectJank(diffValues) {
  const jankFrames = [];

  if (diffValues.length < 3) return { hasJank: false, jankFrames: [] };

  for (let i = 2; i < diffValues.length; i++) {
    const prevAvg = (diffValues[i - 1] + diffValues[i - 2]) / 2;
    const isSpike = diffValues[i] > prevAvg * 4 && diffValues[i] > 15;
    if (isSpike) jankFrames.push(i);
  }

  return { hasJank: jankFrames.length > 0, jankFrames };
}

// ─────────────────────────────────────────────────────────────────────────────
// File I/O
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Save key frames to disk and return enriched frame data with base64 strings.
 *
 * @param {Array}  keyFrames       - Output from extractKeyFrames()
 * @param {string} transitionName  - Used for directory naming
 * @returns {{ dir: string, frames: Array }}
 */
function saveKeyFrames(keyFrames, transitionName) {
  const safeName = transitionName.replace(/[^a-zA-Z0-9-_]/g, '-');
  const dir = path.join(TRANSITIONS_DIR, safeName);
  fs.mkdirSync(dir, { recursive: true });

  const saved = keyFrames.map((frame, i) => {
    const prefix = String(i).padStart(3, '0');
    const filename = `${prefix}-${frame.label.replace(/[^a-zA-Z0-9-]/g, '-')}.png`;
    const filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, frame.screenshot);

    return {
      index: i,
      timestamp: frame.timestamp,
      label: frame.label,
      diffFromPrev: frame.diffFromPrev ?? 0,
      filePath,
      base64: frame.screenshot.toString('base64'),
    };
  });

  return { dir, frames: saved };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Pipeline
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Full transition analysis pipeline:
 * capture → extract key frames → save → compute metrics → return analysis.
 *
 * @param {object} page          - Playwright page
 * @param {string} name          - Transition name (used for file paths)
 * @param {object} options       - Same options as captureTransition()
 * @param {number} [options.diffThreshold=2] - Min % diff for a key frame
 * @returns {TransitionAnalysis}
 */
async function analyzeTransition(page, name, options = {}) {
  console.log(`  🎬 Capturing: ${name}`);

  const allFrames = await captureTransition(page, options);
  const totalDuration = allFrames[allFrames.length - 1]?.timestamp ?? 0;
  console.log(`     ${allFrames.length} frames captured over ${totalDuration}ms`);

  const keyFrames = extractKeyFrames(allFrames, options.diffThreshold ?? 2);
  console.log(`     ${keyFrames.length} key frames identified`);

  const { dir, frames: saved } = saveKeyFrames(keyFrames, name);
  console.log(`     Saved to: ${dir}`);

  // Metrics
  const diffs        = saved.map(f => f.diffFromPrev);
  const maxDiff      = diffs.length > 0 ? Math.max(...diffs) : 0;
  const avgDiff      = diffs.length > 0 ? diffs.reduce((s, d) => s + d, 0) / diffs.length : 0;
  const { hasJank }  = detectJank(diffs);

  // Smoothness classification
  const smoothness =
    maxDiff < 15  ? 'smooth' :
    maxDiff < 35  ? 'moderate' :
    'jarring';

  // Speed classification (based on total captured animation duration)
  // Note: totalDuration includes beforeDelay + animation + afterDelay
  const animDuration = totalDuration - (options.beforeDelay ?? 200) - (options.afterDelay ?? 300);
  const speed =
    animDuration < 150 ? 'instant (no animation detected)' :
    animDuration < 300 ? 'fast' :
    animDuration < 600 ? 'normal' :
    'slow';

  return {
    name,
    totalFrames:  allFrames.length,
    keyFrames:    saved.length,
    maxDiff:      +maxDiff.toFixed(2),
    avgDiff:      +avgDiff.toFixed(2),
    durationMs:   totalDuration,
    animDuration: Math.max(0, animDuration),
    hasJank,
    outputDir:    dir,
    frames:       saved,
    // Convenience: just the base64 strings for Claude Vision
    base64Sequence: saved.map(f => f.base64),
    summary: {
      smoothness,
      speed,
      jank: hasJank ? 'detected' : 'none',
    },
  };
}

/**
 * Run analysis for multiple transitions in sequence.
 *
 * @param {object} page        - Playwright page
 * @param {Array}  transitions - Array of { name, setup?, trigger, duration?, interval? }
 * @returns {Array<TransitionAnalysis>}
 */
async function analyzeMultiple(page, transitions, options = {}) {
  const results = [];

  for (const t of transitions) {
    try {
      if (t.setup) {
        await t.setup(page);
        await page.waitForTimeout(300);
      }

      const result = await analyzeTransition(page, t.name, {
        trigger: () => t.trigger(page),
        duration: t.duration ?? 600,
        interval: t.interval ?? 50,
        diffThreshold: t.diffThreshold ?? 2,
        ...options,
      });

      results.push(result);

      // Reset state between transitions
      await page.keyboard.press('Escape').catch(() => {});
      await page.waitForTimeout(400);

    } catch (err) {
      console.error(`  ⚠️  Failed "${t.name}": ${err.message}`);
      results.push({ name: t.name, error: err.message });
    }
  }

  return results;
}

/**
 * Generate a summary table of multiple transition results.
 * Prints to console and returns markdown string.
 *
 * @param {Array} results - Output from analyzeMultiple()
 * @returns {string} Markdown table
 */
function generateSummary(results) {
  console.log('\n📊 Transition Audit Summary');
  console.log('─'.repeat(90));
  console.log('Transition'.padEnd(36) + 'Duration'.padEnd(12) + 'Smoothness'.padEnd(14) + 'Speed'.padEnd(30) + 'Jank');
  console.log('─'.repeat(90));

  results.forEach(r => {
    if (r.error) {
      console.log(r.name.padEnd(36) + 'ERROR: ' + r.error);
    } else {
      console.log(
        r.name.padEnd(36) +
        `${r.durationMs}ms`.padEnd(12) +
        r.summary.smoothness.padEnd(14) +
        r.summary.speed.padEnd(30) +
        r.summary.jank
      );
    }
  });

  const janky = results.filter(r => r.summary?.jank === 'detected');
  const slow  = results.filter(r => r.summary?.speed === 'slow');
  const noAnim = results.filter(r => !r.error && r.keyFrames <= 2);

  if (janky.length > 0)  console.log(`\n⚠️  Jank detected in: ${janky.map(r => r.name).join(', ')}`);
  if (slow.length > 0)   console.log(`⚠️  Slow transitions: ${slow.map(r => r.name).join(', ')}`);
  if (noAnim.length > 0) console.log(`⚠️  No animation detected: ${noAnim.map(r => r.name).join(', ')}`);

  // Build markdown
  let md = `## Transition Audit Summary\n\n`;
  md += `| Transition | Duration | Smoothness | Speed | Jank | Key Frames |\n`;
  md += `|-----------|---------|-----------|-------|------|------------|\n`;
  results.forEach(r => {
    if (r.error) {
      md += `| ${r.name} | ERROR | — | — | — | ${r.error} |\n`;
    } else {
      md += `| ${r.name} | ${r.durationMs}ms | ${r.summary.smoothness} | ${r.summary.speed} | ${r.summary.jank} | ${r.keyFrames} |\n`;
    }
  });

  return md;
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  captureTransition,
  extractKeyFrames,
  saveKeyFrames,
  analyzeTransition,
  analyzeMultiple,
  generateSummary,
  frameDiff,
  detectJank,
  TRANSITIONS_DIR,
};
