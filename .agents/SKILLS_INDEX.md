# Re/acc Commons Skills Index

Complete index of agent skills for operationalizing the Commons Constitution.

---

## Overview

This index catalogs all skills available to agents operating within the Re/acc Commons. Each skill represents a discrete, automatable capability that agents can execute to support governance, coordination, and administration.

**Total Skills:** 27
**Domains:** 7

---

## Skills by Domain

### Membrane Crossing (5 skills)

Skills for managing role transitions and identity verification.

| Skill | Purpose | Trigger |
|-------|---------|---------|
| [`verify-introduction.md`](skills/membrane-crossing/verify-introduction.md) | Verify newcomer introductions in #threshold | Message in #threshold |
| [`verify-participation.md`](skills/membrane-crossing/verify-participation.md) | Assess participation patterns for Participant status | Scheduled + patterns |
| [`process-nomination.md`](skills/membrane-crossing/process-nomination.md) | Handle Member nominations | Nomination message |
| [`execute-role-change.md`](skills/membrane-crossing/execute-role-change.md) | Execute role transitions + NFT minting | Consent complete |
| [`process-steward-rotation.md`](skills/membrane-crossing/process-steward-rotation.md) | Monthly Steward rotation | Scheduled (monthly) |

**Flow:** Introduction → Participation → Nomination → Role Change

---

### Governance (5 skills)

Skills for managing consent processes and governance decisions.

| Skill | Purpose | Trigger |
|-------|---------|---------|
| [`process-proposal.md`](skills/governance/process-proposal.md) | Initialize proposal tracking | Proposal posted |
| [`track-consent.md`](skills/governance/track-consent.md) | Monitor consent state via reactions | Reaction add/remove |
| [`escalate-objection.md`](skills/governance/escalate-objection.md) | Handle paramount objections | 🚫 reaction |
| [`finalize-decision.md`](skills/governance/finalize-decision.md) | Close consent windows and execute | Window expires |
| [`process-amendment.md`](skills/governance/process-amendment.md) | Handle constitution PRs | GitHub PR created |

**Flow:** Proposal → Track → [Objection] → Finalize

---

### Treasury (6 skills)

Skills for managing Commons treasury operations, commitments, and bounties.

| Skill | Purpose | Trigger |
|-------|---------|---------|
| [`submit-transaction.md`](skills/treasury/submit-transaction.md) | Create Gnosis Safe transaction | Treasury consent approved |
| [`track-signatures.md`](skills/treasury/track-signatures.md) | Monitor signature collection | Scheduled + webhook |
| [`execute-disbursement.md`](skills/treasury/execute-disbursement.md) | Record completed transactions | Blockchain event |
| [`process-emergency.md`](skills/treasury/process-emergency.md) | Handle emergency treasury actions | Steward command |
| [`manage-commitment.md`](skills/treasury/manage-commitment.md) | Create and track staked commitments | Commitment request + scheduled |
| [`coordinate-bounty.md`](skills/treasury/coordinate-bounty.md) | Scout, claim, and distribute bounty rewards | Scheduled scan + team formation |

**Flow:** Submit → Track Signatures → Execute
**Commitment Flow:** Stake → Work → Validate → Resolve
**Bounty Flow:** Scout → Form Team → Execute → Distribute

---

### Knowledge Commons (3 skills)

Skills for managing shared knowledge and content.

| Skill | Purpose | Trigger |
|-------|---------|---------|
| [`index-content.md`](skills/knowledge-commons/index-content.md) | Index content for discoverability | GitHub push/merge |
| [`validate-schema.md`](skills/knowledge-commons/validate-schema.md) | Validate YAML frontmatter compliance | GitHub PR created |
| [`federation-sync.md`](skills/knowledge-commons/federation-sync.md) | Sync with federated networks | Scheduled + webhook |

**Flow:** Validate → Merge → Index → [Federate]

---

### Accountability (4 skills)

Skills for handling concerns and accountability processes.

| Skill | Purpose | Trigger |
|-------|---------|---------|
| [`process-concern.md`](skills/accountability/process-concern.md) | Log and route concerns | DM/reaction/command |
| [`escalate-accountability.md`](skills/accountability/escalate-accountability.md) | Escalate to formal review | Pattern/failure trigger |
| [`execute-accountability-action.md`](skills/accountability/execute-accountability-action.md) | Execute approved actions | Consent complete |
| [`emergency-suspension.md`](skills/accountability/emergency-suspension.md) | Handle immediate harm | Steward command |

**Flow:** Concern → [Escalate] → [Action]

---

### Federation (3 skills)

Skills for cross-network coordination.

| Skill | Purpose | Trigger |
|-------|---------|---------|
| [`verify-federation-agent.md`](skills/federation/verify-federation-agent.md) | Verify cross-network agents | Registration request |
| [`sync-trust-bridge.md`](skills/federation/sync-trust-bridge.md) | Maintain trust synchronization | Scheduled + webhook |
| [`route-cross-network.md`](skills/federation/route-cross-network.md) | Handle cross-network requests | API request |

**Flow:** Verify → Sync → Route

---

### Coordination (1 skill)

Skills for multi-agent swarm coordination.

| Skill | Purpose | Trigger |
|-------|---------|---------|
| [`form-swarm.md`](skills/coordination/form-swarm.md) | Initiate and coordinate multi-agent swarms | Task analysis + explicit request |

**Flow:** Detect Opportunity → Form Team → Distribute Tasks → Coordinate → Complete

---

## Autonomous Execution

**All execution skills run autonomously after consent is complete.**

There are no blocking human checkpoints. Humans participate in consent processes (alongside agents), but execution proceeds without waiting for additional human approval.

| Skill | Autonomy Level | Human Participation |
|-------|----------------|---------------------|
| `execute-role-change.md` | Full autonomous | Via consent process |
| `submit-transaction.md` | Full autonomous (agent signers) | Via consent process |
| `execute-disbursement.md` | Full autonomous | Via consent process |
| `process-amendment.md` | Full autonomous (agent merge) | Via consent process |
| `execute-accountability-action.md` | Full autonomous | Via consent process |
| `emergency-suspension.md` | Execute + 24h ratification | Ratification window |
| `process-emergency.md` | Expedited consent | 2 Steward consents |
| `manage-commitment.md` | Full autonomous | Validators vote on delivery |
| `coordinate-bounty.md` | Full autonomous | Team quick-consent |
| `form-swarm.md` | Full autonomous | Member self-selection |

### Transparency as Accountability

Since agents execute autonomously:
- All actions logged to GitHub and Discord
- Any participant can call-up post-execution
- Reversible actions can be amended via new consent
- Full attribution chain maintained

---

## Trigger Types

### Event-Based
- `message_created`: Discord message posted
- `reaction_add/remove`: Emoji reaction changed
- `github_pr_created`: Pull request opened
- `github_push`: Code pushed to repository
- `consent_complete`: Consent window closed with approval
- `blockchain_event`: On-chain transaction executed

### Scheduled
- `cron`: Time-based schedule (e.g., monthly rotation)
- `frequency`: Interval-based (e.g., every 5 minutes)
- `timeout`: Deadline-based (e.g., 24h ratification)

### Command-Based
- `command`: Explicit command (e.g., `!emergency-treasury`)
- `dm_received`: Direct message to agent

### Webhook
- `safe_transaction_service`: Gnosis Safe events
- `federation_partner`: Cross-network events

---

## Skill Dependencies

```
verify-introduction
    └─→ verify-participation
            └─→ process-nomination
                    └─→ track-consent
                            └─→ finalize-decision
                                    └─→ execute-role-change

process-proposal
    └─→ track-consent
            ├─→ escalate-objection
            └─→ finalize-decision
                    ├─→ execute-role-change
                    ├─→ submit-transaction
                    │       └─→ track-signatures
                    │               └─→ execute-disbursement
                    ├─→ process-amendment (merge)
                    └─→ execute-accountability-action

process-concern
    └─→ escalate-accountability
            └─→ track-consent (if Commons decision)
                    └─→ execute-accountability-action

manage-commitment
    └─→ validators vote
            └─→ resolve (refund or slash)
                    └─→ execute-disbursement (if slashed)

coordinate-bounty
    └─→ form-swarm (for complex bounties)
            └─→ execute work
                    └─→ distribute rewards

form-swarm
    └─→ distribute tasks
            └─→ coordinate execution
                    └─→ compile artifact
```

---

## Integration Requirements

Each skill relies on one or more integrations:

| Integration | Skills Using |
|-------------|--------------|
| Discord | All skills (notifications) |
| GitHub | Governance, Knowledge Commons, Federation |
| Gnosis Safe | Treasury, Commitments |
| NFT Contracts | Membrane Crossing |
| Identity/Wallet | Membrane Crossing, Treasury, Commitments |
| Federation APIs | Federation, Knowledge Commons |
| Commitment Pool Contract | Treasury (manage-commitment) |
| Bounty Platforms | Treasury (coordinate-bounty) |
| Semaphore Service | Coordination (form-swarm) |

See `.agents/integrations/` for detailed specifications.

---

## Adding New Skills

When creating a new skill:

1. **Choose the appropriate domain** based on the skill's purpose
2. **Follow the skill template** (see existing skills for structure)
3. **Define clear triggers** that agents can monitor
4. **Define autonomy level** (most skills execute fully autonomously after consent)
5. **Update this index** with the new skill
6. **Update AGENT_COORDINATION.md** trigger patterns
7. **Test the skill** in isolation before integration

### Skill Template Structure

```markdown
# Skill: [Name]

[Brief description]

---

## Trigger

```yaml
trigger:
  type: [event type]
  conditions:
    - [condition 1]
    - [condition 2]
```

---

## Required Permissions

- [Permission 1]
- [Permission 2]

---

## Process

### Step 1: [Description]

```python
async def step_function():
    # Implementation
```

[Additional steps...]

---

## Outputs

```yaml
outputs:
  on_success:
    - [output 1]
  on_failure:
    - [output 1]
```

---

## Autonomous Execution

[Describe autonomy level - most skills execute fully autonomously after consent]

---

## Related Skills

- [Related skill 1]
- [Related skill 2]
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024-01 | Initial skill set |
| 1.1 | 2026-02 | Added commitment pool, bounty coordination, swarm formation |

---

## Related Documents

- [[AGENT_COORDINATION]] — Central coordination hub
- [[0. Meta/Component Guide]] — Constitution structure
- `.agents/integrations/` — Platform integrations
