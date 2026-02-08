# Federate Sync Skill

Handles federation between knowledge commons repositories.

## Purpose

Federation enables cosmo-local knowledge sharing:
1. **Subscribe** to upstream commons for new content
2. **Publish** changes for downstream consumers
3. **Translate** content between different taxonomies
4. **Maintain** attribution chains

## Federation Model

```
┌─────────────────┐     subscribe      ┌─────────────────┐
│  Upstream Repo  │ ─────────────────▶ │    Your Repo    │
│  (Publisher)    │                    │  (Subscriber)   │
└─────────────────┘                    └─────────────────┘
                                              │
                                              │ publish
                                              ▼
                                       ┌─────────────────┐
                                       │ Downstream Repo │
                                       │  (Subscriber)   │
                                       └─────────────────┘
```

## Configuration

### Sources (Upstream Subscriptions)

```yaml
# _federation/sources.yaml
sources:
  - name: open-protocol-library
    repo: omniharmonic/open-protocol-library
    branch: main
    subscribe_to:
      - patterns/*
      - protocols/*
    auto_merge: false
    translate_taxonomy: true
```

### Subscriptions (What to Share Downstream)

```yaml
# _federation/subscriptions.yaml
publish:
  enabled: true
  include:
    - patterns/*
    - protocols/*
  exclude:
    - _draft/*
  license: CC-BY-SA-4.0
```

## Operations

### Pull from Upstream

```yaml
# Input
operation: pull
source: open-protocol-library

# Process
1. git fetch upstream repo
2. diff against last known state
3. filter by subscription patterns
4. for each new/updated file:
   - copy to _inbox/federation/
   - add attribution metadata
   - if translate_taxonomy: queue for translation
5. update last_sync timestamp

# Output
pulled:
  files: 3
  new_entities: 2
  updated_entities: 1
  source: open-protocol-library
  commit: abc123
```

### Push to Outbox

```yaml
# Input
operation: publish
commit: def456

# Process
1. get changed files from commit
2. filter by publish.include/exclude
3. generate structured summary
4. write to _federation/outbox/{date}.json
5. optionally notify subscribers (webhook)

# Output
published:
  commit: def456
  files: 2
  outbox_entry: _federation/outbox/2026-02-01.json
```

### Taxonomy Translation

When pulling from a repo with different taxonomy:

```yaml
translation:
  source_taxonomy: external-taxonomy
  target_taxonomy: opl

  mappings:
    # Resource types
    "best-practice" → "pattern"
    "procedure" → "protocol"
    "guide" → "playbook"

    # Sectors
    "environment" → "environmental-sustainability"
    "government" → "governance-political-systems"

  unmapped_handling: preserve  # or: prompt, discard
```

## Attribution Chain

Every federated item tracks its origin:

```yaml
---
# patterns/imported-pattern.md
type: pattern
name: Imported Pattern
federation:
  source_repo: omniharmonic/open-protocol-library
  source_path: patterns/original-name.md
  source_commit: abc123
  imported: 2026-02-01
  license: CC-BY-SA-4.0
  attribution: "Originally from Open Protocol Library"
---
```

## Outbox Format

```json
// _federation/outbox/2026-02-01.json
{
  "date": "2026-02-01",
  "commits": [
    {
      "hash": "def456",
      "timestamp": "2026-02-01T12:00:00Z",
      "message": "[add] Add food sovereignty pattern",
      "files": [
        {
          "path": "patterns/food-sovereignty.md",
          "action": "added",
          "type": "pattern",
          "summary": "Community food system governance..."
        }
      ]
    }
  ]
}
```

## Error Handling

| Error | Action |
|-------|--------|
| Upstream unreachable | Log, retry later |
| Merge conflict | Stage for manual review |
| Translation failure | Preserve original, flag for review |
| License incompatible | Skip with warning |

## Commands

- `/federate pull` - Pull from all sources
- `/federate pull <source>` - Pull from specific source
- `/federate status` - Show federation state
- `/federate publish` - Update outbox with recent commits
