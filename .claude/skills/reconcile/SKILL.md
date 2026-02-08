# Reconcile Skill

Deduplication and entity reconciliation against the knowledge base.

## Purpose

After extraction, this skill determines for each entity:
1. Is this a **new entity** that needs a new page?
2. Is this an **existing entity** that should be updated?
3. Is this a **merge candidate** where two entities are actually the same?

This is the deduplication brain of OPAL.

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `extraction` | object | Yes | Output from extract-entities skill |
| `entity_index` | object | Yes | Full _index/entities.json |
| `alias_index` | object | Yes | _index/aliases.json |
| `threshold_high` | float | No | Auto-merge threshold (default: 0.9) |
| `threshold_low` | float | No | New entity threshold (default: 0.7) |

## Outputs

```yaml
reconciliation:
  operations:
    # New entities - need wiki pages created
    - action: create
      entity:
        canonical_name: Food Council Decision Protocol
        type: protocol
        source_extraction: {...}
      confidence: 0.85
      rationale: "No existing entity matches this protocol description"

    # Updates - add new information to existing entity
    - action: update
      existing_entity_id: participatory-budgeting
      updates:
        add_alias: "community budget process"
        add_mention:
          source: "food-council-jan-2026.md"
          date: "2026-01-15"
          context: "...applied participatory budgeting..."
        update_sectors: [economic-resource-sharing]  # Add if not present
      confidence: 0.95
      rationale: "Exact alias match in existing entity"

    # Merges - two entities are actually the same
    - action: merge
      source_entity: "Community Resource Allocation"
      target_entity_id: participatory-budgeting
      confidence: 0.82
      rationale: "Claude semantic analysis: these describe the same concept"
      requires_review: true

    # Review - uncertain, needs human input
    - action: review
      entity:
        canonical_name: Sarah
        type: person
      possible_matches:
        - entity_id: sarah-chen
          confidence: 0.65
          rationale: "Same first name, different context"
        - entity_id: sarah-jones
          confidence: 0.55
          rationale: "Same first name, also involved in food systems"
      question: "Is 'Sarah' from this transcript Sarah Chen or someone else?"

  statistics:
    total_entities: 15
    creates: 2
    updates: 10
    merges: 1
    reviews: 2

  index_updates:
    # Proposed updates to entities.json
    new_entries: [...]
    modified_entries: [...]
```

## Reconciliation Algorithm

### Step 1: Exact Match Check

```python
for entity in extraction.entities:
    # Check canonical names
    if entity.canonical_name.lower() in entity_index.names:
        mark_as_update(entity, matched_id)
        continue

    # Check aliases
    for alias in entity.aliases:
        if alias.lower() in alias_index:
            mark_as_update(entity, alias_index[alias])
            continue
```

### Step 2: Fuzzy Match Check

```python
for entity in unmatched_entities:
    candidates = []
    for existing in entity_index:
        # Levenshtein distance check
        distance = levenshtein(entity.name, existing.name)
        if distance <= 3 and len(entity.name) > 8:
            candidates.append((existing, distance))

    if candidates:
        mark_for_fuzzy_review(entity, candidates)
```

### Step 3: Semantic Match (Claude)

For entities still unmatched, use Claude for semantic comparison:

```
You are checking if a new entity matches any existing entities.

New Entity:
Name: "{entity.name}"
Type: {entity.type}
Description: "{entity.description}"
Context: "{entity.context}"

Existing Entities to Compare:
{top 10 closest by embedding or keyword overlap}

For each existing entity, assess:
1. Are these the SAME concept/person/organization? (confidence 0-1)
2. Are these RELATED but distinct? (describe relationship)
3. Are these UNRELATED?

If confidence > 0.7 for "same", recommend merge.
If confidence 0.5-0.7, flag for human review.
If confidence < 0.5, treat as new entity.
```

### Step 4: Generate Operations

Based on match results, generate operations:

| Match Result | Confidence | Action |
|--------------|------------|--------|
| Exact match | 1.0 | Update existing |
| Alias match | 0.95 | Update existing |
| Fuzzy match | 0.8-0.95 | Update with alias added |
| Semantic match | 0.7-0.9 | Merge (with review if <0.85) |
| Semantic match | 0.5-0.7 | Review required |
| No match | <0.5 | Create new |

## Entity Index Structure

The skill reads and proposes updates to `_index/entities.json`:

```json
{
  "version": "1.0",
  "last_updated": "2026-02-01T12:00:00Z",
  "entities": {
    "participatory-budgeting": {
      "id": "participatory-budgeting",
      "canonical_name": "Participatory Budgeting",
      "type": "pattern",
      "file_path": "patterns/participatory-budgeting.md",
      "aliases": ["PB", "community budgeting", "citizen budgeting"],
      "sectors": ["governance-political-systems", "economic-resource-sharing"],
      "scales": ["neighborhood", "municipal"],
      "created": "2025-06-15",
      "last_updated": "2026-01-28",
      "mention_count": 23,
      "sources": [
        {"file": "transcripts/food-council-2026-01.md", "date": "2026-01-15"},
        {"file": "artifacts/pb-handbook.md", "date": "2025-06-15"}
      ]
    }
  }
}
```

## LLM Routing

Semantic matching requires Claude:

```yaml
# Exact and fuzzy matching: no LLM needed
# Semantic matching:
llm_preference: claude
fallback: ollama.llama3.2:70b
```

## Merge Strategy

When merging entities:

```yaml
merge_rules:
  # Keep the more established entity as primary
  primary: entity with more mentions OR older creation date

  # Combine aliases
  aliases: union of both alias sets

  # Combine sources
  sources: union of both source lists

  # Keep richer metadata
  description: longer description wins
  sectors: union
  scales: union

  # Create redirect
  redirect: source entity file becomes redirect to target
```

## Error Handling

| Error | Action |
|-------|--------|
| Entity index corrupt | Rebuild from markdown files |
| Merge conflict | Stage both for review |
| Claude unavailable | Skip semantic matching, flag for later |
| Circular merge detected | Abort, flag for human review |

## Audit Trail

All reconciliation decisions are logged:

```yaml
audit:
  timestamp: 2026-02-01T12:34:56Z
  batch_id: batch-2026-02-01-001
  decisions:
    - entity: "Food Council Decision Protocol"
      action: create
      reason: "No matches found (exact, fuzzy, or semantic)"
      model: claude-3-opus
      reviewer: auto

    - entity: "Community Resource Allocation"
      action: merge
      target: participatory-budgeting
      reason: "Semantic match confidence 0.87"
      model: claude-3-opus
      reviewer: pending  # Needs human approval
```
