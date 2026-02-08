# /embeddings Command

Manage vector embeddings for semantic search and entity reconciliation.

## Usage

```
/embeddings                   # Show status
/embeddings generate          # Generate embeddings for all content
/embeddings generate --new    # Only new/changed content
/embeddings generate --type entities  # Only entities
/embeddings rebuild           # Full rebuild (clears and regenerates)
/embeddings status            # Detailed status
/embeddings verify            # Check index integrity
/embeddings prune             # Remove orphaned vectors
```

## Subcommands

### generate

Generate embeddings for content:

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

Options:
- `--new` - Only embed new/changed content
- `--type <type>` - Only embed specific type (entities, transcripts, links)
- `--force` - Re-embed everything, ignoring cache

### status

Show embedding index status:

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

### rebuild

Full rebuild of the embedding index:

```
/embeddings rebuild

⚠️ This will delete and regenerate all embeddings.
Continue? [y/N] y

Rebuilding Embeddings

[1/4] Backing up current index...
      └── ✅ Backup: _index/embeddings.backup.2026-02-02/

[2/4] Clearing index...
      └── ✅ Index cleared

[3/4] Regenerating all embeddings...
      ├── Entities: 156 items
      │   ████████████████████████████████ 156/156
      ├── Transcripts: 23 items (178 chunks)
      │   ████████████████████████████████ 178/178
      └── Links: 45 items (89 chunks)
          ████████████████████████████████ 89/89

[4/4] Optimizing index...
      └── ✅ Index optimized

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Rebuild complete:
• Total vectors: 423
• Index size: 2.8 MB
• Time: 45.2s
```

### verify

Check index integrity:

```
/embeddings verify

Verifying Embeddings Index

[1/4] Checking vector store...
      └── ✅ FAISS index readable

[2/4] Checking metadata consistency...
      ├── Vectors in index: 423
      ├── Metadata entries: 423
      └── ✅ All vectors have metadata

[3/4] Checking content coverage...
      ├── Entities: 156/156 (100%)
      ├── Transcripts: 178/178 chunks (100%)
      ├── Links: 89/89 chunks (100%)
      └── ✅ All content embedded

[4/4] Checking for orphans...
      ├── Orphaned vectors: 0
      ├── Missing content: 0
      └── ✅ No orphans found

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Verification: ✅ PASSED
Index is healthy and consistent.
```

With `--fix`:

```
/embeddings verify --fix

Verifying Embeddings Index

[3/4] Checking content coverage...
      ├── Entities: 156/156 (100%)
      ├── Transcripts: 175/178 chunks (98%)
      │   ⚠️ Missing: 3 chunks from new transcript
      └── Links: 89/89 chunks (100%)

[4/4] Checking for orphans...
      ├── Orphaned vectors: 2
      │   ⚠️ Vectors for deleted content
      └── Missing content: 3

Fixing issues...
├── Generating 3 missing embeddings...
│   ████████████████████████████████ 3/3
└── Removing 2 orphaned vectors...
    ✅ Done

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Fixed: 3 missing, 2 orphaned
Index is now healthy.
```

### prune

Remove orphaned vectors:

```
/embeddings prune

Pruning Embeddings Index

Scanning for orphaned vectors...

Found 5 orphaned vectors:
├── transcript-abc123-chunk-4 (content deleted)
├── transcript-abc123-chunk-5 (content deleted)
├── link-xyz789-chunk-1 (content deleted)
├── entity-old-pattern (file moved/renamed)
└── entity-test-item (file deleted)

Remove these vectors? [y/N] y

Pruning...
✅ Removed 5 orphaned vectors

Index size: 2.8 MB → 2.7 MB
```

## Configuration

Configure in `config/embeddings.yaml`:

```yaml
embeddings:
  provider: ollama

  ollama:
    model: nomic-embed-text
    endpoint: http://localhost:11434
    batch_size: 32

  vector_store:
    type: faiss
    path: _index/embeddings/

  content:
    entities:
      enabled: true
      fields: [title, summary, content]
      chunk_size: 512
    transcripts:
      enabled: true
      chunk_size: 1000
    links:
      enabled: true
      chunk_size: 512
```

## How Embeddings Are Used

| Feature | How Embeddings Help |
|---------|---------------------|
| `/search` | Semantic similarity matching |
| `/ask` | RAG context retrieval |
| `/process reconcile` | Duplicate detection |
| Related suggestions | Finding similar content |

## Requirements

- **Ollama** running with `nomic-embed-text` model
- Or alternative provider configured (OpenAI, Voyage)

## Related

- [EMBEDDINGS.md](../EMBEDDINGS.md) - Full embeddings documentation
- `/search` - Semantic search
- `/ask` - Q&A with RAG
