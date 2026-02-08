# /bridge Command

Manage taxonomy bridges for cross-taxonomy federation.

## Usage

```
/bridge                           # List available bridges
/bridge status                    # Show bridge status and coverage
/bridge validate <bridge>         # Validate a bridge file
/bridge translate <entity>        # Translate an entity using bridge
/bridge create <source> <target>  # Create a new bridge (interactive)
/bridge test <bridge>             # Test bridge with sample entities
```

## Philosophy

**Taxonomies should talk to each other.** Different knowledge commons use different ways to organize knowledge. Bridges enable federation without forcing standardization.

**Preserve, don't discard.** When translating, original fields are preserved alongside mapped fields. Nothing is lost.

**Provenance matters.** Every translation is tracked with CAT receipts for full accountability.

---

## List Bridges

```
/bridge

🔗 Taxonomy Bridges
━━━━━━━━━━━━━━━━━━━

Available bridges in .opal/bridges/:

┌─────────────────────┬─────────────────┬─────────────┬──────────┐
│ Bridge              │ Source → Target │ Coverage    │ Status   │
├─────────────────────┼─────────────────┼─────────────┼──────────┤
│ opl-to-regen.yaml   │ OPL → Regen     │ 100%        │ ✅ Valid │
│ regen-to-opl.yaml   │ Regen → OPL     │ 85%         │ ✅ Valid │
│ sdg-alignment.yaml  │ Any → SDGs      │ N/A         │ ✅ Valid │
└─────────────────────┴─────────────────┴─────────────┴──────────┘

Active bridge: opl-to-regen.yaml (for KOI federation)

Commands:
• /bridge validate <name> - Check bridge integrity
• /bridge translate <entity> - Test translation
• /bridge create - Create new bridge
```

---

## Bridge Status

```
/bridge status

🔗 Bridge Status: opl-to-regen.yaml
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Source: OPL Civic Taxonomy (opl:civic-v1)
Target: Regen Unified Ontology (regen:unified-v1)

Resource Type Mappings:
┌─────────────────┬───────────────────────┬───────────┐
│ OPL Type        │ Regen Class           │ Status    │
├─────────────────┼───────────────────────┼───────────┤
│ pattern         │ regen:Pattern         │ ✅ Mapped │
│ protocol        │ regen:Methodology     │ ✅ Mapped │
│ playbook        │ regen:Playbook        │ ✅ Mapped │
│ primitive       │ regen:SemanticAsset   │ ✅ Mapped │
│ artifact        │ regen:Source          │ ✅ Mapped │
│ person          │ regen:HumanActor      │ ✅ Mapped │
│ organization    │ regen:Commons         │ ✅ Mapped │
│ activity        │ regen:GovernanceAct   │ ✅ Mapped │
│ note            │ regen:Note            │ ✅ Mapped │
└─────────────────┴───────────────────────┴───────────┘

Dimension Mappings:
├── civic_sectors → regen_domains + SDG alignment (13/13)
├── civic_scales → regen_scales (7/7)
└── All dimensions mapped ✅

Relationship Mappings:
├── relates_to → regen:relatedTo ✅
├── implements → regen:implements ✅
├── part_of → regen:partOf ✅
├── supports → regen:supports ✅
└── 6/6 relationships mapped ✅

Overall Coverage: 100%
Last validated: 2 hours ago
Used in: 156 translations
```

---

## Validate Bridge

```
/bridge validate opl-to-regen.yaml

🔍 Validating Bridge: opl-to-regen.yaml
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Checking structure...
├── ✅ Version specified (1.0)
├── ✅ Source taxonomy defined (opl:civic-v1)
├── ✅ Target taxonomy defined (regen:unified-v1)
└── ✅ Namespaces declared

Checking resource type mappings...
├── ✅ pattern → regen:Pattern
├── ✅ protocol → regen:Methodology
├── ✅ playbook → regen:Playbook
├── ✅ primitive → regen:SemanticAsset
├── ✅ artifact → regen:Source
├── ✅ person → regen:HumanActor
├── ✅ organization → regen:Commons
├── ✅ activity → regen:GovernanceAct
└── ✅ note → regen:Note
    Coverage: 9/9 types (100%)

Checking dimension mappings...
├── ✅ civic_sectors: 13/13 mapped
├── ✅ civic_scales: 7/7 mapped
└── ✅ SDG alignment included
    Coverage: 20/20 dimension values (100%)

Checking relationship mappings...
├── ✅ relates_to → regen:relatedTo
├── ✅ implements → regen:implements
├── ✅ part_of → regen:partOf
├── ✅ supports → regen:supports
├── ✅ opposes → regen:opposes
└── ✅ mentioned_in → regen:contextualizes
    Coverage: 6/6 relationships (100%)

Checking for issues...
├── ✅ No circular mappings
├── ✅ No duplicate mappings
├── ✅ All RDF URIs valid
└── ✅ Inverse relationships defined

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Bridge Valid

Coverage: 100%
Quality: Excellent
Ready for federation: Yes
```

---

## Translate Entity

Test translation of a specific entity:

```
/bridge translate patterns/participatory-budgeting.md

🔄 Translating Entity
━━━━━━━━━━━━━━━━━━━━━

Entity: patterns/participatory-budgeting.md
Bridge: opl-to-regen.yaml
Direction: OPL → Regen

Input (OPL):
┌────────────────────────────────────────────────────────
│ type: pattern
│ name: Participatory Budgeting
│ aliases: [PB, community budgeting]
│ civic_sectors:
│   - governance-political-systems
│   - economic-resource-sharing
│ civic_scales:
│   - municipal
│   - bioregional
│ related_patterns:
│   - consent-decision-making
└────────────────────────────────────────────────────────

Applying mappings...
├── type: pattern → @type: regen:Pattern
├── civic_sectors[0] → regen:Governance + SDG:16
├── civic_sectors[1] → regen:Commons + SDG:8
├── civic_scales[0] → regen:Municipal
├── civic_scales[1] → regen:Bioregional
└── related_patterns → regen:relatedTo

Output (Regen JSON-LD):
┌────────────────────────────────────────────────────────
│ {
│   "@context": "https://regen.network/ontology/v1",
│   "@type": "Pattern",
│   "@id": "orn:opal.commons:omniharmonic/opal/patterns/participatory-budgeting",
│   "schema:name": "Participatory Budgeting",
│   "skos:altLabel": ["PB", "community budgeting"],
│   "regen:domain": ["regen:Governance", "regen:Commons"],
│   "regen:scale": ["regen:Municipal", "regen:Bioregional"],
│   "regen:relatedTo": [
│     "orn:opal.commons:omniharmonic/opal/patterns/consent-decision-making"
│   ],
│   "sdg:alignment": ["SDG:16", "SDG:8"],
│   "opal:originalSectors": [
│     "governance-political-systems",
│     "economic-resource-sharing"
│   ]
│ }
└────────────────────────────────────────────────────────

Translation Summary:
├── Fields mapped: 6
├── Fields preserved: 2 (aliases, original sectors)
├── SDGs inferred: 2
└── Relationships: 1

CAT Receipt generated: cat:bridge:2026-02-02:001
```

---

## Create New Bridge

```
/bridge create my-taxonomy regen

🔗 Create Taxonomy Bridge
━━━━━━━━━━━━━━━━━━━━━━━━

Creating bridge: my-taxonomy → regen

Step 1: Source Taxonomy
━━━━━━━━━━━━━━━━━━━━━━━

Analyzing your schema (.opal/schema.yaml)...

Detected resource types:
├── [1] project
├── [2] task
├── [3] meeting
├── [4] document
└── [5] person

Detected dimensions:
├── [1] status (planning, active, complete, archived)
└── [2] priority (low, medium, high, urgent)

Step 2: Target Taxonomy
━━━━━━━━━━━━━━━━━━━━━━━

Target: Regen Unified Ontology (regen:unified-v1)

Available Regen classes:
├── regen:Pattern
├── regen:Methodology
├── regen:Project
├── regen:GovernanceAct
├── regen:SemanticAsset
├── regen:Source
├── regen:HumanActor
├── regen:Commons
└── regen:Note

Step 3: Map Resource Types
━━━━━━━━━━━━━━━━━━━━━━━━━

For each of your types, select the best Regen match:

[1/5] project
  Best matches:
    [a] regen:Project (0.95 match)
    [b] regen:GovernanceAct (0.65 match)
    [c] Skip / No mapping

  Choice: a
  ✅ project → regen:Project

[2/5] task
  Best matches:
    [a] regen:GovernanceAct (0.72 match)
    [b] regen:SemanticAsset (0.45 match)
    [c] Skip / No mapping

  Choice: a
  ✅ task → regen:GovernanceAct

[Continue for remaining types...]

Step 4: Map Dimensions
━━━━━━━━━━━━━━━━━━━━━━

Map your dimension values to Regen concepts or SDGs:

status.active → ?
  [1] regen:ActiveProject
  [2] SDG alignment (select SDGs)
  [3] Keep as custom property

  Choice: 1

[Continue for remaining dimension values...]

Step 5: Generate Bridge
━━━━━━━━━━━━━━━━━━━━━━━

Creating bridge file...

✅ Created: .opal/bridges/my-taxonomy-to-regen.yaml

Bridge summary:
├── Resource types mapped: 5/5 (100%)
├── Dimension values mapped: 6/6 (100%)
├── SDG alignment: 3 SDGs referenced
└── Namespaces: 4 defined

Validate now? [Y/n]
> y

[Runs /bridge validate my-taxonomy-to-regen.yaml]
```

---

## Test Bridge

Test a bridge with sample entities:

```
/bridge test opl-to-regen.yaml

🧪 Testing Bridge: opl-to-regen.yaml
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Running translation tests...

[1/5] patterns/participatory-budgeting.md
├── Translation: ✅ Success
├── RDF valid: ✅ Yes
├── Round-trip: ✅ Lossless
└── Time: 12ms

[2/5] protocols/consent-process.md
├── Translation: ✅ Success
├── RDF valid: ✅ Yes
├── Round-trip: ✅ Lossless
└── Time: 8ms

[3/5] organizations/civic-patterns-institute.md
├── Translation: ✅ Success
├── RDF valid: ✅ Yes
├── Round-trip: ✅ Lossless
└── Time: 6ms

[4/5] people/jane-facilitator.md
├── Translation: ✅ Success
├── RDF valid: ✅ Yes
├── Round-trip: ✅ Lossless
└── Time: 5ms

[5/5] artifacts/governance-handbook.md
├── Translation: ✅ Success
├── RDF valid: ✅ Yes
├── Round-trip: ⚠️ 1 field not round-trippable (custom_field)
└── Time: 7ms

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Test Results:
├── Translations: 5/5 successful
├── RDF validity: 5/5 valid
├── Round-trip: 4/5 lossless
└── Avg time: 7.6ms

⚠️ Note: 1 custom field preserved but not round-trippable
   This is expected for taxonomy-specific extensions.

Overall: ✅ Bridge working correctly
```

---

## Configuration

Bridge settings in `.opal/config.yaml`:

```yaml
federation:
  bridges:
    # Default bridge for federation
    default: opl-to-regen.yaml

    # Auto-select based on target
    auto_select: true

    # Preserve original fields during translation
    preserve_original: true

    # Generate CAT receipts for all translations
    track_provenance: true

    # SDG alignment
    auto_sdg_alignment: true
```

---

## Bridge File Format

```yaml
# .opal/bridges/example-bridge.yaml

version: "1.0"
source: "my-taxonomy:v1"
target: "other-taxonomy:v1"

# Namespace declarations
namespaces:
  my: "https://my-taxonomy.org/v1#"
  other: "https://other-taxonomy.org/v1#"
  schema: "https://schema.org/"

# Resource type mappings
resource_types:
  my_type:
    other_class: "other:EquivalentClass"
    rdf_type: "https://other-taxonomy.org/v1#EquivalentClass"
    field_mappings:
      my_field: "other:field"

# Dimension mappings
dimensions:
  my_dimension:
    other_dimension: "other:equivalent"
    value_mappings:
      value1: "other:Value1"
      value2: "other:Value2"

# Relationship mappings
relationships:
  my_relation:
    other_predicate: "other:equivalent"
    inverse: "other:inverse"
```

---

## Related Commands

- `/federate` - Federation management (uses bridges)
- `/koi` - KOI integration (uses opl-to-regen bridge)
- `/export --format jsonld` - RDF export (uses bridges)
