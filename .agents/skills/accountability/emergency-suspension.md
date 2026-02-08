# Skill: Emergency Suspension

Handle immediate harm situations requiring temporary suspension before full process.

---

## Trigger

```yaml
trigger:
  type: command | escalation
  conditions:
    - type: command
      command: "!emergency-suspend"
      author_role: "@Steward"

    - type: escalation
      concern_category: "safety"
      severity: "immediate_harm"

    - type: report
      channel: "#stewardship"
      contains: ["emergency", "suspend", "immediate", "harm"]
```

---

## Required Permissions

- Manage Discord roles
- Send DMs
- Post to channels
- Create accountability records
- Trigger ratification process

---

## Emergency Criteria

```yaml
justifications:
  - active_harassment: "Ongoing harassment of Commons members"
  - safety_threat: "Credible threat to member safety"
  - bad_faith_attack: "Active attempt to harm Commons infrastructure"
  - doxxing: "Sharing private information of members"
  - impersonation: "Impersonating Commons or members"

constraints:
  max_duration_before_ratification: 24_hours
  requires_ratification: true
  can_be_appealed: true
  reversible: true
```

---

## Process

### Step 1: Validate Emergency

```python
async def validate_emergency_suspension(
    invoker_id: str,
    subject_id: str,
    justification: str
) -> EmergencyValidation:
    """Validate emergency suspension request."""

    # Verify invoker is Steward
    if not await has_role(invoker_id, ROLE_STEWARD):
        return EmergencyValidation(
            valid=False,
            error="Only Stewards can invoke emergency suspension"
        )

    # Cannot suspend another Steward without second Steward
    if await has_role(subject_id, ROLE_STEWARD):
        return EmergencyValidation(
            valid=False,
            error="Steward suspension requires 2 Stewards. Use !emergency-suspend-steward"
        )

    # Validate justification
    valid_justifications = [
        "harassment", "safety", "threat", "doxxing",
        "impersonation", "attack", "harm"
    ]

    has_valid_justification = any(
        j in justification.lower() for j in valid_justifications
    )

    if not has_valid_justification:
        return EmergencyValidation(
            valid=False,
            error="Emergency suspension requires safety-related justification"
        )

    # Check if subject is even in Commons
    subject_roles = await get_user_roles(subject_id)
    if not any(role in subject_roles for role in COMMONS_ROLES):
        return EmergencyValidation(
            valid=False,
            error="Subject is not a Commons participant"
        )

    return EmergencyValidation(
        valid=True,
        invoker_id=invoker_id,
        subject_id=subject_id,
        justification=justification,
        subject_role=get_highest_role(subject_roles)
    )
```

### Step 2: Execute Immediate Suspension

```python
async def execute_emergency_suspension(
    validation: EmergencyValidation
) -> SuspensionResult:
    """Execute immediate suspension."""

    subject_id = validation.subject_id
    ratification_deadline = datetime.now() + timedelta(hours=24)

    # Store current state
    current_roles = await get_user_roles(subject_id)
    await store_emergency_suspension_state(subject_id, {
        "previous_roles": current_roles,
        "suspended_at": datetime.now().isoformat(),
        "invoker_id": validation.invoker_id,
        "justification": validation.justification,
        "ratification_deadline": ratification_deadline.isoformat()
    })

    # Remove all Commons roles
    for role in current_roles:
        if role in COMMONS_ROLES:
            await remove_discord_role(subject_id, role)

    # Apply emergency-suspended role
    await assign_discord_role(subject_id, ROLE_EMERGENCY_SUSPENDED)

    # Restrict channel access (role-based)
    # The ROLE_EMERGENCY_SUSPENDED should have minimal permissions

    # Create suspension record
    suspension = EmergencySuspensionRecord(
        id=generate_suspension_id(),
        subject_id=subject_id,
        invoker_id=validation.invoker_id,
        justification=validation.justification,
        suspended_at=datetime.now(),
        ratification_deadline=ratification_deadline,
        status="pending_ratification",
        previous_roles=current_roles
    )

    await store_emergency_suspension(suspension)

    return SuspensionResult(
        success=True,
        suspension_id=suspension.id,
        ratification_deadline=ratification_deadline
    )
```

### Step 3: Notify Parties

```python
async def notify_emergency_suspension(
    result: SuspensionResult,
    validation: EmergencyValidation
):
    """Notify all relevant parties."""

    subject = await get_user(validation.subject_id)
    invoker = await get_user(validation.invoker_id)

    # DM the suspended person
    await send_dm(
        validation.subject_id,
        f"**Emergency Suspension Notice**\n\n"
        f"You have been temporarily suspended from the Re/acc Commons "
        f"due to a reported emergency.\n\n"
        f"**Reason:** {validation.justification}\n"
        f"**Invoked by:** A Steward\n"
        f"**Duration:** Temporary, pending ratification\n\n"
        f"This suspension will be reviewed by Stewardship within 24 hours.\n"
        f"You may respond to this message if you wish to provide context.\n\n"
        f"If the suspension is not ratified, your access will be restored.\n\n"
        f"Suspension ID: `{result.suspension_id}`"
    )

    # Notify Stewardship
    stewards = await get_steward_ids()

    await post_to_channel(
        STEWARDSHIP_CHANNEL_ID,
        f"🚨 **EMERGENCY SUSPENSION INVOKED**\n\n"
        f"{' '.join(f'<@{s}>' for s in stewards)}\n\n"
        f"**Subject:** <@{validation.subject_id}>\n"
        f"**Invoked by:** <@{validation.invoker_id}>\n"
        f"**Justification:** {validation.justification}\n\n"
        f"**RATIFICATION REQUIRED** within 24 hours.\n"
        f"Deadline: <t:{int(result.ratification_deadline.timestamp())}:F>\n\n"
        f"To ratify: React ✅\n"
        f"To reverse: React ❌\n\n"
        f"If no ratification by deadline, suspension will be automatically lifted.\n\n"
        f"Suspension ID: `{result.suspension_id}`"
    )

    # Log in agent channel
    await post_to_channel(
        AGENT_COMMONS_CHANNEL_ID,
        f"[EMERGENCY] Suspension executed: {result.suspension_id}"
    )
```

### Step 4: Handle Ratification

```python
async def process_ratification(
    suspension_id: str,
    outcome: str,  # "ratified" or "reversed"
    ratifying_steward_id: str
):
    """Process Stewardship ratification of emergency suspension."""

    suspension = await get_emergency_suspension(suspension_id)

    if outcome == "ratified":
        await ratify_suspension(suspension, ratifying_steward_id)
    else:
        await reverse_suspension(suspension, ratifying_steward_id)


async def ratify_suspension(
    suspension: EmergencySuspensionRecord,
    ratifier_id: str
):
    """Ratify the emergency suspension and convert to formal process."""

    await update_emergency_suspension(suspension.id, {
        "status": "ratified",
        "ratified_by": ratifier_id,
        "ratified_at": datetime.now().isoformat()
    })

    # Notify subject
    await send_dm(
        suspension.subject_id,
        f"**Suspension Ratified**\n\n"
        f"Your emergency suspension has been ratified by Stewardship.\n\n"
        f"This will now proceed through the formal accountability process.\n"
        f"You will have opportunity to share your perspective.\n\n"
        f"Suspension ID: `{suspension.id}`"
    )

    # Create formal accountability escalation
    await trigger_skill("accountability/escalate-accountability", {
        "trigger_type": "emergency_suspension_ratified",
        "subject_id": suspension.subject_id,
        "suspension_id": suspension.id,
        "initial_justification": suspension.justification
    })

    await post_to_channel(
        STEWARDSHIP_CHANNEL_ID,
        f"✅ Emergency suspension `{suspension.id}` ratified.\n"
        f"Formal accountability process initiated."
    )


async def reverse_suspension(
    suspension: EmergencySuspensionRecord,
    reverser_id: str
):
    """Reverse the emergency suspension and restore access."""

    # Remove emergency-suspended role
    await remove_discord_role(suspension.subject_id, ROLE_EMERGENCY_SUSPENDED)

    # Restore previous roles
    for role in suspension.previous_roles:
        await assign_discord_role(suspension.subject_id, role)

    await update_emergency_suspension(suspension.id, {
        "status": "reversed",
        "reversed_by": reverser_id,
        "reversed_at": datetime.now().isoformat()
    })

    # Notify subject
    await send_dm(
        suspension.subject_id,
        f"**Suspension Reversed**\n\n"
        f"Your emergency suspension has been reviewed and reversed.\n"
        f"Your previous access has been restored.\n\n"
        f"We apologize for any inconvenience. If you have concerns about "
        f"this process, please reach out to Stewardship.\n\n"
        f"Suspension ID: `{suspension.id}`"
    )

    await post_to_channel(
        STEWARDSHIP_CHANNEL_ID,
        f"❌ Emergency suspension `{suspension.id}` reversed.\n"
        f"Member access restored."
    )
```

### Step 5: Handle Deadline

```python
async def check_ratification_deadline():
    """Scheduled check for unratified suspensions."""

    pending = await get_pending_emergency_suspensions()

    for suspension in pending:
        if datetime.now() > suspension.ratification_deadline:
            # Auto-reverse
            await reverse_suspension(
                suspension,
                reverser_id="SYSTEM:deadline_expired"
            )

            await post_to_channel(
                STEWARDSHIP_CHANNEL_ID,
                f"⚠️ Emergency suspension `{suspension.id}` expired without ratification.\n"
                f"Suspension has been automatically reversed.\n\n"
                f"Please ensure timely ratification of emergency actions."
            )
```

---

## Recording

```python
async def record_emergency_suspension(suspension: EmergencySuspensionRecord):
    """Create permanent record of emergency action."""

    record_content = f"""---
type: emergency_suspension
id: {suspension.id}
subject_id: {suspension.subject_id}
status: {suspension.status}
---

# Emergency Suspension: {suspension.id}

## Summary

| Field | Value |
|-------|-------|
| Subject | <@{suspension.subject_id}> |
| Invoked by | <@{suspension.invoker_id}> |
| Suspended | {suspension.suspended_at.isoformat()} |
| Status | {suspension.status} |

## Justification

{suspension.justification}

## Outcome

{format_outcome(suspension)}
"""

    await write_file(
        repo="reacc-commons-constitution",
        path=f"Records/Accountability/Emergency/{suspension.id}.md",
        content=record_content,
        message=f"Record emergency suspension: {suspension.id}"
    )
```

---

## Outputs

```yaml
outputs:
  on_valid_invocation:
    - roles: removed immediately
    - dm: sent to subject
    - stewardship: notified for ratification
    - record: created
    - log: emergency_suspension_invoked

  on_ratification:
    - status: updated
    - accountability: escalated
    - notifications: sent
    - log: suspension_ratified

  on_reversal:
    - roles: restored
    - dm: apology sent
    - stewardship: notified
    - log: suspension_reversed

  on_deadline_expired:
    - auto_reversal: executed
    - warning: sent to stewardship
    - log: suspension_expired
```

---

## Autonomy Note

**This skill executes immediately — it does not wait for human approval.**

The 24-hour ratification window is about **reversibility**, not permission:
- Action is taken immediately upon invocation
- Ratification confirms the action should stand
- Lack of ratification triggers automatic reversal
- This is "execute first, confirm later" — not "ask permission"

This enables agents to respond to genuine emergencies at machine speed while maintaining accountability through automatic reversal if the action isn't ratified.

---

## Related Skills

- `escalate-accountability.md` — Post-ratification process
- `execute-accountability-action.md` — Formal actions
- `process-concern.md` — Standard concern flow
