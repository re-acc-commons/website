# Extract Entities Skill

Claude-powered domain-aware entity extraction that identifies concepts, people, organizations, and relationships from content.

## Purpose

This is the core intelligence of OPAL. Unlike generic NER libraries (spaCy, LangExtract), this skill uses Claude directly with full context about:
1. The loaded taxonomy (what kinds of entities matter)
2. Existing entities in the knowledge base (for matching)
3. The domain context (civic innovation, open protocols, etc.)

This enables extraction of domain-specific concepts like "participatory budgeting", "commitment pooling", or "bioregional coordination" as first-class entities.

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `content` | string | Yes | Preprocessed content to extract from |
| `taxonomy` | object | Yes | Full taxonomy definition |
| `existing_entities` | array | Yes | Top N entities from _index/entities.json |
| `classification` | object | No | Output from classify skill |
| `source_metadata` | object | No | Attribution info (speakers, date, etc.) |

## Outputs

```yaml
extraction:
  entities:
    - canonical_name: Participatory Budgeting
      type: pattern
      aliases: [PB, community budgeting]
      confidence: 0.95
      mentions:
        - text: "participatory budgeting process"
          position: 234
          context: "...we used a participatory budgeting process to..."
      attributes:
        description: "A democratic process where community members directly decide..."
        sectors: [governance-political-systems]
        scales: [neighborhood, municipal]

    - canonical_name: Sarah Chen
      type: person
      confidence: 0.9
      mentions:
        - text: "Sarah"
          position: 0
          context: "[Speaker label in transcript]"
      attributes:
        role: "Facilitator"
        organization: "Bioregional Food Council"

  relationships:
    - source: Sarah Chen
      target: Bioregional Food Council
      type: member_of
      confidence: 0.85

    - source: Participatory Budgeting
      target: Community Resource Allocation
      type: related_pattern
      confidence: 0.7

  potential_new_resources:
    - name: "Food Council Decision Protocol"
      type: protocol
      evidence: "Step-by-step process described starting at position 1234"
      confidence: 0.6

  statistics:
    total_entities: 15
    new_entities: 3
    matched_existing: 12
    relationships_found: 8
```

## Extraction Prompt

The skill constructs a prompt like this:

```
You are extracting entities from content for a knowledge commons.

## Taxonomy Context
This knowledge base uses the following taxonomy:
{taxonomy summary - resource types, sectors, scales}

## Existing Entities
Here are the most-referenced entities already in the knowledge base.
When you identify entities, check if they match any of these:
{top 50 entities with names, types, and aliases}

## Content to Analyze
{content}

## Source Information
Source: {source type}
Date: {date if available}
Speakers: {speakers if transcript}

## Instructions
Extract the following:

1. **Named Entities**: People, organizations, places mentioned
   - For each, determine if it matches an existing entity or is new
   - Provide canonical name and any aliases used

2. **Concepts and Patterns**: Domain-specific concepts that match the taxonomy
   - Patterns: Recurring solutions to common problems
   - Protocols: Step-by-step processes with defined roles
   - Primitives: Fundamental concepts and building blocks

3. **Relationships**: How entities relate to each other
   - Use relationship types from the taxonomy
   - Include confidence scores

4. **Potential New Resources**: If the content describes something that
   could become a standalone resource (a new protocol, pattern, etc.)

## Output Format
Provide structured YAML output with the schema shown above.
Focus on precision over recall - only extract entities you're confident about.
```

## Matching Against Existing Entities

Before returning results, the skill checks each extracted entity against existing ones:

```
For each extracted entity:
1. Exact name match → mark as "matched"
2. Alias match → mark as "matched"
3. Fuzzy match (Levenshtein < 3) → mark as "potential_match", include existing entity
4. No match → mark as "new"
```

This pre-filtering helps the reconcile skill make better decisions.

## LLM Routing

This skill MUST use Claude for quality:

```yaml
llm_preference: claude
fallback: ollama.llama3.2:70b  # Only if Claude unavailable
```

Entity extraction quality is critical - it affects everything downstream. Using a smaller model would degrade the entire knowledge base over time.

## Batch Processing

For long content, the skill processes in chunks:

```
1. Split content into ~2000 word chunks with 200 word overlap
2. Extract entities from each chunk
3. Deduplicate across chunks (same entity mentioned multiple times)
4. Merge mentions and context
5. Return unified extraction result
```

## Error Handling

| Error | Action |
|-------|--------|
| Content too short (<50 words) | Extract what's there, flag as minimal |
| No taxonomy loaded | Use generic entity types (person, org, concept) |
| LLM error | Retry once, then fail with error for human review |
| Malformed output | Attempt to parse what's available, flag issues |
| Too many entities (>100) | Truncate to highest confidence, flag for review |

## Quality Signals

The skill includes quality metadata:

```yaml
quality:
  extraction_model: claude-3-opus
  content_length: 3421 words
  processing_time: 4.2s
  chunk_count: 2
  confidence_distribution:
    high: 12      # >0.9
    medium: 8     # 0.7-0.9
    low: 3        # <0.7
```
