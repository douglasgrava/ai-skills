---
name: ux-screenwriter
description: Validates user journeys through the lens of a professional screenwriter and interactive narrative director. Evaluates whether all possible user paths — individually and in combination — form coherent, emotionally resonant stories. Handles the complexity of free-form usage by applying open-world narrative theory (Hades, Disco Elysium, Breath of the Wild). Detects dead-end scenes, broken story arcs, missing stakes, character inconsistency, and unresolved emotional beats. Use when validating onboarding, new interaction patterns, or full user journey coherence.
argument-hint: "[--journey=<name> | --full | --ai-character | --onboarding | --execution | --free-form]"
---

# UX Screenwriter — Interactive Narrative Validator

Validates user journeys as **interactive stories**. This skill does not test functional correctness — it tests **narrative coherence, emotional resonance, and story satisfaction** across all possible paths a user might take.

> **The Screenwriter's Axiom:** Every screen is a scene. Every scene must earn its place. A scene that does not advance the story, reveal character, or raise stakes does not belong. In a product, a screen that does none of these is confusion, not design.

## Why Screenwriting Theory for Products?

Complex products present uniquely challenging narrative problems:

1. **Free-form usage** — the user decides what to do, in what order, at what pace
2. **Non-linear protagonism** — the same user can adopt different roles within one session
3. **AI as co-protagonist** — AI assistants are active characters, not passive tools (if the product has AI)
4. **Open world** — unlike a typical onboarding flow, there is no single "correct" path
5. **High-stakes narrative** — the user's real work and real deadlines are the world

The appropriate narrative framework is not **linear screenplay** (three-act, single path) but **open-world interactive narrative** — as pioneered in games like Hades, Disco Elysium, Breath of the Wild, and Outer Wilds.

## Configuration

This skill reads narrative config from `project-context.json`:

```json
{
  "name": "My Product",
  "narrativeConfig": {
    "protagonistArchetypes": [
      {
        "name": "The Builder",
        "motivation": "Create and ship features",
        "fear": "Wasting time, shipping bugs",
        "resource": "Domain expertise"
      }
    ],
    "aiCharacter": {
      "enabled": true,
      "name": "AI Assistant",
      "role": "Helper / co-pilot",
      "personality": "Collaborative, contextually aware"
    },
    "storyWorld": {
      "description": "Describe the world your user inhabits",
      "hierarchy": ["Projects", "Tasks", "Subtasks"]
    },
    "primaryJourneys": [
      {
        "name": "First-time setup",
        "arcType": "Linear, Act 0 → Act 1",
        "keyTests": ["What Happens Next?", "Emotional Arc"],
        "typicalDuration": "5-15 min"
      }
    ]
  }
}
```

---

## The Cast of Characters

Before evaluating journeys, establish who the characters are. Every good story starts here.

### The Protagonist: The User

Define protagonist archetypes in your `project-context.json`. Common archetypes:

| Archetype | Motivation | Fear | Current "Act" |
|-----------|-----------|------|---------------|
| **The Architect** | Designing structure, planning work | Scope creep, under-specification | Act 1 (Setup) |
| **The Operator** | Running and monitoring systems | Silent failure, things going off-track | Act 2 (Conflict) |
| **The Reviewer** | Validating output, checking quality | Subtle bugs, missed issues | Act 3 (Resolution) |
| **The Explorer** | Discovering what the product can do | Wasted time, confusion, wrong mental model | Act 0 (Exposition) |

> The same user moves between archetypes within one session. The narrative must support all simultaneously — this is the core complexity.

### The AI Character (if applicable)

If your product has an AI assistant, it is not a tool — it is a **character**. Specifically the "Mentor/Oracle" archetype (Athena in Hades, Virgil in Dante).

A well-written AI mentor character has:
- **Consistent personality** — always feels like the same entity
- **Appropriate tone per context** — wise when confused, direct when executing, celebratory on success
- **Proactive narrative contribution** — offers relevant information before being asked
- **Memory of the shared story** — references previous context

A poorly-written AI mentor:
- Gives the same response regardless of context
- Has no personality — feels like a lookup table
- Forgets context between sessions
- Offers information that belongs to a different "act"

### Automated Workers (if applicable)

If your product has automated agents/workers, they are the **hired ensemble** — specialists brought for specific acts.

Their narrative role: **promise, effort, and delivery**:
1. **Promise**: "I will do X" (task description)
2. **Effort**: visible progress (logs, status updates)
3. **Delivery**: result — success (satisfaction), failure (crisis), or ambiguous (tension)

If any beat is missing, the narrative arc is broken.

---

## The Product Story World

The "world" the protagonist inhabits must be narratively coherent. Define it in your config:

```
The Product Story World
├── The Domain (the user's kingdom)
│   ├── Primary Objects (story arcs — multi-step endeavors)
│   │   ├── Secondary Objects (chapters — coherent units)
│   │   │   └── Atomic Actions (scenes — individual actions)
│   │   └── Status: planned → in-progress → done
│   └── The Data (the landscape — always present, always at stake)
│
├── The AI Character (if enabled — always available)
│   └── Conversation Space (the inner sanctum)
│
└── The Automated Workers (if any — execute while the user watches)
    └── Executions (missions — each a mini story arc)
```

**Narrative consistency rule**: The world must feel coherent. If a parent object's status is "done" but its children are "in-progress", the world contradicts itself — this is a plot hole, not a data inconsistency.

---

## Narrative Structure Framework

### The Five Acts of a Session (Linear Version)

Most user sessions follow this arc:

```
Act 0 — EXPOSITION (First encounter or returning after absence)
  The protagonist orients themselves. "Where am I? What was I doing?"
  Success: User knows exactly where they are in 10 seconds.
  Failure: User must reconstruct context manually.

Act 1 — SETUP (Planning & structuring the work)
  The protagonist architects their approach.
  Success: The user feels like a director briefing their team.
  Failure: The user feels like they're filling out forms.

Act 2 — RISING ACTION (Execution & monitoring)
  Work is happening. Tension builds.
  Success: The user feels like a mission controller.
  Failure: The system is a black box.

Act 3 — CLIMAX (Result & decision point)
  Work completes (or fails). The user must act.
  Success: The user feels agency — they are the final judge.
  Failure: The user doesn't know if the result is good or bad.

Act 4 — RESOLUTION (Integration & closure)
  Work is done, the story closes.
  Success: The user feels progress — the world has changed.
  Failure: Anti-climax — "done" is just a status change.
```

### The Open-World Complication

In practice, usage is **non-linear**. A user might:
- Start multiple workflows simultaneously
- Abandon in-progress work mid-session
- Return after days to a changed world
- Use the AI assistant as the primary interface

**Open-World Narrative Principles** (from games):

| Principle | Game Example | Product Application |
|-----------|-------------|-------------------|
| **World Readability** | Breath of the Wild | Statuses and context should tell the story without recall |
| **Contextual Narrative** | Hades | AI acknowledges what's happening now, not just what was asked |
| **Narrative Resilience** | Disco Elysium | Every path leads somewhere meaningful, not a dead end |
| **Emergent Story** | Outer Wilds | Free exploration reveals coherent patterns |
| **Character Memory** | Hades | AI remembers the project and previous sessions |

---

## The Validation Methodology

### Phase 1: Journey Mapping as Story Structure

For each journey, write it as a story synopsis:

```
JOURNEY: [Name]

PROTAGONIST: [Which archetype? What do they know?]

INCITING INCIDENT: [What triggers this journey?]

STORY BEATS (in order):
1. [Beat 1]: [What happens, what does the user feel?]
2. [Beat 2]: [...]
...N. [Final Beat]: [How does this arc resolve?]

NARRATIVE QUESTIONS RAISED AND ANSWERED:
- Q: "..." → A: "..." (at beat N)
- Q: "..." → UNRESOLVED ← Script problem

EMOTIONAL ARC: [frustrated → curious → engaged → satisfied]

VERDICT: Complete arc / Broken arc / Missing resolution / Missing stakes
```

### Phase 2: The 7 Narrative Tests

#### Test 1: The "What Happens Next?" Test
At every screen, the user must answer in under 5 seconds without guessing.
If neither "What do I do now?" nor "What happens if I do it?" is answerable -> **Narrative Failure: Missing Direction**

#### Test 2: The "Stakes" Test
The user must understand consequences at every decision point.
If consequences are unclear -> **Narrative Failure: Missing Stakes**

#### Test 3: The "Character Consistency" Test (AI Character)
If your product has an AI character, map responses across 5+ scenarios:
1. User is idle
2. User just started a task
3. An error occurred
4. User hasn't interacted in 30 minutes
5. User just completed a major milestone

Does the AI feel like the same entity? Does tone adapt appropriately?
- Same responses everywhere -> **Character Failure: No Contextual Awareness**
- Different personalities per context -> **Character Failure: Inconsistent Voice**

#### Test 4: The "World Coherence" Test
Open the app after 2 days. Can you reconstruct the story from what's visible?
- Must remember externally -> **World Failure: Missing Memory**
- Statuses contradict each other -> **World Failure: Plot Hole**

#### Test 5: The "Emotional Arc" Test
Run a complete session. Map emotional states. Is there a satisfying payoff?
- Session just stops -> **Arc Failure: Anti-Climax**
- Flat engagement throughout -> **Arc Failure: No Tension**

#### Test 6: The "Free-Form Coherence" Test (Open-World)
Test at least 5 non-intended paths. Does the app guide forward or leave stranded?

#### Test 7: The "Worker Arc" Test (if applicable)
Every automated execution is a mini story. Validate Promise, Effort, Delivery beats.

---

## Narrative Red Flags — Story Problems

| # | Red Flag | Story Analogy | Category |
|---|----------|---------------|----------|
| **NRF-1** | Screen with no clear "What Happens Next?" | Scene with no dramatic purpose | `narrative_direction` |
| **NRF-2** | Decision with invisible consequences | Choice without stakes | `narrative_stakes` |
| **NRF-3** | AI response identical across different contexts | Character with no personality | `character_consistency` |
| **NRF-4** | User must remember context between sessions | Story with no memory | `world_coherence` |
| **NRF-5** | Statuses that contradict each other | Plot hole | `world_coherence` |
| **NRF-6** | Session ends without emotional resolution | Missing Act 4 | `emotional_arc` |
| **NRF-7** | Free-form path leads to dead end | Scene with no exit | `narrative_resilience` |
| **NRF-8** | Automated execution with no visible Effort beat | Mission with no montage | `worker_arc` |
| **NRF-9** | Ambiguous result — user can't tell success from failure | Climax with no resolution | `worker_arc` |
| **NRF-10** | AI forgets project context across sessions | Mentor who doesn't remember | `character_memory` |
| **NRF-11** | Multiple workers running with no differentiation | Ensemble with no identity | `world_coherence` |
| **NRF-12** | Empty state with no narrative direction | Protagonist dropped with no setup | `narrative_direction` |
| **NRF-13** | Completion with no acknowledgment | Resolution scene cut | `emotional_arc` |
| **NRF-14** | Error message that doesn't advance the story | Crisis with no response | `narrative_stakes` |

---

## The Playwright's Scene Analysis

Apply to any screen being scrutinized:

```markdown
### Scene: [Screen Name]

**Narrative Function:**
- [ ] Advances the story (protagonist moves closer to/further from goal)
- [ ] Reveals character (protagonist, AI, or workers)
- [ ] Raises stakes (introduces new risk or opportunity)
- [ ] Provides exposition (necessary world-building)
- [ ] Provides relief/reward (emotional payoff after tension)

**If none checked → the scene has no narrative function → consider removal or redesign.**

**Protagonist State at Arrival:**
[What does the user know? What do they want? What are they afraid of?]

**Narrative Question Opened:**
"Will the protagonist be able to [goal]?"

**Scene Beats:**
1. [User sees...] → [User feels...]
2. [User does...] → [User expects...]
3. [System responds...] → [User feels... and understands...]

**Narrative Question Closed (or passed to next scene):**
[Answer, escalation, or cliffhanger]

**Emotional Tone:** [Tense / Exploratory / Satisfying / Celebratory / Neutral]

**Verdict:** Serves the narrative / Weak narrative function / Scene without purpose
```

---

## AI Character Bible (Template)

If your product has an AI character, define its character bible:

### Core Personality

- **Primary trait**: [e.g., Collaborative intelligence — not subservient, not dominant]
- **Secondary trait**: [e.g., Contextual awareness — knows what "act" the user is in]
- **Tertiary trait**: [e.g., Proactive without being presumptuous]

### Voice Tone Per Act

| Act | User State | AI Tone | Example Quality |
|-----|-----------|---------|-----------------|
| Act 0 (Orientation) | Returning, disoriented | Warm, orienting | "You have 3 tasks in progress from your last session." |
| Act 1 (Planning) | Creative, structuring | Collaborative, questioning | "That could be broken into 4 parts — want me to draft them?" |
| Act 2 (Execution) | Monitoring, tense | Calm, informative | "60% complete. 3 files modified — nothing unexpected." |
| Act 3 (Crisis) | Stressed, uncertain | Direct, decisive | "Error found. Most likely fix is X. Shall I retry?" |
| Act 4 (Resolution) | Satisfied, reflecting | Celebratory, forward-looking | "Done. That's the 5th this sprint. Remaining looks achievable." |

### What the AI Must NEVER Do

- Speak in a tone that doesn't match the current act
- Forget established context
- Give the same response regardless of situation
- Use generic phrases ("How can I help you today?")
- Disappear during Act 2 and Act 3

---

## Workflow

### Quick Journey Validation (`--journey=<name>`)

1. **Write the journey synopsis**
2. **Navigate the journey** in the live app, screenshot at each beat
3. **Apply the 7 Narrative Tests**
4. **Check for Narrative Red Flags**
5. **Write the Scene Analysis** for any weak screens
6. **Produce findings**

### Full Narrative Audit (`--full`)

1. **Map all primary journeys** (from `narrativeConfig.primaryJourneys`)
2. **Write synopses** for each
3. **Run all 7 tests** per journey
4. **Run Free-Form Coherence** with 5 non-intended paths
5. **Validate AI Character Bible** (if `aiCharacter.enabled`)
6. **Validate Worker Arcs** (if applicable)
7. **Synthesize** into Narrative Quality Report

### AI-Character-Only Audit (`--ai-character`)

1. **Extract all AI response contexts**
2. **Evaluate against Character Bible** (tone per act, memory, proactivity)
3. **Check NRF-3** (identical responses)
4. **Check NRF-10** (session memory)

### Onboarding Audit (`--onboarding`)

1. **Enter as first-time user** (clean state)
2. **Write as Act 0 → Act 1 story**
3. **Apply Test 1** at every screen
4. **Check NRF-12** at every empty state

---

## Output Format

### Per Journey

```markdown
# Narrative Audit: [Journey Name]

**Date:** YYYY-MM-DD
**Archetype:** [Protagonist archetype]
**Act Range:** [e.g., Act 0 → Act 4]
**Narrative Verdict:** Complete arc / Broken arc / Missing resolution

## Story Synopsis
[2-4 sentences AS A STORY]

## Emotional Arc
`disoriented → orientating → engaged → confident → satisfied`

## 7 Narrative Tests Results
| Test | Result | Evidence |
|------|--------|----------|
| What Happens Next? | PASS/FAIL | [specific finding] |
| Stakes | PASS/FAIL | |
| Character Consistency | PASS/FAIL/N/A | |
| World Coherence | PASS/FAIL | |
| Emotional Arc | PASS/FAIL | |
| Free-Form Coherence | PASS/FAIL/N/A | |
| Worker Arc | PASS/FAIL/N/A | |

## Narrative Red Flags Found
| Flag | Screen | Description | Severity |
|------|--------|-------------|----------|
| NRF-X | [screen] | [what was found] | Critical/Major/Minor |

## Narrative Prescriptions
1. **[Fix]**: [Written as a story note]
```

### Consolidated Report

Save to `.planning/narrative-audit-YYYY-MM-DD.md`:

```markdown
# Narrative Quality Report
**Date:** YYYY-MM-DD

## Narrative Health Score
| Journey | Arc Complete | Emotional Arc | World Coherence | AI Voice | **Score** |
|---------|-------------|---------------|-----------------|----------|-----------|
| [name] | PASS/FAIL | PASS/FAIL | PASS/FAIL | PASS/FAIL/N/A | X/5 |
| **Overall** | | | | | **X.X/5** |

## Priority Story Repairs
[Top 5 fixes, ordered by user exposure x severity]
```

---

## Scoring Rubric

| Score | Narrative Quality |
|-------|-----------------|
| **0-1** | Main path has unresolved acts; dead ends common; AI has no consistency |
| **2** | Main path mostly works; edge paths broken; AI recognizable but inconsistent |
| **3** | All primary journeys complete; edge paths mostly resilient; AI consistent on main act |
| **4** | All journeys with satisfying arcs; AI is a real character with memory and tone |
| **5** | Every path tells a coherent story. AI feels like a collaborator. You feel like the protagonist. |

---

## Tips

- **Write the synopsis before testing** — if you can't write 3 sentences, the journey has no spine
- **Test the crisis path first** — Act 3 is where most products abandon the user
- **The AI's response to an error is the most important line** — it defines the product's character
- **Empty states are Act 0 scenes** — they must orient, not just display nothing
- **"Done" is not resolution** — completion must feel like something changed
- **The free-form test always breaks something** — design for paths users actually take
- **Score 3 is acceptable for shipping; score 2 blocks release**
