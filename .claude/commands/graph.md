# /graph Command

Visualize knowledge graph relationships.

## Usage

```
/graph [entity-id] [options]
```

## Description

Generate interactive visualizations of entity relationships. Shows how patterns, protocols, people, and organizations connect across the commons.

## Examples

```bash
# Full commons graph
/graph

# Local graph for specific entity
/graph pattern-consent-based-decision-making

# Graph with depth limit
/graph pattern-consent --depth 3

# Export as SVG
/graph --export svg

# Show statistics only
/graph --stats

# Cluster analysis
/graph --clusters
```

## Options

| Option | Description |
|--------|-------------|
| `--depth <n>` | Relationship depth (default: 2) |
| `--type <type>` | Filter by entity type |
| `--sector <sector>` | Filter by sector |
| `--export <format>` | Export as svg, png, json |
| `--stats` | Show graph statistics only |
| `--clusters` | Show cluster analysis |
| `--no-orphans` | Hide unconnected entities |

## Output

### Interactive Graph

When no export option specified, generates an interactive visualization with:
- Zoom and pan
- Node hover for details
- Click to expand/focus
- Filter controls
- Search

### Statistics

```
## Graph Statistics

- **Nodes**: 156 entities
- **Edges**: 312 relationships
- **Density**: 2.6%
- **Clusters**: 8
- **Orphans**: 12

### Most Connected
1. Sociocracy (15 connections)
2. Consent Pattern (12 connections)
3. Participatory Budgeting (10 connections)

### Bridge Entities
Entities connecting multiple clusters:
1. Democratic Governance Framework
2. Community Facilitation Protocol
```

### Local Graph

When entity specified, shows centered view:
- Focus entity in center
- Related entities radiating outward
- Relationship types labeled
- Depth configurable

## Visual Encoding

- **Color**: By entity type (patterns green, protocols blue, etc.)
- **Size**: By connection count
- **Edge style**: By relationship type (solid for implements, dashed for related_to)

## Related Commands

- `/coverage` - Gap analysis including relationship health
- `/search` - Find entities to graph
- `/ask` - Query about relationships

## Skill

Uses: `generate-graph`
