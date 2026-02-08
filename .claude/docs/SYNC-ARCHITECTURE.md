# OPAL Sync Architecture

## Overview

OPAL separates content acquisition into two distinct phases:

1. **`/sync`** - Pull content from configured sources into `_inbox/`
2. **`/process`** - Analyze inbox content and integrate into knowledge graph

This separation enables:
- Independent scheduling of source syncs
- Source-specific rate limiting and pagination
- Clear state management per source
- Schema-agnostic content acquisition

---

## The `/sync` Command

### Purpose

Fetch content from all configured sources (or specific sources) and deposit into `_inbox/` with standardized metadata.

### Usage

```bash
/sync                       # Sync all enabled sources
/sync telegram              # Sync specific source
/sync fathom otter          # Sync multiple sources
/sync --since 2026-01-01    # Override time range
/sync --dry-run             # Preview what would be fetched
/sync --status              # Show sync status for all sources
/sync --force               # Ignore last sync cursor, refetch all
```

### Output

```
Syncing Content Sources

[1/4] Fathom
      ├── Checking for new transcripts...
      ├── Last sync: 2026-02-01T10:00:00Z
      ├── Found: 3 new transcripts
      ├── Fetching: team-standup-2026-02-02.md
      ├── Fetching: product-review-2026-02-02.md
      ├── Fetching: customer-call-2026-02-01.md
      └── ✅ Synced 3 items → _inbox/transcripts/

[2/4] Otter
      ├── Checking for new transcripts...
      ├── Last sync: 2026-02-01T10:00:00Z
      └── ✅ No new items

[3/4] Telegram
      ├── Checking monitored channels...
      ├── Channels: #opencivics-links, #resources
      ├── Found: 7 new links
      ├── Fetching URL content for 7 links...
      └── ✅ Synced 7 items → _inbox/links/

[4/4] Read.ai
      └── ⚠️ Skipped (not configured)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Summary:
• Sources checked: 4
• Items synced: 10
• Errors: 0

Next: Run /process to analyze new content
```

---

## Source Adapter Architecture

### Adapter Interface

Each source adapter implements a common interface:

```yaml
# Conceptual interface - implemented via config + skills
adapter:
  name: string              # Unique identifier
  display_name: string      # Human-readable name
  type: transcript | link | document | feed | api

  # Authentication
  auth:
    method: api_key | oauth | bot_token | none
    credentials_env: string  # Environment variable name

  # Connection
  connect:
    prefer_mcp: boolean      # Try MCP server first
    mcp_server: string       # MCP server name if available
    api_endpoint: string     # REST API endpoint

  # Fetching
  fetch:
    supports_incremental: boolean
    cursor_type: timestamp | offset | cursor_token
    pagination: boolean
    rate_limit: requests_per_minute

  # Filtering
  filters:
    configurable: [list of filter options]

  # Transform
  transform:
    output_format: markdown
    metadata_fields: [list of fields to preserve]
```

### Implemented Adapters

| Adapter | Type | Auth | MCP | Incremental |
|---------|------|------|-----|-------------|
| **Fathom** | transcript | API key | Yes | Yes (timestamp) |
| **Otter** | transcript | API key | Yes | Yes (timestamp) |
| **Read.ai** | transcript | API key | Yes | Yes (timestamp) |
| **Telegram** | link | Bot token | No | Yes (message ID) |
| **RSS/Atom** | feed | None | No | Yes (guid) |
| **YouTube** | transcript | API key | No | Yes (video ID) |
| **Podcast** | transcript | None | No | Yes (episode guid) |
| **Email** | mixed | IMAP/API | No | Yes (message ID) |

---

## State Management

### Sync State File

Location: `_index/sync-state.json`

```json
{
  "version": "1.0.0",
  "sources": {
    "fathom": {
      "enabled": true,
      "last_sync": "2026-02-02T10:30:00Z",
      "cursor": {
        "type": "timestamp",
        "value": "2026-02-02T10:30:00Z"
      },
      "items_synced": 145,
      "last_item_id": "fathom-abc123",
      "errors": []
    },
    "telegram": {
      "enabled": true,
      "last_sync": "2026-02-02T11:00:00Z",
      "cursor": {
        "type": "message_id",
        "value": 98765,
        "per_channel": {
          "opencivics-links": 98765,
          "resources": 87654
        }
      },
      "items_synced": 312,
      "errors": []
    },
    "otter": {
      "enabled": true,
      "last_sync": "2026-02-01T08:00:00Z",
      "cursor": {
        "type": "timestamp",
        "value": "2026-02-01T08:00:00Z"
      },
      "items_synced": 89,
      "errors": []
    }
  }
}
```

### Per-Item Tracking

Each synced item gets a unique fingerprint to prevent re-fetching:

```yaml
---
source: fathom
source_id: fathom-abc123
source_url: https://fathom.video/calls/abc123
synced_at: 2026-02-02T10:30:00Z
fingerprint: sha256:a1b2c3...
---
```

---

## Configuration

### Source Configuration in `config/integrations.yaml`

```yaml
sources:
  # Transcript Sources
  fathom:
    enabled: true
    prefer_mcp: true
    mcp_server: fathom-mcp
    api_key_env: FATHOM_API_KEY
    sync:
      schedule: "0 */4 * * *"    # Every 4 hours
      # schedule: manual         # Only on /sync fathom
    filters:
      workspaces: [default]
      exclude_titles: ["1:1", "standup"]
      min_duration_minutes: 5
      max_age_days: 30

  otter:
    enabled: true
    prefer_mcp: true
    api_key_env: OTTER_API_KEY
    sync:
      schedule: "0 */6 * * *"
    filters:
      exclude_titles: ["daily sync"]
      min_duration_minutes: 10

  read_ai:
    enabled: false
    api_key_env: READ_AI_API_KEY
    sync:
      schedule: manual

  # Communication Sources
  telegram:
    enabled: true
    bot_token_env: TELEGRAM_BOT_TOKEN
    sync:
      schedule: "*/30 * * * *"   # Every 30 minutes
    channels:
      - id: -1001234567890
        name: opencivics-links
        monitor_type: links       # links | all | media
      - id: -1009876543210
        name: resources
        monitor_type: links
    link_handling:
      auto_fetch: true            # Fetch URL content
      fetch_timeout: 30
      max_content_size: 10MB
    filters:
      exclude_domains: [twitter.com, x.com]
      include_domains: []         # Empty = all allowed

  # Feed Sources
  rss:
    enabled: true
    sync:
      schedule: "0 */2 * * *"
    feeds:
      - url: https://example.com/feed.xml
        name: Example Blog
        category: resources
      - url: https://another.org/rss
        name: Another Source
        category: news

  # Media Sources
  youtube:
    enabled: false
    api_key_env: YOUTUBE_API_KEY
    sync:
      schedule: manual
    channels: []
    playlists: []

  podcast:
    enabled: false
    sync:
      schedule: daily
    feeds: []
```

---

## Inbox Organization

Synced content is organized by type:

```
_inbox/
├── transcripts/           # From Fathom, Otter, Read.ai, YouTube, Podcast
│   ├── fathom/
│   │   └── team-standup-2026-02-02.md
│   ├── otter/
│   │   └── client-call-2026-02-01.md
│   └── youtube/
│       └── conference-talk-abc123.md
│
├── links/                 # From Telegram, RSS, manual
│   ├── telegram/
│   │   └── link-98765.md
│   └── rss/
│       └── article-guid123.md
│
├── documents/             # PDFs, Word docs (manual or email)
│   └── research-paper.pdf
│
├── activities/            # Activity-specific items (from Activity Index)
│   └── telegram/
│       └── gathering-12345.md
│
└── failed/                # Items that failed to sync
    └── fathom-xyz789.error.log
```

---

## Schema-Agnostic Classification

The sync phase is **schema-agnostic** - it just pulls raw content. Classification happens during `/process`:

### During CLASSIFY Step

Claude receives:
1. The raw content
2. All configured taxonomies (OPL, Activity Index, custom)
3. Instructions to determine which taxonomy applies

```
Given this content and the following taxonomies:

[OPL Taxonomy]
- Patterns, Protocols, Playbooks, Primitives...
- Sectors: Governance, Economic, Environmental...
- Scales: Individual → Planetary

[Activity Index Taxonomy]
- Grants, Initiatives, Alliances, Courses, Gatherings, Maps, Resources

Determine:
1. Which taxonomy best fits this content
2. What specific type within that taxonomy
3. Confidence score
```

### Multi-Taxonomy Support

```yaml
# config/settings.yaml
taxonomies:
  primary: opl                    # Default taxonomy
  additional:
    - activity-index              # Also check for activities
    - custom/my-taxonomy          # Custom taxonomy

  routing:
    # Source-specific taxonomy hints
    telegram:
      prefer: activity-index      # Telegram links often are activities
      fallback: opl
    fathom:
      prefer: opl
```

---

## Activity Index Integration

### Loading Activity Index Schema

Create `taxonomy/activity-index.yaml`:

```yaml
name: Activity Index
version: "1.0.0"
description: Schema for indexing civic activities and resources

resource_types:
  - id: grant
    name: Grant
    description: Funding opportunities
    directory: activities/grants/
    keywords: [funding, grant, award, fellowship]

  - id: initiative
    name: Initiative
    description: Ongoing projects or campaigns
    directory: activities/initiatives/
    keywords: [project, campaign, initiative, program]

  - id: alliance
    name: Alliance
    description: Coalitions and partnerships
    directory: activities/alliances/
    keywords: [coalition, partnership, alliance, consortium]

  - id: course
    name: Course
    description: Educational offerings
    directory: activities/courses/
    keywords: [course, training, workshop, webinar, class]

  - id: gathering
    name: Gathering
    description: Events and conferences
    directory: activities/gatherings/
    keywords: [event, conference, summit, meetup, gathering]

  - id: map
    name: Map
    description: Directories and mappings
    directory: activities/maps/
    keywords: [directory, map, registry, database, index]

  - id: resource
    name: Resource
    description: Tools, guides, and references
    directory: activities/resources/
    keywords: [tool, guide, resource, template, toolkit]

  - id: member-update
    name: Member Update
    description: Community member news
    directory: activities/updates/
    keywords: [announcement, update, news, member]
```

---

## Telegram Deep Dive

### Link Monitoring Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    TELEGRAM SYNC FLOW                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   1. CHECK CHANNELS                                              │
│      ├── Get messages since last cursor                         │
│      ├── Filter for messages containing URLs                    │
│      └── Extract URL + context (message text, sender, channel)  │
│                                                                  │
│   2. FETCH URL CONTENT (if auto_fetch enabled)                  │
│      ├── Respect rate limits                                    │
│      ├── Convert to markdown (readability extraction)           │
│      ├── Handle failures gracefully                             │
│      └── Cache fetched content                                  │
│                                                                  │
│   3. CREATE INBOX ITEM                                          │
│      ├── Combine URL content + Telegram context                 │
│      ├── Add metadata (channel, sender, timestamp)              │
│      └── Save to _inbox/links/telegram/                         │
│                                                                  │
│   4. UPDATE CURSOR                                               │
│      └── Store last processed message ID per channel            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Telegram Item Format

```markdown
---
source: telegram
source_id: msg-98765
channel: opencivics-links
channel_id: -1001234567890
sender: @username
sent_at: 2026-02-02T14:30:00Z
synced_at: 2026-02-02T15:00:00Z
url: https://example.com/article
url_fetched: true
url_title: "Interesting Article About Governance"
url_domain: example.com
---

# Interesting Article About Governance

## Telegram Context

Shared by @username in #opencivics-links:
> "Check out this great article on participatory governance!"

## Content

[Fetched article content converted to markdown...]
```

---

## Scheduled Syncs

### Using Watch Mode

The `/watch` command can monitor sources continuously:

```bash
/watch sync                 # Start watching all sources
/watch sync telegram        # Watch only telegram
/watch stop                 # Stop watching
```

### Cron-Based Scheduling

For non-interactive use, configure cron schedules in `config/integrations.yaml`:

```yaml
sources:
  telegram:
    sync:
      schedule: "*/30 * * * *"   # Every 30 minutes
```

Then run OPAL in daemon mode or use system cron to invoke `/sync`.

---

## Error Handling

### Source-Level Errors

```
[2/4] Fathom
      └── ❌ Error: API rate limit exceeded
          Retry in: 15 minutes
          Stored in: _index/sync-errors.json
```

### Item-Level Errors

```
[3/4] Telegram
      ├── Fetching 7 links...
      ├── ✅ 6 fetched successfully
      ├── ❌ 1 failed: https://broken.link (404)
      │   └── Saved context to _inbox/failed/telegram-msg-12345.md
      └── ✅ Synced 6 items → _inbox/links/
```

### Error Recovery

- Failed syncs are retried on next run
- Individual item failures don't block other items
- Error context is preserved for debugging
- Manual retry: `/sync --retry-failed`

---

## Command Relationship

```
┌────────────────────────────────────────────────────────────────┐
│                     COMMAND HIERARCHY                           │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│   /sync                    Pull from sources → _inbox/          │
│      │                                                          │
│      ▼                                                          │
│   /process                 _inbox/ → CLASSIFY → ... → _staging/ │
│      │                                                          │
│      ▼                                                          │
│   /review                  Human approval of _staging/          │
│      │                                                          │
│      ▼                                                          │
│   /github commit           Commit approved changes              │
│                                                                 │
│   ─────────────────────────────────────────────────────────────│
│                                                                 │
│   /ingest                  STILL USEFUL for manual additions:   │
│      ├── /ingest file      Add local file to _inbox/            │
│      ├── /ingest url       Fetch URL to _inbox/                 │
│      └── /ingest clipboard Capture clipboard to _inbox/         │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

---

## Implementation Checklist

### Phase 1: Core Infrastructure
- [ ] Create `_index/sync-state.json` schema
- [ ] Create `/sync` command specification
- [ ] Update `config/integrations.yaml` with sync config
- [ ] Add Activity Index taxonomy

### Phase 2: Source Adapters
- [ ] Telegram adapter (links from channels)
- [ ] Fathom adapter (transcripts)
- [ ] Otter adapter (transcripts)
- [ ] Read.ai adapter (transcripts)
- [ ] RSS adapter (feed items)

### Phase 3: Enhanced Features
- [ ] YouTube transcript adapter
- [ ] Podcast transcript adapter
- [ ] Email adapter
- [ ] Scheduled sync daemon
- [ ] `/watch sync` implementation

### Phase 4: Multi-Taxonomy
- [ ] Load multiple taxonomies
- [ ] Taxonomy routing based on source
- [ ] Claude-based taxonomy selection during CLASSIFY
