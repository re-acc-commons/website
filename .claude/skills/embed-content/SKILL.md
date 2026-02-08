# Embed Content Skill

Generate and manage vector embeddings for semantic search and relationship discovery.

## Purpose

This skill creates vector embeddings for all content in the knowledge commons, enabling:
- Semantic search across entities
- Automatic relationship discovery during ingestion
- Similarity-based recommendations
- Gap analysis and coverage detection

## When to Use

- After entity creation/update (automatic via hooks)
- During `/process` pipeline (EXTRACT stage)
- When running `/search` queries
- During background reindexing

## Embedding Strategy

### Entity Embeddings

Each entity gets a composite embedding from:

```
EMBEDDING_INPUT = """
Title: {title}
Type: {resource_type}
Sectors: {sectors}
Scales: {scales}
Summary: {summary}
Tags: {tags}
Key concepts: {extracted_concepts}
"""
```

### Chunk Embeddings

Long content is chunked for granular search:

1. Split by semantic boundaries (headers, paragraphs)
2. Target 512 tokens per chunk with 64 token overlap
3. Preserve section context in each chunk
4. Store chunk offset for citation

### Relationship Embeddings

Relationships are embedded for discovery:

```
RELATIONSHIP_INPUT = """
{source_title} ({source_type})
  --[{relationship_type}]-->
{target_title} ({target_type})
Context: {relationship_description}
"""
```

## Embedding Pipeline

### 1. Prepare Content

```yaml
input:
  entity_id: "pattern-consent-based-decision-making"
  content: <full entity markdown>
  metadata:
    type: pattern
    sectors: [governance-and-political-systems]
    scales: [neighborhood, municipal]

steps:
  - extract_embedding_text:
      include: [title, summary, content, tags]
      exclude: [frontmatter_raw, internal_notes]

  - chunk_if_needed:
      threshold_tokens: 1000
      chunk_size: 512
      overlap: 64
      preserve: [headers, paragraphs]

  - add_context:
      prefix_with: "Type: {type}, Sectors: {sectors}"
```

### 2. Generate Embeddings

```yaml
embedding:
  provider: ollama  # or openai fallback
  model: nomic-embed-text

  process:
    - normalize_text:
        lowercase: false
        remove_markdown: true
        collapse_whitespace: true

    - generate_embedding:
        input: <prepared_text>
        dimensions: 768

    - validate:
        check_dimensions: true
        check_magnitude: true  # Should be unit normalized
```

### 3. Store and Index

```yaml
storage:
  - upsert_entity_embedding:
      table: entity_embeddings
      id: <entity_id>
      embedding: <vector>
      metadata:
        model: nomic-embed-text
        dimensions: 768
        updated_at: <timestamp>

  - upsert_chunk_embeddings:
      table: chunk_embeddings
      entity_id: <entity_id>
      chunks: <chunk_vectors>

  - update_vector_index:
      collection: opal_entities
      operation: upsert
```

### 4. Discover Relationships

After embedding, automatically find related content:

```yaml
discovery:
  - find_similar:
      query_embedding: <new_entity_embedding>
      collection: opal_entities
      exclude: [<self_id>]
      limit: 10
      min_similarity: 0.75

  - analyze_relationships:
      for_each: <similar_entities>
      determine:
        - relationship_type: <inferred_type>
        - confidence: <similarity_score>
        - reasoning: <why_related>

  - create_suggestions:
      table: suggested_relationships
      entries: <discovered_relationships>
      status: pending
```

## Similarity Search

### Query Processing

```yaml
search:
  input: "consensus decision making in neighborhoods"

  steps:
    - embed_query:
        text: <input>
        model: nomic-embed-text

    - vector_search:
        embedding: <query_embedding>
        collection: opal_entities
        limit: 20
        min_similarity: 0.5

    - hybrid_boost:
        keyword_matches: <bm25_results>
        semantic_matches: <vector_results>
        weights: [0.3, 0.7]

    - apply_filters:
        type: <optional_type_filter>
        sectors: <optional_sector_filter>
        date_range: <optional_date_filter>

    - rank_and_return:
        limit: 10
        include: [id, title, type, similarity, snippet]
```

### Relationship Discovery During Ingestion

When new content arrives, find connections:

```yaml
ingestion_discovery:
  trigger: on_entity_staged

  process:
    - embed_new_entity:
        entity: <staged_entity>

    - search_corpus:
        query: <entity_embedding>
        exclude_staged: true
        limit: 20

    - analyze_each_match:
        for: <similar_entities>
        prompt: |
          Given these two entities, determine their relationship:

          NEW ENTITY:
          {new_entity_summary}

          EXISTING ENTITY:
          {existing_entity_summary}

          SIMILARITY SCORE: {similarity}

          What is their relationship? Choose from:
          - related_to: General topical relationship
          - similar_to: Very similar concepts/approaches
          - builds_on: New entity extends existing
          - extends: Existing extends new (reverse)
          - contradicts: Conflicting approaches
          - prerequisite: One requires understanding of other
          - implements: One is implementation of other
          - none: No meaningful relationship

          Respond with:
          - relationship_type: <type>
          - confidence: <0.0-1.0>
          - reasoning: <brief explanation>

    - store_suggestions:
        high_confidence: # > 0.8
          add_to: suggested_relationships
          notify: true
        medium_confidence: # 0.6-0.8
          add_to: suggested_relationships
          notify: false
        low_confidence: # < 0.6
          discard: true
```

## Background Processing

### Job Queue

Embeddings are processed asynchronously:

```yaml
job_queue:
  table: embedding_jobs

  job_types:
    create:
      priority: high
      trigger: entity_created
    update:
      priority: medium
      trigger: entity_updated
    reindex:
      priority: low
      trigger: scheduled

  processing:
    batch_size: 32
    max_concurrent: 4
    retry_attempts: 3
    backoff: exponential

  scheduling:
    check_interval: 30s
    stale_threshold: 30d
    batch_limit: 100
```

### Reindexing

Full reindex for model changes or maintenance:

```yaml
reindex:
  command: "/process reindex-embeddings"

  options:
    --full: "Reindex all entities"
    --stale: "Only reindex stale embeddings"
    --type: "Reindex specific entity type"
    --force: "Ignore existing embeddings"

  process:
    - pause_background_jobs
    - for_each_entity:
        batch_size: 50
        regenerate_embedding: true
        update_relationships: true
    - optimize_index
    - resume_background_jobs
```

## Configuration

From `config/embeddings.yaml`:

```yaml
provider:
  primary: ollama
  fallback: openai

ollama:
  model: nomic-embed-text
  dimensions: 768

storage:
  backend: sqlite-vec
  path: _index/embeddings.db

chunking:
  strategy: semantic
  chunk_size: 512
  chunk_overlap: 64

discovery:
  auto_suggest: true
  suggestion_threshold: 0.75
  max_suggestions: 5
```

## Integration Points

### With Extract-Entities Skill

After extraction, embed the new entity:

```yaml
post_extraction:
  - embed_entity:
      entity: <extracted_entity>
      priority: high

  - discover_relationships:
      entity: <extracted_entity>
      add_to_staging: true
```

### With Reconcile Skill

Use embeddings for fuzzy matching:

```yaml
reconciliation:
  - exact_match: <try first>
  - alias_match: <try second>
  - semantic_match:
      query: <entity_embedding>
      threshold: 0.9
      confirm_with_llm: true
```

### With Search Command

Power semantic search:

```yaml
search:
  - parse_query: <user_input>
  - embed_query: <normalized_query>
  - vector_search: <find_similar>
  - format_results: <display>
```

## Output

### Embedding Result

```json
{
  "entity_id": "pattern-consent-based-decision-making",
  "embedding": {
    "model": "nomic-embed-text",
    "dimensions": 768,
    "vector": [0.023, -0.156, ...],
    "created_at": "2026-02-01T12:00:00Z"
  },
  "chunks": [
    {
      "index": 0,
      "text": "Consent-based decision making is...",
      "start": 0,
      "end": 512
    }
  ],
  "discovered_relationships": [
    {
      "target_id": "protocol-sociocracy",
      "type": "implements",
      "confidence": 0.89,
      "reasoning": "Consent is core to sociocratic governance"
    }
  ]
}
```

## Error Handling

```yaml
errors:
  embedding_failed:
    retry: true
    max_attempts: 3
    fallback: openai_provider

  ollama_unavailable:
    queue_for_later: true
    notify_user: false
    use_fallback: true

  storage_error:
    retry: true
    alert: true
```

## Performance

- Batch embeddings for efficiency (32 at a time)
- Cache query embeddings for repeated searches
- Use approximate nearest neighbor for large collections
- Background processing to not block user operations
