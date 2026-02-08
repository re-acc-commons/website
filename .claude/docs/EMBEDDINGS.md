# OPAL Embeddings Guide

Embeddings enable semantic search, entity reconciliation, and intelligent Q&A across your knowledge commons.

## Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EMBEDDINGS ARCHITECTURE                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   CONTENT                    EMBEDDINGS                    APPLICATIONS      │
│   ════════                   ══════════                    ════════════      │
│                                                                              │
│   ┌─────────────┐           ┌─────────────┐              ┌─────────────┐    │
│   │  Entities   │──────────▶│   Ollama    │─────────────▶│  /search    │    │
│   │  (markdown) │           │ nomic-embed │              │  semantic   │    │
│   └─────────────┘           └─────────────┘              └─────────────┘    │
│                                    │                                         │
│   ┌─────────────┐                  │                     ┌─────────────┐    │
│   │ Transcripts │──────────────────┤                     │  /ask       │    │
│   │             │                  │                     │  Q&A + RAG  │    │
│   └─────────────┘                  │                     └─────────────┘    │
│                                    │                                         │
│   ┌─────────────┐                  ▼                     ┌─────────────┐    │
│   │   Links     │           ┌─────────────┐              │ /reconcile  │    │
│   │             │──────────▶│ Vector Store│─────────────▶│  dedup      │    │
│   └─────────────┘           │ (FAISS/etc) │              └─────────────┘    │
│                             └─────────────┘                                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Ensure Ollama is Running

```bash
# Start Ollama
ollama serve

# Pull the embedding model
ollama pull nomic-embed-text
```

### 2. Generate Embeddings

```bash
# In Claude Code
/embeddings generate          # Generate for all content
/embeddings generate --new    # Only new/changed content
```

### 3. Use Semantic Features

```bash
/search "community governance"  # Semantic search
/ask "What patterns exist for decision making?"  # Q&A
```

---

## Configuration

### Embeddings Configuration (`config/embeddings.yaml`)

```yaml
embeddings:
  # Provider configuration
  provider: ollama              # ollama | openai | voyage | local

  ollama:
    model: nomic-embed-text     # Recommended for general use
    endpoint: http://localhost:11434
    dimensions: 768             # nomic-embed-text outputs 768 dims
    batch_size: 32              # Process 32 texts at a time

  # Alternative providers (if Ollama unavailable)
  openai:
    model: text-embedding-3-small
    api_key_env: OPENAI_API_KEY
    dimensions: 1536

  voyage:
    model: voyage-02
    api_key_env: VOYAGE_API_KEY

  # Vector store configuration
  vector_store:
    type: faiss                 # faiss | hnswlib | chroma | pinecone
    path: _index/embeddings/

    faiss:
      index_type: IVFFlat      # IVFFlat | HNSW | Flat
      nlist: 100               # Number of clusters for IVF

    # Cloud options (for larger deployments)
    pinecone:
      api_key_env: PINECONE_API_KEY
      environment: us-east-1
      index_name: opal-commons

  # What to embed
  content:
    entities:
      enabled: true
      fields: [title, summary, content]  # Which fields to embed
      chunk_size: 512                     # Max tokens per chunk
      chunk_overlap: 50                   # Overlap between chunks

    transcripts:
      enabled: true
      chunk_size: 1000
      chunk_overlap: 100

    links:
      enabled: true
      chunk_size: 512

  # Index settings
  index:
    rebuild_on_commit: false    # Auto-rebuild after commits
    incremental: true           # Only embed new/changed content
    parallel_workers: 4         # Parallel embedding generation
```

---

## Embedding Models

### Recommended: nomic-embed-text (via Ollama)

```yaml
ollama:
  model: nomic-embed-text
```

**Pros:**
- Free, local, no API costs
- Good quality (768 dimensions)
- Fast on modern hardware
- No data leaves your machine

**Setup:**
```bash
ollama pull nomic-embed-text
```

### Alternative: OpenAI text-embedding-3-small

```yaml
openai:
  model: text-embedding-3-small
  api_key_env: OPENAI_API_KEY
```

**Pros:**
- High quality
- Widely used
- Good documentation

**Cons:**
- Costs money
- Data sent to OpenAI

### Alternative: Voyage AI

```yaml
voyage:
  model: voyage-02
  api_key_env: VOYAGE_API_KEY
```

**Pros:**
- Very high quality for retrieval
- Optimized for semantic search

---

## Commands

### `/embeddings` Command

```bash
# Generate embeddings
/embeddings generate              # All content
/embeddings generate --new        # Only new content
/embeddings generate --type entities  # Only entities
/embeddings generate --force      # Rebuild all

# Status and info
/embeddings status                # Show embedding stats
/embeddings verify                # Check index integrity

# Maintenance
/embeddings rebuild               # Full rebuild
/embeddings prune                 # Remove orphaned vectors
```

### Example: Generate Embeddings

```
/embeddings generate

Generating Embeddings

Provider: ollama (nomic-embed-text)
Vector store: faiss (_index/embeddings/)

[1/3] Entities
      ├── Scanning patterns/, protocols/, people/...
      ├── Found: 156 entities
      ├── Already embedded: 142
      ├── New/changed: 14
      ├── Generating embeddings...
      │   ████████████████████████████████ 14/14
      └── ✅ 14 entities embedded

[2/3] Transcripts
      ├── Scanning _inbox/transcripts/...
      ├── Found: 23 transcripts
      ├── Chunking into segments...
      ├── Chunks: 156 (avg 487 tokens)
      ├── Already embedded: 134
      ├── New: 22
      │   ████████████████████████████████ 22/22
      └── ✅ 22 chunks embedded

[3/3] Links
      ├── Scanning _inbox/links/...
      ├── Found: 45 links
      ├── Already embedded: 45
      └── ✅ No new content

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Summary:
• Total vectors: 357
• New vectors: 36
• Index size: 2.3 MB
• Generation time: 12.4s
```

### Example: Embeddings Status

```
/embeddings status

Embeddings Status

Provider: ollama (nomic-embed-text @ localhost:11434)
Vector store: faiss (IVFFlat, 100 clusters)
Index path: _index/embeddings/

┌────────────────┬─────────┬─────────┬──────────┐
│ Content Type   │ Items   │ Vectors │ Coverage │
├────────────────┼─────────┼─────────┼──────────┤
│ Entities       │ 156     │ 156     │ 100%     │
│ Transcripts    │ 23      │ 178     │ 100%     │
│ Links          │ 45      │ 89      │ 100%     │
├────────────────┼─────────┼─────────┼──────────┤
│ Total          │ 224     │ 423     │ 100%     │
└────────────────┴─────────┴─────────┴──────────┘

Index health: ✅ Good
Last rebuild: 2026-02-02T10:00:00Z
Last incremental: 2026-02-02T15:30:00Z
```

---

## How Embeddings Are Used

### 1. Semantic Search (`/search`)

```bash
/search "participatory decision making"
```

Process:
1. Query text is embedded using same model
2. Vector similarity search finds closest matches
3. Results ranked by cosine similarity
4. Combined with keyword search for hybrid results

```
Search Results for "participatory decision making"

Found 8 results (semantic + keyword)

1. **Consent-Based Decision Making** (0.92 similarity)
   Pattern for group decisions where all can live with the outcome...

2. **Sociocracy** (0.87 similarity)
   Governance method using consent in nested circles...

3. **Advice Process** (0.84 similarity)
   Decision-making pattern where anyone can make decisions after
   seeking advice from affected parties...
```

### 2. Q&A with RAG (`/ask`)

```bash
/ask "How do communities make collective decisions?"
```

Process:
1. Question embedded
2. Relevant chunks retrieved via vector search
3. Top-k chunks passed to Claude as context
4. Claude synthesizes answer with citations

```
## Answer

Communities use several approaches for collective decision-making:

1. **Consent-based methods** focus on finding proposals that are
   "good enough for now, safe enough to try" [Source: pattern-consent]

2. **Sociocracy** organizes groups into circles with distributed
   authority and uses consent for policy decisions [Source: protocol-sociocracy]

3. **The Advice Process** allows anyone to make decisions after
   seeking input from those affected [Source: pattern-advice-process]

## Sources

- patterns/consent-based-decision-making.md
- protocols/sociocracy.md
- patterns/advice-process.md
```

### 3. Entity Reconciliation (`/process`)

During entity extraction, embeddings help identify duplicates:

```
Reconciling: "Community Budgeting Process"

Semantic matches in index:
├── "Participatory Budgeting" (0.89 similarity)
├── "PB Protocol" (0.85 similarity)
└── "Budget Participation" (0.82 similarity)

Recommendation: Merge with "Participatory Budgeting" (0.89 > 0.7 threshold)
```

### 4. Related Content Discovery

Embeddings power "Related" suggestions:

```yaml
# In entity frontmatter
related:
  auto_generated:
    - pattern-advice-process (0.84)
    - protocol-sociocracy (0.81)
    - pattern-consensus (0.78)
```

---

## Chunking Strategies

Content is split into chunks for embedding:

### Entity Chunking

```yaml
entities:
  chunk_size: 512
  chunk_overlap: 50
  strategy: section  # section | paragraph | fixed
```

**Section-based** (recommended for entities):
- Split on markdown headers
- Each section becomes a chunk
- Preserves semantic coherence

### Transcript Chunking

```yaml
transcripts:
  chunk_size: 1000
  chunk_overlap: 100
  strategy: semantic  # semantic | speaker | fixed
```

**Semantic-based** (recommended for transcripts):
- Split on topic changes
- Respects speaker turns
- Larger chunks for context

### Link Chunking

```yaml
links:
  chunk_size: 512
  chunk_overlap: 50
  strategy: paragraph
```

---

## Vector Store Options

### FAISS (Default, Local)

Best for: Small to medium collections (<100k vectors)

```yaml
vector_store:
  type: faiss
  path: _index/embeddings/
  faiss:
    index_type: IVFFlat
    nlist: 100
```

### Pinecone (Cloud)

Best for: Large collections, production deployments

```yaml
vector_store:
  type: pinecone
  pinecone:
    api_key_env: PINECONE_API_KEY
    index_name: opal-commons
```

### Chroma (Local, Persistent)

Best for: Medium collections with metadata filtering

```yaml
vector_store:
  type: chroma
  chroma:
    path: _index/chroma/
    collection: opal
```

---

## Troubleshooting

### "Ollama not responding"

```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Start Ollama
ollama serve
```

### "Model not found"

```bash
# Pull the model
ollama pull nomic-embed-text

# Verify
ollama list
```

### "Out of memory"

Reduce batch size:

```yaml
ollama:
  batch_size: 8  # Reduce from default 32
```

### "Embeddings out of sync"

```bash
# Rebuild the index
/embeddings rebuild

# Or verify and fix
/embeddings verify --fix
```

### "Slow embedding generation"

Options:
1. Use GPU acceleration (if available)
2. Reduce chunk size
3. Use smaller model (nomic-embed-text is already efficient)
4. Increase parallel workers

---

## Best Practices

### 1. Keep Embeddings Fresh

```yaml
embeddings:
  index:
    rebuild_on_commit: false  # Manual is safer
    incremental: true         # Only embed changes
```

Run `/embeddings generate --new` after processing new content.

### 2. Tune Chunk Sizes

- **Entities**: Smaller chunks (512) for precise matching
- **Transcripts**: Larger chunks (1000) for context
- **Links**: Medium chunks (512) for balance

### 3. Monitor Quality

Periodically check search quality:

```bash
/search "known good query" --debug
```

If results degrade, consider rebuilding.

### 4. Backup Before Rebuild

```bash
cp -r _index/embeddings/ _index/embeddings.backup/
/embeddings rebuild
```

### 5. Use Hybrid Search

Combine semantic + keyword for best results:

```yaml
search:
  mode: hybrid
  semantic_weight: 0.7
  keyword_weight: 0.3
```

---

## Index Structure

```
_index/
├── embeddings/
│   ├── entities.faiss        # Entity vectors
│   ├── entities.meta.json    # Entity metadata (id, path, chunk)
│   ├── transcripts.faiss     # Transcript vectors
│   ├── transcripts.meta.json
│   ├── links.faiss
│   ├── links.meta.json
│   └── config.json           # Index configuration
│
├── entities.json             # Master entity registry
├── aliases.json              # Alias mappings
└── relationships.json        # Entity relationships
```

---

## Advanced: Custom Embedding Pipeline

For custom embedding workflows, OPAL exposes the embedding skill:

```yaml
# In a custom skill
steps:
  - skill: embed-content
    params:
      content: "Text to embed"
      model: nomic-embed-text

  - skill: vector-search
    params:
      query_vector: $embed_result
      top_k: 10
      threshold: 0.7
```
