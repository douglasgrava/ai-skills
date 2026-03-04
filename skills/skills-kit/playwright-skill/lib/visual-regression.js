/**
 * Visual Regression Library for Claude Code UX Testing
 *
 * Provides pixel-level screenshot comparison with baseline management.
 * Uses pixelmatch + pngjs for accurate per-pixel diff computation.
 * Falls back to approximate byte-level comparison if deps not installed.
 *
 * Usage:
 *   const vr = require('./lib/visual-regression');
 *   await vr.saveBaseline(page, 'dashboard');
 *   const result = await vr.compareWithBaseline(page, 'dashboard');
 *   if (!result.pass) { console.log('Diff:', result.diffPercent + '%'); }
 */

const fs = require('fs');
const path = require('path');

const BASELINE_DIR = path.join(process.cwd(), '.testing', 'baselines');
const DIFF_DIR = path.join(process.cwd(), '.testing', 'diffs');

// Try to load pixelmatch + pngjs (optional but recommended)
let pixelmatch, PNG;
try {
  const _pm = require('pixelmatch');
  pixelmatch = _pm.default ?? _pm; // pixelmatch v6+ is ESM-only; require() returns { default: fn }
  PNG = require('pngjs').PNG;
} catch (e) {
  // Will use byte-level fallback — install with:
  // cd playwright-skill && npm install pixelmatch pngjs
}

// ─────────────────────────────────────────────────────────────────────────────
// Core Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Save current page screenshot as the approved baseline for a named test.
 *
 * @param {object} page         - Playwright page object
 * @param {string} name         - Test name (used for file path)
 * @param {object} [options]
 * @param {boolean} [options.fullPage=false] - Full page or viewport
 * @param {object} [options.clip]            - Clip region {x,y,width,height}
 * @returns {{ saved: boolean, path: string }}
 */
async function saveBaseline(page, name, options = {}) {
  fs.mkdirSync(BASELINE_DIR, { recursive: true });

  const filePath = path.join(BASELINE_DIR, `${name}.png`);
  await page.screenshot({
    path: filePath,
    fullPage: options.fullPage ?? false,
    clip: options.clip,
  });

  const stats = fs.statSync(filePath);
  return { saved: true, path: filePath, size: stats.size };
}

/**
 * Compare current page to its baseline.
 * If no baseline exists, auto-creates one and returns { firstRun: true }.
 *
 * @param {object} page           - Playwright page object
 * @param {string} name           - Test name (must match saveBaseline name)
 * @param {object} [options]
 * @param {number} [options.threshold=0.5]   - Max allowed diff % (0–100)
 * @param {boolean} [options.fullPage=false] - Full page or viewport
 * @param {object} [options.clip]            - Clip region
 * @returns {{ pass, firstRun?, diffPercent, name, baselinePath, currentPath, diffPath? }}
 */
async function compareWithBaseline(page, name, options = {}) {
  const threshold = options.threshold ?? 0.5;

  fs.mkdirSync(BASELINE_DIR, { recursive: true });
  fs.mkdirSync(DIFF_DIR, { recursive: true });

  const baselinePath = path.join(BASELINE_DIR, `${name}.png`);
  const currentPath  = path.join(DIFF_DIR, `${name}-current.png`);
  const diffPath     = path.join(DIFF_DIR, `${name}-diff.png`);

  // Auto-create baseline on first run
  if (!fs.existsSync(baselinePath)) {
    await page.screenshot({
      path: baselinePath,
      fullPage: options.fullPage ?? false,
      clip: options.clip,
    });
    return {
      pass: true,
      firstRun: true,
      diffPercent: 0,
      name,
      baselinePath,
      message: 'Baseline created (first run — approve this as the golden master)',
    };
  }

  // Take current screenshot
  await page.screenshot({
    path: currentPath,
    fullPage: options.fullPage ?? false,
    clip: options.clip,
  });

  // Compare
  if (pixelmatch && PNG) {
    return _pixelmatchCompare(baselinePath, currentPath, diffPath, threshold, name);
  } else {
    return _byteCompare(baselinePath, currentPath, threshold, name);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Comparison Implementations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Accurate pixel-level comparison using pixelmatch.
 * Ignores anti-aliasing differences. Creates a visual diff PNG.
 */
function _pixelmatchCompare(baselinePath, currentPath, diffPath, threshold, name) {
  try {
    const baselineData = fs.readFileSync(baselinePath);
    const currentData  = fs.readFileSync(currentPath);

    const baseline = PNG.sync.read(baselineData);
    const current  = PNG.sync.read(currentData);

    // Size mismatch = 100% different
    if (baseline.width !== current.width || baseline.height !== current.height) {
      return {
        pass: false,
        diffPercent: 100,
        name,
        baselinePath,
        currentPath,
        reason: `Viewport size changed: baseline=${baseline.width}x${baseline.height}, current=${current.width}x${current.height}`,
      };
    }

    const { width, height } = baseline;
    const diff = new PNG({ width, height });

    const numDiff = pixelmatch(
      baseline.data,
      current.data,
      diff.data,
      width,
      height,
      {
        threshold: 0.1,    // Per-pixel tolerance (0–1), not the suite threshold
        alpha: 0.1,        // Reduce alpha channel weight
        includeAA: false,  // Exclude anti-aliased pixels from diff count
      }
    );

    const diffPercent = (numDiff / (width * height)) * 100;
    const pass = diffPercent <= threshold;

    if (!pass) {
      // Save visual diff image for Claude to analyze
      fs.writeFileSync(diffPath, PNG.sync.write(diff));
    }

    return {
      pass,
      diffPercent: +diffPercent.toFixed(4),
      diffPixels: numDiff,
      totalPixels: width * height,
      name,
      baselinePath,
      currentPath,
      diffPath: pass ? null : diffPath,
      method: 'pixelmatch',
    };

  } catch (err) {
    return {
      pass: false,
      diffPercent: -1,
      name,
      error: `pixelmatch error: ${err.message}`,
      baselinePath,
      currentPath,
    };
  }
}

/**
 * Approximate byte-level comparison (fallback when pixelmatch not installed).
 * Less accurate — PNG compression can cause identical images to have different bytes.
 * Install pixelmatch+pngjs for accurate results.
 */
function _byteCompare(baselinePath, currentPath, threshold, name) {
  const baselineBuffer = fs.readFileSync(baselinePath);
  const currentBuffer  = fs.readFileSync(currentPath);

  // Quick size diff
  const sizeDiff = Math.abs(baselineBuffer.length - currentBuffer.length) / baselineBuffer.length * 100;

  // Byte-level comparison
  const minLen = Math.min(baselineBuffer.length, currentBuffer.length);
  let diffBytes = 0;
  for (let i = 0; i < minLen; i++) {
    if (baselineBuffer[i] !== currentBuffer[i]) diffBytes++;
  }

  // Account for length difference
  const lengthPenalty = Math.abs(baselineBuffer.length - currentBuffer.length);
  const totalDiff = diffBytes + lengthPenalty;
  const diffPercent = (totalDiff / Math.max(baselineBuffer.length, currentBuffer.length)) * 100;

  return {
    pass: diffPercent <= threshold,
    diffPercent: +diffPercent.toFixed(4),
    name,
    baselinePath,
    currentPath,
    method: 'byte-compare (approximate — install pixelmatch+pngjs for accuracy)',
    note: sizeDiff > 1 ? `File size changed ${sizeDiff.toFixed(1)}%` : undefined,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Suite Runner
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run visual regression for multiple views.
 *
 * @param {object} page    - Playwright page
 * @param {Array}  views   - Array of { name, navigate(page), waitFor?, clip? }
 * @param {object} options - { threshold, fullPage, settleDelay }
 * @returns {Array} Results array
 */
async function runRegressionSuite(page, views, options = {}) {
  const results = [];

  for (const view of views) {
    console.log(`\n📸 Testing: ${view.name}`);

    try {
      if (view.navigate) {
        await view.navigate(page);
      }

      if (view.waitFor) {
        await page.waitForSelector(view.waitFor, { timeout: 5000 }).catch(() => {});
      }

      await page.waitForTimeout(options.settleDelay ?? 400);

      const result = await compareWithBaseline(page, view.name, {
        threshold: options.threshold ?? 0.5,
        fullPage: options.fullPage ?? false,
        clip: view.clip,
      });

      results.push({ view: view.name, ...result });

      if (result.firstRun) {
        console.log(`  🆕 Baseline created: ${result.baselinePath}`);
      } else if (result.pass) {
        console.log(`  ✅ PASS — ${result.diffPercent}% diff (≤ ${options.threshold ?? 0.5}% threshold)`);
      } else {
        console.log(`  ❌ FAIL — ${result.diffPercent}% diff (> ${options.threshold ?? 0.5}% threshold)`);
        if (result.diffPath) console.log(`     Diff image: ${result.diffPath}`);
        if (result.reason)   console.log(`     Reason: ${result.reason}`);
      }

    } catch (err) {
      const errorResult = { view: view.name, pass: false, error: err.message };
      results.push(errorResult);
      console.log(`  ❌ ERROR — ${err.message}`);
    }
  }

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// Baseline Management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * List all existing baselines.
 * @returns {Array} of { name, path, size, mtime }
 */
function listBaselines() {
  if (!fs.existsSync(BASELINE_DIR)) return [];

  return fs.readdirSync(BASELINE_DIR)
    .filter(f => f.endsWith('.png'))
    .map(f => {
      const filePath = path.join(BASELINE_DIR, f);
      const stats = fs.statSync(filePath);
      return {
        name: f.replace('.png', ''),
        path: filePath,
        size: stats.size,
        mtime: stats.mtime,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Delete a baseline to force recreation on next comparison run.
 * @param {string} name - Baseline name (without .png)
 * @returns {boolean} true if deleted, false if not found
 */
function deleteBaseline(name) {
  const filePath = path.join(BASELINE_DIR, `${name}.png`);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }
  return false;
}

/**
 * Delete all diff files (current screenshots and diff images).
 * Useful for cleaning up after a test run.
 */
function cleanDiffs() {
  if (!fs.existsSync(DIFF_DIR)) return 0;
  const files = fs.readdirSync(DIFF_DIR).filter(f => f.endsWith('.png'));
  files.forEach(f => fs.unlinkSync(path.join(DIFF_DIR, f)));
  return files.length;
}

// ─────────────────────────────────────────────────────────────────────────────
// Report Generation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a markdown report from regression suite results.
 * @param {Array}  results - Output from runRegressionSuite()
 * @param {object} options - { title }
 * @returns {string} Markdown report
 */
function generateReport(results, options = {}) {
  const passed   = results.filter(r => r.pass).length;
  const failed   = results.filter(r => !r.pass && !r.firstRun && !r.error).length;
  const newBases = results.filter(r => r.firstRun).length;
  const errors   = results.filter(r => r.error).length;

  const overallPass = failed === 0 && errors === 0;
  const statusBadge = overallPass
    ? `✅ PASS (${passed} views match baselines)`
    : `❌ FAIL (${failed} regressions${errors > 0 ? `, ${errors} errors` : ''})`;

  let md = `# Visual Regression Report\n\n`;
  md += `**${options.title ?? 'UI'}**\n`;
  md += `**Date:** ${new Date().toISOString()}\n`;
  md += `**Status:** ${statusBadge}\n`;
  md += `**Method:** ${pixelmatch ? 'pixelmatch (pixel-accurate)' : 'byte-compare (approximate)'}\n\n`;

  md += `## Summary\n\n`;
  md += `| Result | Count |\n`;
  md += `|--------|-------|\n`;
  md += `| ✅ Pass | ${passed - newBases} |\n`;
  md += `| 🆕 New Baseline | ${newBases} |\n`;
  md += `| ❌ Regression | ${failed} |\n`;
  md += `| ⚠️ Error | ${errors} |\n\n`;

  md += `## Results by View\n\n`;
  md += `| View | Status | Diff % | Details |\n`;
  md += `|------|--------|--------|---------|\n`;

  for (const r of results) {
    const icon = r.error ? '⚠️' : r.firstRun ? '🆕' : r.pass ? '✅' : '❌';
    const diff = r.firstRun ? 'new baseline' : r.error ? 'error' : `${r.diffPercent}%`;
    const detail = r.error ?? r.reason ?? r.note ?? '';
    md += `| ${r.view} | ${icon} | ${diff} | ${detail} |\n`;
  }

  // Detailed failure section
  const failures = results.filter(r => !r.pass && !r.firstRun);
  if (failures.length > 0) {
    md += `\n## Failures — Claude Should Analyze These\n\n`;
    for (const f of failures) {
      md += `### ❌ ${f.view}\n\n`;
      md += `**Diff:** ${f.diffPercent}%\n\n`;
      if (f.diffPath)     md += `**Diff image** (read this to see what changed): \`${f.diffPath}\`\n\n`;
      if (f.currentPath)  md += `**Current:** \`${f.currentPath}\`\n\n`;
      if (f.baselinePath) md += `**Baseline:** \`${f.baselinePath}\`\n\n`;
      if (f.reason)       md += `**Reason:** ${f.reason}\n\n`;
      md += `To update baseline (if change is intentional):\n`;
      md += `\`\`\`bash\nnode -e "require('./lib/visual-regression').deleteBaseline('${f.view}')"\n\`\`\`\n\n`;
    }
  }

  return md;
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  saveBaseline,
  compareWithBaseline,
  runRegressionSuite,
  listBaselines,
  deleteBaseline,
  cleanDiffs,
  generateReport,
  BASELINE_DIR,
  DIFF_DIR,
};
