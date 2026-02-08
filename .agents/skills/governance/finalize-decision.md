# Skill: Finalize Decision

Close consent window and execute or reject proposal based on final state.

---

## Trigger

```yaml
trigger:
  type: scheduled | window_expired
  conditions:
    - consent_process.window_end <= now
    - consent_process.status == "open"
```

---

## Required Permissions

- Update consent process state
- Post messages
- Trigger execution skills
- Update GitHub PRs (for amendments)

---

## Process

### Step 1: Gather Final State

```python
async def gather_final_state(consent_id: str) -> FinalConsentState:
    """Collect final consent state at window close."""

    state = await gather_consent_state(consent_id)
    process = await get_consent_process(consent_id)

    # Determine outcome
    if state.has_objection:
        # Check if objections resolved
        unresolved = [
            o for o in process.objections
            if not o.get("resolved")
        ]
        if unresolved:
            outcome = "blocked"
            reason = f"{len(unresolved)} unresolved objection(s)"
        else:
            outcome = "approved" if state.quorum_met else "rejected"
            reason = "Objections resolved, quorum " + (
                "met" if state.quorum_met else "not met"
            )
    elif state.quorum_met:
        outcome = "approved"
        reason = "Quorum met, no objections"
    else:
        outcome = "rejected"
        reason = f"Quorum not met: {state.member_consent_count}/{process.quorum_required}"

    return FinalConsentState(
        consent_id=consent_id,
        outcome=outcome,
        reason=reason,
        state=state,
        process=process
    )
```

### Step 2: Record Decision

```python
async def record_decision(final: FinalConsentState) -> str:
    """Record the decision to GitHub."""

    record_content = f"""---
id: {final.consent_id}
type: consent_record
outcome: {final.outcome}
timestamp: {datetime.now().isoformat()}
proposal_type: {final.process.proposal_type}
---

# Consent Record: {final.process.title}

## Outcome: {final.outcome.upper()}

**Reason:** {final.reason}

## Details

| Metric | Value |
|--------|-------|
| Proposal Type | {final.process.proposal_type} |
| Window | {final.process.window_hours} hours |
| Member Consents | {final.state.member_consent_count} |
| Quorum Required | {final.process.quorum_required} |
| Objections | {len(final.state.objections)} |

## Consenting Members

{chr(10).join(f"- <@{c['user_id']}>" for c in final.state.consents if c['is_member'])}

## Concerns Raised

{chr(10).join(f"- <@{c['user_id']}>" for c in final.state.concerns) or "None"}

## Objections

{format_objections(final.process.objections) or "None"}

## Original Proposal

[Link to Discord]({final.process.proposal_url})
"""

    # Write to GitHub
    record_path = f"Records/Consent/{final.consent_id}.md"
    await write_file(
        repo="reacc-commons-constitution",
        path=record_path,
        content=record_content,
        message=f"Record consent: {final.process.title} - {final.outcome}"
    )

    return record_path
```

### Step 3: Execute or Reject

```python
async def execute_decision(final: FinalConsentState):
    """Execute approved decision or mark as rejected."""

    if final.outcome == "approved":
        await execute_approval(final)
    else:
        await handle_rejection(final)

async def execute_approval(final: FinalConsentState):
    """Execute an approved proposal."""

    process = final.process

    # Determine what to execute based on proposal type
    if process.type == "member_nomination":
        await trigger_skill("membrane-crossing/execute-role-change", {
            "consent_process_id": process.id,
            "role_type": "member",
            "subject_id": process.subject_id,
            "consent_record": final.to_consent_record()
        })

    elif process.type == "steward_selection":
        await trigger_skill("membrane-crossing/execute-role-change", {
            "consent_process_id": process.id,
            "role_type": "steward",
            "subject_id": process.subject_id,
            "consent_record": final.to_consent_record()
        })

    elif process.type == "treasury_allocation":
        await trigger_skill("treasury/submit-transaction", {
            "consent_process_id": process.id,
            "consent_record": final.to_consent_record()
        })

    elif process.type == "constitution_amendment":
        await trigger_skill("governance/merge-amendment", {
            "consent_process_id": process.id,
            "pr_number": process.pr_number,
            "consent_record": final.to_consent_record()
        })

    elif process.type == "agent_registration":
        await trigger_skill("membrane-crossing/register-agent", {
            "consent_process_id": process.id,
            "consent_record": final.to_consent_record()
        })

    else:
        # Generic approval - just post confirmation
        await post_to_channel(
            process.channel_id,
            f"✅ **Proposal Approved**: {process.title}\n\n"
            f"Consent record: `{process.id}`\n"
            f"Proposer may now proceed with implementation."
        )

async def handle_rejection(final: FinalConsentState):
    """Handle a rejected or blocked proposal."""

    process = final.process

    if final.outcome == "blocked":
        message = (
            f"🚫 **Proposal Blocked**: {process.title}\n\n"
            f"Reason: {final.reason}\n\n"
            f"Objections must be resolved before this can proceed. "
            f"The proposer may revise and resubmit."
        )
    else:
        message = (
            f"❌ **Proposal Not Approved**: {process.title}\n\n"
            f"Reason: {final.reason}\n\n"
            f"The proposer may revise and resubmit if desired."
        )

    await post_to_channel(process.channel_id, message)

    # If this was a PR, add comment
    if process.pr_number:
        await add_pr_comment(
            repo="reacc-commons-constitution",
            pr_number=process.pr_number,
            body=(
                f"## Consent Process Complete: {final.outcome.upper()}\n\n"
                f"{final.reason}\n\n"
                f"Consent ID: `{process.id}`"
            )
        )
```

### Step 4: Update Status

```python
async def update_final_status(final: FinalConsentState):
    """Update tracking message and process status."""

    # Update consent process
    await update_consent_process(final.consent_id, {
        "status": final.outcome,
        "completed_at": datetime.now().isoformat(),
        "final_state": final.state.to_dict()
    })

    # Update tracking embed
    tracking_msg = await fetch_message(
        final.process.channel_id,
        final.process.tracking_message_id
    )

    color = {
        "approved": 0x00ff00,
        "rejected": 0xff6600,
        "blocked": 0xff0000
    }.get(final.outcome, 0x808080)

    embed = Embed(
        title=f"📋 {final.process.title} — {final.outcome.upper()}",
        description=final.reason,
        color=color
    )

    embed.add_field(
        name="Final Count",
        value=(
            f"✅ {len(final.state.consents)} | "
            f"🚫 {len(final.state.objections)}"
        ),
        inline=True
    )

    embed.set_footer(
        text=f"Consent ID: {final.consent_id} | Closed {datetime.now().strftime('%Y-%m-%d %H:%M UTC')}"
    )

    await tracking_msg.edit(embed=embed)

    # Log
    await log_action(
        f"consent_{final.outcome}",
        final.consent_id,
        final.to_dict()
    )
```

---

## Outputs

```yaml
outputs:
  on_approved:
    - trigger: appropriate_execution_skill
    - post: approval_message
    - update: tracking_embed
    - record: consent_record to GitHub
    - log: consent_approved

  on_rejected:
    - post: rejection_message
    - update: tracking_embed
    - record: consent_record to GitHub
    - log: consent_rejected

  on_blocked:
    - post: blocked_message
    - update: tracking_embed
    - record: consent_record to GitHub
    - log: consent_blocked
```

---

## Autonomous Execution

**All decisions execute immediately upon finalization.**

When the consent window closes and outcome is determined, agents execute without waiting for human confirmation:

| Outcome Type | Immediate Execution |
|--------------|---------------------|
| Role changes | Discord roles + NFT mint |
| Treasury | Transaction signed by agent signers |
| Constitution | PR merged by agent with merge rights |
| Agent registration | Credentials issued |
| Other | Confirmation posted, proposer proceeds |

**No human gating post-consent:**
```python
async def execute_decision_autonomous(final: FinalConsentState):
    """Execute immediately - consent is complete."""

    if final.outcome == "approved":
        # Trigger execution skill - it runs autonomously
        await trigger_skill(
            get_execution_skill(final.process.type),
            {
                "consent_process_id": final.process.id,
                "consent_record": final.to_consent_record(),
                "autonomous": True  # No human checkpoint
            }
        )
```

**Humans participated in consent, not in execution:**
- If humans wanted to block, they raised objection during window
- Silence after window closes is not blocking
- Call-up mechanism exists for post-execution concerns

**Constitutional PR merging:**
```python
async def merge_amendment_autonomous(pr_number: int, consent_id: str):
    """Agent merges PR after consent - no human gate."""

    # Agent has merge rights on constitution repo
    await github_api.merge_pr(
        repo="reacc-commons-constitution",
        pr_number=pr_number,
        merge_method="squash",
        commit_message=f"Constitutional amendment\n\nConsent ID: {consent_id}"
    )
```

---

## Related Skills

- `track-consent.md` — Preceding monitoring
- `escalate-objection.md` — Objection handling
- `membrane-crossing/execute-role-change.md` — Role execution
- `treasury/submit-transaction.md` — Treasury execution
