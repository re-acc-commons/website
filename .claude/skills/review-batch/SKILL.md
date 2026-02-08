# Review Batch Skill

Efficiently review multiple staged items with keyboard-driven workflow.

## Purpose

Speed up the review process when many items are staged. Provides a streamlined interface for accepting, rejecting, and editing multiple entities without context-switching.

## When to Use

- `/review batch` - Enter batch review mode
- Many items in staging (>5)
- Regular curation sessions
- Sprint review sessions

## Batch Review Interface

### Overview Mode

```
╔══════════════════════════════════════════════════════════════╗
║  BATCH REVIEW - 12 items staged                              ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  [ ] 1. Consent-Based Decision Making     Pattern    0.95   ║
║  [ ] 2. Advice Process Pattern            Pattern    0.88   ║
║  [✓] 3. Sociocracy Protocol               Protocol   0.92   ║
║  [ ] 4. Municipal Governance Framework    Framework  0.76   ║
║  [✗] 5. Unknown Entity                    Pattern    0.45   ║
║  [ ] 6. Participatory Budgeting           Protocol   0.89   ║
║  ...                                                         ║
║                                                              ║
╠══════════════════════════════════════════════════════════════╣
║  [a]ccept  [r]eject  [e]dit  [v]iew  [↑↓]navigate  [q]uit   ║
╚══════════════════════════════════════════════════════════════╝
```

### Detail Mode

```
╔══════════════════════════════════════════════════════════════╗
║  REVIEWING: Consent-Based Decision Making (1/12)             ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Type: Pattern                                               ║
║  Confidence: 0.95                                            ║
║  Source: meeting-transcript-2026-01-28.md                    ║
║                                                              ║
║  ─────────────────────────────────────────────────────────   ║
║                                                              ║
║  Summary:                                                    ║
║  A decision-making approach where proposals are adopted      ║
║  unless there are meaningful objections...                   ║
║                                                              ║
║  Sectors: Governance and Political Systems                   ║
║  Scales: Neighborhood, Municipal                             ║
║                                                              ║
║  Relationships:                                              ║
║  - implements: Sociocracy Protocol (0.89)                    ║
║  - similar_to: Advice Process (0.82)                         ║
║                                                              ║
║  ─────────────────────────────────────────────────────────   ║
║  Source excerpt:                                             ║
║  "...we use consent-based decision making, which means..."   ║
║                                                              ║
╠══════════════════════════════════════════════════════════════╣
║  [a]ccept  [r]eject  [e]dit  [n]ext  [p]rev  [b]ack  [q]uit ║
╚══════════════════════════════════════════════════════════════╝
```

## Keyboard Shortcuts

### Navigation

| Key | Action |
|-----|--------|
| `↑` / `k` | Move up in list |
| `↓` / `j` | Move down in list |
| `Enter` | View item details |
| `b` | Back to list |
| `n` | Next item |
| `p` | Previous item |
| `g` | Go to item number |
| `/` | Search/filter items |

### Actions

| Key | Action |
|-----|--------|
| `a` | Accept item |
| `r` | Reject item |
| `e` | Edit item |
| `m` | Merge with existing entity |
| `s` | Skip (decide later) |
| `Space` | Toggle selection |
| `A` | Accept all selected |
| `R` | Reject all selected |

### Bulk Operations

| Key | Action |
|-----|--------|
| `Ctrl+A` | Select all |
| `Ctrl+D` | Deselect all |
| `*` | Invert selection |
| `t` | Select by type |
| `c` | Select by confidence threshold |

### Editing

| Key | Action |
|-----|--------|
| `e` | Quick edit (inline) |
| `E` | Full edit (open editor) |
| `T` | Edit title |
| `S` | Edit sectors |
| `L` | Edit scales |
| `R` | Edit relationships |

### Other

| Key | Action |
|-----|--------|
| `?` | Show help |
| `q` | Quit batch review |
| `Ctrl+S` | Save progress |
| `u` | Undo last action |

## Review Workflow

### Standard Flow

```yaml
workflow:
  1_load:
    - load staged items
    - sort by confidence (descending)
    - group by type (optional)

  2_review:
    for_each_item:
      - display summary
      - show confidence and source
      - await action:
          accept: move to commit queue
          reject: move to rejected
          edit: open editor, then accept
          skip: leave in staging
          merge: select target, combine

  3_complete:
    - show summary of decisions
    - confirm actions
    - execute: move files, update index
```

### Triage Mode

Quick pass for obvious decisions:

```yaml
triage:
  sort: by_confidence

  auto_suggest:
    - confidence > 0.9: suggest accept
    - confidence < 0.5: suggest reject
    - 0.5 <= confidence <= 0.9: require review

  display: compact
  actions: accept/reject only
```

### Focus Mode

Deep review for complex items:

```yaml
focus:
  filter: confidence < 0.8  # Only uncertain items

  display: full detail
  include:
    - source excerpt
    - similar existing entities
    - relationship suggestions

  actions: all available
```

## Filtering and Sorting

### Filter Options

```yaml
filters:
  by_type:
    command: "t <type>"
    example: "t pattern"

  by_confidence:
    command: "c <threshold>"
    example: "c 0.8"  # Show items with confidence >= 0.8

  by_sector:
    command: "s <sector>"
    example: "s governance"

  by_source:
    command: "src <source>"
    example: "src meeting-2026-01-28"

  by_status:
    command: "st <status>"
    options: [pending, accepted, rejected, skipped]
```

### Sort Options

```yaml
sort:
  by_confidence:
    command: "sort conf"
    direction: descending

  by_type:
    command: "sort type"
    grouping: true

  by_date:
    command: "sort date"
    field: extracted_at

  by_source:
    command: "sort source"
    grouping: true
```

## Merge Workflow

When item matches existing entity:

```yaml
merge:
  trigger: "m" key or auto-detected duplicate

  display: |
    ╔══════════════════════════════════════════════════════════╗
    ║  MERGE: New item matches existing entity                 ║
    ╠══════════════════════════════════════════════════════════╣
    ║                                                          ║
    ║  NEW ITEM                    EXISTING ENTITY             ║
    ║  ──────────────────────────  ──────────────────────────  ║
    ║  Consent Decision Making     Consent-Based Decision...   ║
    ║  Pattern                     Pattern                     ║
    ║  Confidence: 0.88            Created: 2026-01-15         ║
    ║                                                          ║
    ║  Similarity: 0.94                                        ║
    ║                                                          ║
    ╠══════════════════════════════════════════════════════════╣
    ║  [m]erge  [k]eep both  [r]eplace  [c]ancel               ║
    ╚══════════════════════════════════════════════════════════╝

  options:
    merge:
      - combine content
      - keep newer fields
      - merge relationships

    keep_both:
      - accept as new entity
      - add relationship: similar_to

    replace:
      - update existing with new content
      - preserve relationships
```

## Inline Editing

Quick edits without leaving review:

```yaml
inline_edit:
  title:
    key: "T"
    prompt: "Edit title:"
    validate: non_empty

  sectors:
    key: "S"
    prompt: "Select sectors:"
    display: checkbox_list
    options: <taxonomy_sectors>

  scales:
    key: "L"
    prompt: "Select scales:"
    display: checkbox_list
    options: <taxonomy_scales>

  summary:
    key: "D"  # Description
    prompt: "Edit summary:"
    multiline: true
```

## Progress Tracking

```yaml
progress:
  display: |
    Progress: [████████░░░░░░░░░░░░] 8/20 (40%)
    Accepted: 5 | Rejected: 2 | Skipped: 1

  auto_save:
    interval: 5  # Save every 5 actions
    on_quit: true

  resume:
    - save state on quit
    - offer to resume on next `/review batch`
```

## Configuration

### In `config/review.yaml`

```yaml
review:
  # Batch settings
  batch:
    default_sort: confidence
    show_source: true
    show_relationships: true
    auto_suggest: true

  # Thresholds
  thresholds:
    auto_accept: 0.95  # Suggest accept above this
    auto_reject: 0.40  # Suggest reject below this

  # Display
  display:
    items_per_page: 20
    compact_mode: false
    show_excerpts: true
    excerpt_length: 200

  # Behavior
  behavior:
    confirm_bulk_actions: true
    undo_enabled: true
    undo_limit: 50
    auto_save: true

  # Keyboard
  keyboard:
    vim_mode: true  # j/k navigation
    custom_bindings: {}
```

## Commands

```yaml
commands:
  "/review batch":
    description: "Enter batch review mode"
    options:
      --type: "Filter by type"
      --confidence: "Filter by confidence threshold"
      --sort: "Sort order"

  "/review batch --triage":
    description: "Quick triage mode"

  "/review batch --focus":
    description: "Deep review mode for uncertain items"

  "/review batch --resume":
    description: "Resume previous session"
```

## Integration

### With GitHub

After batch review:

```yaml
post_review:
  - group accepted items
  - create single commit or PR
  - include review summary in message
```

### With Reconcile

Use during review:

```yaml
reconcile:
  - show similar entities for each item
  - suggest merges automatically
  - highlight potential duplicates
```

### With Digest

Include review stats:

```yaml
digest:
  include:
    - items_reviewed: count
    - accept_rate: percentage
    - common_rejection_reasons: list
```

## Session Management

```yaml
session:
  save:
    location: _staging/.review-session.json
    contents:
      - current_position
      - decisions_made
      - filters_applied
      - timestamp

  resume:
    prompt: "Resume previous session? (y/n)"
    show_summary: true

  timeout:
    warn_after: 30m
    auto_save: true
```
