# Re/acc Constitution Template Guide

This guide documents the exact structure, metadata patterns, and wiki-linking conventions used in the OpenCivics Consortium constitution for creating the re/acc Commons constitution.

---

## Directory Structure

```
Re-acc Commons Constitution/
├── 0. Meta/
│   └── Component Guide.md
├── 1. Identity/
│   ├── Identity Index.md
│   ├── Vision.md
│   ├── Purpose.md
│   ├── Mission.md
│   ├── Functions.md
│   ├── Mandates.md
│   ├── Values.md
│   └── Worldview.md
├── 2. Structure/
│   ├── Structure Index.md
│   ├── Roles/
│   │   ├── Roles Index.md
│   │   └── [Role].md
│   ├── Groups/
│   │   ├── Groups Index.md
│   │   └── [Group].md
│   └── Assets/
│       ├── Assets Index.md
│       └── [Asset].md
├── 3. Protocols/
│   ├── Protocols Index.md
│   ├── Role Protocols/
│   │   └── [Role] Protocol.md
│   ├── Group Protocols/
│   │   └── [Group] Protocol.md
│   ├── Asset Protocols/
│   │   └── [Asset] Protocol.md
│   └── Cultural Protocols/
│       └── [Cultural] Protocol.md
├── 4. Agreements/
│   ├── Agreement Index.md
│   └── [Role] Agreement.md
└── Re-acc Commons Constitution.md (main entry point)
```

---

## Wiki-Linking Conventions

### Link Types

| Type | Syntax | Use Case |
|------|--------|----------|
| Simple link | `[[Document Name]]` | Reference another document |
| Aliased link | `[[Folder/Document\|Display Text]]` | Link with custom display text |
| Section link (same doc) | `[[#Section Name]]` | Link to section in current document |
| Section link (other doc) | `[[Document#Section]]` | Link to section in another document |
| Full transclusion | `![[Document]]` | Embed entire document content |
| Section transclusion | `![[Document#Section]]` | Embed specific section |
| Path-based link | `[[1. Identity/Purpose\|Purpose]]` | Link with explicit path |

### AI-Readable Patterns

For machine-readability, use consistent naming:
- Role names: `[[Newcomer]]`, `[[Participant]]`, `[[Member]]`, `[[Steward]]`, `[[Agent]]`
- Groups: `[[Working Circle]]`, `[[Stewardship]]`, `[[Commons Assembly]]`
- Protocols: `[[Membrane Crossing Protocol]]`, `[[Consent Protocol]]`
- Assets: `[[Commons Treasury]]`, `[[Discord Server]]`, `[[GitHub Repository]]`

---

## Document Templates

### Main Constitution (Entry Point)

```markdown
---
id: REACC-constitution_[timestamp]-draft-v[version]
---
**Contents**

- [[#Context]]
- [[#Freedom To Participate]]
- [[#Identity]]
- [[#Structure]]
- [[#Protocols]]
- [[#Agreements]]

# Context

[Welcoming paragraph explaining what this document is]

# Freedom To Participate

You are free to take any action that fulfills the [[1. Identity/Purpose|Purpose]] of the commons and the [[Roles Index|Roles]] that you hold — as long as you do not violate any [[3. Protocols/Protocols Index|Protocols]]; and you seek to uphold the [[1. Identity/Values|Values]] and intent of this Constitution.

# Agreements

![[Agreement Index]]

# Identity

![[Identity Index]]

# Structure

![[Structure Index]]

# Protocols

![[Protocols Index]]
```

### Identity Document Template

```markdown
[Opening statement - 1-2 sentences defining the concept]

[Expanded explanation if needed]

[For Values/Mandates: bullet list of items]
```

### Role Document Template

```markdown
[One-sentence description of the role and its primary relationship]

## Purpose

[Why this role exists - 1-2 sentences]

## Criteria

- [Requirement 1]
- [Requirement 2]
- Not currently serving as [[Conflicting Role]] (if applicable)

## Responsibilities

**[Category 1]:** [Description]
**[Category 2]:** [Description]

OR table format for complex responsibilities

## Benefits

| Category | Access |
|----------|--------|
| **Authority** | [What decisions they can make] |
| **Channels** | [Communication access] |
| **Treasury** | [Financial permissions] |
| **Governance** | [Voting/consent rights] |

**Note:** As a [Role], you are also a [[Lower Role]] and retain all [Lower Role] rights.

## Participation Expectations

![[Participation Cadence Protocol#[Role]]]

## Related Protocols

- [[Role Protocol]]
- [[Group Protocol]]
```

### Group Document Template

```markdown
[One-sentence description of the group and its primary function]

# Purpose

[Description of what the group accomplishes]

# Composition & Quorum

- **Size:** [Number range]
- **Quorum:** [Minimum for decisions]
- **Terms:** [Duration and rotation]
- **Selection:** [How members join]

# Responsibilities

| Area | Activities |
|------|-----------|
| [Area 1] | [Activities] |
| [Area 2] | [Activities] |

# Decision Authority

| Decision Type | Authority | Process |
|--------------|-----------|---------|
| [Type 1] | [Who decides] | [How] |
| [Type 2] | [Who decides] | [How] |

# Related Protocols

- [[Group Protocol]]

# Related Groups

- [[Other Group]] — [Relationship description]
```

### Asset Document Template

```markdown
[Description of what the asset is and its primary function]

## Purpose

- [Use case 1]
- [Use case 2]

## Location

[Where the asset is accessed - URL, address, platform]

## Technical Setup (if applicable)

- [Technical detail 1]
- [Technical detail 2]

## Access and Approval

| Access Level | Who | Permissions |
|-------------|-----|-------------|
| Viewer | [[Role]] | [What they can do] |
| Contributor | [[Role]] | [What they can do] |
| Signer/Admin | [[Role]] | [What they can do] |

## Accountability

**Reporting:**
- [Reporting mechanism 1]
- [Reporting mechanism 2]

## Related Documents

- [[Related Protocol]]
- [[Related Asset]]
```

### Protocol Document Template

```markdown
This protocol governs [what it governs] for [[Related Role/Group/Asset]].

## Contents

- [Instantiation](#instantiation)
- [Authority & Oversight](#authority--oversight)
- [Process](#process)
- [Completion & Outputs](#completion--outputs)
- [Exceptions & Edge Cases](#exceptions--edge-cases)
- [Related Protocols](#related-protocols)

## Instantiation

**Trigger Type:** [Action-based / Condition-based / Hybrid]

**Trigger Conditions:**
- [Condition 1]
- [Condition 2]

## Authority & Oversight

| Role | Authority | Accountability |
|------|-----------|----------------|
| [[Role 1]] | [What they can do] | [[Oversight Body]] |
| [[Role 2]] | [What they can do] | [[Oversight Body]] |

## Process

| Step | Action | Actor | Timeline |
|------|--------|-------|----------|
| 1 | [Action] | [[Actor]] | [Duration] |
| 2 | [Action] | [[Actor]] | [Duration] |

### Step 1: [Name]

[Detailed description]

## Completion & Outputs

**Protocol completes when:**
- [Completion condition]

**Outputs:**
- [Output 1]
- [Output 2]

## Exceptions & Edge Cases

- **[Exception]:** [How to handle]

## Related Protocols

- [[Related Protocol 1]]
- [[Related Protocol 2]]
```

### Agreement Document Template

```markdown
---
lastUpdated: [YYYY-MM-DD]
---
Welcome to the [Organization Name] as a **[Role]** — [one-sentence description of role].

This document is the agreement for [[Role]] role membership in the [Organization Name].

- [[#Freedom to Participate]]
- [[#Your Role]]
- [[#Your Group]] (if applicable)
- [[#Key Responsibilities]]
- [[#Your Platform Access]]
- [[#Questions and Support]]
- [[#About [Organization]]]

# Freedom to Participate

You are free to take any action that fulfills the [[1. Identity/Purpose|Purpose]] of the organization and the [[Roles Index|Roles]] that you hold — as long as you do not violate any [[3. Protocols/Protocols Index|Protocols]]; and you seek to uphold the [[1. Identity/Values|Values]] and intent of this Constitution.

# Your Role

![[Role]]

# Your Group

![[Group]] (if applicable)

---

# [Key Section 1]

![[Relevant Protocol#Section]]

---

# Your Platform Access

![[Platforms Protocol#Access by Role]]

---

# Questions and Support

[Support information]

---

# About [Organization]

![[1. Identity/Identity Index|Identity Index]]

![[2. Structure/Structure Index|Structure Index]]

![[3. Protocols/Protocols Index|Protocols Index]]

![[Agreement Index]]
```

### Index Document Template

```markdown
[Brief description of what this index contains]:

## [Category 1] (if applicable)

- [[Item 1]]
- [[Item 2]]

## [Category 2] (if applicable)

- [[Item 3]]
- [[Item 4]]
```

---

## Re/acc-Specific Adaptations

### Membrane Architecture → Role Hierarchy

| OpenCivics Role | Re/acc Role | Membrane |
|-----------------|-------------|----------|
| - | Newcomer | Zero: Threshold |
| Contributor | Participant | One: Public Commons |
| Citizen | Member | Two: Inner Commons |
| Steward | Steward | Three: Solidarity Economy |
| - | Agent | Across All |

### Groups (Re/acc)

- Working Circles (domain-specific)
- Stewardship (rotating curators)
- Commons Assembly (all Members)

### Governance (Re/acc)

- Sociocratic Consent (not voting)
- 3-member consent + 48h window (standard)
- Full commons consent + 72h window (foundational)
- Paramount objections framework

### Assets (Re/acc)

- Commons Treasury (multisig)
- Discord Server
- GitHub Repository
- Knowledge Commons
- Federation Agreements

### Protocols (Re/acc)

**Role Protocols:**
- Newcomer Protocol
- Participant Protocol
- Member Protocol
- Steward Protocol
- Agent Protocol

**Group Protocols:**
- Working Circle Protocol
- Stewardship Protocol
- Commons Assembly Protocol

**Asset Protocols:**
- Treasury Management Protocol
- Constitution Amendment Protocol
- Discord Architecture Protocol
- Knowledge Commons Protocol
- Federation Protocol

**Cultural Protocols:**
- Onboarding Protocol
- Consent Process Protocol
- Accountability Protocol
- Participation Cadence Protocol

---

## NFT/Multi-sig Permission Mapping

For human-machine hybrid governance, map Discord roles to on-chain permissions:

| Role | Discord Role | NFT/Token | Multi-sig Access |
|------|-------------|-----------|------------------|
| Newcomer | @Newcomer | - | None |
| Participant | @Participant | Participation NFT | None |
| Member | @Member | Membership NFT | Viewer |
| Steward | @Steward | Stewardship NFT | Signer |
| Agent | @Agent | Agent Registration | Proposer |

### Agent Verification

Agents verified through:
1. Agent registration transaction
2. Commons consent for scope
3. On-chain role assignment
4. Discord role sync via bot

---

## Machine-Readable Metadata

For AI agent parsing, include structured metadata:

```yaml
---
id: [unique-identifier]
type: [role|group|asset|protocol|agreement|identity]
membrane: [0|1|2|3|all] (for roles)
requires: [[prerequisite-role]] (for roles)
governs: [[governed-item]] (for protocols)
triggers: [trigger-condition] (for protocols)
access_level: [viewer|contributor|proposer|signer] (for assets)
---
```
