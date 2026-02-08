# Taxonomy Bridge Skill

Translate entities between different taxonomy systems during federation.

## Purpose

When federating content between knowledge commons with different taxonomies (e.g., OPL civic taxonomy ↔ Regen ecological ontology), this skill:

1. **Maps resource types** between taxonomies
2. **Translates dimensions** (sectors, scales, domains)
3. **Converts relationships** to equivalent predicates
4. **Generates RDF triples** for semantic web compatibility
5. **Preserves provenance** through the translation

## When to Use

This skill is automatically invoked during:
- `/federate pull` - When importing entities from federated sources
- `/federate publish` - When exporting entities to federated targets
- `/koi publish` - When publishing to KOI
- `/koi sync` - When pulling from KOI subscriptions
- `/export --format jsonld` - When generating RDF-compatible exports

## Bridge Files

Bridges are defined in `.opal/bridges/`:

```yaml
# .opal/bridges/opl-to-regen.yaml
version: "1.0"
source: "opl:civic-v1"
target: "regen:unified-v1"

resource_types:
  pattern:
    regen_class: "regen:Pattern"
    rdf_type: "https://regen.network/ontology/v1#Pattern"
  ...
```

## Operations

### translate_entity

Translate a single entity from source to target taxonomy:

```
Input:
  - entity: The entity to translate
  - bridge: Path to bridge file
  - direction: "forward" (source→target) or "reverse" (target→source)

Output:
  - translated_entity: Entity with mapped types, dimensions, relationships
  - mappings_applied: List of mappings used
  - unmapped_fields: Fields that couldn't be mapped
```

### generate_rdf

Generate RDF triples for an entity:

```
Input:
  - entity: The entity to convert
  - format: "turtle" | "jsonld" | "ntriples"
  - include_provenance: boolean

Output:
  - rdf_content: Serialized RDF
  - triple_count: Number of triples generated
```

### reconcile_across_taxonomies

Find equivalent entities across taxonomy boundaries:

```
Input:
  - entity: Local entity
  - target_taxonomy: Which taxonomy to search
  - confidence_threshold: Minimum match confidence

Output:
  - matches: List of potential matches with confidence scores
  - suggested_links: Recommended sameAs/relatedTo links
```

### validate_bridge

Check a bridge file for completeness and consistency:

```
Input:
  - bridge_path: Path to bridge file

Output:
  - valid: boolean
  - coverage: Percentage of source types mapped
  - warnings: List of potential issues
  - suggestions: Recommended additions
```

## Example: Translating OPL → Regen

```yaml
# Input: OPL Entity
type: pattern
name: Participatory Budgeting
civic_sectors:
  - governance-political-systems
  - economic-resource-sharing
civic_scales:
  - municipal
  - bioregional

# Output: Regen-compatible Entity
"@type": "regen:Pattern"
"@id": "orn:opal.commons:omniharmonic/opal/patterns/participatory-budgeting"
schema:name: "Participatory Budgeting"
regen:domain:
  - "regen:Governance"
  - "regen:Commons"
regen:scale:
  - "regen:Municipal"
  - "regen:Bioregional"
opal:civicSector:
  - "governance-political-systems"
  - "economic-resource-sharing"
sdg:alignment:
  - "SDG:16"
  - "SDG:8"
```

## Provenance Tracking

Every translation generates a CAT receipt:

```json
{
  "cat_id": "cat:bridge:2026-02-02:001",
  "operation": "taxonomy_translation",
  "bridge_used": "opl-to-regen.yaml",
  "direction": "forward",
  "input_type": "pattern",
  "output_type": "regen:Pattern",
  "mappings_applied": 4,
  "unmapped_preserved": 1,
  "timestamp": "2026-02-02T10:00:00Z"
}
```

## Creating Custom Bridges

To bridge your taxonomy with another:

1. Create bridge file: `.opal/bridges/my-taxonomy-to-other.yaml`
2. Define namespace mappings
3. Map resource types
4. Map dimensions
5. Map relationships
6. Validate: `/federate validate-bridge my-taxonomy-to-other`

## Available Bridges

| Bridge | Source | Target | Coverage |
|--------|--------|--------|----------|
| `opl-to-regen.yaml` | OPL Civic | Regen Unified | 100% |
| `regen-to-opl.yaml` | Regen Unified | OPL Civic | 85% |
| `sdg-alignment.yaml` | Any | UN SDGs | N/A |

## Integration with Federation

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Local Entity   │────▶│  Taxonomy Bridge │────▶│ Federated Entity│
│  (OPL Schema)   │     │  (Translation)   │     │ (Regen Schema)  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                       │                        │
         ▼                       ▼                        ▼
   _index/entities.json    CAT Receipt            KOI / External
```
