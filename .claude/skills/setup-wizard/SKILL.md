# Setup Wizard Skill

Intelligent, conversational wizard that guides users through configuring their knowledge commons.

## Purpose

When a user first sets up OPAL or wants to reconfigure, this skill:
1. Determines their use case (personal, team, commons)
2. Offers taxonomy presets or guides custom creation
3. Configures integrations (MCP servers, APIs)
4. Sets up federation if desired
5. Generates all configuration files and directories

## Wizard Flow

```
┌─────────────────┐
│  1. Mode        │──► Personal / Team / Commons
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  2. Taxonomy    │──► Use Preset / Build Custom
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌─────────┐  ┌──────────────┐
│ Preset  │  │ Custom Flow  │
│ Select  │  │ (3-5 steps)  │
└────┬────┘  └──────┬───────┘
     │              │
     └──────┬───────┘
            ▼
┌─────────────────┐
│  3. Resources   │──► What types do you work with?
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  4. Classify    │──► Sectors, scales, custom dimensions
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  5. Integrate   │──► Connect sources and outputs
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  6. Federate    │──► Subscribe to / publish for others?
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  7. Generate    │──► Create files and directories
└─────────────────┘
```

## Phase 1: Mode Selection

```yaml
question: "How will you be using OPAL?"

options:
  - id: personal
    label: "Personal Knowledge Garden"
    description: "For your own learning, research, and note-taking"
    implications:
      - Local-first processing
      - Single Notion workspace
      - Optional GitHub backup
      - No federation by default

  - id: team
    label: "Team Knowledge Base"
    description: "Shared knowledge among a defined group"
    implications:
      - GitHub for collaboration
      - Shared Notion workspace
      - Internal federation
      - PR-based updates

  - id: commons
    label: "Open Knowledge Commons"
    description: "Public, federated knowledge for a community"
    implications:
      - GitHub as source of truth
      - Democratic PR moderation
      - Public Notion frontend
      - Federation enabled
```

## Phase 2: Taxonomy Selection

```yaml
question: "Would you like to use a preset taxonomy or build your own?"

options:
  - id: opl
    label: "Open Protocol Library"
    description: "For civic innovation, community organizing, social systems"
    preview: |
      Resource Types: Patterns, Protocols, Playbooks, Primitives, Artifacts...
      Sectors: Governance, Economic, Environmental, Health, Education...
      Scales: Individual → Planetary

  - id: research
    label: "Research Commons"
    description: "For academic research, papers, literature review"
    preview: |
      Resource Types: Papers, Authors, Concepts, Methods, Datasets...
      Fields: Configurable by discipline

  - id: custom
    label: "Build Custom"
    description: "Define your own resource types and classification"
    leads_to: custom_flow
```

## Phase 3: Resource Types (Custom Flow)

```yaml
question: "Describe what you're trying to organize, and I'll suggest resource types."

prompt: |
  Tell me about the knowledge you want to manage:
  - What kinds of things will you be collecting?
  - Who creates this content?
  - How will people use it?

  Example: "We document best practices for community gardens,
  including how-to guides, plant databases, and lessons from
  experienced gardeners."

# AI-powered suggestion
analysis: |
  Based on your description, I suggest these resource types:

  ✓ Guides - Step-by-step how-to documentation
  ✓ Resources - Databases and reference materials (like plant info)
  ✓ Stories - Lessons and experiences from practitioners
  ✓ People - The gardeners and experts
  ✓ Organizations - Gardens, co-ops, networks

  Would you like to adjust these?

follow_up:
  - Add more types
  - Remove suggested types
  - Rename types
  - Proceed with suggestions
```

## Phase 4: Classification Dimensions

```yaml
question: "How do you want to categorize and browse your knowledge?"

examples:
  - name: "Sectors"
    description: "Topic areas or domains"
    example: "Food, Water, Energy, Housing"

  - name: "Scales"
    description: "Size or scope of application"
    example: "Individual, Neighborhood, City, Region"

  - name: "Status"
    description: "Maturity or review state"
    example: "Draft, Reviewed, Published, Archived"

  - name: "Source"
    description: "Where content came from"
    example: "Interview, Workshop, Document, Field Notes"

prompt: |
  Based on your resource types, I suggest these classification dimensions:

  1. Topic Area (what domain does this cover?)
     Suggestions: [AI-generated based on domain]

  2. Application Scale (what level is this for?)
     Suggestions: [Standard scales]

  Would you like to add, modify, or remove any dimensions?
```

## Phase 5: Integrations

```yaml
question: "What tools do you want to connect?"

categories:
  transcript_sources:
    label: "Meeting Transcripts"
    options:
      - id: otter
        name: "Otter.ai"
        setup: "API key required"
        mcp: true

      - id: fathom
        name: "Fathom"
        setup: "API key required"
        mcp: true

      - id: readai
        name: "Read.ai"
        setup: "API key required"
        mcp: true

      - id: meetily
        name: "Meetily (local)"
        setup: "Point to SQLite database"
        mcp: false

  knowledge_bases:
    label: "Knowledge Management"
    options:
      - id: notion
        name: "Notion"
        setup: "Integration token required"
        mcp: true
        features: ["workspace sync", "database creation"]

      - id: obsidian
        name: "Obsidian Vault"
        setup: "Point to vault directory"
        mcp: false
        features: ["local storage", "markdown sync"]

  communication:
    label: "Communication"
    options:
      - id: telegram
        name: "Telegram Bot"
        setup: "Bot token required"
        features: ["link ingestion", "notifications"]

      - id: slack
        name: "Slack"
        setup: "App installation required"
        features: ["channel monitoring", "notifications"]

  productivity:
    label: "Productivity Suite"
    options:
      - id: google
        name: "Google Suite"
        setup: "OAuth required"
        features: ["Docs", "Calendar", "Gmail"]

# For each selected integration
integration_setup:
  - name: "Otter.ai"
    questions:
      - "Enter your Otter API key:"
      - "Which workspaces should we monitor?"
    validation: "Testing connection..."
    result: "✓ Connected to Otter.ai"
```

## Phase 6: Federation

```yaml
question: "Do you want to connect with other knowledge commons?"

options:
  - id: none
    label: "No federation"
    description: "Keep this knowledge base independent"

  - id: subscribe
    label: "Subscribe to others"
    description: "Pull updates from other repositories"
    setup:
      - "Enter repository URLs to subscribe to"
      - "What types of content do you want?"

  - id: publish
    label: "Publish for others"
    description: "Allow other repos to subscribe to your content"
    setup:
      - "What content should be public?"
      - "Set up outbox notifications"

  - id: both
    label: "Full federation"
    description: "Both subscribe and publish"
```

## Phase 7: Generate Configuration

```yaml
action: "Generate all configuration files and directories"

creates:
  # Configuration files
  - config/settings.yaml
  - config/integrations.yaml
  - config/governance.yaml (if commons mode)
  - config/llm.yaml

  # Taxonomy
  - taxonomy/{selected_taxonomy}.yaml

  # Templates (based on resource types)
  - _templates/{resource_type}.md (for each type)

  # Directories
  - _inbox/transcripts/
  - _inbox/links/
  - _inbox/documents/
  - _staging/new/
  - _staging/merges/
  - _staging/updates/
  - _index/
  - _federation/ (if enabled)
  - {resource_type}/ (for each type)

  # Initial files
  - _index/entities.json (empty structure)
  - _index/pipeline-state.json
  - PROJECT.md (project context)
  - .gitignore (with secrets.local)

output: |
  ✅ Configuration Complete!

  Created:
  • 4 configuration files
  • 7 resource templates
  • 12 directories
  • Entity index structure

  Next steps:
  1. Add your API keys to config/secrets.local
  2. Run /ingest to add your first content
  3. Run /process to start the pipeline

  Need help? Run /help to see all commands.
```

## Conversation Style

The wizard is:
- **Conversational**: One question at a time, natural language
- **Intelligent**: Suggests based on user descriptions
- **Flexible**: Allows going back and modifying choices
- **Educational**: Explains implications of each choice
- **Patient**: Answers questions before proceeding

Example interaction:

```
OPAL: Welcome! I'm OPAL, your Open Protocol Agent Librarian.
      Let's set up your knowledge commons.

      First, how will you be using OPAL?

      1. Personal Knowledge Garden - for your own research
      2. Team Knowledge Base - shared among a group
      3. Open Knowledge Commons - public, federated

User: What's the difference between team and commons?

OPAL: Great question!

      **Team Knowledge Base** is for a defined group with:
      - Shared GitHub repository for collaboration
      - Single Notion workspace everyone edits
      - Updates go through PRs but without formal voting
      - Content stays within the team

      **Open Knowledge Commons** is for public communities:
      - GitHub is the public source of truth
      - Democratic PR moderation (3+ votes to merge)
      - Content is openly licensed and federated
      - Others can subscribe to your knowledge

      Which fits your needs better?

User: Commons sounds right, we're building a public resource.

OPAL: Perfect! Let's set up an Open Knowledge Commons.

      Would you like to use a preset taxonomy, or build custom?

      I have these presets available:
      • Open Protocol Library - civic innovation, social systems
      • Research Commons - academic papers and concepts

      Or I can help you build a custom taxonomy for your domain.
```

## Error Handling

| Error | Action |
|-------|--------|
| Invalid API key | Offer to skip integration, try again later |
| Directory exists | Ask to overwrite, merge, or choose new name |
| Missing permissions | Explain what's needed, offer limited setup |
| Network error | Cache progress, allow resume later |

## Resume Capability

The wizard saves progress:

```yaml
# .opal-setup-progress.yaml
started: 2026-02-01T10:00:00Z
phase: 5  # Integrations
completed:
  mode: commons
  taxonomy: opl
  resource_types: [patterns, protocols, playbooks, artifacts]
  classification: [sectors, scales]
pending:
  integrations: [notion, github, otter]
```

User can run `/setup resume` to continue.
