# /koi Command

Integrate with Regen Network's Knowledge Organization Infrastructure (KOI).

## Usage

```
/koi                         # Show KOI integration status
/koi search <query>          # Search KOI knowledge graph
/koi publish                 # Publish local entities to KOI
/koi sync                    # Pull updates from subscribed topics
/koi link <entity>           # Link local entity to KOI RID
/koi verify <entity>         # Verify entity against on-chain data
/koi export                  # Export entities in KOI-compatible format
```

## What is KOI?

KOI (Knowledge Organization Infrastructure) is Regen Network's distributed knowledge management system. It provides:

- **64K+ indexed documents** across the regenerative ecosystem
- **Semantic search** with 1024-dimensional BGE embeddings
- **Knowledge graph** via Apache Jena Fuseki (RDF/SPARQL)
- **On-chain integration** with Regen Ledger
- **Automated synthesis** for digests and insights

OPAL integrates with KOI as a **federated node**, enabling:
- Publish local knowledge to the broader network
- Search across the entire regenerative knowledge commons
- Link entities to canonical RIDs for deduplication
- Verify claims against on-chain attestations

---

## KOI Status

```
/koi

🌐 KOI Integration Status
━━━━━━━━━━━━━━━━━━━━━━━━

Connection: ✅ Connected
Endpoint: https://regen.gaiaai.xyz/api/koi
Node Type: Partial Node

📊 Network Stats:
├── Documents indexed: 64,760+
├── Entities in graph: 7,744+
├── RDF triples: 3,851+
└── Your contributions: 156

📤 Publishing:
├── Namespace: orn:opal.commons:omniharmonic/opal
├── Last publish: 2 hours ago
├── Entities published: 156
├── Pending: 3 new entities
└── Next scheduled: in 4 hours

📥 Subscriptions:
├── regen:methodologies (23 items)
├── discourse:forum.regen.network/governance (156 items)
└── Last sync: 30 minutes ago

🔗 Entity Links:
├── Local entities: 156
├── Linked to KOI: 89 (57%)
├── Pending reconciliation: 12
└── Conflicts: 0

━━━━━━━━━━━━━━━━━━━━━━━━
Commands:
• /koi publish - Publish pending entities
• /koi sync - Pull subscription updates
• /koi search <query> - Search KOI
```

---

## Search KOI

Search the entire KOI knowledge graph:

```
/koi search participatory budgeting

🔍 KOI Search: "participatory budgeting"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Found 23 results (0.34s)

Local Matches (3):
├── [1] patterns/participatory-budgeting.md (0.95)
│   └── ✅ Linked: orn:opal.commons:omniharmonic/opal/patterns/participatory-budgeting
├── [2] protocols/pb-facilitation.md (0.82)
└── [3] artifacts/pb-handbook.md (0.78)

KOI Network (20):
├── [4] orn:discourse.forum.regen.network:topic/4521 (0.91)
│   └── "Participatory Budgeting for Community Credits"
│       Source: Regen Forum | 2026-01-15
│
├── [5] orn:regen.methodology:pb-allocation-v1 (0.88)
│   └── "Participatory Budget Allocation Methodology"
│       Source: Regen Registry | Credit Class: C04
│
├── [6] orn:notion.regen:page-abc123 (0.85)
│   └── "PB Implementation Guide"
│       Source: Regen Notion | 2025-11-20
│
├── [7] orn:youtube.regen:video-xyz789 (0.81)
│   └── "How Regen Uses Participatory Budgeting"
│       Source: YouTube | 45 min transcript
│
└── ... 16 more results

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Actions:
• /koi link 1 5 - Link local #1 to KOI #5
• /read orn:discourse... - View KOI entity
• /koi import 5 - Import KOI entity locally
```

### Search Options

```
/koi search <query> [options]

Options:
  --local-only       Search only local entities
  --koi-only         Search only KOI network
  --type <type>      Filter by entity type (pattern, methodology, etc.)
  --domain <domain>  Filter by ecological domain
  --limit <n>        Maximum results (default: 20)
```

---

## Publish to KOI

Publish local entities to the KOI network:

```
/koi publish

📤 Publishing to KOI
━━━━━━━━━━━━━━━━━━━━

Namespace: orn:opal.commons:omniharmonic/opal

Scanning for unpublished entities...

Ready to publish (3):
├── [NEW] patterns/consent-decision-making.md
│   └── RID: orn:opal.commons:omniharmonic/opal/patterns/consent-decision-making
│   └── CID: cid:sha256:abc123...
│
├── [UPDATE] patterns/participatory-budgeting.md
│   └── RID: orn:opal.commons:omniharmonic/opal/patterns/participatory-budgeting
│   └── Previous CID: cid:sha256:old456...
│   └── New CID: cid:sha256:new789...
│
└── [NEW] organizations/civic-patterns-institute.md
    └── RID: orn:opal.commons:omniharmonic/opal/organizations/civic-patterns-institute

Generating JSON-LD export...
✅ Created: _federation/outbox/koi-export-2026-02-02.jsonld

Publishing to KOI endpoint...
├── [1/3] consent-decision-making: ✅ Published
├── [2/3] participatory-budgeting: ✅ Updated
└── [3/3] civic-patterns-institute: ✅ Published

Generating CAT receipts...
✅ Receipts stored: _index/cat-receipts.json

━━━━━━━━━━━━━━━━━━━━
Summary:
• Published: 2 new, 1 updated
• CAT receipts: 3
• Network RIDs assigned: 3

Your entities are now searchable across the KOI network!
```

### Publish Options

```
/koi publish [options]

Options:
  --dry-run          Preview without publishing
  --entity <path>    Publish specific entity
  --type <type>      Publish only entities of type
  --force            Re-publish all (ignore CID cache)
```

---

## Sync from KOI

Pull updates from subscribed KOI topics:

```
/koi sync

📥 Syncing from KOI Subscriptions
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[1/3] regen:methodologies
├── Checking for updates since: 2026-02-01T00:00:00Z
├── Found: 2 new methodologies
│   ├── orn:regen.methodology:soil-carbon-v2
│   │   └── "Soil Carbon Methodology v2.0"
│   └── orn:regen.methodology:agroforestry-v1
│       └── "Agroforestry Carbon Methodology"
└── ✅ Staged 2 items for review

[2/3] discourse:forum.regen.network/governance
├── Checking for updates...
├── Found: 5 new discussions
│   ├── Topic 4892: "Consent-based Credit Issuance"
│   ├── Topic 4891: "Bioregional Governance Patterns"
│   └── ... 3 more
└── ✅ Staged 5 items for review

[3/3] regen:credit-classes
├── Checking for updates...
└── ✅ No new items

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Summary:
• Sources checked: 3
• New items staged: 7
• Location: _inbox/koi/

Next: /review to process staged items
```

---

## Link Entities

Link a local entity to its canonical KOI RID:

```
/koi link patterns/participatory-budgeting.md

🔗 Link Entity to KOI
━━━━━━━━━━━━━━━━━━━━━

Local entity: patterns/participatory-budgeting.md
Current RID: orn:opal.commons:omniharmonic/opal/patterns/participatory-budgeting

Searching KOI for matches...

Potential matches:
├── [1] orn:regen.pattern:participatory-budgeting (0.95 match)
│   └── Name: "Participatory Budgeting"
│   └── Source: Regen Commons
│   └── Last updated: 2026-01-20
│
├── [2] orn:opl.commons:patterns/pb (0.88 match)
│   └── Name: "Participatory Budgeting (PB)"
│   └── Source: Open Protocol Library
│   └── Last updated: 2025-12-15
│
└── [3] No link (keep local RID only)

Select match to link [1/2/3]:
> 1

Linking to: orn:regen.pattern:participatory-budgeting

This will:
• Add upstream_rid to entity metadata
• Enable bidirectional updates
• Show KOI context in searches

Confirm? [Y/n]
> y

✅ Linked!

Updated entity:
  Local RID: orn:opal.commons:omniharmonic/opal/patterns/participatory-budgeting
  Upstream RID: orn:regen.pattern:participatory-budgeting
  Link type: sameAs
```

---

## Verify On-Chain

Verify entity data against Regen Ledger:

```
/koi verify credit-classes/soil-carbon-c01.md

🔍 Verifying Against Regen Ledger
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Entity: credit-classes/soil-carbon-c01.md
Class ID: C01

Querying Regen Ledger MCP...

On-Chain Data:
┌─────────────────┬─────────────────────────────────────────┐
│ Field           │ Ledger Value                            │
├─────────────────┼─────────────────────────────────────────┤
│ Class ID        │ C01                                     │
│ Admin           │ regen1abc...xyz                         │
│ Credit Type     │ Carbon Removal                          │
│ Issuers         │ 3 authorized                            │
│ Total Credits   │ 1,234,567.89 C01                        │
│ Metadata IRI    │ regen:C01/metadata.json                 │
└─────────────────┴─────────────────────────────────────────┘

Comparison:
├── ✅ Class ID: Matches
├── ✅ Admin: Matches (resolved regen1abc → "Regen Foundation")
├── ✅ Credit Type: Matches
├── ⚠️ Total Credits: Local shows 1,200,000 (outdated)
└── ✅ Metadata: Verified via IRI

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Verification Status: ⚠️ Partially Verified

Discrepancies:
• Total credits outdated - consider updating local copy

Actions:
• /koi refresh credit-classes/soil-carbon-c01.md
```

---

## Export for KOI

Export entities in KOI-compatible formats:

```
/koi export

📦 Export for KOI Federation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Export format options:
  [1] JSON-LD (recommended for KOI)
  [2] Turtle/RDF (for Fuseki direct import)
  [3] KOI Native (includes CAT receipts)

Choice: 1

Exporting 156 entities as JSON-LD...

Output: _federation/outbox/entities.jsonld

Preview:
{
  "@context": {
    "@vocab": "https://regen.network/ontology/v1#",
    "opal": "https://opal.commons/ontology/v1#",
    ...
  },
  "@graph": [
    {
      "@type": "Pattern",
      "@id": "orn:opal.commons:omniharmonic/opal/patterns/participatory-budgeting",
      "schema:name": "Participatory Budgeting",
      "opal:civicSector": ["governance-political-systems"],
      ...
    }
  ]
}

✅ Exported 156 entities
   Format: JSON-LD
   Size: 234 KB
   Location: _federation/outbox/entities.jsonld
```

---

## Configuration

Configure KOI integration in `.opal/sources.yaml`:

```yaml
koi:
  enabled: true
  endpoint: https://regen.gaiaai.xyz/api/koi
  api_key_env: KOI_API_KEY  # Optional

  # Publishing
  publish:
    enabled: true
    namespace: orn:opal.commons:omniharmonic/opal
    types:
      - patterns
      - protocols
      - playbooks
    schedule: "0 */6 * * *"  # Every 6 hours

  # Subscriptions
  subscribe:
    - topic: regen:methodologies
      filter: domain:soil-carbon
      auto_stage: true

    - topic: discourse:forum.regen.network
      filter: tags:governance
      auto_stage: true

  # Entity reconciliation
  reconciliation:
    enabled: true
    confidence_threshold: 0.85
    auto_link: false  # Require manual confirmation

  # Taxonomy bridge
  bridge: .opal/bridges/opl-to-regen.yaml
```

---

## RID Format

OPAL uses KOI-compatible Resource Identifiers (RIDs):

```
orn:<namespace>:<path>

Examples:
orn:opal.commons:omniharmonic/opal/patterns/participatory-budgeting
orn:regen.methodology:soil-carbon-v2
orn:discourse.forum.regen.network:topic/4521
```

Components:
- `orn:` - Open Resource Name prefix
- `<namespace>` - Source system identifier
- `<path>` - Unique path within namespace

---

## Related Commands

- `/federate` - General federation management
- `/export` - Export in various formats
- `/search` - Search (includes KOI if enabled)
- `/ask` - Q&A (uses KOI for context)

---

## Learn More

- [KOI Master Implementation Guide](https://github.com/regen-network/koi-research/blob/main/docs/KOI_MASTER_IMPLEMENTATION_GUIDE.md)
- [OPAL-KOI Integration Strategy](/.claude/KOI-INTEGRATION.md)
- [OPL-Regen Taxonomy Bridge](/.opal/bridges/opl-to-regen.yaml)
