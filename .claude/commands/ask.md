# /ask Command

Ask questions about the knowledge commons and get cited answers.

## Usage

```
/ask <question>
```

## Description

Natural language Q&A over the entire corpus. Uses RAG (Retrieval Augmented Generation) to find relevant entities and synthesize an answer with citations.

## Examples

```bash
# Factual question
/ask What is consent-based decision making?

# Comparative question
/ask How does sociocracy differ from consensus?

# Exploratory question
/ask What patterns exist for community governance?

# Scale-specific question
/ask What governance approaches work at the neighborhood level?

# Gap detection
/ask Do we have anything about participatory budgeting?

# Coverage analysis
/ask How complete is our governance coverage?
```

## Options

| Option | Description |
|--------|-------------|
| `--detailed` | Include more context and related entities |
| `--sources-only` | Return relevant sources without synthesis |
| `--no-suggest` | Don't suggest related content |

## Process

1. **Analyze** - Parse question to identify type and key concepts
2. **Retrieve** - Semantic search for relevant entities
3. **Synthesize** - Generate answer from retrieved content
4. **Cite** - Link claims to specific sources
5. **Suggest** - Recommend related content for exploration

## Output Format

```markdown
## Answer

{synthesized answer with inline citations}

## Sources

- [Entity Title](/path/to/entity/) - Entity type
- [Another Entity](/path/to/another/) - Entity type

## Related

You might also explore:
- [Related Entity](/path/to/related/)
```

## Behavior

### Always Cites Sources

Every factual claim includes a citation:

> Consent-based decision making focuses on finding proposals that
> are "good enough for now, safe enough to try" [Source: pattern-consent]

### Admits Uncertainty

When information isn't in the corpus:

> I couldn't find information about participatory budgeting in the commons.
> This might be a gap worth filling. Related topics that exist:
> - Community Governance
> - Budget Planning Patterns

### Handles Follow-ups

Maintains conversation context:

```
/ask What is sociocracy?
> Sociocracy is a governance method...

/ask How does it handle conflicts?
> In sociocracy, conflicts are handled by... (resolves "it" to "sociocracy")
```

## Requirements

- Embedding index must be populated (`/process reindex-embeddings`)
- Claude access for synthesis

## Related Commands

- `/search` - Keyword and semantic search
- `/graph` - Visualize entity relationships
- `/coverage` - Analyze taxonomy coverage

## Skill

Uses: `qa-corpus`
