# Q&A Corpus Skill

Answer questions about the knowledge commons with citations.

## Purpose

Enable natural language questions about the entire corpus, returning accurate answers backed by specific citations. Uses RAG (Retrieval Augmented Generation) to ground responses in actual content.

## Design Principles

1. **Always cite sources** - Every claim links to specific entities
2. **Admit uncertainty** - Say "I don't know" when corpus lacks info
3. **Show your work** - Explain which entities informed the answer
4. **Suggest exploration** - Point to related content for deeper dives

## When to Use

- `/ask <question>` command
- Natural conversation about commons content
- Research queries
- Gap identification

## Question Types Handled

```yaml
question_types:
  factual:
    example: "What is consent-based decision making?"
    strategy: direct_retrieval
    sources: 1-3 entities

  comparative:
    example: "How does sociocracy differ from consensus?"
    strategy: multi_entity_synthesis
    sources: 2-5 entities

  exploratory:
    example: "What patterns exist for community governance?"
    strategy: taxonomy_search
    sources: list of relevant entities

  relational:
    example: "What protocols implement the consent pattern?"
    strategy: graph_traversal
    sources: relationship index

  gap_finding:
    example: "Do we have anything about participatory budgeting?"
    strategy: comprehensive_search
    sources: search results or "not found"

  meta:
    example: "How complete is our governance coverage?"
    strategy: coverage_analysis
    sources: taxonomy statistics
```

## Q&A Pipeline

### 1. Question Analysis

```yaml
analysis:
  input: "How does consent-based decision making work in municipal contexts?"

  steps:
    - classify_question_type:
        result: factual + contextual

    - extract_key_concepts:
        result:
          - consent-based decision making
          - municipal
          - governance (implied)

    - identify_constraints:
        result:
          - scale: municipal
          - sector: governance (likely)

    - determine_strategy:
        result: filtered_retrieval + synthesis
```

### 2. Retrieval

```yaml
retrieval:
  # Embed the question
  - embed_query:
      text: "How does consent-based decision making work in municipal contexts?"
      model: nomic-embed-text

  # Semantic search
  - vector_search:
      embedding: <query_embedding>
      collection: opal_entities
      limit: 20
      min_similarity: 0.6

  # Apply filters
  - filter_results:
      scale: municipal  # From constraints
      sector: governance-and-political-systems

  # Keyword boost
  - hybrid_boost:
      keywords: ["consent", "decision", "municipal"]
      weight: 0.3

  # Get top candidates
  - select_top:
      limit: 5
      diverse: true  # Don't return 5 nearly-identical results

  # Fetch full content
  - load_entities:
      ids: <top_result_ids>
      include: [content, relationships, metadata]
```

### 3. Context Assembly

```yaml
context:
  # Build context window for Claude
  - assemble_context:
      format: |
        You are answering questions about a knowledge commons.

        RELEVANT ENTITIES:

        ---
        ENTITY 1: {title}
        Type: {type}
        Sectors: {sectors}
        Scales: {scales}

        {content}

        Source: {entity_id}
        ---

        ENTITY 2: {title}
        ...

        QUESTION: {user_question}

        Answer based ONLY on the entities above.
        Cite sources using [Source: entity-id] format.
        If the entities don't contain enough information, say so.

  # Truncate if too long
  - manage_context_length:
      max_tokens: 8000
      strategy: prioritize_high_similarity
```

### 4. Answer Generation

```yaml
generation:
  - generate_answer:
      model: claude
      temperature: 0.3  # Lower for factual accuracy
      prompt: <assembled_context>

  - format_response:
      include:
        - answer_text
        - citations
        - related_entities
        - suggested_exploration

  - validate_citations:
      check: all_citations_exist_in_context
      warn_if: hallucinated_citation
```

### 5. Response Formatting

```yaml
response:
  format: |
    ## Answer

    {answer_text}

    ## Sources

    {citations_list}

    ## Related

    You might also explore:
    {related_entities}

  example: |
    ## Answer

    Consent-based decision making in municipal contexts works by...
    [Source: pattern-consent-based-decision-making]

    At the municipal scale, this is often implemented through...
    [Source: protocol-municipal-governance]

    ## Sources

    - [Consent-Based Decision Making](/patterns/consent-based-decision-making/)
    - [Municipal Governance Protocol](/protocols/municipal-governance/)

    ## Related

    You might also explore:
    - [Sociocracy](/protocols/sociocracy/) - Related governance approach
    - [Town Hall Meetings](/activities/town-hall/) - Common implementation
```

## Citation Requirements

### Citation Format

```yaml
citation:
  inline:
    format: "[Source: {entity_id}]"
    example: "[Source: pattern-consent]"

  bibliography:
    format: |
      - [{title}]({url}) - {type}
    example: |
      - [Consent-Based Decision Making](/patterns/consent-based-decision-making/) - Pattern

  requirements:
    - every_factual_claim_cited
    - no_claims_without_source
    - prefer_primary_sources
```

### Handling Uncertainty

```yaml
uncertainty:
  no_relevant_results:
    response: |
      I couldn't find information about "{topic}" in the commons.

      This might be a gap worth filling. Related topics that exist:
      {related_topics}

  low_confidence:
    response: |
      Based on limited information in the commons:
      {tentative_answer}

      Note: This answer is based on partial information.
      Consider adding more content about {topic}.

  conflicting_sources:
    response: |
      The commons contains different perspectives on this:

      View 1: {perspective_1} [Source: {source_1}]
      View 2: {perspective_2} [Source: {source_2}]

      These differences may reflect...
```

## Advanced Features

### Follow-up Questions

```yaml
follow_up:
  track_context:
    - store previous Q&A
    - resolve pronouns ("it", "they", "this")
    - maintain topic thread

  example:
    Q1: "What is consent-based decision making?"
    A1: "Consent-based decision making is..."

    Q2: "How does it differ from consensus?"
    # "it" resolved to "consent-based decision making"
    A2: "The key differences are..."
```

### Graph-Aware Answers

```yaml
graph_queries:
  traverse_relationships:
    question: "What implements the consent pattern?"
    strategy:
      - find: pattern-consent
      - follow: implements_by (reverse)
      - return: related entities

  multi_hop:
    question: "What organizations use sociocracy?"
    strategy:
      - find: protocol-sociocracy
      - follow: used_by → organizations
      - return: organization entities
```

### Coverage Analysis

```yaml
coverage:
  question: "How complete is our governance coverage?"
  strategy:
    - analyze_taxonomy:
        sector: governance-and-political-systems
    - count_entities_per_scale
    - identify_gaps
    - generate_report

  response: |
    ## Governance Coverage Analysis

    **Overall**: 67% coverage

    **By Scale**:
    - Individual: 3 entities
    - Household: 1 entity
    - Neighborhood: 8 entities ✓
    - Municipal: 12 entities ✓
    - Bioregional: 2 entities
    - National: 4 entities
    - Planetary: 1 entity

    **Gaps identified**:
    - Household governance (only 1 pattern)
    - Bioregional governance (limited)
    - Planetary governance (very limited)
```

## Configuration

### In `config/qa.yaml`

```yaml
qa:
  # Retrieval settings
  retrieval:
    top_k: 10
    min_similarity: 0.5
    rerank: true
    diversity: 0.3  # Avoid redundant results

  # Generation settings
  generation:
    model: claude
    temperature: 0.3
    max_tokens: 2000

  # Citation settings
  citations:
    required: true
    format: inline
    include_links: true

  # Context settings
  context:
    max_tokens: 8000
    include_relationships: true
    include_metadata: true

  # Features
  features:
    follow_up: true
    graph_aware: true
    suggest_related: true
    admit_uncertainty: true
```

## Command

```yaml
command:
  name: "/ask"
  syntax: "/ask <question>"

  examples:
    - "/ask What is consent-based decision making?"
    - "/ask How do we handle conflicts in communities?"
    - "/ask What governance patterns work at neighborhood scale?"
    - "/ask Do we have anything about participatory budgeting?"

  options:
    --detailed: "Include more context in answer"
    --sources-only: "Just return relevant sources, no synthesis"
    --coverage: "Analyze coverage instead of answering"
```

## Integration

### With Embed Skill

```yaml
integration:
  embed:
    - embed_query for semantic search
    - use same embedding model
    - leverage cached embeddings
```

### With Search Command

```yaml
integration:
  search:
    - /search for keyword search
    - /ask for synthesized answers
    - combine for research workflows
```

### With Review Workflow

```yaml
integration:
  review:
    - flag gaps found via /ask
    - suggest entities to create
    - track question patterns
```

## Metrics

Track Q&A quality:

```yaml
metrics:
  track:
    - questions_asked
    - answers_with_citations
    - "no answer found" rate
    - follow_up_rate
    - common_topics
    - gap_signals

  use_for:
    - coverage improvement
    - content prioritization
    - user need understanding
```
