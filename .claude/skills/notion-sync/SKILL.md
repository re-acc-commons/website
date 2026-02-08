# Notion Sync Skill

Synchronizes the knowledge base with Notion workspaces.

## Purpose

After commits are made to the repository, this skill:
1. Pushes new/updated entities to Notion databases
2. Creates or updates Notion pages to match markdown files
3. Maintains bidirectional links between GitHub (source of truth) and Notion (frontend)

## Modes

### Frontend Mode (Commons)
- Notion mirrors GitHub content
- Changes flow GitHub → Notion only
- Used when GitHub is source of truth

### Workspace Mode (Personal/Team)
- Notion is collaborative workspace
- Changes can flow bidirectionally
- Conflicts resolved by timestamp

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `entities` | array | Yes | Entities to sync |
| `direction` | string | No | `push`, `pull`, or `bidirectional` |
| `databases` | object | No | Notion database ID mapping |

## Outputs

```yaml
sync_result:
  pushed: 12
  pulled: 0
  conflicts: 0
  errors: []

  details:
    - entity: patterns/participatory-budgeting.md
      notion_id: abc123
      action: updated
      timestamp: 2026-02-01T12:00:00Z
```

## Database Mapping

Maps resource types to Notion databases:

```yaml
# config/integrations.yaml → notion.databases
databases:
  patterns: "abc123..."
  protocols: "def456..."
  playbooks: "ghi789..."
  # ...auto-discovered or manually configured
```

## Property Mapping

Translates frontmatter to Notion properties:

```yaml
property_mapping:
  name: "Name"           # Title property
  short_description: "Short Description"
  civic_sectors: "Related Sectors"
  civic_scales: "Civic Scales"
  authors: "Author(s)"
  moderated: "Moderated"
  status: "Status"
```

## Sync Logic

### On Push (GitHub → Notion)
```
1. Load entity from markdown file
2. Parse frontmatter
3. Check if Notion page exists (by notion_id in frontmatter)
4. If exists: Update properties and content
5. If not: Create new page, save notion_id to frontmatter
6. Update relationships/backlinks
```

### On Pull (Notion → GitHub)
```
1. Query Notion database for updates since last sync
2. For each updated page:
   - Find corresponding markdown file
   - Compare timestamps
   - If Notion newer: update markdown
   - If GitHub newer: skip (will push on next sync)
3. Log conflicts for review
```

## Error Handling

| Error | Action |
|-------|--------|
| Notion API rate limit | Exponential backoff, retry |
| Page not found | Create new or log orphan |
| Property mismatch | Map what's possible, log gaps |
| Content too large | Truncate with note |

## LLM Routing

This skill doesn't require LLM - it's direct API/MCP operations.
