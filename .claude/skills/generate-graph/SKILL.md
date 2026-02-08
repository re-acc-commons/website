# Generate Graph Skill

Create interactive knowledge graph visualizations of entity relationships.

## Purpose

Transform the relationship index into visual, explorable graph representations. Supports both local graphs (centered on one entity) and global graphs (entire commons).

## Graph Types

### Local Graph

Centered on a specific entity, showing immediate relationships:

```
         [Related Pattern]
              ↑
              │ similar_to
              │
[Protocol] ←──┼──→ [FOCUS ENTITY] ←──→ [Organization]
   implements │         │                uses
              │         │ builds_on
              ↓         ↓
         [Primitive]  [Another Pattern]
```

### Global Graph

Entire commons visualized with clustering:

```
┌─────────────────────────────────────────────┐
│  [Governance Cluster]    [Education Cluster]│
│     ●──●──●                  ●──●          │
│     │  │                     │             │
│     ●──●──●──────────────────●──●          │
│                                            │
│  [Economic Cluster]                         │
│     ●──●──●                                │
└─────────────────────────────────────────────┘
```

## When to Use

- `/graph` - Full commons graph
- `/graph <entity-id>` - Local graph for specific entity
- Publishing - Generate graph data for static site
- Analysis - Understand relationship patterns

## Graph Generation Pipeline

### 1. Load Relationship Data

```yaml
load:
  sources:
    - _index/relationships.json:
        contains: explicit relationships
    - _index/entities.json:
        contains: entity metadata
    - embeddings_db:
        contains: discovered relationships (if threshold met)

  merge:
    - combine explicit + discovered
    - deduplicate edges
    - validate both endpoints exist
```

### 2. Build Graph Structure

```yaml
structure:
  nodes:
    - id: entity_id
    - label: title
    - type: resource_type
    - group: primary_sector
    - size: relationship_count  # More connections = larger
    - metadata:
        sectors: [...]
        scales: [...]
        url: /path/to/entity/

  edges:
    - source: source_entity_id
    - target: target_entity_id
    - type: relationship_type
    - weight: confidence_score
    - label: relationship_type (human readable)
```

### 3. Apply Layout Algorithm

```yaml
layout:
  algorithm: force-directed  # or hierarchical, radial, cluster

  force_directed:
    # D3-force parameters
    link_distance: 100
    charge_strength: -300
    center_strength: 0.1
    collision_radius: 30

  clustering:
    enabled: true
    group_by: sector  # or type, scale
    cluster_strength: 0.5

  optimization:
    iterations: 300
    cooling_factor: 0.99
```

### 4. Generate Output

```yaml
output:
  formats:
    json:
      path: _index/graph.json
      for: static_site, api

    html:
      path: _staging/graph.html
      for: preview, standalone

    svg:
      path: _assets/graph.svg
      for: export, documentation
```

## Visualization Features

### Interactive Controls

```yaml
controls:
  zoom:
    enabled: true
    min: 0.1
    max: 10
    wheel: true

  pan:
    enabled: true
    drag: true

  search:
    enabled: true
    highlight_matches: true
    focus_on_select: true

  filter:
    by_type: true
    by_sector: true
    by_scale: true
    show_orphans: toggle
```

### Node Interactions

```yaml
node_interactions:
  hover:
    - highlight_node
    - highlight_connected_edges
    - show_tooltip:
        content: |
          **{title}**
          Type: {type}
          Connections: {edge_count}

  click:
    - expand_local_graph  # Show more connections
    - option: navigate_to_entity

  double_click:
    - open_entity_page

  right_click:
    - context_menu:
        - "View entity"
        - "Show local graph"
        - "Find similar"
        - "Hide node"
```

### Edge Interactions

```yaml
edge_interactions:
  hover:
    - highlight_edge
    - show_relationship_type

  click:
    - show_relationship_details:
        source: {source_title}
        target: {target_title}
        type: {relationship_type}
        confidence: {confidence}
```

### Visual Encoding

```yaml
visual:
  nodes:
    color_by: type  # or sector, scale
    color_scheme:
      pattern: "#4CAF50"
      protocol: "#2196F3"
      playbook: "#FF9800"
      person: "#9C27B0"
      organization: "#607D8B"
      # ...

    size_by: connection_count
    size_range: [10, 50]

    shape_by: null  # All circles, or vary by type
    shapes:
      pattern: circle
      protocol: square
      person: triangle

  edges:
    color_by: type
    color_scheme:
      implements: "#4CAF50"
      extends: "#2196F3"
      related_to: "#9E9E9E"
      contradicts: "#F44336"

    width_by: confidence
    width_range: [1, 5]

    style:
      implements: solid
      related_to: dashed
      contradicts: dotted

    arrows:
      directional: true
      size: 8
```

## Local Graph Generation

```yaml
local_graph:
  input:
    entity_id: "pattern-consent-based-decision-making"
    depth: 2  # How many hops from center

  process:
    - find_center_node:
        id: <entity_id>

    - traverse_relationships:
        depth: <depth>
        direction: both  # incoming + outgoing
        max_nodes: 50  # Prevent overwhelming graph

    - build_subgraph:
        nodes: <traversed_nodes>
        edges: <connecting_edges>

    - apply_local_layout:
        center: <entity_id>
        radial: true  # Center node in middle

  output:
    json:
      nodes: [...]
      edges: [...]
      center: <entity_id>
      depth: <depth>
```

## Global Graph Generation

```yaml
global_graph:
  process:
    - load_all_entities
    - load_all_relationships

    - filter:
        min_connections: 1  # Hide orphans by default
        max_nodes: 500  # Performance limit

    - cluster:
        method: louvain  # Community detection
        resolution: 1.0

    - layout:
        algorithm: force-directed
        cluster_aware: true

    - optimize:
        reduce_overlap: true
        iterations: 500

  output:
    json:
      nodes: [...]
      edges: [...]
      clusters: [...]
      statistics:
        total_nodes: N
        total_edges: M
        density: D
        clusters: K
```

## Graph Statistics

```yaml
statistics:
  compute:
    - node_count: total entities
    - edge_count: total relationships
    - density: edges / possible_edges
    - average_degree: avg connections per node
    - clustering_coefficient: local clustering
    - connected_components: separate subgraphs
    - diameter: longest shortest path
    - central_nodes: highest betweenness centrality

  output:
    format: |
      ## Graph Statistics

      - **Nodes**: {node_count}
      - **Edges**: {edge_count}
      - **Density**: {density:.2%}
      - **Avg connections**: {average_degree:.1f}
      - **Clusters**: {cluster_count}

      ### Most Connected Entities
      1. {top_1} ({degree_1} connections)
      2. {top_2} ({degree_2} connections)
      3. {top_3} ({degree_3} connections)

      ### Bridge Entities (connect clusters)
      1. {bridge_1}
      2. {bridge_2}
```

## Configuration

### In `config/graph.yaml`

```yaml
graph:
  # Default settings
  defaults:
    depth: 2
    max_nodes: 200
    layout: force-directed

  # Visual settings
  visual:
    color_by: type
    size_by: connections
    show_labels: true
    animate: true

  # Clustering
  clustering:
    enabled: true
    algorithm: louvain
    group_by: sector

  # Export
  export:
    formats: [json, html, svg]
    output_dir: _assets/graphs/

  # For static site
  static_site:
    include_global: true
    include_local: true
    local_depth: 2
```

## Commands

```yaml
commands:
  "/graph":
    description: "Show full commons graph"
    output: interactive visualization

  "/graph <entity-id>":
    description: "Show local graph for entity"
    output: centered visualization

  "/graph --stats":
    description: "Show graph statistics"
    output: statistics report

  "/graph --export svg":
    description: "Export graph as SVG"
    output: file path

  "/graph --clusters":
    description: "Show cluster analysis"
    output: cluster report
```

## Integration

### With Static Site

Graph data is generated during build:

```yaml
publish:
  - generate_global_graph → graph.json
  - for_each_entity:
      generate_local_graph → entity/graph.json
  - embed_visualization_component
```

### With Search

Graph can enhance search:

```yaml
search:
  - find_matching_entities
  - option: show_as_graph
  - visualize_search_results
```

### With Coverage

Gap analysis uses graph:

```yaml
coverage:
  - identify_disconnected_areas
  - find_sparse_regions
  - suggest_bridge_entities
```

## Output Files

### graph.json

```json
{
  "nodes": [
    {
      "id": "pattern-consent",
      "label": "Consent-Based Decision Making",
      "type": "pattern",
      "group": "governance",
      "size": 8,
      "x": 150.5,
      "y": 200.3
    }
  ],
  "edges": [
    {
      "source": "pattern-consent",
      "target": "protocol-sociocracy",
      "type": "implements",
      "weight": 0.95
    }
  ],
  "clusters": [
    {
      "id": 0,
      "label": "Governance",
      "nodes": ["pattern-consent", "protocol-sociocracy"],
      "color": "#4CAF50"
    }
  ],
  "statistics": {
    "nodeCount": 156,
    "edgeCount": 312,
    "density": 0.026
  }
}
```

### graph.html (Standalone)

Self-contained HTML with embedded D3.js visualization.

## Dependencies

```yaml
dependencies:
  javascript:
    - d3.js (v7+)
    - d3-force
    - d3-zoom

  python (for analysis):
    - networkx
    - python-louvain (community detection)
```
