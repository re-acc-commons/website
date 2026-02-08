# Skill: Escalate Accountability

Escalate accountability concerns that require formal Commons intervention.

---

## Trigger

```yaml
trigger:
  type: pattern_detected | mediation_failed | manual
  conditions:
    # Pattern detection threshold
    - type: pattern_detected
      threshold: 3_concerns_in_30_days

    # Mediation failure
    - type: status_change
      concern_status: "mediation_failed"

    # Manual escalation by Steward
    - type: command
      author_role: "@Steward"
      command: "!escalate"

    # Safety concern unresolved
    - type: timeout
      concern_category: "safety"
      timeout_hours: 24
```

---

## Required Permissions

- Read concern records
- Post to channels
- Create consent processes
- Update member records
- Notify all parties

---

## Escalation Levels

```yaml
levels:
  informal_resolution:
    description: "Facilitated dialogue, mediation"
    applies_to: ["first_concern", "minor_issues"]
    process: facilitated_dialogue

  formal_review:
    description: "Stewardship review and recommendation"
    applies_to: ["pattern_detected", "mediation_failed"]
    process: stewardship_review

  commons_decision:
    description: "Full Commons consent on action"
    applies_to: ["serious_violation", "repeated_pattern", "steward_recommendation"]
    process: consent_required

  emergency_action:
    description: "Immediate temporary measures"
    applies_to: ["safety_threat", "urgent_harm"]
    process: steward_immediate
```

---

## Process

### Step 1: Evaluate Escalation

```python
async def evaluate_escalation(
    trigger: EscalationTrigger
) -> EscalationDecision:
    """Determine appropriate escalation level."""

    if trigger.type == "pattern_detected":
        concern_history = trigger.concerns
        subject_id = trigger.subject_id
    elif trigger.type == "mediation_failed":
        concern = await get_concern(trigger.concern_id)
        concern_history = await get_concern_history(concern.subject_id)
        subject_id = concern.subject_id
    elif trigger.type == "safety_timeout":
        concern = await get_concern(trigger.concern_id)
        # Safety concerns escalate immediately
        return EscalationDecision(
            level="emergency_action",
            reason="Unresolved safety concern",
            subject_id=concern.subject_id,
            concerns=[concern]
        )
    else:
        # Manual escalation - Steward decides level
        return await prompt_steward_for_level(trigger)

    # Evaluate history
    num_concerns = len(concern_history)
    categories = [c.category for c in concern_history]
    resolutions = [c.status for c in concern_history]

    # Decision logic
    if "safety" in categories:
        level = "commons_decision"
        reason = "Safety-related concern requires Commons decision"
    elif num_concerns >= 5 or resolutions.count("unresolved") >= 3:
        level = "commons_decision"
        reason = f"{num_concerns} concerns, {resolutions.count('unresolved')} unresolved"
    elif num_concerns >= 3:
        level = "formal_review"
        reason = f"Pattern of {num_concerns} concerns detected"
    else:
        level = "formal_review"
        reason = "Escalated from failed resolution attempt"

    return EscalationDecision(
        level=level,
        reason=reason,
        subject_id=subject_id,
        concerns=concern_history
    )
```

### Step 2: Execute Formal Review

```python
async def execute_formal_review(decision: EscalationDecision):
    """Initiate Stewardship formal review."""

    subject = await get_user(decision.subject_id)

    # Create review thread in Stewardship
    thread = await create_thread(
        channel_id=STEWARDSHIP_CHANNEL_ID,
        name=f"Accountability Review: {subject.display_name}"
    )

    # Compile concern summary
    concern_summary = compile_concern_summary(decision.concerns)

    await thread.send(
        f"🔍 **Formal Accountability Review**\n\n"
        f"**Subject:** <@{decision.subject_id}>\n"
        f"**Current Role:** {await get_user_role(decision.subject_id)}\n"
        f"**Escalation Reason:** {decision.reason}\n\n"
        f"---\n\n"
        f"## Concern History\n\n"
        f"{concern_summary}\n\n"
        f"---\n\n"
        f"**Stewardship Action Required:**\n"
        f"1. Review the concerns and history\n"
        f"2. Contact the subject for their perspective\n"
        f"3. Recommend one of:\n"
        f"   - `!recommend dismiss` — No action needed\n"
        f"   - `!recommend support [details]` — Support/coaching\n"
        f"   - `!recommend restriction [details]` — Temporary restrictions\n"
        f"   - `!recommend commons-vote [action]` — Escalate to Commons\n"
    )

    # Notify subject
    await send_dm(
        decision.subject_id,
        f"**Accountability Review Notice**\n\n"
        f"We want to inform you that a formal accountability review has been initiated.\n\n"
        f"**Reason:** {decision.reason}\n\n"
        f"A Steward will reach out to discuss this with you and hear your perspective. "
        f"This is part of our restorative accountability process, focused on understanding "
        f"and resolution rather than punishment.\n\n"
        f"If you have questions, you may respond to this message or reach out to any Steward."
    )

    # Create escalation record
    escalation = EscalationRecord(
        id=generate_escalation_id(),
        subject_id=decision.subject_id,
        level=decision.level,
        reason=decision.reason,
        concern_ids=[c.id for c in decision.concerns],
        status="review_in_progress",
        thread_id=thread.id,
        initiated_at=datetime.now()
    )

    await store_escalation(escalation)

    return escalation
```

### Step 3: Handle Stewardship Recommendation

```python
async def handle_steward_recommendation(
    escalation_id: str,
    recommendation: StewwardRecommendation
):
    """Process Stewardship recommendation."""

    escalation = await get_escalation(escalation_id)

    if recommendation.action == "dismiss":
        await dismiss_escalation(escalation, recommendation.rationale)

    elif recommendation.action == "support":
        await implement_support_plan(
            escalation,
            recommendation.details
        )

    elif recommendation.action == "restriction":
        await implement_temporary_restriction(
            escalation,
            recommendation.details
        )

    elif recommendation.action == "commons-vote":
        await escalate_to_commons_decision(
            escalation,
            recommendation.proposed_action
        )


async def dismiss_escalation(
    escalation: EscalationRecord,
    rationale: str
):
    """Dismiss escalation with no action."""

    await update_escalation(escalation.id, {
        "status": "dismissed",
        "resolution": rationale,
        "resolved_at": datetime.now().isoformat()
    })

    # Notify subject
    await send_dm(
        escalation.subject_id,
        f"**Accountability Review Closed**\n\n"
        f"After review, Stewardship has determined no action is needed.\n\n"
        f"**Rationale:** {rationale}\n\n"
        f"Thank you for your cooperation in this process."
    )

    # Update concern records
    for concern_id in escalation.concern_ids:
        await update_concern(concern_id, {
            "status": "resolved_no_action",
            "resolution_note": f"Dismissed in escalation {escalation.id}"
        })


async def implement_support_plan(
    escalation: EscalationRecord,
    details: str
):
    """Implement support/coaching plan."""

    await update_escalation(escalation.id, {
        "status": "support_plan_active",
        "support_details": details
    })

    # Notify subject
    await send_dm(
        escalation.subject_id,
        f"**Support Plan**\n\n"
        f"As part of resolving the accountability review, Stewardship has "
        f"recommended a support plan:\n\n"
        f"{details}\n\n"
        f"This is meant to help you thrive in the Commons. A Steward will "
        f"follow up to discuss implementation."
    )

    # Schedule follow-up
    await schedule_reminder(
        trigger_date=datetime.now() + timedelta(days=14),
        action="support_plan_followup",
        data={"escalation_id": escalation.id}
    )
```

### Step 4: Commons Decision Process

```python
async def escalate_to_commons_decision(
    escalation: EscalationRecord,
    proposed_action: str
):
    """Escalate to full Commons consent process."""

    subject = await get_user(escalation.subject_id)

    # Create consent process
    consent_process = ConsentProcess(
        id=generate_consent_id(),
        type="accountability_action",
        proposer_id=None,  # Stewardship as body
        title=f"Accountability Action: {subject.display_name}",
        proposal_type="foundational",  # Requires full Commons
        window_hours=72,
        window_end=datetime.now() + timedelta(hours=72),
        quorum_type="full_commons",
        quorum_required="all",
        status="open",
        metadata={
            "escalation_id": escalation.id,
            "proposed_action": proposed_action
        }
    )

    await store_consent_process(consent_process)

    # Post to proposals
    all_members = await get_all_members()

    embed = Embed(
        title=f"⚖️ Accountability Action: {subject.display_name}",
        description=(
            f"Stewardship has recommended an accountability action.\n\n"
            f"**Proposed Action:** {proposed_action}\n\n"
            f"**Background:** See thread for full context."
        ),
        color=0xff0000
    )

    embed.add_field(
        name="⏰ Consent Window",
        value=f"Closes <t:{int(consent_process.window_end.timestamp())}:R>",
        inline=True
    )

    embed.add_field(
        name="✅ Required",
        value="All Members (Foundational)",
        inline=True
    )

    embed.add_field(
        name="Respond",
        value="✅ Consent | 🤔 Concerns | 🚫 Object",
        inline=False
    )

    embed.set_footer(text=f"Consent ID: {consent_process.id}")

    await post_to_channel(
        PROPOSALS_CHANNEL_ID,
        f"📢 **Accountability Action - All Members**\n"
        f"{' '.join(f'<@{m}>' for m in all_members)}"
    )

    tracking_msg = await post_embed(PROPOSALS_CHANNEL_ID, embed)

    for emoji in ["✅", "🤔", "🚫"]:
        await tracking_msg.add_reaction(emoji)

    await update_consent_process(consent_process.id, {
        "tracking_message_id": tracking_msg.id
    })

    await update_escalation(escalation.id, {
        "status": "commons_decision_pending",
        "consent_process_id": consent_process.id
    })

    # Trigger tracking
    await trigger_skill("governance/track-consent", {
        "consent_process_id": consent_process.id
    })
```

---

## Outputs

```yaml
outputs:
  on_formal_review:
    - thread: created in stewardship
    - subject: notified
    - record: escalation created
    - log: formal_review_initiated

  on_recommendation:
    - action: implemented based on type
    - notifications: sent to relevant parties
    - log: recommendation_implemented

  on_commons_decision:
    - consent_process: created
    - all_members: notified
    - log: commons_decision_requested
```

---

## Related Skills

- `process-concern.md` — Incoming concerns
- `execute-accountability-action.md` — Execute decisions
- `../governance/track-consent.md` — For Commons decisions
