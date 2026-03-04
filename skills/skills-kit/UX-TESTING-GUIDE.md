# UX Testing & Design Quality Framework

This skills kit provides an integrated system of **7 skills + 4 libraries** for comprehensive UX/UI auditing of any web application:

```
visual-regression  → Pixel diff against baselines (CSS regressions)
transition-auditor → Frame analysis of animations (jank, timing, smoothness)
ai-design-critique → Visual analysis with Claude Vision (8 dimensions)
accessibility-deep → axe-core + contextual vision (WCAG AA)
e2e-uat            → Chaos monkey + UX heuristic evaluation
ux-screenwriter    → Narrative journey validation
ux-explorer        → Orchestrator (coordinates all of the above)
```

## Setup

1. **Copy the `skills-kit/` directory** into your project's `.claude/skills/` directory
2. **Edit `project-context.json`** with your project's details (URL, views, transitions)
3. **Install Playwright** in the playwright-skill directory:
   ```bash
   cd .claude/skills/playwright-skill && npm run setup
   ```
4. **Install pixel diff** (optional, recommended):
   ```bash
   cd .claude/skills/playwright-skill && npm install pixelmatch pngjs
   ```

---

## Invoking Skills

### Full Audit
```bash
@ux-explorer --full
```
Executes all tests, saves consolidated report. **Time:** ~35-45 minutes

### Individual Tests

**Visual Regression** — Detect CSS/layout changes
```bash
@visual-regression --all              # Compare all views
@visual-regression --update           # Update approved baselines
@visual-regression --list             # List existing baselines
```

**Transition Auditor** — Analyze animations
```bash
@transition-auditor --all             # Audit all transitions
@transition-auditor page-switch       # Analyze a specific transition
```

**Design Critique** — Visual critique with Claude Vision
```bash
@ai-design-critique --all             # Analyze all views
@ai-design-critique Dashboard         # Critique a specific view
@ai-design-critique --dark-mode       # Analyze dark mode
```

**Accessibility Deep** — WCAG compliance
```bash
@accessibility-deep --all             # Audit all views
@accessibility-deep Settings          # Audit a specific view
@accessibility-deep --wcag-aaa        # Include AAA rules
@accessibility-deep --mobile          # Test for touch (44px minimum)
```

**E2E UAT** — Functional testing & chaos
```bash
@e2e-uat 1                            # Run phase 1 tests
@e2e-uat --chaos                      # Run chaos monkey
@e2e-uat --ux-audit                   # Run UX heuristic evaluation
```

**UX Screenwriter** — Narrative validation
```bash
@ux-screenwriter --full               # Full narrative audit
@ux-screenwriter --journey=onboarding # Validate specific journey
@ux-screenwriter --ai-character       # AI character consistency check
```

---

## Recommended Workflow

### After Implementing a New Feature
1. `@visual-regression --all` — Check for visual regression
2. `@transition-auditor --all` — If animations were added
3. `@ux-explorer --full` — Complete audit before PR

### Before Deploy
1. Run `@ux-explorer --full`
2. Review report in `.planning/ux-explorer-*.md`
3. Fix blocker/major issues
4. Re-test fixed areas

### Design Review Process
1. Implement feature
2. `@ai-design-critique` for visual polish
3. `@accessibility-deep` for compliance
4. Iterate until passing

---

## Outputs & Artifacts

```
.testing/baselines/              Reference snapshots (golden master)
.testing/diffs/                  Visual diffs (pixelmatch comparisons)
.testing/transitions/            Animation key frames
.testing/design-critique/        Claude Vision screenshots
.testing/accessibility/          Accessibility screenshots

.planning/ux-explorer-*.md       Consolidated report
.planning/design-critique-*.md   Design critique report
.planning/accessibility-*.md     Accessibility report
.planning/narrative-audit-*.md   Narrative quality report
```

---

## Understanding Results

### Visual Regression
- **PASS**: No visual changes detected (within threshold)
- **FAIL**: Regression detected — investigate and fix
- **First Run**: Baseline created — review and approve

### Transition Analysis
| Metric | Good | Needs Work | Poor |
|--------|------|-----------|------|
| Duration | 150-500ms | 500-800ms | <150ms or >800ms |
| Smoothness | smooth | moderate | jarring |
| Jank | none | — | detected |
| Max Frame delta | <15% | 15-35% | >35% |

### Design Critique
8 dimensions, each scored 0-5:
1. **Typography** — Scale, weight, reading comfort
2. **Color & Contrast** — Palette, WCAG, dark mode
3. **Spacing & Rhythm** — Consistency, breathing room
4. **Components** — States, icons, borders
5. **Identity** — Personality, professionalism
6. **Layout** — Hierarchy, grid, whitespace
7. **Information Density** — Progressive disclosure, cognitive load
8. **Visual States** — Interactive state completeness

**Benchmark:**
- 3/5: Functional, no major visual issues
- 4/5: Professional product (VS Code tier)
- 5/5: Premium product (Linear/Raycast tier)

### Accessibility
| Severity | WCAG | Impact |
|----------|------|--------|
| Critical | A violation | Blocks usage completely |
| Major | AA violation | Significant barrier |
| Minor | Best practice | Usable with effort |

---

## Configuring for Your Project

The key to making these skills work for your project is a well-configured `project-context.json`:

1. **`baseUrl`** — Your dev server URL
2. **`views`** — All major views/pages with navigation instructions
3. **`transitions`** — Animations you want to audit
4. **`floatingUI`** — If you have persistent floating elements (chatbots, FABs)
5. **`darkMode`** — If your app supports dark mode
6. **`benchmarkProducts`** — Products to compare against
7. **`phaseTests`** — E2E test definitions per phase
8. **`narrativeConfig`** — Character and journey definitions for screenwriter

---

## Philosophy

This testing stack follows **goal-backward thinking**:

| Skill | Question | Answer |
|-------|----------|--------|
| visual-regression | "Did the design change unintentionally?" | Pixel diff |
| transition-auditor | "Are animations smooth and fast?" | Frame analysis |
| design-critique | "Is the UI visually coherent?" | Claude Vision |
| accessibility-deep | "Can everyone use it?" | axe + contextual |
| e2e-uat | "Does it survive real-world chaos?" | Chaos monkey |
| ux-screenwriter | "Does every path tell a coherent story?" | Narrative analysis |

---

## Troubleshooting

### "pixelmatch is not a function"
```bash
cd .claude/skills/playwright-skill && npm install pixelmatch pngjs
```

### Server not running
Start your dev server before running any skill.

### Empty/white screenshots
- Increase `settleDelay` in `project-context.json`
- Check if elements exist in the DOM
- Use `waitFor` if content loads asynchronously

---

**Ready to audit! Use `@ux-explorer --full` to start.**
