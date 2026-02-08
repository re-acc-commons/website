# OPAL Specification Sheet

**Version:** 1.2.0
**Last Updated:** 2026-02-02
**Status:** ✅ Feature Complete | Ready for Testing

### Component Counts
| Component | Count |
|-----------|-------|
| Skills | 20 |
| Commands | 15 |
| Config Files | 14 |
| Templates | 11 |
| Sample Entities | 5 |
| Relationships | 8 |

---

## 1. Executive Summary

OPAL (Open Protocol Agent Librarian) is a Claude Code plugin that transforms markdown repositories into intelligent, federated knowledge commons. It provides AI-powered entity extraction, deduplication, wiki generation, and democratic governance for collaborative knowledge management.

**Vision:** The ultimate swiss army knife for open protocol librarians—capturing knowledge from anywhere, processing it intelligently, curating it collaboratively, discovering connections, publishing widely, and governing democratically.

---

## 2. Capability Layers

OPAL is organized into eight capability layers:

| Layer | Purpose | V1.2 Status |
|-------|---------|-------------|
| **Capture** | Getting knowledge into the system | 🟢 Complete (Audio, PDF, RSS) |
| **Processing** | Making sense of content | 🟢 Complete |
| **Curation** | Human-AI collaboration | 🟢 Complete (Batch Review) |
| **Discovery** | Finding and connecting knowledge | 🟢 Complete (Search, Graph, Coverage) |
| **Publishing** | Sharing knowledge widely | 🟢 Complete (Quartz/Hugo, Digests) |
| **Federation** | Connected commons network | 🟢 Complete |
| **Governance** | Democratic stewardship | 🟢 Complete |
| **Intelligence** | AI-powered insights | 🟢 Complete (RAG, Q&A) |

---

## 3. Capture Layer

### 3.1 Current Capabilities (V1.0)

| Source | Method | Status |
|--------|--------|--------|
| Local files | `/ingest file <path>` | 🟢 Built |
| Otter.ai | MCP/API | 🟡 Config exists |
| Fathom | MCP/API | 🟡 Config exists |
| Read.ai | MCP/API | 🟡 Config exists |
| Meetily | SQLite | 🟡 Config exists |

### 3.2 Enhanced Capabilities (V1.1)

| Source | Method | Priority |
|--------|--------|----------|
| **Audio/Voice Memos** | Whisper transcription | 🔴 High |
| **Web Pages** | Browser extension / URL fetch | 🔴 High |
| **PDFs** | Text extraction + OCR | 🔴 High |
| **Email Forwarding** | Inbound email parsing | 🟡 Medium |
| **RSS/Atom Feeds** | Background monitoring | 🟡 Medium |
| **YouTube/Podcasts** | Transcript extraction | 🟡 Medium |
| **Screenshots** | OCR extraction | 🟢 Low |
| **Academic Papers** | arXiv/SSRN import | 🟢 Low |

### 3.3 Capture Skills

| Skill | Purpose | Status |
|-------|---------|--------|
| `ingest-file` | Process local files | 🟢 Built (via command) |
| `ingest-transcript` | Fetch from transcript services | 🟢 Built (via command) |
| `transcribe-audio` | Whisper-powered transcription | 🔴 V1.1 |
| `capture-web` | URL to clean markdown | 🔴 V1.1 |
| `process-pdf` | PDF to text/entities | 🔴 V1.1 |
| `monitor-rss` | Background feed watching | 🔴 V1.1 |
| `parse-email` | Inbound email processing | 🔴 V1.2 |

---

## 4. Processing Layer

### 4.1 Current Pipeline (V1.0)

```
INBOX → CLASSIFY → PREPROCESS → EXTRACT → RECONCILE → STAGE → REVIEW → COMMIT → NOTIFY
```

| Stage | Skill | Status |
|-------|-------|--------|
| CLASSIFY | `classify` | 🟢 Built |
| PREPROCESS | `cleanup-transcript` | 🟢 Built |
| EXTRACT | `extract-entities` | 🟢 Built |
| RECONCILE | `reconcile` | 🟢 Built |
| COMMIT | `github` | 🟢 Built |
| NOTIFY | `notion-sync`, `federate-sync` | 🟢 Built |

### 4.2 Enhanced Processing (V1.1)

| Capability | Description | Priority |
|------------|-------------|----------|
| **Multi-pass Extraction** | First pass entities, second pass relationships | 🔴 High |
| **Auto-summarization** | Tweet, paragraph, page-length summaries | 🔴 High |
| **Key Quote Extraction** | Pull most important statements | 🟡 Medium |
| **Contradiction Detection** | Flag conflicts with existing content | 🟡 Medium |
| **Gap Identification** | Note missing referenced entities | 🟡 Medium |
| **Quality Scoring** | Completeness, freshness, reliability | 🟢 Low |
| **Multi-language** | Translation to/from English | 🟢 Low |

### 4.3 Processing Skills

| Skill | Purpose | Status |
|-------|---------|--------|
| `classify` | Content type detection | 🟢 Built |
| `cleanup-transcript` | Speech-to-text cleanup | 🟢 Built |
| `extract-entities` | Claude-powered extraction | 🟢 Built |
| `reconcile` | Deduplication matching | 🟢 Built |
| `generate-wiki` | Template-based page creation | 🟢 Built |
| `summarize` | Multi-length summarization | 🔴 V1.1 |
| `extract-quotes` | Key statement extraction | 🔴 V1.1 |
| `detect-conflicts` | Contradiction flagging | 🔴 V1.2 |
| `translate` | Multi-language support | 🔴 V1.2 |

---

## 5. Curation Layer

### 5.1 Current Capabilities (V1.0)

| Feature | Status |
|---------|--------|
| `/review` command | 🟢 Built |
| Accept/reject items | 🟢 Designed |
| Inline editing | 🔴 Not built |
| Batch operations | 🔴 Not built |

### 5.2 Enhanced Curation (V1.1)

| Capability | Description | Priority |
|------------|-------------|----------|
| **Batch Review** | Process multiple items with hotkeys | 🔴 High |
| **Side-by-Side Diff** | Compare extraction to source | 🔴 High |
| **Quick Edit** | Inline corrections in review | 🟡 Medium |
| **Confidence Sorting** | Review low-confidence first | 🟡 Medium |
| **Merge Wizard** | Combine duplicate entities | 🟡 Medium |
| **Collections** | Curated entity lists | 🟢 Low |
| **Editorial Calendar** | Scheduled review tasks | 🟢 Low |

### 5.3 Curation Skills

| Skill | Purpose | Status |
|-------|---------|--------|
| `review-batch` | Multi-item review flow | 🔴 V1.1 |
| `merge-entities` | Duplicate combination | 🔴 V1.1 |
| `generate-diff` | Source vs extraction comparison | 🔴 V1.1 |

---

## 6. Discovery Layer

### 6.1 Current Capabilities (V1.0)

| Feature | Status |
|---------|--------|
| Entity index | 🟢 Built (structure) |
| Basic search | 🔴 Not built |

### 6.2 Enhanced Discovery (V1.1)

| Capability | Description | Priority |
|------------|-------------|----------|
| **Semantic Search** | Natural language queries | 🔴 Critical |
| **Knowledge Graph** | Visual relationship explorer | 🔴 High |
| **Coverage Reports** | Gap analysis by taxonomy | 🔴 High |
| **Similar Entities** | Find related content | 🟡 Medium |
| **Trend Detection** | What's being discussed more | 🟡 Medium |
| **Federated Search** | Cross-commons queries | 🟢 Low |

### 6.3 Discovery Skills

| Skill | Purpose | Status |
|-------|---------|--------|
| `search-semantic` | Vector-based search | 🔴 V1.1 |
| `generate-graph` | Knowledge graph rendering | 🔴 V1.1 |
| `analyze-coverage` | Gap detection | 🔴 V1.1 |
| `find-similar` | Related entity discovery | 🔴 V1.2 |

### 6.4 Discovery Commands

| Command | Purpose | Status |
|---------|---------|--------|
| `/search <query>` | Semantic search | 🔴 V1.1 |
| `/graph [entity]` | Visualize relationships | 🔴 V1.1 |
| `/coverage [sector]` | Gap analysis report | 🔴 V1.1 |
| `/ask <question>` | Q&A over corpus | 🔴 V1.1 |

---

## 7. Publishing Layer

### 7.1 Current Capabilities (V1.0)

| Feature | Status |
|---------|--------|
| GitHub as source | 🟢 Built |
| Notion sync | 🟢 Built |
| Static site | 🔴 Not built |

### 7.2 Enhanced Publishing (V1.1)

| Capability | Description | Priority |
|------------|-------------|----------|
| **Quartz Integration** | Beautiful wiki-style sites | 🔴 High |
| **Weekly Digest** | Automated activity summary | 🔴 High |
| **RSS Feeds** | Per-category syndication | 🟡 Medium |
| **API Access** | REST/GraphQL endpoints | 🟡 Medium |
| **Export Formats** | PDF, EPUB, Obsidian | 🟡 Medium |
| **Social Posting** | Auto-share to platforms | 🟢 Low |

### 7.3 Publishing Skills

| Skill | Purpose | Status |
|-------|---------|--------|
| `notion-sync` | Notion database sync | 🟢 Built |
| `generate-site` | Static site building | 🔴 V1.1 |
| `generate-digest` | Activity summaries | 🔴 V1.1 |
| `export-format` | Multi-format export | 🔴 V1.2 |
| `generate-feed` | RSS/Atom generation | 🔴 V1.2 |

### 7.4 Publishing Commands

| Command | Purpose | Status |
|---------|---------|--------|
| `/publish site` | Build static site | 🔴 V1.1 |
| `/digest [period]` | Generate summary | 🔴 V1.1 |
| `/export <format>` | Export data | 🔴 V1.2 |

---

## 8. Federation Layer

### 8.1 Current Capabilities (V1.0)

| Feature | Status |
|---------|--------|
| Source configuration | 🟢 Built |
| Subscription filters | 🟢 Built |
| Basic sync skill | 🟢 Built |

### 8.2 Enhanced Federation (V1.1)

| Capability | Description | Priority |
|------------|-------------|----------|
| **Selective Sync** | Category-specific subscriptions | 🟡 Medium |
| **Taxonomy Mapping** | Cross-commons translation | 🟡 Medium |
| **Conflict Resolution** | Handle divergent versions | 🟡 Medium |
| **Attribution Chains** | Track provenance | 🟢 Low |
| **Federated Search** | Query across network | 🟢 Low |

### 8.3 Federation Skills

| Skill | Purpose | Status |
|-------|---------|--------|
| `federate-sync` | Pull from upstream | 🟢 Built |
| `federate-publish` | Push to downstream | 🔴 V1.1 |
| `federate-search` | Cross-commons queries | 🔴 V1.2 |
| `map-taxonomy` | Translation rules | 🔴 V1.2 |

---

## 9. Governance Layer

### 9.1 Current Capabilities (V1.0)

| Feature | Value | Status |
|---------|-------|--------|
| Required approvals | 3 | 🟢 Configured |
| Rejection blocks | Yes | 🟢 Configured |
| Voting period | 72 hours | 🟢 Configured |
| Vote via PR comments | Structured format | 🟢 Designed |

### 9.2 Enhanced Governance (V1.1)

| Capability | Description | Priority |
|------------|-------------|----------|
| **Role Templates** | Curator, Contributor, Reader | 🟡 Medium |
| **Configurable Thresholds** | Per-content-type rules | 🟡 Medium |
| **Dispute Handling** | Conflict resolution workflow | 🟡 Medium |
| **Delegation** | Liquid democracy support | 🟢 Low |
| **Amendment Process** | Governance doc changes | 🟢 Low |

### 9.3 Governance Skills

| Skill | Purpose | Status |
|-------|---------|--------|
| `github` (voting) | PR-based voting | 🟢 Built |
| `manage-roles` | Permission management | 🔴 V1.2 |
| `resolve-dispute` | Conflict handling | 🔴 V1.2 |

---

## 10. Intelligence Layer

### 10.1 Current Capabilities (V1.0)

| Feature | Status |
|---------|--------|
| Entity extraction | 🟢 Built |
| Deduplication | 🟢 Built |
| Classification | 🟢 Built |

### 10.2 Enhanced Intelligence (V1.1)

| Capability | Description | Priority |
|------------|-------------|----------|
| **Ask the Commons** | Q&A over full corpus | 🔴 High |
| **Writing Assistance** | Draft generation, improvement | 🟡 Medium |
| **Gap Analysis** | What's missing in coverage | 🟡 Medium |
| **Proactive Alerts** | Relevant new content detected | 🟢 Low |
| **Autonomous Monitoring** | Background intelligence | 🟢 Low |

### 10.3 Intelligence Skills

| Skill | Purpose | Status |
|-------|---------|--------|
| `extract-entities` | Entity identification | 🟢 Built |
| `reconcile` | Semantic matching | 🟢 Built |
| `qa-corpus` | Question answering | 🔴 V1.1 |
| `assist-writing` | Content improvement | 🔴 V1.1 |
| `analyze-gaps` | Coverage intelligence | 🔴 V1.1 |

---

## 11. Complete Skill Inventory

### Built (V1.0)

| Skill | Layer | Lines |
|-------|-------|-------|
| `classify` | Processing | ~150 |
| `cleanup-transcript` | Processing | ~270 |
| `extract-entities` | Processing | ~190 |
| `reconcile` | Processing | ~250 |
| `generate-wiki` | Processing | ~270 |
| `github` | Governance | ~370 |
| `notion-sync` | Publishing | ~150 |
| `reconcile-notion` | Publishing | ~100 |
| `federate-sync` | Federation | ~150 |
| `setup-wizard` | System | ~420 |

**Total: 10 skills, ~2,320 lines**

### Built (V1.1)

| Skill | Layer | Lines |
|-------|-------|-------|
| `embed-content` | Discovery | ~350 |
| `transcribe-audio` | Capture | ~400 |
| `process-pdf` | Capture | ~350 |
| `qa-corpus` | Intelligence | ~300 |
| `generate-site` | Publishing | ~400 |
| `generate-digest` | Publishing | ~350 |

**Total: 6 new skills built, ~2,150 lines**

### Built (V1.2)

| Skill | Layer | Lines |
|-------|-------|-------|
| `generate-graph` | Discovery | ~400 |
| `analyze-coverage` | Discovery | ~380 |
| `monitor-rss` | Capture | ~350 |
| `review-batch` | Curation | ~300 |

**Total: 4 new skills built, ~1,430 lines**

### Remaining (V2.0+)

| Skill | Layer | Priority |
|-------|-------|----------|
| `summarize` | Processing | 🟡 Medium |
| `assist-writing` | Intelligence | 🟢 Low |
| `federate-search` | Federation | 🟢 Low |

**Total: 3 skills remaining**

---

## 12. Complete Command Inventory

### Built (V1.0)

| Command | Purpose |
|---------|---------|
| `/process` | Run pipeline on inbox |
| `/ingest` | Add content to inbox |
| `/status` | Show current state |
| `/review` | Review staged changes |
| `/github` | GitHub management |
| `/federate` | Federation operations |
| `/setup` | Configuration wizard |
| `/help` | Contextual help |

**Total: 8 commands**

### Built (V1.1)

| Command | Purpose |
|---------|---------|
| `/search` | Semantic and keyword search |
| `/ask` | Q&A over corpus with citations |
| `/digest` | Generate activity summaries |
| `/publish` | Build and deploy static site |

**Total: 4 new commands built**

### Built (V1.2)

| Command | Purpose |
|---------|---------|
| `/graph` | Visualize entity relationships |
| `/coverage` | Gap analysis by taxonomy |
| `/watch` | Monitor RSS feeds |

**Total: 3 new commands built**

### Remaining (V2.0+)

| Command | Purpose | Priority |
|---------|---------|----------|
| `/export <format>` | Export data | 🟢 Low |

**Total: 1 command remaining**

---

## 13. Infrastructure Requirements

### Current (V1.0)

| Component | Status |
|-----------|--------|
| Claude Code plugin structure | 🟢 Complete |
| Directory structure | 🟢 Complete |
| Entity index (JSON) | 🟢 Complete |
| Configuration files | 🟢 Complete |
| Templates | 🟢 Complete |
| Taxonomy (OPL) | 🟢 Complete |

### Built (V1.1)

| Component | Purpose | Status |
|-----------|---------|--------|
| **Embeddings Config** | Vector database schema + config | 🟢 Complete |
| **Whisper Integration** | Audio transcription skill | 🟢 Complete |
| **Static Site Generator** | Quartz/Hugo publishing skill | 🟢 Complete |
| **PDF Processing** | Document extraction skill | 🟢 Complete |
| **Q&A System** | RAG-based question answering | 🟢 Complete |
| **Digest System** | Activity summary generation | 🟢 Complete |

### Remaining (V1.2+)

| Component | Purpose | Priority |
|-----------|---------|----------|
| **Graph Visualization** | D3.js or similar | 🟡 Medium |
| **RSS Parser** | Feed monitoring | 🟡 Medium |
| **Scheduled Tasks** | Cron-like automation | 🟡 Medium |

---

## 14. OPL Taxonomy (Complete)

### Resource Types (12)

| Type | Template | Directory |
|------|----------|-----------|
| Primitives | `primitive.md` | `primitives/` |
| Patterns | `pattern.md` | `patterns/` |
| Protocols | `protocol.md` | `protocols/` |
| Playbooks | `playbook.md` | `playbooks/` |
| Frameworks | `framework.md` | `frameworks/` |
| Artifacts | `artifact.md` | `artifacts/` |
| Templates | `template.md` | `templates/` |
| Activities | `activity.md` | `activities/` |
| Systems | `system.md` | `systems/` |
| Utilities | `utility.md` | `utilities/` |
| Individuals | `person.md` | `people/` |
| Organizations | `organization.md` | `organizations/` |

### Civic Sectors (13)

1. Governance and Political Systems
2. Civic Engagement and Participation Systems
3. Justice and Legal Systems
4. Educational and Learning Systems
5. Environmental and Sustainability Systems
6. Economic and Resource Sharing Systems
7. Health and Well-Being Systems
8. Transportation and Mobility Systems
9. Cultural and Creative Systems
10. Security and Safety Systems
11. Digital and Technological Systems
12. Information and Media Systems
13. Housing and Shelter Systems

### Civic Scales (7)

1. Individual
2. Household
3. Neighborhood
4. Municipal
5. Bioregional
6. National
7. Planetary

---

## 15. Version Roadmap

### V1.0 (Current) - Core Infrastructure ✅

- [x] Plugin structure (agents, skills, commands)
- [x] Processing pipeline (classify → extract → reconcile)
- [x] Entity index (JSON-based)
- [x] Democratic governance (PR voting)
- [x] Notion sync
- [x] Federation basics
- [x] OPL taxonomy
- [x] Setup wizard

### V1.1 (Complete) - Discovery & Intelligence ✅

- [x] RAG embedding infrastructure
- [x] Semantic search (`/search`)
- [x] Question answering (`/ask`)
- [x] Audio transcription (Whisper)
- [x] PDF processing
- [x] Static site generation (Quartz/Hugo)
- [x] Activity digests (`/digest`)

### V1.2 (Current) - Scale & Polish ✅

- [x] Knowledge graph visualization (`/graph`)
- [x] Coverage analysis (`/coverage`)
- [x] RSS monitoring (`/watch`)
- [x] Batch review operations
- [ ] Multi-language support
- [ ] Advanced federation (federated search)
- [ ] Role-based permissions
- [ ] Export formats
- [ ] Social publishing
- [ ] Conflict resolution

### V2.0 (Vision) - Autonomous Commons

- [ ] Proactive monitoring agents
- [ ] Self-healing (broken links, stale content)
- [ ] Liquid democracy
- [ ] ActivityPub federation
- [ ] IPFS pinning
- [ ] Plugin ecosystem
- [ ] Mobile apps

---

## 16. Success Metrics

### V1.0 Success Criteria ✅

- [x] Process transcript → wiki page
- [x] Deduplicate against entity index
- [x] Create GitHub PRs with voting
- [x] Sync to Notion
- [x] Federate between repos
- [x] Full OPL taxonomy support

### V1.1 Success Criteria

- [ ] Answer questions about corpus content
- [ ] Visualize entity relationships
- [ ] Identify coverage gaps
- [ ] Ingest audio directly
- [ ] Capture web pages
- [ ] Generate static site

### Long-term Success Criteria

- [ ] <5 minutes from raw content to staged entity
- [ ] <1% duplicate entities in mature commons
- [ ] 100% citation backing for Q&A answers
- [ ] Cross-commons search across 10+ federated repos
- [ ] Self-maintaining with minimal librarian intervention

---

## 17. File Structure

```
opal/
├── CLAUDE.md                      # Root context
├── PROJECT.md                     # Project-specific context
├── README.md                      # User documentation
├── .gitignore
│
├── .claude/
│   ├── SPEC.md                    # This specification
│   ├── ROADMAP.md                 # Full feature vision
│   ├── agents/
│   │   └── coordinator.md
│   ├── commands/                  # 15 built
│   │   ├── ask.md                 # V1.1: Q&A
│   │   ├── coverage.md            # V1.2: Gap analysis
│   │   ├── digest.md              # V1.1: Summaries
│   │   ├── federate.md
│   │   ├── github.md
│   │   ├── graph.md               # V1.2: Visualization
│   │   ├── help.md
│   │   ├── ingest.md
│   │   ├── process.md
│   │   ├── publish.md             # V1.1: Static site
│   │   ├── review.md
│   │   ├── search.md              # V1.1: Semantic search
│   │   ├── setup.md
│   │   ├── status.md
│   │   └── watch.md               # V1.2: RSS monitoring
│   └── skills/                    # 20 built
│       ├── analyze-coverage/      # V1.2: Gap analysis
│       ├── classify/
│       ├── cleanup-transcript/
│       ├── embed-content/         # V1.1: RAG embeddings
│       ├── extract-entities/
│       ├── federate-sync/
│       ├── generate-digest/       # V1.1: Activity summaries
│       ├── generate-graph/        # V1.2: Knowledge graph
│       ├── generate-site/         # V1.1: Quartz/Hugo
│       ├── generate-wiki/
│       ├── github/
│       ├── monitor-rss/           # V1.2: Feed monitoring
│       ├── notion-sync/
│       ├── process-pdf/           # V1.1: PDF extraction
│       ├── qa-corpus/             # V1.1: Question answering
│       ├── reconcile/
│       ├── reconcile-notion/
│       ├── review-batch/          # V1.2: Batch review
│       ├── setup-wizard/
│       └── transcribe-audio/      # V1.1: Whisper
│
├── config/
│   ├── coverage.yaml              # V1.2: Gap analysis settings
│   ├── digest.yaml                # Digest settings
│   ├── embeddings.yaml            # RAG configuration
│   ├── feeds.yaml                 # V1.2: RSS monitoring
│   ├── governance.yaml
│   ├── graph.yaml                 # V1.2: Visualization settings
│   ├── integrations.yaml
│   ├── llm.yaml
│   ├── processing.yaml            # PDF/content processing
│   ├── publishing.yaml            # Static site settings
│   ├── review.yaml                # V1.2: Batch review settings
│   ├── secrets.local.example
│   ├── settings.yaml
│   └── transcription.yaml         # Whisper settings
│
├── taxonomy/
│   └── opl.yaml
│
├── _inbox/
│   ├── documents/
│   └── transcripts/
│
├── _staging/
│   ├── entities/
│   └── pages/
│
├── _index/
│   ├── entities.json
│   ├── aliases.json
│   ├── relationships.json
│   └── pipeline-state.json
│
├── _templates/                    # 11 resource templates
│   ├── activity.md
│   ├── artifact.md
│   ├── framework.md
│   ├── organization.md
│   ├── pattern.md
│   ├── person.md
│   ├── playbook.md
│   ├── primitive.md
│   ├── protocol.md
│   ├── system.md
│   └── utility.md
│
├── _federation/
│   ├── sources.yaml
│   ├── subscriptions.yaml
│   └── outbox/
│
├── _feeds/                        # V1.2: RSS monitoring
│   ├── subscriptions.yaml
│   └── history/
│
├── _config/
│   └── subscribers.yaml           # Digest subscribers
│
├── _digests/                      # Archived digests
│
├── _assets/
│   └── figures/                   # Extracted PDF figures
│
├── _processed/
│   └── audio/                     # Archived audio files
│
└── _temp/                         # Temporary processing
```

---

## 18. Design Principles

1. **Capture Omnivore** - Accept knowledge from any source
2. **Process Intelligently** - Use AI for understanding, not just formatting
3. **Curate Collaboratively** - Human judgment with AI assistance
4. **Discover Serendipitously** - Surface unexpected connections
5. **Publish Widely** - Knowledge wants to be free
6. **Federate Generously** - Strengthen the network
7. **Govern Democratically** - Collective stewardship
8. **Fail Gracefully** - Always preserve data, surface errors clearly

---

*This specification is the source of truth for OPAL development.*
*See ROADMAP.md for the complete feature vision.*
*Last verified: 2026-02-02*
