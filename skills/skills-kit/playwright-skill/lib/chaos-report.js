/**
 * Chaos Report Generator
 *
 * Produces a structured CHAOS-REPORT.md following GSD document patterns:
 * - YAML frontmatter with machine-readable metadata
 * - Severity taxonomy: blocker > major > minor > cosmetic
 * - Truth + Status + Evidence triples
 * - Gaps structured for direct consumption by AI fix agents
 * - Recommended fix plans with file paths and action descriptions
 *
 * The report is designed to be consumed by an AI agent that will
 * read it and produce fixes without needing additional context.
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// SEVERITY DEFINITIONS
// ============================================================================

const SEVERITY = {
  blocker: { label: 'blocker', emoji: '🛑', order: 0, description: 'Prevents core functionality, crashes, data loss' },
  major:   { label: 'major',   emoji: '🟠', order: 1, description: 'Feature broken but app still usable' },
  minor:   { label: 'minor',   emoji: '🟡', order: 2, description: 'Works but degraded experience' },
  cosmetic:{ label: 'cosmetic',emoji: '🔵', order: 3, description: 'Visual only, no functional impact' },
};

const CATEGORY = {
  js_error:        'JS Error',
  console_error:   'Console Error',
  crash:           'Page Crash',
  unhandled_rejection: 'Unhandled Promise Rejection',
  broken_layout:   'Broken Layout',
  overflow:        'Content Overflow',
  broken_image:    'Broken Image',
  missing_element: 'Missing Element',
  frozen_ui:       'Frozen UI',
  state_corruption:'State Corruption',
  navigation_fail: 'Navigation Failure',
  form_validation: 'Form Validation Gap',
  accessibility:   'Accessibility Issue',
  performance:     'Performance Degradation',
  visual_glitch:   'Visual Glitch',
  data_leak:       'Data Leak / XSS',
  websocket_fail:  'WebSocket Failure',
  uncaught:        'Uncaught Exception',
  // UX-specific categories (from UX Layout Evaluation)
  ux_layout:             'UX Layout Issue',
  ux_hierarchy:          'Visual Hierarchy Problem',
  ux_cognitive_load:     'High Cognitive Load',
  ux_feedback:           'Missing User Feedback',
  ux_consistency:        'Design Inconsistency',
  ux_interaction:        'Interaction Design Gap',
  ux_typography:         'Typography / Readability Issue',
  ux_spacing:            'Spacing / Rhythm Issue',
  ux_touch_target:       'Touch Target Too Small',
  ux_color_contrast:     'Color Contrast Issue',
  ux_information_arch:   'Information Architecture Gap',
  ux_ai_clarity:         'AI Capability Unclear',
  ux_ai_feedback:        'AI Status / Feedback Missing',
  ux_ai_trust:           'AI Trust Signal Missing',
  ux_ai_control:         'AI Control / Override Missing',
  ux_error_prevention:   'Error Prevention Gap',
  ux_empty_state:        'Empty State UX Missing',
  ux_loading_state:      'Loading State UX Missing',
};

// ============================================================================
// REPORT BUILDER
// ============================================================================

class ChaosReport {
  constructor({ targetUrl, projectName = '', testDate = null }) {
    this.targetUrl = targetUrl;
    this.projectName = projectName;
    this.testDate = testDate || new Date().toISOString();
    this.startTime = Date.now();
    this.endTime = null;

    /** @type {Array<Finding>} */
    this.findings = [];

    /** @type {Array<{action: string, timestamp: string, result: object}>} */
    this.scenariosExecuted = [];

    /** @type {Array<string>} */
    this.screenshots = [];

    /** @type {object|null} */
    this.healthMetrics = null;

    /** @type {{jsErrors: Array, consoleErrors: Array, totalErrors: number}|null} */
    this.errorReport = null;

    /** @type {Array<string>} */
    this.pagesVisited = [];

    /** @type {object} */
    this.environment = {};

    /** @type {object|null} UX assessment scores per view */
    this.uxAssessment = null;
  }

  // --------------------------------------------------------------------------
  // RECORDING METHODS — called during the chaos session
  // --------------------------------------------------------------------------

  /**
   * Record a finding (issue discovered during chaos testing or UX evaluation).
   *
   * @param {object} finding
   * @param {string} finding.id           - Unique ID, e.g. "F001"
   * @param {string} finding.severity     - blocker | major | minor | cosmetic
   * @param {string} finding.category     - Key from CATEGORY map (includes ux_* categories)
   * @param {string} finding.title        - Short description (1 line)
   * @param {string} finding.description  - Detailed description of what happened
   * @param {string} finding.expected     - What should have happened
   * @param {string} finding.actual       - What actually happened
   * @param {string} finding.trigger      - What chaos scenario or UX check triggered this
   * @param {string} [finding.screenshot] - Path to screenshot file
   * @param {Array<{path: string, issue: string, line?: number}>} [finding.artifacts] - Affected files
   * @param {Array<string>} [finding.steps]  - Reproduction steps
   * @param {string} [finding.suggestedFix]  - AI suggestion for fix
   * @param {string} [finding.evidence]      - Raw error message / stack trace
   * @param {string} [finding.heuristic]     - UX heuristic violated (e.g. "H8: Aesthetic & Minimalist")
   * @param {number} [finding.uxScore]       - UX score 1-5 (1=failing, 5=excellent) for this aspect
   * @param {string} [finding.uxContext]     - View/page context for UX findings (e.g. "Backlog view")
   */
  addFinding(finding) {
    if (!finding.id) {
      finding.id = `F${String(this.findings.length + 1).padStart(3, '0')}`;
    }
    finding.timestamp = finding.timestamp || new Date().toISOString();
    finding.severity = finding.severity || 'minor';
    this.findings.push(finding);
    return finding.id;
  }

  /**
   * Record a chaos scenario that was executed.
   */
  addScenario(result) {
    this.scenariosExecuted.push({
      action: result.action || 'unknown',
      timestamp: new Date().toISOString(),
      result,
    });
  }

  /**
   * Record a screenshot taken during the session.
   */
  addScreenshot(filePath, description = '') {
    this.screenshots.push({ path: filePath, description, timestamp: new Date().toISOString() });
  }

  /**
   * Set the health metrics (from chaos.collectHealthMetrics).
   */
  setHealthMetrics(metrics) {
    this.healthMetrics = metrics;
  }

  /**
   * Set the error report (from chaos.setupErrorCollector return value).
   */
  setErrorReport(report) {
    this.errorReport = report;
  }

  /**
   * Record a visited page URL.
   */
  addPageVisited(url) {
    if (!this.pagesVisited.includes(url)) {
      this.pagesVisited.push(url);
    }
  }

  /**
   * Set environment metadata.
   */
  setEnvironment(env) {
    this.environment = { ...this.environment, ...env };
  }

  /**
   * Set UX assessment data (scores per view and overall).
   * @param {object} assessment - { views: [{name, heuristics, lawsOfUX, aiFirst, overall}], overall: {heuristics, lawsOfUX, aiFirst, score} }
   */
  setUXAssessment(assessment) {
    this.uxAssessment = assessment;
  }

  /**
   * Mark the session as finished.
   */
  finish() {
    this.endTime = Date.now();
  }

  // --------------------------------------------------------------------------
  // AUTO-DETECT FINDINGS FROM ERROR COLLECTOR
  // --------------------------------------------------------------------------

  /**
   * Convert raw JS errors and console errors into findings automatically.
   * Call this after the chaos session, before generating the report.
   */
  autoDetectFindings() {
    if (!this.errorReport) return;

    for (const err of this.errorReport.jsErrors || []) {
      const exists = this.findings.some(f =>
        f.category === 'js_error' && f.evidence === err.message
      );
      if (!exists) {
        this.addFinding({
          severity: 'blocker',
          category: 'js_error',
          title: `Uncaught JS Error: ${err.message.slice(0, 80)}`,
          description: `A JavaScript error was thrown and not caught during chaos testing.`,
          expected: 'No uncaught JavaScript errors',
          actual: err.message,
          trigger: 'Detected during chaos session (exact trigger unknown)',
          evidence: err.stack || err.message,
          suggestedFix: 'Add error handling (try/catch) or fix the root cause. Check the stack trace for the origin.',
        });
      }
    }

    for (const msg of this.errorReport.consoleErrors || []) {
      const exists = this.findings.some(f =>
        f.category === 'console_error' && f.evidence === msg
      );
      if (!exists) {
        this.addFinding({
          severity: 'major',
          category: 'console_error',
          title: `Console Error: ${msg.slice(0, 80)}`,
          description: `A console.error was logged during chaos testing.`,
          expected: 'No console errors during normal or chaotic interaction',
          actual: msg,
          trigger: 'Detected during chaos session',
          evidence: msg,
        });
      }
    }

    // Health-based findings
    if (this.healthMetrics) {
      const hm = this.healthMetrics;

      if (hm.brokenImages && hm.brokenImages.length > 0) {
        this.addFinding({
          severity: 'minor',
          category: 'broken_image',
          title: `${hm.brokenImages.length} broken image(s) detected`,
          description: `Images that failed to load after chaos testing.`,
          expected: 'All images should load correctly',
          actual: `Broken: ${hm.brokenImages.join(', ')}`,
          trigger: 'Health metrics check post-chaos',
          evidence: JSON.stringify(hm.brokenImages),
        });
      }

      if (hm.overflowingElements && hm.overflowingElements.length > 0) {
        this.addFinding({
          severity: 'minor',
          category: 'overflow',
          title: `${hm.overflowingElements.length} overflowing element(s) detected`,
          description: `Elements extending beyond the viewport after chaos.`,
          expected: 'No elements should overflow the viewport',
          actual: `Overflowing: ${hm.overflowingElements.join(', ')}`,
          trigger: 'Health metrics check post-chaos',
          evidence: JSON.stringify(hm.overflowingElements),
        });
      }

      if (hm.totalDomNodes && hm.totalDomNodes > 5000) {
        this.addFinding({
          severity: 'cosmetic',
          category: 'performance',
          title: `High DOM node count: ${hm.totalDomNodes}`,
          description: `The DOM has a large number of nodes, which may indicate memory leaks or missing cleanup.`,
          expected: 'DOM node count should stay reasonable (<3000 for most apps)',
          actual: `${hm.totalDomNodes} nodes`,
          trigger: 'Health metrics check post-chaos',
        });
      }
    }
  }

  // --------------------------------------------------------------------------
  // REPORT GENERATION
  // --------------------------------------------------------------------------

  /**
   * Generate the full CHAOS-REPORT.md content.
   * @returns {string} Markdown content
   */
  generate() {
    if (!this.endTime) this.finish();

    const durationMs = this.endTime - this.startTime;
    const durationMin = Math.round(durationMs / 60000);
    const durationSec = Math.round(durationMs / 1000);

    const sorted = [...this.findings].sort((a, b) => {
      return (SEVERITY[a.severity]?.order ?? 9) - (SEVERITY[b.severity]?.order ?? 9);
    });

    const counts = {
      total: sorted.length,
      blocker: sorted.filter(f => f.severity === 'blocker').length,
      major: sorted.filter(f => f.severity === 'major').length,
      minor: sorted.filter(f => f.severity === 'minor').length,
      cosmetic: sorted.filter(f => f.severity === 'cosmetic').length,
    };

    const status = counts.blocker > 0 ? 'critical'
      : counts.major > 0 ? 'issues_found'
      : counts.minor > 0 ? 'minor_issues'
      : 'clean';

    const sections = [];

    // ---- FRONTMATTER ----
    sections.push(this._generateFrontmatter(status, counts, durationSec));

    // ---- HEADER ----
    sections.push(`# Chaos Monkey Test Report`);
    sections.push('');
    sections.push(`**Target:** ${this.targetUrl}`);
    if (this.projectName) sections.push(`**Project:** ${this.projectName}`);
    sections.push(`**Date:** ${this.testDate.split('T')[0]}`);
    sections.push(`**Duration:** ${durationSec > 120 ? durationMin + ' min' : durationSec + 's'}`);
    sections.push(`**Status:** ${this._statusBadge(status)}`);
    sections.push('');

    // ---- EXECUTIVE SUMMARY ----
    sections.push(this._generateSummary(counts, status));

    // ---- FINDINGS TABLE ----
    sections.push(this._generateFindingsTable(sorted));

    // ---- DETAILED FINDINGS ----
    sections.push(this._generateDetailedFindings(sorted));

    // ---- GAPS (GSD-compatible) ----
    sections.push(this._generateGaps(sorted));

    // ---- SCENARIOS EXECUTED ----
    sections.push(this._generateScenariosSection());

    // ---- HEALTH METRICS ----
    sections.push(this._generateHealthSection());

    // ---- SCREENSHOTS ----
    sections.push(this._generateScreenshotsSection());

    // ---- UX ASSESSMENT ----
    sections.push(this._generateUXAssessment());

    // ---- RECOMMENDED FIXES ----
    sections.push(this._generateRecommendedFixes(sorted));

    // ---- FOOTER ----
    sections.push('---');
    sections.push(`*Tested: ${this.testDate}*`);
    sections.push(`*Tester: AI Chaos Monkey (playwright-skill)*`);
    sections.push(`*Total scenarios: ${this.scenariosExecuted.length}*`);
    sections.push(`*Total findings: ${counts.total}*`);

    return sections.join('\n');
  }

  /**
   * Generate and write the report to a file.
   * @param {string} [outputPath] - Path to write. Defaults to /tmp/CHAOS-REPORT.md
   * @returns {string} The path where the report was written.
   */
  writeReport(outputPath) {
    const filePath = outputPath || `/tmp/CHAOS-REPORT-${Date.now()}.md`;
    const content = this.generate();
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`CHAOS-REPORT written to: ${filePath}`);
    return filePath;
  }

  // --------------------------------------------------------------------------
  // PRIVATE SECTION GENERATORS
  // --------------------------------------------------------------------------

  _generateFrontmatter(status, counts, durationSec) {
    const gaps = this.findings
      .filter(f => f.severity === 'blocker' || f.severity === 'major')
      .map(f => ({
        id: f.id,
        truth: f.expected,
        status: 'failed',
        severity: f.severity,
        reason: f.actual,
        category: f.category,
        ...(f.artifacts && f.artifacts.length > 0 && {
          artifacts: f.artifacts.map(a => ({
            path: a.path,
            issue: a.issue,
            ...(a.line && { line: a.line }),
          }))
        }),
        ...(f.suggestedFix && { fix: f.suggestedFix }),
        missing: f.steps || [`Fix: ${f.title}`],
      }));

    const frontmatter = {
      type: 'chaos-report',
      status,
      target_url: this.targetUrl,
      ...(this.projectName && { project: this.projectName }),
      tested: this.testDate,
      duration: `${durationSec}s`,
      scenarios_executed: this.scenariosExecuted.length,
      pages_visited: this.pagesVisited,
      score: `${counts.total - counts.blocker - counts.major}/${counts.total} passed chaos resilience`,
      findings: {
        total: counts.total,
        blocker: counts.blocker,
        major: counts.major,
        minor: counts.minor,
        cosmetic: counts.cosmetic,
      },
      ...(gaps.length > 0 && { gaps }),
      ...(Object.keys(this.environment).length > 0 && { environment: this.environment }),
    };

    return '---\n' + this._yamlSerialize(frontmatter, 0) + '---\n';
  }

  _generateSummary(counts, status) {
    const lines = ['## Executive Summary', ''];

    if (status === 'clean') {
      lines.push('The application survived all chaos scenarios without critical issues. No blockers or major problems were found.');
    } else if (status === 'critical') {
      lines.push(`**CRITICAL:** ${counts.blocker} blocker(s) found. The application has critical resilience gaps that must be fixed before release.`);
    } else if (status === 'issues_found') {
      lines.push(`**Issues found:** ${counts.major} major issue(s) discovered. The application is functional but has significant resilience gaps.`);
    } else {
      lines.push(`**Minor issues:** ${counts.minor} minor issue(s) found. The application is generally resilient but has some edge-case problems.`);
    }

    lines.push('');
    lines.push(`| Severity | Count |`);
    lines.push(`|----------|-------|`);
    lines.push(`| ${SEVERITY.blocker.emoji} Blocker | ${counts.blocker} |`);
    lines.push(`| ${SEVERITY.major.emoji} Major | ${counts.major} |`);
    lines.push(`| ${SEVERITY.minor.emoji} Minor | ${counts.minor} |`);
    lines.push(`| ${SEVERITY.cosmetic.emoji} Cosmetic | ${counts.cosmetic} |`);
    lines.push(`| **Total** | **${counts.total}** |`);
    lines.push('');

    return lines.join('\n');
  }

  _generateFindingsTable(sorted) {
    if (sorted.length === 0) {
      return '## Findings Overview\n\nNo issues found. The application is resilient to chaos testing.\n';
    }

    const lines = ['## Findings Overview', ''];
    lines.push('| # | Severity | Category | Title | Trigger |');
    lines.push('|---|----------|----------|-------|---------|');

    for (const f of sorted) {
      const sev = SEVERITY[f.severity] || SEVERITY.minor;
      const cat = CATEGORY[f.category] || f.category;
      const title = f.title.replace(/\|/g, '\\|').slice(0, 60);
      const trigger = (f.trigger || '').replace(/\|/g, '\\|').slice(0, 40);
      lines.push(`| ${f.id} | ${sev.emoji} ${sev.label} | ${cat} | ${title} | ${trigger} |`);
    }
    lines.push('');

    return lines.join('\n');
  }

  _generateDetailedFindings(sorted) {
    if (sorted.length === 0) return '';

    const lines = ['## Detailed Findings', ''];

    for (const f of sorted) {
      const sev = SEVERITY[f.severity] || SEVERITY.minor;
      const cat = CATEGORY[f.category] || f.category;

      lines.push(`### ${f.id}: ${f.title}`);
      lines.push('');
      lines.push(`- **Severity:** ${sev.emoji} ${sev.label}`);
      lines.push(`- **Category:** ${cat}`);
      lines.push(`- **Trigger:** ${f.trigger || 'Unknown'}`);
      if (f.timestamp) lines.push(`- **Detected:** ${f.timestamp}`);
      lines.push('');

      lines.push(`**Expected:** ${f.expected}`);
      lines.push('');
      lines.push(`**Actual:** ${f.actual}`);
      lines.push('');

      if (f.description) {
        lines.push(f.description);
        lines.push('');
      }

      if (f.steps && f.steps.length > 0) {
        lines.push('**Reproduction Steps:**');
        f.steps.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
        lines.push('');
      }

      if (f.evidence) {
        lines.push('**Evidence:**');
        lines.push('```');
        lines.push(f.evidence.slice(0, 500));
        lines.push('```');
        lines.push('');
      }

      if (f.artifacts && f.artifacts.length > 0) {
        lines.push('**Affected Files:**');
        for (const a of f.artifacts) {
          const lineRef = a.line ? `:${a.line}` : '';
          lines.push(`- \`${a.path}${lineRef}\` — ${a.issue}`);
        }
        lines.push('');
      }

      if (f.screenshot) {
        lines.push(`**Screenshot:** \`${f.screenshot}\``);
        lines.push('');
      }

      if (f.suggestedFix) {
        lines.push(`**Suggested Fix:** ${f.suggestedFix}`);
        lines.push('');
      }

      lines.push('---');
      lines.push('');
    }

    return lines.join('\n');
  }

  _generateGaps(sorted) {
    const actionable = sorted.filter(f => f.severity === 'blocker' || f.severity === 'major');
    if (actionable.length === 0) return '';

    const lines = [
      '## Gaps',
      '',
      'Structured gap list for consumption by AI fix agents (GSD-compatible format):',
      '',
      '```yaml',
    ];

    for (const f of actionable) {
      lines.push(`- id: "${f.id}"`);
      lines.push(`  truth: "${this._escapeYamlString(f.expected)}"`);
      lines.push(`  status: failed`);
      lines.push(`  severity: ${f.severity}`);
      lines.push(`  reason: "${this._escapeYamlString(f.actual)}"`);
      lines.push(`  category: ${f.category}`);
      if (f.trigger) {
        lines.push(`  trigger: "${this._escapeYamlString(f.trigger)}"`);
      }
      if (f.artifacts && f.artifacts.length > 0) {
        lines.push(`  artifacts:`);
        for (const a of f.artifacts) {
          lines.push(`    - path: "${a.path}"`);
          lines.push(`      issue: "${this._escapeYamlString(a.issue)}"`);
          if (a.line) lines.push(`      line: ${a.line}`);
        }
      }
      if (f.evidence) {
        lines.push(`  evidence: "${this._escapeYamlString(f.evidence.slice(0, 200))}"`);
      }
      if (f.suggestedFix) {
        lines.push(`  fix: "${this._escapeYamlString(f.suggestedFix)}"`);
      }
      lines.push(`  missing:`);
      if (f.steps && f.steps.length > 0) {
        for (const s of f.steps) {
          lines.push(`    - "${this._escapeYamlString(s)}"`);
        }
      } else {
        lines.push(`    - "Fix: ${this._escapeYamlString(f.title)}"`);
      }
      lines.push('');
    }

    lines.push('```');
    lines.push('');

    return lines.join('\n');
  }

  _generateScenariosSection() {
    const lines = ['## Chaos Scenarios Executed', ''];

    if (this.scenariosExecuted.length === 0) {
      lines.push('No scenarios recorded.');
      lines.push('');
      return lines.join('\n');
    }

    // Group by action name
    const grouped = {};
    for (const s of this.scenariosExecuted) {
      grouped[s.action] = (grouped[s.action] || 0) + 1;
    }

    lines.push(`**Total scenarios:** ${this.scenariosExecuted.length}`);
    lines.push('');
    lines.push('| Scenario | Times Executed |');
    lines.push('|----------|---------------|');
    for (const [action, count] of Object.entries(grouped).sort((a, b) => b[1] - a[1])) {
      lines.push(`| ${action} | ${count} |`);
    }
    lines.push('');

    return lines.join('\n');
  }

  _generateHealthSection() {
    if (!this.healthMetrics) return '';

    const hm = this.healthMetrics;
    const lines = ['## Health Metrics (Post-Chaos)', ''];

    lines.push('| Metric | Value | Status |');
    lines.push('|--------|-------|--------|');

    const domStatus = (hm.totalDomNodes || 0) > 5000 ? '⚠️ High' : '✅ OK';
    lines.push(`| DOM Nodes | ${hm.totalDomNodes || '?'} | ${domStatus} |`);

    const docW = hm.documentWidth || '?';
    const docH = hm.documentHeight || '?';
    lines.push(`| Document Size | ${docW} x ${docH} | - |`);

    const imgStatus = (hm.brokenImages?.length || 0) > 0 ? `🛑 ${hm.brokenImages.length} broken` : '✅ OK';
    lines.push(`| Broken Images | ${hm.brokenImages?.length || 0} | ${imgStatus} |`);

    const overflowStatus = (hm.overflowingElements?.length || 0) > 0 ? `⚠️ ${hm.overflowingElements.length} overflowing` : '✅ OK';
    lines.push(`| Overflowing Elements | ${hm.overflowingElements?.length || 0} | ${overflowStatus} |`);

    const zStatus = (hm.highZIndexElements?.length || 0) > 0 ? `⚠️ ${hm.highZIndexElements.length} high` : '✅ OK';
    lines.push(`| High z-index Elements | ${hm.highZIndexElements?.length || 0} | ${zStatus} |`);

    lines.push('');

    if (this.errorReport) {
      lines.push(`| JS Errors Caught | ${this.errorReport.jsErrors?.length || 0} | ${this.errorReport.jsErrors?.length > 0 ? '🛑' : '✅'} |`);
      lines.push(`| Console Errors | ${this.errorReport.consoleErrors?.length || 0} | ${this.errorReport.consoleErrors?.length > 0 ? '🟠' : '✅'} |`);
      lines.push('');
    }

    return lines.join('\n');
  }

  _generateScreenshotsSection() {
    if (this.screenshots.length === 0) return '';

    const lines = ['## Screenshots', ''];

    for (const s of this.screenshots) {
      const desc = s.description ? ` — ${s.description}` : '';
      lines.push(`- \`${s.path}\`${desc} (${s.timestamp.split('T')[1]?.split('.')[0] || ''})`);
    }
    lines.push('');

    return lines.join('\n');
  }

  _generateUXAssessment() {
    const uxFindings = this.findings.filter(f => f.category && f.category.startsWith('ux_'));
    const hasAssessment = this.uxAssessment || uxFindings.length > 0;

    if (!hasAssessment) return '';

    const lines = ['## UX Layout Assessment', ''];

    if (this.uxAssessment) {
      const a = this.uxAssessment;

      if (a.overall) {
        const score = a.overall.score || a.overall.overall || '?';
        const scoreNum = parseFloat(score);
        const rating = scoreNum >= 4.5 ? '🌟 Excellent'
          : scoreNum >= 3.5 ? '✅ Good'
          : scoreNum >= 2.5 ? '⚠️ Needs Improvement'
          : '🛑 Poor';

        lines.push(`**Overall UX Score:** ${score}/5 — ${rating}`);
        lines.push('');
      }

      if (a.views && a.views.length > 0) {
        lines.push('### Scores by View');
        lines.push('');
        lines.push('| View | Heuristics | Laws of UX | AI-First | Overall |');
        lines.push('|------|-----------|------------|----------|---------|');
        for (const v of a.views) {
          const h = v.heuristics != null ? `${v.heuristics}/5` : '-';
          const l = v.lawsOfUX != null ? `${v.lawsOfUX}/5` : '-';
          const ai = v.aiFirst != null ? `${v.aiFirst}/5` : '-';
          const o = v.overall != null ? `**${v.overall}/5**` : '-';
          lines.push(`| ${v.name} | ${h} | ${l} | ${ai} | ${o} |`);
        }
        if (a.overall) {
          const h = a.overall.heuristics != null ? `${a.overall.heuristics}/5` : '-';
          const l = a.overall.lawsOfUX != null ? `${a.overall.lawsOfUX}/5` : '-';
          const ai = a.overall.aiFirst != null ? `${a.overall.aiFirst}/5` : '-';
          const o = a.overall.score != null ? `**${a.overall.score}/5**` : '-';
          lines.push(`| **Overall** | ${h} | ${l} | ${ai} | ${o} |`);
        }
        lines.push('');
      }

      if (a.highlights && a.highlights.length > 0) {
        lines.push('### UX Highlights (What Works Well)');
        lines.push('');
        for (const h of a.highlights) {
          lines.push(`- ✅ ${h}`);
        }
        lines.push('');
      }

      if (a.topImprovements && a.topImprovements.length > 0) {
        lines.push('### Top UX Improvement Opportunities');
        lines.push('');
        for (const imp of a.topImprovements) {
          lines.push(`- ${imp}`);
        }
        lines.push('');
      }
    }

    if (uxFindings.length > 0) {
      lines.push('### UX Findings Summary');
      lines.push('');
      lines.push('| # | Severity | Heuristic | View | Issue |');
      lines.push('|---|----------|-----------|------|-------|');
      for (const f of uxFindings) {
        const sev = SEVERITY[f.severity] || SEVERITY.minor;
        const heuristic = (f.heuristic || '').slice(0, 30);
        const view = (f.uxContext || '').slice(0, 20);
        const title = f.title.slice(0, 50);
        lines.push(`| ${f.id} | ${sev.emoji} ${sev.label} | ${heuristic} | ${view} | ${title} |`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  _generateRecommendedFixes(sorted) {
    const fixable = sorted.filter(f => f.severity === 'blocker' || f.severity === 'major');
    if (fixable.length === 0) return '';

    const lines = [
      '## Recommended Fix Plan',
      '',
      'Fixes ordered by severity. Each fix can be executed independently.',
      '',
    ];

    let fixNum = 1;
    for (const f of fixable) {
      const sev = SEVERITY[f.severity] || SEVERITY.minor;
      lines.push(`### Fix ${fixNum}: ${f.title}`);
      lines.push('');
      lines.push(`- **Finding:** ${f.id}`);
      lines.push(`- **Priority:** ${sev.emoji} ${sev.label}`);
      lines.push(`- **Category:** ${CATEGORY[f.category] || f.category}`);
      lines.push('');

      lines.push('**Problem:**');
      lines.push(f.actual);
      lines.push('');

      lines.push('**Expected behavior:**');
      lines.push(f.expected);
      lines.push('');

      if (f.artifacts && f.artifacts.length > 0) {
        lines.push('**Files to investigate:**');
        for (const a of f.artifacts) {
          const lineRef = a.line ? `:${a.line}` : '';
          lines.push(`- \`${a.path}${lineRef}\` — ${a.issue}`);
        }
        lines.push('');
      }

      if (f.suggestedFix) {
        lines.push('**Suggested approach:**');
        lines.push(f.suggestedFix);
        lines.push('');
      }

      if (f.evidence) {
        lines.push('**Error evidence:**');
        lines.push('```');
        lines.push(f.evidence.slice(0, 300));
        lines.push('```');
        lines.push('');
      }

      lines.push('**Verification:**');
      lines.push(`Re-run chaos scenario \`${f.trigger || f.category}\` and confirm the error no longer occurs.`);
      lines.push('');

      fixNum++;
    }

    return lines.join('\n');
  }

  // --------------------------------------------------------------------------
  // UTILITIES
  // --------------------------------------------------------------------------

  _statusBadge(status) {
    switch (status) {
      case 'critical':     return '🛑 CRITICAL — Blockers found';
      case 'issues_found': return '🟠 ISSUES FOUND — Major problems detected';
      case 'minor_issues': return '🟡 MINOR ISSUES — Edge cases found';
      case 'clean':        return '✅ CLEAN — All chaos scenarios survived';
      default:             return status;
    }
  }

  _escapeYamlString(str) {
    if (!str) return '';
    return str.replace(/"/g, '\\"').replace(/\n/g, ' ').slice(0, 200);
  }

  _yamlValue(v) {
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    const s = String(v);
    if (/^[a-zA-Z0-9_/.:-]+$/.test(s) && s.length < 80) return s;
    return `"${this._escapeYamlString(s)}"`;
  }

  /**
   * Simple YAML serializer for frontmatter.
   * Handles objects, arrays, strings, numbers, booleans.
   */
  _yamlSerialize(obj, indent = 0) {
    const pad = '  '.repeat(indent);
    let output = '';

    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) continue;

      if (Array.isArray(value)) {
        if (value.length === 0) {
          output += `${pad}${key}: []\n`;
        } else if (typeof value[0] === 'object') {
          output += `${pad}${key}:\n`;
          const itemPad = '  '.repeat(indent + 1);
          const contPad = '  '.repeat(indent + 2);
          for (const item of value) {
            const entries = Object.entries(item).filter(([, v]) => v !== null && v !== undefined);
            let first = true;
            for (const [k, v] of entries) {
              const prefix = first ? `${itemPad}- ` : `${contPad}`;
              first = false;
              if (Array.isArray(v)) {
                output += `${prefix}${k}:\n`;
                const subPad = '  '.repeat(indent + 3);
                for (const sub of v) {
                  if (typeof sub === 'object') {
                    const subEntries = Object.entries(sub).filter(([, sv]) => sv !== null && sv !== undefined);
                    let subFirst = true;
                    for (const [sk, sv] of subEntries) {
                      const subPrefix = subFirst ? `${subPad}- ` : `${subPad}  `;
                      subFirst = false;
                      output += `${subPrefix}${sk}: ${this._yamlValue(sv)}\n`;
                    }
                  } else {
                    output += `${subPad}- ${this._yamlValue(sub)}\n`;
                  }
                }
              } else if (typeof v === 'object') {
                output += `${prefix}${k}:\n`;
                output += this._yamlSerialize(v, indent + 3);
              } else {
                output += `${prefix}${k}: ${this._yamlValue(v)}\n`;
              }
            }
          }
        } else {
          output += `${pad}${key}:\n`;
          for (const item of value) {
            output += `${pad}  - ${this._yamlValue(item)}\n`;
          }
        }
      } else if (typeof value === 'object') {
        output += `${pad}${key}:\n`;
        output += this._yamlSerialize(value, indent + 1);
      } else if (typeof value === 'string') {
        // Don't quote simple strings that look safe
        if (/^[a-zA-Z0-9_/.:-]+$/.test(value) && value.length < 80) {
          output += `${pad}${key}: ${value}\n`;
        } else {
          output += `${pad}${key}: "${this._escapeYamlString(value)}"\n`;
        }
      } else {
        output += `${pad}${key}: ${value}\n`;
      }
    }

    return output;
  }
}


// ============================================================================
// CONVENIENCE: Create a pre-wired chaos session with automatic reporting
// ============================================================================

/**
 * Create a chaos session that automatically collects errors, records scenarios,
 * and generates a structured report at the end.
 *
 * @param {object} options
 * @param {import('playwright').Page} options.page
 * @param {import('playwright').BrowserContext} options.context
 * @param {string} options.targetUrl
 * @param {string} [options.projectName]
 * @param {string} [options.outputPath]
 * @returns {{ report: ChaosReport, chaos: object, run: function, finish: function }}
 */
function createChaosSession({ page, context, targetUrl, projectName, outputPath }) {
  const chaos = require('./chaos-monkey');
  const report = new ChaosReport({ targetUrl, projectName });
  const getErrors = chaos.setupErrorCollector(page);

  // Wrap each chaos function to auto-record scenarios
  const wrappedChaos = {};
  for (const [name, fn] of Object.entries(chaos)) {
    if (typeof fn === 'function' && name !== 'setupErrorCollector') {
      wrappedChaos[name] = async (...args) => {
        const result = await fn(...args);
        if (result && typeof result === 'object' && result.action) {
          report.addScenario(result);
        }
        return result;
      };
    } else {
      wrappedChaos[name] = fn;
    }
  }

  /**
   * Run a chaos function by name and record it.
   * @param {string} name - Function name from chaos-monkey module
   * @param  {...any} args - Arguments to pass
   */
  async function run(name, ...args) {
    if (!wrappedChaos[name]) throw new Error(`Unknown chaos scenario: ${name}`);
    return wrappedChaos[name](...args);
  }

  /**
   * Finish the session: collect errors, detect findings, write report.
   * @param {string} [screenshotPath] - Take a final screenshot
   * @returns {Promise<string>} Path to the written report
   */
  async function finish(screenshotPath) {
    // Final screenshot
    if (screenshotPath) {
      await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
      report.addScreenshot(screenshotPath, 'Final state after chaos');
    }

    // Collect health metrics
    const health = await chaos.collectHealthMetrics(page).catch(() => null);
    if (health) report.setHealthMetrics(health);

    // Collect error report
    const errors = getErrors();
    report.setErrorReport(errors);

    // Auto-detect findings from errors
    report.autoDetectFindings();

    // Write report
    report.finish();
    const reportPath = report.writeReport(outputPath);

    // Print summary to console
    const counts = {
      blocker: report.findings.filter(f => f.severity === 'blocker').length,
      major: report.findings.filter(f => f.severity === 'major').length,
      minor: report.findings.filter(f => f.severity === 'minor').length,
      cosmetic: report.findings.filter(f => f.severity === 'cosmetic').length,
    };
    console.log('\n=== CHAOS MONKEY REPORT ===');
    console.log(`Status: ${counts.blocker > 0 ? 'CRITICAL' : counts.major > 0 ? 'ISSUES FOUND' : 'CLEAN'}`);
    console.log(`Findings: ${report.findings.length} (${counts.blocker}B / ${counts.major}M / ${counts.minor}m / ${counts.cosmetic}c)`);
    console.log(`Scenarios: ${report.scenariosExecuted.length}`);
    console.log(`Report: ${reportPath}`);

    return reportPath;
  }

  return {
    report,
    chaos: wrappedChaos,
    run,
    finish,
  };
}


module.exports = {
  ChaosReport,
  createChaosSession,
  SEVERITY,
  CATEGORY,
};
