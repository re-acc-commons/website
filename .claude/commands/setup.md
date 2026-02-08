# /setup Command

Initialize and configure an OPAL knowledge base through intelligent consultation.

## Usage

```
/setup                      # Interactive knowledge architecture session
/setup --template <name>    # Quick setup with template
/setup --import <path>      # Import existing structure
/setup --reconfigure        # Modify existing configuration
```

## Philosophy

This is not a form to fill out. It's a **consultation with a knowledge architect**.

OPAL analyzes your domain, workflow, and goals to generate a bespoke knowledge structure that:
- Captures the right things with the right level of detail
- Connects information in ways that answer your real questions
- Scales with your practice without becoming burdensome
- Surfaces insights you wouldn't find otherwise

---

## EXECUTION INSTRUCTIONS

**CRITICAL:** This wizard creates intelligent, bespoke schemas through genuine conversation. Do NOT simply present preset options. LISTEN to what the user describes, ANALYZE their domain, and SYNTHESIZE appropriate structures.

### State Variables

Track throughout the wizard:
- `domain_understanding`: Rich text describing user's domain, workflow, goals
- `resource_types`: List of intelligently designed types with bespoke fields
- `dimensions`: List of cross-cutting categories with semantic values
- `relationships`: Graph of connections with traversal purposes
- `linking_strategy`: How entities should discover and connect to each other
- `directory_philosophy`: Organizational approach based on workflow
- `templates`: Rich markdown templates with guidance prompts
- `sources`: Configured content sources

---

## Phase 0: Check Existing Configuration

**Action:** Use Glob to check for `.opal/config.yaml` or `.opal/schema.yaml`.

If configuration exists:
```
USE AskUserQuestion:
questions: [{
  question: "OPAL is already configured here. What would you like to do?",
  header: "Existing",
  options: [
    {label: "Reconfigure", description: "Start fresh with new configuration"},
    {label: "Evolve schema", description: "Add to existing structure"},
    {label: "View current", description: "Show what's configured"}
  ]
}]
```

**WAIT. Handle response accordingly.**

---

## Phase 1: Deep Domain Understanding

**Goal:** Understand not just WHAT they want to track, but WHY, HOW they'll use it, and what QUESTIONS they want to answer.

### Step 1.1: Open-Ended Discovery

Display:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  OPAL Knowledge Architecture Session
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

I'm going to help you design a knowledge system tailored to your
specific needs. This isn't about filling out forms - I want to
understand your domain so I can suggest structures you wouldn't
think of yourself.

Let's start with the big picture.
```

**USE AskUserQuestion:**
```
questions: [{
  question: "In a few sentences, what are you trying to organize and why?",
  header: "Domain",
  options: [
    {label: "Personal learning", description: "Books, courses, ideas I'm exploring"},
    {label: "Work knowledge", description: "Projects, meetings, clients, decisions"},
    {label: "Research", description: "Papers, experiments, citations, findings"},
    {label: "Let me describe it...", description: "My situation is more specific"}
  ]
}]
```

**WAIT.**

**IMPORTANT:** If they select "Let me describe it..." or provide custom text, this becomes your primary input for intelligent schema generation. Parse their description for:
- Nouns (potential resource types)
- Verbs/Actions (potential workflows and relationships)
- Adjectives (potential dimensions and fields)
- Questions they mention wanting to answer (relationship traversal needs)

### Step 1.2: Workflow Understanding

**USE AskUserQuestion:**
```
questions: [{
  question: "Walk me through a typical week - when do you capture information and what triggers it?",
  header: "Workflow",
  options: [
    {label: "After meetings", description: "I capture notes, decisions, action items"},
    {label: "While reading/learning", description: "I capture insights, quotes, connections"},
    {label: "During project work", description: "I capture progress, blockers, learnings"},
    {label: "Mixed/varies", description: "Let me explain my workflow..."}
  ]
}]
```

**WAIT.** Store workflow patterns. This informs:
- Which source integrations matter
- What fields should be auto-populated vs manual
- Template design (quick capture vs detailed entry)

### Step 1.3: Query Intent - What Questions Matter?

**This is crucial for relationship design.**

**USE AskUserQuestion:**
```
questions: [{
  question: "What questions do you wish you could answer with your knowledge? (Select your top priority)",
  header: "Questions",
  options: [
    {label: "Who said what?", description: "Track ideas back to sources/people"},
    {label: "What connects to what?", description: "Find unexpected relationships"},
    {label: "What's the status?", description: "Track progress across initiatives"},
    {label: "What should I focus on?", description: "Surface priorities and gaps"}
  ]
}]
```

**WAIT.**

**Follow up based on response to understand traversal needs:**

If "Who said what?":
```
questions: [{
  question: "When you trace an idea to its source, what do you want to find?",
  header: "Attribution",
  options: [
    {label: "The original text/quote", description: "Exact words matter"},
    {label: "The context", description: "Where/when I encountered it"},
    {label: "Related ideas from same source", description: "What else did they say?"},
    {label: "My interpretation", description: "How I understood/applied it"}
  ],
  multiSelect: true
}]
```

If "What connects to what?":
```
questions: [{
  question: "What kinds of connections are most valuable to discover?",
  header: "Connections",
  options: [
    {label: "Concept bridges", description: "Ideas that link different domains"},
    {label: "People networks", description: "Who knows/works with whom"},
    {label: "Project dependencies", description: "What blocks or enables what"},
    {label: "Temporal patterns", description: "How things evolved over time"}
  ],
  multiSelect: true
}]
```

### Step 1.4: Scale and Longevity

**USE AskUserQuestion:**
```
questions: [{
  question: "How much content do you expect to manage over the next year?",
  header: "Scale",
  options: [
    {label: "Dozens of items", description: "Focused, curated collection"},
    {label: "Hundreds of items", description: "Active working knowledge"},
    {label: "Thousands of items", description: "Comprehensive archive"},
    {label: "Not sure", description: "Help me think about this"}
  ]
}]
```

**WAIT.** This informs:
- Directory structure (flat vs hierarchical)
- Indexing strategy
- Archive/lifecycle policies

---

## Phase 2: Intelligent Schema Synthesis

**Goal:** Based on Phase 1 understanding, SYNTHESIZE an intelligent schema - don't just ask them to pick from presets.

### Step 2.1: Analyze Domain and Generate Proposal

**Action:** Based on all Phase 1 inputs, use Claude's reasoning to:

1. **Identify Resource Types** - What distinct "things" exist in their domain?
   - Consider both primary entities and supporting entities
   - Consider both capture types (meeting notes) and curated types (insights)

2. **Infer Bespoke Fields** - What metadata would be genuinely useful?
   - Go beyond obvious fields (title, date)
   - Consider their query intent (what fields enable those queries?)
   - Consider their workflow (what can be auto-populated?)
   - Consider domain-specific nuances

3. **Design Relationships** - How should entities connect?
   - Map to their stated questions/traversal needs
   - Consider bidirectional value
   - Consider emergent relationship discovery

4. **Determine Dimensions** - What cross-cutting categories matter?
   - Based on their workflow (status tracking? priority?)
   - Based on their domain (lifecycle stages? confidence levels?)

### Step 2.2: Present Synthesized Schema

Display your analysis:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Schema Proposal for: {kb_name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Based on what you've described, here's what I'm thinking:

YOUR DOMAIN: {1-2 sentence summary of what you understood}

CORE INSIGHT: {Something non-obvious you noticed about their needs}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Then present each proposed type with rationale:

```
📁 RESOURCE TYPE: {type_name}
   Why: {1 sentence explaining why this type serves their needs}

   Fields I'm suggesting:
   ┌────────────────────────────────────────────────────────────┐
   │ title            │ string   │ Primary identifier          │
   │ {bespoke_field}  │ {type}   │ {why this field matters}    │
   │ {bespoke_field}  │ {type}   │ {why this field matters}    │
   │ {bespoke_field}  │ {type}   │ {why this field matters}    │
   └────────────────────────────────────────────────────────────┘

   Non-obvious suggestion: {field}
   └─ {explanation of why this field will be valuable}
```

### Step 2.3: Refine Resource Types Conversationally

**USE AskUserQuestion:**
```
questions: [{
  question: "Looking at this {type_name} structure, how does it feel?",
  header: "{Type}",
  options: [
    {label: "This captures it well", description: "Move on to the next type"},
    {label: "Missing something", description: "There's a field or aspect I need"},
    {label: "Too much", description: "Some of these fields aren't relevant"},
    {label: "Wrong framing", description: "I think about this differently"}
  ]
}]
```

**WAIT.**

If "Missing something":
```
questions: [{
  question: "What aspect of {type_name} isn't captured? Describe what you need to track.",
  header: "Missing",
  options: [
    {label: "A relationship", description: "How it connects to other things"},
    {label: "A status/state", description: "Where it is in a workflow"},
    {label: "A quality/rating", description: "How good/important it is"},
    {label: "Something else...", description: "Let me explain"}
  ]
}]
```

Then **SYNTHESIZE** appropriate fields based on their response. Don't just add what they say - interpret it intelligently.

If "Wrong framing":
```
questions: [{
  question: "Help me understand - how do you actually think about {type_name}?",
  header: "Reframe",
  options: [
    {label: "It's more granular", description: "This should be multiple types"},
    {label: "It's more general", description: "This should merge with something else"},
    {label: "Different name/concept", description: "I call this something else"},
    {label: "Let me explain...", description: "The mental model is different"}
  ]
}]
```

### Step 2.4: Generate Bespoke Fields Based on Domain

**CRITICAL:** This is where intelligent schema creation happens.

Based on the domain understanding, suggest fields the user WOULDN'T think of:

**For Research/Learning domains, consider:**
- `methodology_type` - How was this knowledge generated?
- `confidence_level` - How certain is this claim?
- `replication_status` - Has this been verified?
- `citation_count` - How influential is this source?
- `surprise_factor` - How unexpected was this insight?
- `connection_density` - How many things does this connect to?
- `decay_risk` - Will this become outdated?

**For Work/Projects domains, consider:**
- `decision_authority` - Who can approve this?
- `stakeholder_sentiment` - How do people feel about this?
- `risk_level` - What could go wrong?
- `dependency_depth` - How blocked is this by other things?
- `learning_value` - What did this teach us?
- `reuse_potential` - Could this pattern apply elsewhere?

**For Personal/Creative domains, consider:**
- `energy_level` - How does this make me feel?
- `revisit_trigger` - When should I come back to this?
- `incubation_stage` - How developed is this idea?
- `synthesis_potential` - What could this combine with?
- `personal_relevance` - Why does this matter to me?

**Present these suggestions with rationale:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Intelligent Field Suggestions
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Based on your workflow and the questions you want to answer,
here are some fields you might not have thought of:

For {type_name}:

  confidence_level (low/medium/high/verified)
  └─ You mentioned wanting to trace ideas to sources.
     This lets you distinguish "I think I read this somewhere"
     from "Here's the exact citation."

  synthesis_potential (tags)
  └─ You mentioned wanting to find unexpected connections.
     Tagging what an idea COULD combine with (even speculatively)
     creates a discovery surface for your future self.

  energy_cost (quick/moderate/deep)
  └─ Not every note deserves the same attention. This helps
     you match available energy to appropriate tasks.
```

**USE AskUserQuestion:**
```
questions: [{
  question: "Which of these non-obvious fields would actually be useful?",
  header: "Bespoke",
  options: [
    {label: "All of them", description: "These are genuinely insightful"},
    {label: "Some of them", description: "Let me pick which ones"},
    {label: "None of them", description: "Too much overhead"},
    {label: "Different ones", description: "I have other metadata needs"}
  ],
  multiSelect: false
}]
```

**WAIT.** Refine fields based on response.

---

## Phase 3: Relationship Strategy

**Goal:** Design a graph structure that answers the user's real questions.

### Step 3.1: Identify Traversal Patterns

Based on their query intent from Phase 1:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Relationship Strategy
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You said you want to answer: "{their query intent}"

To enable that, here's how I'd connect your types:

  QUERY: "Who said what?"
  ─────────────────────────────────────────────────────────────
  insight ──[attributed_to]──► source
           ──[encountered_in]──► context (meeting, article, etc.)
           ──[influenced_by]──► person

  This lets you trace: insight → source → author → other insights

  QUERY: "What connects to what?"
  ─────────────────────────────────────────────────────────────
  insight ──[synthesizes]──► insight (creates new from existing)
           ──[contradicts]──► insight (productive tension)
           ──[extends]──► insight (builds on prior work)

  This creates a semantic web, not just a link dump.
```

### Step 3.2: Propose Semantic Relationships

**CRITICAL:** Relationships should have MEANING, not just existence.

Don't just suggest "relates_to" - suggest relationships with semantic content:

```
Instead of generic "related" links, consider:

  CAUSAL RELATIONSHIPS
  • enables / blocks
  • causes / results_from
  • requires / provides

  STRUCTURAL RELATIONSHIPS
  • contains / part_of
  • specializes / generalizes
  • implements / specifies

  TEMPORAL RELATIONSHIPS
  • precedes / follows
  • evolves_into / evolved_from
  • supersedes / superseded_by

  EPISTEMIC RELATIONSHIPS
  • supports / contradicts
  • exemplifies / abstracts
  • synthesizes / decomposes

  SOCIAL RELATIONSHIPS
  • authored_by / authored
  • recommended_by / recommended
  • critiqued_by / critiqued
```

**USE AskUserQuestion:**
```
questions: [{
  question: "When you link two things, what does the link usually MEAN?",
  header: "Link Semantics",
  options: [
    {label: "It's contextual", description: "Different links mean different things"},
    {label: "It's associative", description: "Just 'these are related somehow'"},
    {label: "It's structural", description: "Hierarchy, containment, dependencies"},
    {label: "It's temporal", description: "Sequence, evolution, causation"}
  ]
}]
```

**WAIT.** Design relationship vocabulary accordingly.

### Step 3.3: Automatic Linking Strategy

**USE AskUserQuestion:**
```
questions: [{
  question: "How should OPAL discover connections automatically?",
  header: "Auto-Link",
  options: [
    {label: "Semantic similarity", description: "Link things that discuss similar concepts"},
    {label: "Shared references", description: "Link things that cite the same sources"},
    {label: "Temporal proximity", description: "Link things captured around the same time"},
    {label: "Manual only", description: "I prefer to create links intentionally"}
  ],
  multiSelect: true
}]
```

**WAIT.** Store as `linking_strategy`.

---

## Phase 4: Directory Philosophy

**Goal:** Design an organizational structure that fits their workflow, not a generic tree.

### Step 4.1: Understand Access Patterns

**USE AskUserQuestion:**
```
questions: [{
  question: "When you're looking for something, how do you usually search?",
  header: "Access",
  options: [
    {label: "By what it IS", description: "I know the type (meeting, project, etc.)"},
    {label: "By WHEN it was", description: "I remember roughly when I captured it"},
    {label: "By WHAT it's about", description: "I search by topic or keyword"},
    {label: "By WHERE it came from", description: "I remember the source/context"}
  ]
}]
```

**WAIT.** This determines primary directory structure:
- "By type" → `projects/`, `meetings/`, `notes/`
- "By when" → `2026/01/`, `2026/02/` or `2026-Q1/`
- "By topic" → Tag-based with flat storage
- "By source" → `from-meetings/`, `from-reading/`, `from-conversations/`

### Step 4.2: Archive Strategy

**USE AskUserQuestion:**
```
questions: [{
  question: "What happens to old content?",
  header: "Lifecycle",
  options: [
    {label: "Everything stays active", description: "All content is equally accessible"},
    {label: "Natural archive", description: "Old stuff just gets less visited"},
    {label: "Explicit archive", description: "I move completed/stale items to archive"},
    {label: "Sunset policy", description: "Some content should eventually be deleted"}
  ]
}]
```

**WAIT.** Configure lifecycle handling.

### Step 4.3: Propose Directory Structure

Based on access patterns and scale:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Directory Structure Proposal
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Based on your access patterns ("by type") and scale ("hundreds"),
I recommend:

  {kb_name}/
  │
  ├── .opal/                    # Configuration (hidden)
  │
  ├── {type1}/                  # Primary capture type
  │   └── [flat structure]      # No subfolders - rely on frontmatter
  │
  ├── {type2}/
  │   └── [flat structure]
  │
  ├── _inbox/                   # Incoming, unsorted
  │   ├── transcripts/          # From meeting tools
  │   ├── links/                # From chat apps
  │   └── documents/            # From file drops
  │
  ├── _staging/                 # Awaiting review
  │
  └── _archive/                 # Completed/stale (if explicit archive)

WHY FLAT: With hundreds of items, deep nesting makes navigation
harder and linking more fragile. Frontmatter + search is more
powerful than folder hierarchies.
```

**USE AskUserQuestion:**
```
questions: [{
  question: "Does this structure match how you think about your content?",
  header: "Structure",
  options: [
    {label: "Yes, this works", description: "Move on to templates"},
    {label: "I need subfolders", description: "Explain what groupings I need"},
    {label: "Different approach", description: "I think about organization differently"}
  ]
}]
```

**WAIT.** Refine structure based on feedback.

---

## Phase 5: Template Generation

**Goal:** Create markdown templates that GUIDE good knowledge capture, not just provide blank fields.

### Step 5.1: Understand Capture Style

**USE AskUserQuestion:**
```
questions: [{
  question: "When you capture something, what's your state of mind?",
  header: "Capture",
  options: [
    {label: "Quick and rough", description: "Get it down, refine later"},
    {label: "Thoughtful", description: "I take time to process as I capture"},
    {label: "Varies by type", description: "Meetings are quick, insights are slow"},
    {label: "Batch processing", description: "I dump content, then process in batches"}
  ]
}]
```

**WAIT.** This affects template verbosity:
- Quick → Minimal prompts, easy fields
- Thoughtful → Guiding questions, reflection prompts
- Varies → Different templates per type
- Batch → Capture template + refinement template

### Step 5.2: Generate Intelligent Templates

**FOR EACH resource type, create a template with:**

1. **Frontmatter with sensible defaults**
2. **Title with framing guidance**
3. **Body sections with prompts (not just headers)**
4. **Reflection questions** (optional, based on capture style)
5. **Linking prompts** (encourage connections)

**Example intelligent template for "Insight":**

```markdown
---
type: insight
captured: {{date}}
source:
confidence: medium
status: raw
synthesis_potential: []
energy_to_develop: moderate
---

# {{title}}

<!-- What's the core idea in one sentence? -->


## Source Context

<!-- Where did this come from? What were you reading/hearing/thinking when this emerged? -->


## The Insight

<!-- Explain it like you're telling a curious friend. What makes this interesting or useful? -->


## So What?

<!-- Why does this matter? What does it change about how you think or act? -->


## Questions This Raises

<!-- What don't you know yet? What would you need to explore to develop this further? -->

-


## Connections

<!-- What does this relate to? Don't just list - explain the nature of the connection. -->

- [[]] -


---

*Captured in a moment of {{context}}. Revisit when: {{trigger}}.*
```

### Step 5.3: Template Philosophy Explanation

Display:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Template Philosophy
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Your templates aren't just blank forms. They're THINKING TOOLS.

Each template includes:

  PROMPTS, NOT JUST HEADERS
  Instead of "## Notes", you'll see:
  "## The Insight
   <!-- Explain it like you're telling a curious friend -->"

  STRATEGIC FIELDS
  Fields like `synthesis_potential` and `energy_to_develop` aren't
  busywork - they create a surface for your future self to find
  and prioritize content.

  CONNECTION PROMPTS
  Every template ends with a Connections section that asks
  "Don't just list - explain the nature of the connection."
  This builds a semantic graph, not a link dump.

  REFLECTION HOOKS
  Templates include questions like "So what?" and "Questions
  this raises" to help you process, not just capture.
```

**USE AskUserQuestion:**
```
questions: [{
  question: "How verbose should your templates be?",
  header: "Templates",
  options: [
    {label: "Full guidance", description: "Include all prompts and questions"},
    {label: "Light guidance", description: "Key prompts only, less text"},
    {label: "Minimal", description: "Just fields, I know what to do"},
    {label: "Varies by type", description: "Some types need more guidance than others"}
  ]
}]
```

**WAIT.** Adjust template verbosity.

---

## Phase 6: Content Sources

**Use the same detailed source configuration from the original, but frame it in context of the workflow understanding from Phase 1.**

Display:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Content Sources
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You mentioned your workflow involves: {workflow_summary}

Let me suggest sources that fit:
```

Then configure sources as in the original Phase 5, but with contextual recommendations based on what they described.

---

## Phase 7: Review and Synthesis

### Step 7.1: Complete Summary with Rationale

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Your Knowledge Architecture: {kb_name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DOMAIN UNDERSTANDING
{Summary of what you understood about their needs}

DESIGN RATIONALE
{Why you made the choices you made}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RESOURCE TYPES ({count})

{For each type:}
  {type_name}
  ├── Purpose: {why this type exists}
  ├── Fields: {field list with notable ones highlighted}
  ├── Non-obvious: {bespoke fields and why they matter}
  └── Template: {template philosophy}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DIMENSIONS ({count})

{For each dimension:}
  {dimension_name}: {values}
  └── Enables: {what questions this helps answer}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RELATIONSHIP STRATEGY

{Graph visualization or description}

Key traversals enabled:
• {question} → {path through graph}
• {question} → {path through graph}

Automatic linking: {strategy}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DIRECTORY PHILOSOPHY

{Structure with rationale}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SOURCES ({count enabled})

{Source list with connection status}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Step 7.2: Final Confirmation

**USE AskUserQuestion:**
```
questions: [{
  question: "This is your bespoke knowledge architecture. Ready to create it?",
  header: "Create",
  options: [
    {label: "Create it!", description: "Generate all files and directories"},
    {label: "Adjust something", description: "I want to refine a specific part"},
    {label: "Show me the YAML", description: "Preview the configuration files"},
    {label: "Start over", description: "I want to rethink the approach"}
  ]
}]
```

**WAIT.** Handle accordingly.

### Step 7.3: Generate Files

**Use Write tool to create:**

1. **`.opal/config.yaml`** - Main configuration
2. **`.opal/schema.yaml`** - Full schema with all types, fields, dimensions, relationships
3. **`.opal/sources.yaml`** - Source configurations
4. **`.opal/templates/{type}.md`** - Intelligent templates for each type
5. **Directory structure** - All folders
6. **Index files** - `_index/entities.json`, `_index/pipeline-state.json`, `_index/sync-state.json`

### Step 7.4: Completion with Next Steps

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅ Knowledge Architecture Created: {kb_name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Your bespoke knowledge system is ready.

WHAT'S UNIQUE ABOUT THIS SETUP:
• {highlight 1 - something specific to their needs}
• {highlight 2 - a non-obvious feature you included}
• {highlight 3 - how relationships enable their questions}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FIRST STEPS:

  1. START CAPTURING
     Your templates are ready. Try creating your first {primary_type}:
     └─ Create a new file in {type}/ or use /new {type}

  2. SYNC CONTENT (if sources configured)
     /sync
     └─ This will pull from {configured sources}

  3. EXPLORE THE STRUCTURE
     /status
     └─ See your knowledge base state anytime

EVOLVING YOUR SCHEMA:

  This architecture isn't fixed. As your practice evolves:
  • /setup --reconfigure to add types or fields
  • Edit .opal/schema.yaml directly for quick changes
  • Templates in .opal/templates/ are just markdown - customize freely

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Remember: A knowledge system is a practice, not a product.
The best structure is the one you'll actually use.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Appendix: Domain-Specific Field Libraries

Reference these when generating bespoke fields based on domain understanding:

### Research & Learning

| Field | Type | Purpose |
|-------|------|---------|
| `methodology` | enum | How was this knowledge generated? |
| `confidence` | enum (low/medium/high/verified) | How certain is this? |
| `replication_status` | enum | Has this been independently verified? |
| `citation_count` | number | How influential is this source? |
| `surprise_factor` | enum | How unexpected/novel is this? |
| `decay_risk` | enum | Will this become outdated? |
| `prereqs` | references | What do you need to understand first? |
| `applications` | tags | Where could this be applied? |

### Work & Projects

| Field | Type | Purpose |
|-------|------|---------|
| `decision_authority` | reference:person | Who can approve this? |
| `stakeholder_sentiment` | enum | How do people feel about this? |
| `risk_level` | enum | What could go wrong? |
| `dependency_depth` | number | How blocked is this? |
| `learning_value` | text | What did this teach us? |
| `reuse_potential` | enum | Could this pattern apply elsewhere? |
| `bus_factor` | number | How many people understand this? |
| `political_sensitivity` | enum | Does this require careful handling? |

### Personal & Creative

| Field | Type | Purpose |
|-------|------|---------|
| `energy_level` | enum | How does this make me feel? |
| `revisit_trigger` | text | When should I come back to this? |
| `incubation_stage` | enum (seed/sprouting/growing/mature) | How developed is this idea? |
| `synthesis_potential` | tags | What could this combine with? |
| `personal_relevance` | text | Why does this matter to me? |
| `creative_tension` | references | What does this contradict or challenge? |
| `completion_criteria` | text | How will I know this is done? |

### Community & Civic

| Field | Type | Purpose |
|-------|------|---------|
| `scale` | enum | At what level does this operate? |
| `sector` | tags | What domains does this touch? |
| `maturity` | enum (emerging/developing/established/proven) | How tested is this? |
| `adaptation_notes` | text | How was this modified for local context? |
| `failure_modes` | list | What could cause this to fail? |
| `equity_considerations` | text | Who benefits/is burdened? |
| `implementation_complexity` | enum | How hard is this to do? |

---

## Appendix: Relationship Vocabularies

### Causal
- `enables` ↔ `enabled_by`
- `blocks` ↔ `blocked_by`
- `causes` ↔ `caused_by`
- `requires` ↔ `required_by`

### Structural
- `contains` ↔ `contained_in`
- `specializes` ↔ `generalized_by`
- `implements` ↔ `implemented_by`
- `composes` ↔ `composed_of`

### Temporal
- `precedes` ↔ `follows`
- `evolves_into` ↔ `evolved_from`
- `supersedes` ↔ `superseded_by`
- `triggers` ↔ `triggered_by`

### Epistemic
- `supports` ↔ `supported_by`
- `contradicts` ↔ `contradicted_by`
- `exemplifies` ↔ `exemplified_by`
- `synthesizes` ↔ `synthesized_from`

### Social
- `authored_by` ↔ `authored`
- `recommended_by` ↔ `recommended`
- `critiqued_by` ↔ `critiqued`
- `attributed_to` ↔ `credited_with`

---

## Error Handling

If any step fails or user seems confused:

**USE AskUserQuestion:**
```
questions: [{
  question: "It seems like something isn't clicking. What would help?",
  header: "Help",
  options: [
    {label: "Explain that again", description: "I didn't understand the last part"},
    {label: "Show an example", description: "I learn better from concrete examples"},
    {label: "Simplify", description: "This is too complex - let's pare down"},
    {label: "Take a break", description: "Save progress and continue later"}
  ]
}]
```
