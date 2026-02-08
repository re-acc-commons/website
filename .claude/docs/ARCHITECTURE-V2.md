# OPAL v2 Architecture: Composable Knowledge Toolkit

## Design Philosophy

OPAL is a **toolkit**, not a template. The core functions (sync, process, extract, reconcile, search) are schema-agnostic and work with any knowledge structure the user defines.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DESIGN PRINCIPLES                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. TOOLKIT OVER TEMPLATE                                                   │
│     The functions are the product, not the file structure                   │
│                                                                              │
│  2. USER-DEFINED SCHEMA                                                     │
│     Resource types, categories, and structure come from configuration       │
│                                                                              │
│  3. TEMPLATES AS ACCELERATORS                                               │
│     Pre-built starting points, not requirements                             │
│                                                                              │
│  4. COMPOSABLE PROFILES                                                     │
│     Multiple knowledge domains in one toolkit                               │
│                                                                              │
│  5. PROGRESSIVE COMPLEXITY                                                  │
│     Simple by default, powerful when needed                                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           OPAL CORE (The Toolkit)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  SCHEMA-AGNOSTIC FUNCTIONS                                                  │
│  ═════════════════════════                                                  │
│                                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │  /sync   │ │ /process │ │ /review  │ │ /search  │ │  /ask    │          │
│  │          │ │          │ │          │ │          │ │          │          │
│  │ Pull from│ │ Classify │ │ Human    │ │ Semantic │ │ Q&A over │          │
│  │ sources  │ │ Extract  │ │ approval │ │ + keyword│ │ corpus   │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│                                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │/cleanup  │ │/embeddings│ │ /graph  │ │/coverage │ │ /digest  │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  TEMPLATES (Starting Points)          PROFILES (Active Configurations)      │
│  ═══════════════════════════          ════════════════════════════════      │
│                                                                              │
│  ┌─────────────────────┐              ┌─────────────────────┐               │
│  │ Open Protocol       │              │ @work               │               │
│  │ Library (OPL)       │              │ Project docs, notes │               │
│  ├─────────────────────┤              ├─────────────────────┤               │
│  │ Personal Knowledge  │              │ @personal           │               │
│  │ Garden              │              │ Life archive        │               │
│  ├─────────────────────┤              ├─────────────────────┤               │
│  │ Research Library    │              │ @research           │               │
│  ├─────────────────────┤              │ Papers, citations   │               │
│  │ Life Archive        │              └─────────────────────┘               │
│  ├─────────────────────┤                                                    │
│  │ Creative Portfolio  │                                                    │
│  ├─────────────────────┤                                                    │
│  │ Minimal (blank)     │                                                    │
│  └─────────────────────┘                                                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          USER'S KNOWLEDGE BASE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  .opal/                        [user-defined directories]                   │
│  ├── config.yaml               Based on their schema                        │
│  ├── schema.yaml               ┌─────────────────────┐                      │
│  ├── sources.yaml              │ notes/              │                      │
│  └── profiles/                 │ projects/           │                      │
│      ├── work.yaml             │ people/             │                      │
│      └── personal.yaml         │ memories/           │                      │
│                                │ references/         │                      │
│  _inbox/                       │ ... anything ...    │                      │
│  _staging/                     └─────────────────────┘                      │
│  _index/                                                                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Core Concepts

### 1. Schema (User-Defined)

The schema defines what kinds of things the user tracks:

```yaml
# .opal/schema.yaml

name: "My Knowledge Garden"
version: "1.0"

# Resource types - what kinds of things do you collect?
resource_types:
  - id: note
    name: Note
    plural: Notes
    description: Atomic ideas and observations
    directory: notes/
    template: note.md

  - id: project
    name: Project
    plural: Projects
    description: Active or archived projects
    directory: projects/
    template: project.md

  - id: person
    name: Person
    plural: People
    description: People in my network
    directory: people/
    template: person.md

  - id: memory
    name: Memory
    plural: Memories
    description: Personal experiences and stories
    directory: memories/
    template: memory.md

# Classification dimensions - how do you categorize things?
dimensions:
  - id: area
    name: Area of Life
    values:
      - work
      - personal
      - health
      - relationships
      - learning
      - creative

  - id: status
    name: Status
    values:
      - active
      - someday
      - archived
      - reference

# Relationships - how do things connect?
relationships:
  - id: relates_to
    name: Relates To
    bidirectional: true

  - id: created_by
    name: Created By
    inverse: created

  - id: part_of
    name: Part Of
    inverse: contains
```

### 2. Templates (Starting Points)

Templates are pre-built schemas + configurations that users can:
- Use as-is
- Modify to fit their needs
- Mix elements from multiple templates
- Ignore entirely and build from scratch

**Built-in Templates:**

| Template | Use Case | Resource Types |
|----------|----------|----------------|
| **minimal** | Blank slate | Just notes |
| **zettelkasten** | Personal knowledge | Notes, concepts, sources |
| **gtd** | Task management | Projects, tasks, contexts |
| **research** | Academic work | Papers, authors, concepts |
| **life-archive** | Personal history | Memories, people, places, events |
| **creative** | Portfolio | Works, ideas, inspirations |
| **opl** | Civic commons | Patterns, protocols, playbooks... |
| **activity-index** | Event tracking | Grants, gatherings, initiatives... |

### 3. Profiles (Multiple Contexts)

Users may have different knowledge domains they switch between:

```yaml
# .opal/profiles/work.yaml
name: Work
active: true

schema_overlay:
  resource_types:
    - id: meeting
      name: Meeting
      directory: work/meetings/
    - id: decision
      name: Decision
      directory: work/decisions/

sources:
  - fathom: { enabled: true }
  - slack: { enabled: true, channels: [engineering] }

# .opal/profiles/personal.yaml
name: Personal
active: false

schema_overlay:
  resource_types:
    - id: journal
      name: Journal Entry
      directory: journal/

sources:
  - telegram: { enabled: true, channels: [family] }
```

Switch profiles:
```bash
/profile work      # Activate work profile
/profile personal  # Activate personal profile
/profile list      # Show available profiles
```

### 4. Sources (Where Content Comes From)

Sources are configured independently of schema:

```yaml
# .opal/sources.yaml

sources:
  # Transcript sources
  fathom:
    enabled: true
    api_key_env: FATHOM_API_KEY
    # ... config

  meetily:
    enabled: true
    database: auto

  # Communication
  telegram:
    enabled: false
    channels: []

  # Feeds
  rss:
    enabled: false
    feeds: []

  # Local
  filesystem:
    enabled: true
    watch_paths:
      - ~/Downloads/*.pdf
      - ~/Documents/Inbox/
```

---

## Setup Wizard Flow

The setup wizard guides users through creating their configuration:

```
/setup

Welcome to OPAL - Your Knowledge Toolkit

OPAL helps you collect, organize, and connect your knowledge.
Let's set up your knowledge base.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Step 1: Starting Point

How would you like to begin?

  [1] Start from a template (recommended)
      Pre-built configurations for common use cases

  [2] Build from scratch
      Define everything yourself

  [3] Import existing structure
      Analyze current files and generate schema

Choice: 1

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Step 2: Choose Template

What kind of knowledge are you managing?

  [1] Personal Knowledge Garden
      Notes, ideas, connections - Zettelkasten style

  [2] Life Archive
      Memories, people, places, personal history

  [3] Research Library
      Papers, authors, citations, concepts

  [4] Project Documentation
      Meetings, decisions, specs, tasks

  [5] Creative Portfolio
      Works, ideas, inspirations, references

  [6] Open Protocol Library
      Civic patterns, protocols, playbooks

  [7] Minimal
      Just the basics - customize from there

Choice: 1

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Step 3: Customize Resource Types

The "Personal Knowledge Garden" template includes:

  ✓ Note - Atomic ideas and observations
  ✓ Concept - Larger themes and topics
  ✓ Source - Books, articles, references
  ✓ Person - People and their ideas

Would you like to:

  [1] Use these as-is
  [2] Add more types
  [3] Remove some types
  [4] Rename types

Choice: 2

What would you like to add?

  [1] Project - Active work with goals
  [2] Memory - Personal experiences
  [3] Question - Open inquiries
  [4] Custom - Define your own

Choice: 1, 3

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Step 4: Classification Dimensions

How do you want to categorize your knowledge?

Current dimensions:
  ✓ Status (active, reference, archived)
  ✓ Area (work, personal, learning)

Add more?

  [1] Add "Priority" (high, medium, low)
  [2] Add "Confidence" (certain, likely, speculative)
  [3] Add custom dimension
  [4] Done with dimensions

Choice: 4

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Step 5: Content Sources

Where does your content come from?

  [ ] Meeting transcripts (Fathom, Otter, Meetily)
  [ ] Communication (Telegram, Slack, Discord)
  [ ] Feeds (RSS, newsletters)
  [ ] Local files (watch folders)
  [ ] Manual only (I'll add things myself)

Select all that apply: 1, 5

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Step 6: Generate Structure

Ready to create your knowledge base!

Will create:
  .opal/
  ├── config.yaml
  ├── schema.yaml
  ├── sources.yaml
  └── templates/
      ├── note.md
      ├── concept.md
      ├── source.md
      ├── person.md
      ├── project.md
      └── question.md

  _inbox/
  _staging/
  _index/

  notes/
  concepts/
  sources/
  people/
  projects/
  questions/

Create this structure? [Y/n] y

✅ Knowledge base created!

Next steps:
  • Add content to _inbox/ or use /sync
  • Run /process to analyze new content
  • Use /search and /ask to explore your knowledge
```

---

## Directory Structure

### OPAL Core (The Plugin)

```
opal/
├── .claude/
│   ├── commands/           # Schema-agnostic commands
│   │   ├── sync.md
│   │   ├── process.md
│   │   ├── review.md
│   │   ├── search.md
│   │   ├── ask.md
│   │   ├── cleanup.md
│   │   ├── embeddings.md
│   │   ├── setup.md        # The setup wizard
│   │   └── profile.md      # Profile management
│   │
│   ├── skills/             # Core processing skills
│   │   ├── classify.md
│   │   ├── extract.md
│   │   ├── reconcile.md
│   │   └── generate.md
│   │
│   ├── agents/             # Profile-specific agents
│   │   ├── librarian.md    # General knowledge management
│   │   ├── researcher.md   # Academic/research focus
│   │   ├── archivist.md    # Personal history focus
│   │   └── curator.md      # Creative/portfolio focus
│   │
│   └── templates/          # Built-in templates
│       ├── minimal/
│       ├── zettelkasten/
│       ├── research/
│       ├── life-archive/
│       ├── creative/
│       ├── opl/
│       └── activity-index/
│
├── CLAUDE.md               # Core toolkit documentation
└── README.md
```

### User's Knowledge Base (Generated)

```
my-knowledge/
├── .opal/                  # OPAL configuration
│   ├── config.yaml         # Main settings
│   ├── schema.yaml         # User's resource types & dimensions
│   ├── sources.yaml        # Content sources
│   ├── profiles/           # Optional profile configs
│   │   ├── default.yaml
│   │   └── work.yaml
│   └── templates/          # User's templates for each type
│       ├── note.md
│       └── project.md
│
├── _inbox/                 # Incoming content (always present)
├── _staging/               # Pending review (always present)
├── _index/                 # Entity index (always present)
│   ├── entities.json
│   ├── aliases.json
│   └── embeddings/
│
└── [user-defined]/         # Based on schema
    ├── notes/
    ├── projects/
    └── ...
```

---

## Core Functions (Schema-Agnostic)

These functions work with ANY schema:

### /sync
Pulls content from configured sources into `_inbox/`.
- Reads source config from `.opal/sources.yaml`
- Deposits raw content with metadata
- Tracks sync state per source

### /process
Analyzes inbox content using the user's schema.
- Reads schema from `.opal/schema.yaml`
- Classifies content against user-defined types
- Extracts entities based on schema
- Reconciles against existing entities

### /review
Human review of staged changes.
- Works with any resource types
- Shows proposed classifications
- Allows edits before committing

### /search
Semantic + keyword search.
- Searches across all resource types
- Filters by any dimension
- Returns results with context

### /ask
Q&A over the corpus.
- Uses embeddings + RAG
- Cites sources from any type
- Understands user's schema

### /cleanup
Manages inbox lifecycle.
- Applies retention rules
- Archives/deletes processed items
- Works with any content type

### /embeddings
Manages vector index.
- Embeds all resource types
- Chunks based on type config
- Rebuilds on demand

---

## Profile Agents

Specialized agents can help users in different contexts:

### @librarian (Default)
General knowledge management assistant.
- Helps with organization
- Suggests connections
- Maintains index health

### @researcher
Academic and research focus.
- Citation management
- Literature review assistance
- Concept mapping

### @archivist
Personal history focus.
- Memory organization
- Timeline construction
- Relationship mapping

### @curator
Creative and portfolio focus.
- Work organization
- Inspiration tracking
- Portfolio curation

Usage:
```bash
/ask @researcher "What papers discuss participatory governance?"
/ask @archivist "When did I last see Sarah?"
/ask @curator "Show me my unfinished projects"
```

---

## Migration Path

### From Current OPAL Structure

The current OPL-focused structure becomes a template:

```bash
/setup --template opl

# Or migrate existing:
/migrate --to-v2

# This will:
# 1. Create .opal/ config from current structure
# 2. Generate schema.yaml from taxonomy/opl.yaml
# 3. Move config files to new locations
# 4. Preserve all content
```

### From Other Systems

```bash
/setup --import obsidian ~/Documents/MyVault
/setup --import notion --workspace-id xxx
/setup --import roam ~/Downloads/roam-export.json
```

---

## Configuration Files

### .opal/config.yaml

```yaml
# Main OPAL configuration
version: "2.0"
name: "My Knowledge Garden"

# Active profile (if using profiles)
active_profile: default

# Processing settings
processing:
  auto_classify: true
  auto_extract: true
  confidence_threshold: 0.7

# Output settings
output:
  commit_after_review: true
  generate_backlinks: true

# LLM settings
llm:
  provider: claude
  embeddings: ollama
```

### .opal/schema.yaml

```yaml
# User-defined knowledge schema
name: "Personal Knowledge Garden"
version: "1.0"

resource_types:
  - id: note
    name: Note
    directory: notes/
    template: note.md
    extraction:
      auto: true
      confidence: 0.8

dimensions:
  - id: status
    values: [active, reference, archived]

relationships:
  - id: relates_to
    bidirectional: true
```

### .opal/sources.yaml

```yaml
# Content sources
sources:
  meetily:
    enabled: true
    database: auto
    output: _inbox/meetings/

  filesystem:
    enabled: true
    watch:
      - path: ~/Downloads/*.pdf
        type: document
      - path: ~/Desktop/inbox/
        type: mixed
```

---

## Summary

**OPAL v2** shifts from an opinionated library structure to a composable toolkit:

1. **Core functions are universal** - sync, process, search work with any schema
2. **Schema is user-defined** - resource types and dimensions in config
3. **Templates accelerate setup** - pre-built starting points
4. **Profiles enable context switching** - multiple knowledge domains
5. **Agents specialize assistance** - different helpers for different needs

The toolkit empowers users to structure their knowledge their way, while providing powerful, generalizable functions that serve ongoing knowledge management needs.
