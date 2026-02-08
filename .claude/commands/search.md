# /search Command

Search the knowledge commons using keywords or natural language.

## Usage

```
/search <query> [options]
```

## Description

Hybrid search combining semantic similarity and keyword matching. Returns relevant entities ranked by relevance.

## Examples

```bash
# Simple search
/search consent decision making

# Natural language
/search "patterns for community governance"

# Filtered search
/search governance --type pattern

# Sector filter
/search community --sector civic-engagement-and-participation-systems

# Scale filter
/search governance --scale municipal

# Combined filters
/search governance --type protocol --scale neighborhood --sector governance
```

## Options

| Option | Description |
|--------|-------------|
| `--type <type>` | Filter by resource type (pattern, protocol, etc.) |
| `--sector <sector>` | Filter by civic sector |
| `--scale <scale>` | Filter by civic scale |
| `--limit <n>` | Maximum results (default: 10) |
| `--semantic-only` | Only semantic search, no keyword matching |
| `--keyword-only` | Only keyword search, no semantic matching |

## Output Format

```markdown
## Search Results for "governance patterns"

Found 8 results (0.23s)

### Patterns (5)

1. **[Consent-Based Decision Making](/patterns/consent/)** - 0.92
   Governance pattern for making decisions acceptable to all...

2. **[Advice Process](/patterns/advice-process/)** - 0.87
   Pattern for distributed decision-making in organizations...

### Protocols (3)

1. **[Sociocracy](/protocols/sociocracy/)** - 0.85
   Governance protocol using consent and circles...
```

## Search Modes

### Hybrid (Default)

Combines semantic understanding with keyword matching:
- 70% semantic similarity
- 30% keyword relevance

### Semantic Only

Uses vector embeddings for conceptual similarity:
```bash
/search "ways to make group decisions" --semantic-only
```

### Keyword Only

Traditional keyword matching:
```bash
/search consent --keyword-only
```

## Filters

### By Type

```bash
/search governance --type pattern
/search governance --type protocol,playbook  # Multiple types
```

### By Sector

```bash
/search participation --sector civic-engagement-and-participation-systems
```

### By Scale

```bash
/search governance --scale municipal
/search governance --scale neighborhood,municipal  # Multiple scales
```

## Requirements

- Embedding index should be populated for best results
- Falls back to keyword-only if embeddings unavailable

## Related Commands

- `/ask` - Get synthesized answers to questions
- `/graph` - Visualize relationships
- `/coverage` - Find gaps in taxonomy

## Skill

Uses: `embed-content` (for semantic search), `search-semantic`
