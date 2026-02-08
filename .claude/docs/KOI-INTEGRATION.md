# OPAL ↔ KOI Integration Strategy

*Implementation plan for federated knowledge commons interoperability*

---

## Executive Summary

The Regen Network's KOI (Knowledge Organization Infrastructure) and OPAL share remarkable philosophical and architectural alignment. This document outlines the implementation strategy for full interoperability.

**Core Insight**: KOI is the "brain" (large-scale indexing, graph reasoning, on-chain integration) — OPAL is the "hands" (local ingestion, human curation, domain taxonomies).

Together they form a complete knowledge commons stack:
```
OPAL (Ingestion & Curation) → KOI (Indexing & Search) → Regen AI (Action & Intelligence)
```

---

## Phase 1: Foundation (Immediate)

### 1.1 Add RID (Resource Identifier) Support

KOI uses a dual identification system:
- **RID**: Semantic identity (stable across transformations)
- **CID**: Content hash (deduplication via SHA-256)

**Implementation**: Update `_index/entities.json` schema:

```json
{
  "participatory-budgeting": {
    "canonical_name": "Participatory Budgeting",
    "type": "pattern",
    "file_path": "patterns/participatory-budgeting.md",
    "rid": "orn:opal.commons:omniharmonic/opal/patterns/participatory-budgeting",
    "cid": "cid:sha256:e002e2e94b5cc9057e16fe0173854c88af1d1ba307986c0337066ddcbfdeb4a7",
    "koi_sync": {
      "last_published": "2026-02-02T00:00:00Z",
      "upstream_rid": null,
      "cat_receipts": []
    }
  }
}
```

**RID Format for OPAL**:
```
orn:opal.commons:<org>/<repo>/<type>/<slug>
```

Examples:
- `orn:opal.commons:omniharmonic/opal/patterns/consent-decision-making`
- `orn:opal.commons:regen-network/regen-commons/methodologies/soil-carbon-v1`

### 1.2 Add Content Hashing

Generate CIDs for all entities to enable deduplication across the network:

```python
import hashlib

def generate_cid(content: str) -> str:
    """Generate KOI-compatible content identifier."""
    hash_bytes = hashlib.sha256(content.encode('utf-8')).hexdigest()
    return f"cid:sha256:{hash_bytes}"
```

### 1.3 Update Entity Index Schema

Create new index format at `_index/koi-entities.json`:

```json
{
  "$schema": "https://koi.regen.network/schema/v1/entities",
  "version": "1.0",
  "namespace": "orn:opal.commons:omniharmonic/opal",
  "generated_at": "2026-02-02T00:00:00Z",
  "entities": [
    {
      "rid": "orn:opal.commons:omniharmonic/opal/patterns/participatory-budgeting",
      "cid": "cid:sha256:e002e2e94b5cc9057...",
      "type": "Pattern",
      "name": "Participatory Budgeting",
      "aliases": ["PB", "community budgeting"],
      "file_path": "patterns/participatory-budgeting.md",
      "created_at": "2026-01-15T00:00:00Z",
      "updated_at": "2026-02-01T00:00:00Z",
      "civic_sectors": ["governance-political-systems", "economic-resource-sharing"],
      "civic_scales": ["municipal", "bioregional"],
      "relationships": [
        {
          "predicate": "regen:relatedTo",
          "object_rid": "orn:opal.commons:omniharmonic/opal/patterns/consent-decision-making"
        }
      ]
    }
  ]
}
```

---

## Phase 2: Export & Federation

### 2.1 JSON-LD Export

Enable RDF-compatible export for KOI ingestion:

```bash
/export --format jsonld --target _federation/outbox/
```

**Output Format** (`_federation/outbox/entities.jsonld`):

```json
{
  "@context": {
    "@vocab": "https://regen.network/ontology/v1#",
    "opal": "https://opal.commons/ontology/v1#",
    "schema": "https://schema.org/",
    "skos": "http://www.w3.org/2004/02/skos/core#",
    "rid": "@id",
    "cid": "opal:contentIdentifier",
    "civicSector": "opal:civicSector",
    "civicScale": "opal:civicScale"
  },
  "@graph": [
    {
      "@type": "Pattern",
      "@id": "orn:opal.commons:omniharmonic/opal/patterns/participatory-budgeting",
      "schema:name": "Participatory Budgeting",
      "skos:altLabel": ["PB", "community budgeting"],
      "schema:description": "A democratic process...",
      "civicSector": ["governance-political-systems"],
      "civicScale": ["municipal"],
      "schema:dateCreated": "2026-01-15",
      "schema:dateModified": "2026-02-01"
    }
  ]
}
```

### 2.2 Turtle/RDF Export

For direct Apache Jena Fuseki ingestion:

```bash
/export --format turtle --target _federation/outbox/
```

**Output** (`_federation/outbox/entities.ttl`):

```turtle
@prefix regen: <https://regen.network/ontology/v1#> .
@prefix opal: <https://opal.commons/ontology/v1#> .
@prefix schema: <https://schema.org/> .

<orn:opal.commons:omniharmonic/opal/patterns/participatory-budgeting>
    a regen:Pattern ;
    schema:name "Participatory Budgeting" ;
    opal:civicSector "governance-political-systems" ;
    opal:civicScale "municipal" ;
    regen:relatedTo <orn:opal.commons:omniharmonic/opal/patterns/consent-decision-making> .
```

### 2.3 CAT Receipt Generation

Track all transformations with KOI-compatible provenance:

```json
{
  "cat_id": "cat:opal:extract:2026-02-02:001",
  "operation": "entity_extraction",
  "input_rid": "orn:opal.commons:omniharmonic/opal/_inbox/meeting-2026-02-01.md",
  "input_cid": "cid:sha256:abc123...",
  "output_rid": "orn:opal.commons:omniharmonic/opal/patterns/new-pattern",
  "output_cid": "cid:sha256:def456...",
  "timestamp": "2026-02-02T10:00:00Z",
  "agent": "claude-opus-4",
  "ontology_version": "opal:civic-v1",
  "confidence": 0.87
}
```

---

## Phase 3: Taxonomy Bridging

### 3.1 OPL ↔ Regen Taxonomy Bridge

Create mapping file at `.opal/bridges/opl-to-regen.yaml`:

```yaml
# OPL ↔ Regen Ontology Bridge
# Enables cross-taxonomy entity resolution

version: "1.0"
source: "opl:civic-v1"
target: "regen:unified-v1"

# Resource Type Mappings
resource_types:
  # OPL → Regen
  pattern:
    regen_class: "regen:Pattern"
    note: "Direct mapping - both represent reusable solutions"

  protocol:
    regen_class: "regen:Methodology"
    note: "Protocols map to methodologies in ecological context"

  playbook:
    regen_class: "regen:Playbook"
    note: "Direct mapping"

  primitive:
    regen_class: "regen:SemanticAsset"
    note: "Fundamental building blocks"

  artifact:
    regen_class: "regen:Source"
    note: "Documents and external references"

  person:
    regen_class: "regen:HumanActor"
    note: "Individuals in the system"

  organization:
    regen_class: "regen:Commons"
    subclass_of: "regen:Agent"
    note: "Collective entities"

  activity:
    regen_class: "regen:GovernanceAct"
    note: "Events and activities map to governance acts"

# Civic Sector → SDG/Regen Domain Mappings
civic_sectors:
  environmental-sustainability:
    regen_domains:
      - "regen:EcologicalRegeneration"
    sdg_alignment:
      - "SDG:15"  # Life on Land
      - "SDG:13"  # Climate Action
      - "SDG:14"  # Life Below Water

  governance-political-systems:
    regen_domains:
      - "regen:Governance"
    sdg_alignment:
      - "SDG:16"  # Peace, Justice, Strong Institutions

  economic-resource-sharing:
    regen_domains:
      - "regen:Commons"
      - "regen:TokenEconomics"
    sdg_alignment:
      - "SDG:8"   # Decent Work and Economic Growth
      - "SDG:12"  # Responsible Consumption

  food-agriculture-systems:
    regen_domains:
      - "regen:Agroforestry"
      - "regen:SoilCarbon"
    sdg_alignment:
      - "SDG:2"   # Zero Hunger
      - "SDG:15"  # Life on Land

  water-sanitation-systems:
    regen_domains:
      - "regen:BlueCarbon"
      - "regen:WaterStewardship"
    sdg_alignment:
      - "SDG:6"   # Clean Water and Sanitation

# Civic Scale → Regen Scale Mappings
civic_scales:
  individual:
    regen_scale: "regen:Individual"

  household:
    regen_scale: "regen:Household"

  neighborhood:
    regen_scale: "regen:Community"

  municipal:
    regen_scale: "regen:Municipal"

  bioregional:
    regen_scale: "regen:Bioregional"
    note: "Key alignment - both systems use bioregional framing"

  national:
    regen_scale: "regen:National"

  planetary:
    regen_scale: "regen:Planetary"
    note: "Maps to PROI (Planetary Regeneration Outcome Index)"

# Relationship Mappings
relationships:
  relates_to:
    regen_predicate: "regen:relatedTo"

  implements:
    regen_predicate: "regen:implements"

  part_of:
    regen_predicate: "regen:partOf"

  mentioned_in:
    regen_predicate: "regen:contextualizes"

  supports:
    regen_predicate: "regen:supports"

  opposes:
    regen_predicate: "regen:opposes"
```

### 3.2 Regen Taxonomy Template

Create `.claude/templates/regen/manifest.yaml`:

```yaml
name: Regen Network
id: regen
description: |
  For ecological regeneration knowledge, carbon credit methodologies,
  and Regen Network ecosystem content.

resource_types:
  - id: methodology
    name: Methodology
    plural: Methodologies
    description: Credit class methodologies and verification protocols
    directory: methodologies/
    icon: 📋
    fields:
      - name: title
        type: string
        required: true
      - name: credit_class
        type: reference
        to: credit_class
      - name: verification_standard
        type: string
      - name: ecological_domain
        type: dimension
        dimension: ecological_domain
      - name: sdg_alignment
        type: list
      - name: measurement_approach
        type: text

  - id: credit_class
    name: Credit Class
    plural: Credit Classes
    description: On-chain credit type definitions
    directory: credit-classes/
    icon: 🌱
    fields:
      - name: title
        type: string
        required: true
      - name: class_id
        type: string
        description: On-chain identifier
      - name: admin
        type: reference
        to: organization
      - name: methodology
        type: reference
        to: methodology
      - name: ecological_domain
        type: dimension
        dimension: ecological_domain

  - id: project
    name: Project
    plural: Projects
    description: Ecological projects generating credits
    directory: projects/
    icon: 🗺️
    fields:
      - name: title
        type: string
        required: true
      - name: location
        type: string
      - name: credit_class
        type: reference
        to: credit_class
      - name: project_developer
        type: reference
        to: organization
      - name: hectares
        type: number
      - name: start_date
        type: date
      - name: status
        type: dimension
        dimension: project_status

  - id: claim
    name: Claim
    plural: Claims
    description: Verifiable claims about ecological impact
    directory: claims/
    icon: ✓
    regen_class: regen:Claim
    fields:
      - name: title
        type: string
        required: true
      - name: claim_type
        type: string
      - name: evidence
        type: list
        of: reference
        to: evidence
      - name: confidence
        type: number

  - id: evidence
    name: Evidence
    plural: Evidence
    description: Data supporting claims
    directory: evidence/
    icon: 📊
    regen_class: regen:Evidence
    fields:
      - name: title
        type: string
        required: true
      - name: source
        type: reference
        to: artifact
      - name: methodology
        type: reference
        to: methodology
      - name: data_url
        type: string

  - id: organization
    name: Organization
    plural: Organizations
    description: Project developers, verifiers, registries
    directory: organizations/
    icon: 🏢
    regen_class: regen:Commons

  - id: person
    name: Person
    plural: People
    description: Researchers, practitioners, stewards
    directory: people/
    icon: 👤
    regen_class: regen:HumanActor

  - id: artifact
    name: Artifact
    plural: Artifacts
    description: Papers, reports, datasets
    directory: artifacts/
    icon: 📄
    regen_class: regen:Source

dimensions:
  - id: ecological_domain
    name: Ecological Domain
    values:
      - id: soil-carbon
        name: Soil Carbon
        description: Soil organic carbon sequestration
      - id: biodiversity
        name: Biodiversity
        description: Species and ecosystem diversity
      - id: blue-carbon
        name: Blue Carbon
        description: Coastal and marine carbon
      - id: agroforestry
        name: Agroforestry
        description: Trees integrated with agriculture
      - id: forest-carbon
        name: Forest Carbon
        description: Above and below ground forest carbon
      - id: grassland
        name: Grassland
        description: Grassland and rangeland systems

  - id: project_status
    name: Project Status
    values:
      - id: proposed
        name: Proposed
      - id: registered
        name: Registered
      - id: monitoring
        name: Monitoring
      - id: verified
        name: Verified
      - id: credits-issued
        name: Credits Issued
      - id: retired
        name: Retired

  - id: sdg
    name: SDG Alignment
    values:
      - id: sdg-2
        name: "SDG 2: Zero Hunger"
      - id: sdg-6
        name: "SDG 6: Clean Water"
      - id: sdg-13
        name: "SDG 13: Climate Action"
      - id: sdg-14
        name: "SDG 14: Life Below Water"
      - id: sdg-15
        name: "SDG 15: Life on Land"

relationships:
  - id: verifies
    name: Verifies
    description: Organization verifies a claim
  - id: develops
    name: Develops
    description: Organization develops a project
  - id: supports
    name: Supports
    description: Evidence supports a claim
  - id: implements
    name: Implements
    description: Project implements a methodology
```

---

## Phase 4: KOI Integration

### 4.1 KOI MCP Configuration

Add to `config/integrations.yaml`:

```yaml
integrations:
  koi:
    enabled: true
    description: Regen Network Knowledge Organization Infrastructure

    # Connection
    endpoint: https://regen.gaiaai.xyz/api/koi
    api_key_env: KOI_API_KEY  # Optional, for authenticated access

    # Capabilities
    use_for:
      # During entity extraction, check if entity exists in KOI
      - entity_reconciliation

      # Enrich extraction prompt with related KOI entities
      - context_enrichment

      # /search queries both local index and KOI
      - federated_search

      # /ask uses KOI as additional knowledge source
      - qa_augmentation

    # Federation
    federation:
      # Publish OPAL entities to KOI
      publish:
        enabled: true
        patterns:
          - patterns/*
          - protocols/*
          - playbooks/*
        format: jsonld
        schedule: "0 */6 * * *"  # Every 6 hours

      # Subscribe to KOI updates
      subscribe:
        enabled: true
        topics:
          - source: "discourse:forum.regen.network"
            filter: "tags:governance"
          - source: "regen:methodologies"
            filter: "domain:soil-carbon"
        auto_stage: true  # Stage for review, don't auto-merge

    # Mapping
    taxonomy_bridge: .opal/bridges/opl-to-regen.yaml
```

### 4.2 Entity Reconciliation with KOI

When extracting entities, query KOI for matches:

```python
async def reconcile_with_koi(entity: dict, koi_client) -> dict:
    """Check if entity exists in KOI network."""

    # Search KOI for similar entities
    results = await koi_client.search(
        query=entity['canonical_name'],
        entity_types=[map_to_regen_type(entity['type'])],
        limit=5
    )

    for match in results:
        similarity = calculate_similarity(entity, match)
        if similarity > 0.9:
            # High confidence match - link to KOI entity
            entity['koi_sync'] = {
                'upstream_rid': match['rid'],
                'match_confidence': similarity,
                'synced_at': datetime.now().isoformat()
            }
            return entity
        elif similarity > 0.7:
            # Medium confidence - flag for review
            entity['koi_candidates'] = entity.get('koi_candidates', [])
            entity['koi_candidates'].append({
                'rid': match['rid'],
                'name': match['name'],
                'confidence': similarity
            })

    return entity
```

### 4.3 Federated Search

Extend `/search` to query both local and KOI:

```python
async def federated_search(query: str, options: dict) -> list:
    """Search local index and KOI simultaneously."""

    # Parallel search
    local_results, koi_results = await asyncio.gather(
        search_local(query, options),
        search_koi(query, options) if options.get('federated', True) else []
    )

    # Merge with source attribution
    merged = []

    for result in local_results:
        result['source'] = 'local'
        merged.append(result)

    for result in koi_results:
        # Check for duplicates (same RID or high similarity)
        if not is_duplicate(result, merged):
            result['source'] = 'koi'
            merged.append(result)

    # Rank by relevance
    return sorted(merged, key=lambda x: x['score'], reverse=True)
```

---

## Phase 5: Commands & Workflow

### 5.1 New Commands

**`/koi` - KOI Integration Management**

```
/koi                     # Show KOI integration status
/koi search <query>      # Search KOI knowledge graph
/koi publish             # Publish local entities to KOI
/koi sync                # Pull updates from subscribed topics
/koi link <entity>       # Link local entity to KOI RID
/koi verify <entity>     # Verify entity against on-chain data
```

**`/export` - Export for Federation**

```
/export --format jsonld          # Export as JSON-LD
/export --format turtle          # Export as RDF/Turtle
/export --format koi             # Export in KOI-native format
/export --to koi                 # Direct publish to KOI
```

### 5.2 Enhanced `/federate`

```
/federate

🌐 Federation Status
━━━━━━━━━━━━━━━━━━━━

Mode: OPAL Node (KOI Partial Node)

📥 Subscribed Sources:
├── koi:discourse.forum.regen.network
│   ├── Filter: tags:governance
│   ├── Last sync: 2 hours ago
│   └── Status: ✅ 12 new items staged
│
├── koi:regen.methodologies
│   ├── Filter: domain:soil-carbon
│   ├── Last sync: 6 hours ago
│   └── Status: ✅ Up to date
│
└── github:omniharmonic/open-protocol-library
    ├── Pattern: patterns/*, protocols/*
    └── Status: ✅ Up to date

📤 Publishing to KOI:
├── Enabled: Yes
├── Namespace: orn:opal.commons:omniharmonic/opal
├── Last publish: 30 minutes ago
├── Entities published: 156
└── Next scheduled: in 5h 30m

🔗 Entity Links:
├── Local entities: 156
├── Linked to KOI: 89 (57%)
├── KOI-only refs: 234
└── Pending reconciliation: 12

Commands:
• /koi publish - Publish now
• /koi sync - Pull KOI updates
• /federate pull - Pull from all sources
```

---

## Implementation Checklist

### Phase 1: Foundation (Week 1-2)
- [ ] Add RID generation to entity creation
- [ ] Add CID (content hash) generation
- [ ] Update `_index/entities.json` schema
- [ ] Create `_index/koi-entities.json` export format
- [ ] Add CAT receipt tracking

### Phase 2: Export (Week 2-3)
- [ ] Implement JSON-LD export (`/export --format jsonld`)
- [ ] Implement Turtle/RDF export (`/export --format turtle`)
- [ ] Add export to `_federation/outbox/`
- [ ] Create `/export` command

### Phase 3: Taxonomy (Week 3-4)
- [ ] Create `.opal/bridges/opl-to-regen.yaml`
- [ ] Create `.claude/templates/regen/manifest.yaml`
- [ ] Add bridge loading to entity extraction
- [ ] Test taxonomy mapping

### Phase 4: Integration (Week 4-6)
- [ ] Add KOI configuration to `config/integrations.yaml`
- [ ] Implement KOI client for API calls
- [ ] Add entity reconciliation with KOI
- [ ] Implement federated search
- [ ] Add KOI subscription handling

### Phase 5: Commands (Week 6-8)
- [ ] Create `/koi` command
- [ ] Enhance `/federate` for KOI
- [ ] Update `/search` for federation
- [ ] Update `/ask` for KOI augmentation
- [ ] Create documentation

---

## Benefits Summary

### For OPAL Users
- Access to 64K+ indexed documents via KOI
- Production-scale semantic search
- Knowledge graph infrastructure
- On-chain verification capabilities
- Broader knowledge network participation

### For Regen/KOI Users
- Human-in-the-loop curation workflow
- Local-first, privacy-preserving processing
- Transcript processing pipeline
- Democratic governance for contributions
- Civic/social taxonomy coverage

### For the Ecosystem
- Unified knowledge commons infrastructure
- Cross-community knowledge sharing
- Complementary strengths leveraged
- Open, federated architecture
- Regenerative knowledge stewardship

---

## Next Steps

1. **Respond to GitHub Issue** - Accept the proposal
2. **Begin Phase 1** - Add RID/CID support
3. **Schedule Collaboration** - Meet with Regen team
4. **Document Progress** - Update this file as we go

---

*Strategy document created: February 2, 2026*
*Based on analysis from: regen-network/koi-research*
