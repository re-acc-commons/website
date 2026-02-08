# Skill: Escalate Objection

Handle paramount objections raised during consent processes by facilitating resolution.

---

## Trigger

```yaml
trigger:
  type: reaction_add
  conditions:
    - message_id == consent_process.tracking_message_id
    - emoji == "🚫"
    - reactor_has_role: "@Member"  # Only Members can raise paramount objections
```

---

## Required Permissions

- Read consent processes
- Post to channels
- Create resolution threads
- Update consent state
- Notify involved parties

---

## Process

### Step 1: Capture Objection

```python
async def capture_objection(
    consent_id: str,
    objector_id: str
) -> Objection:
    """Record the objection and gather context."""

    process = await get_consent_process(consent_id)

    # Create objection record
    objection = Objection(
        id=generate_objection_id(),
        consent_process_id=consent_id,
        objector_id=objector_id,
        raised_at=datetime.now(),
        status="raised",
        reason=None,  # To be provided
        resolution=None
    )

    # Store objection
    await add_objection_to_process(consent_id, objection)

    # Request reason
    await send_dm(
        objector_id,
        f"You've raised a paramount objection to: **{process.title}**\n\n"
        f"Per the constitution, a paramount objection means you believe this "
        f"proposal would cause significant harm to the Commons.\n\n"
        f"Please reply with your specific concern so we can work toward resolution.\n\n"
        f"*Your response will be shared with the proposer and may be posted "
        f"to the resolution thread.*"
    )

    return objection
```

### Step 2: Create Resolution Thread

```python
async def create_resolution_thread(
    process: ConsentProcess,
    objection: Objection
) -> Thread:
    """Create a thread for objection resolution discussion."""

    objector = await get_user(objection.objector_id)
    proposer = await get_user(process.proposer_id)

    thread = await create_thread(
        channel_id=process.channel_id,
        parent_message_id=process.tracking_message_id,
        name=f"Objection: {process.title[:30]}..."
    )

    # Post opening message
    await thread.send(
        f"🚫 **Paramount Objection Raised**\n\n"
        f"<@{objection.objector_id}> has raised a paramount objection to this proposal.\n\n"
        f"**Proposer:** <@{process.proposer_id}>\n"
        f"**Objector:** <@{objection.objector_id}>\n\n"
        f"---\n\n"
        f"**Resolution Process:**\n"
        f"1. Objector provides specific concern\n"
        f"2. Proposer and objector discuss in good faith\n"
        f"3. Proposal may be modified, withdrawn, or objection may be resolved\n"
        f"4. Either party may request facilitation from Stewardship\n\n"
        f"*The consent window is paused until this objection is resolved.*"
    )

    # Update objection with thread ID
    await update_objection(objection.id, {
        "resolution_thread_id": thread.id
    })

    return thread
```

### Step 3: Monitor Resolution

```python
async def monitor_resolution(objection_id: str):
    """Monitor for resolution signals in the thread."""

    objection = await get_objection(objection_id)
    thread = await get_thread(objection.resolution_thread_id)

    # Watch for resolution signals
    resolution_triggers = [
        # Objector resolves
        (r"(?:I |objection )(?:withdraw|resolve|am satisfied)", "objector_resolved"),
        # Proposal modified
        (r"proposal (?:has been |is )(?:modified|updated)", "proposal_modified"),
        # Escalation requested
        (r"request(?:ing)? (?:steward|facilitation)", "escalation_requested"),
        # Impasse declared
        (r"impasse|cannot (?:resolve|reach agreement)", "impasse")
    ]

    async for message in thread.history():
        if message.author.id == objection.objector_id:
            for pattern, action in resolution_triggers:
                if re.search(pattern, message.content, re.IGNORECASE):
                    await handle_resolution_signal(objection, action, message)
                    return


async def handle_resolution_signal(
    objection: Objection,
    signal: str,
    message: Message
):
    """Handle resolution signal."""

    if signal == "objector_resolved":
        await resolve_objection(
            objection,
            resolution_type="withdrawn",
            resolution_note=message.content
        )

    elif signal == "proposal_modified":
        # Notify objector to confirm
        await message.reply(
            f"<@{objection.objector_id}> — The proposal has been modified. "
            f"Does this address your concern? "
            f"If so, please indicate that your objection is resolved."
        )

    elif signal == "escalation_requested":
        await escalate_to_stewardship(objection)

    elif signal == "impasse":
        await handle_impasse(objection)
```

### Step 4: Handle Escalation

```python
async def escalate_to_stewardship(objection: Objection):
    """Request Stewardship facilitation."""

    process = await get_consent_process(objection.consent_process_id)

    await update_objection(objection.id, {
        "status": "escalated",
        "escalated_at": datetime.now().isoformat()
    })

    # Notify Stewardship
    stewards = await get_steward_ids()

    await post_to_channel(
        STEWARDSHIP_CHANNEL_ID,
        f"🆘 **Facilitation Requested**\n\n"
        f"{' '.join(f'<@{s}>' for s in stewards)}\n\n"
        f"An objection resolution requires facilitation.\n\n"
        f"**Proposal:** {process.title}\n"
        f"**Proposer:** <@{process.proposer_id}>\n"
        f"**Objector:** <@{objection.objector_id}>\n\n"
        f"Thread: <#{objection.resolution_thread_id}>\n\n"
        f"Please join the thread to facilitate resolution."
    )

    # Post in thread
    thread = await get_thread(objection.resolution_thread_id)
    await thread.send(
        f"📣 **Stewardship has been notified.**\n\n"
        f"A Steward will join shortly to help facilitate resolution."
    )
```

### Step 5: Resolve Objection

```python
async def resolve_objection(
    objection: Objection,
    resolution_type: str,
    resolution_note: str
):
    """Mark objection as resolved and update consent process."""

    process = await get_consent_process(objection.consent_process_id)

    # Update objection
    await update_objection(objection.id, {
        "status": "resolved",
        "resolution_type": resolution_type,
        "resolution_note": resolution_note,
        "resolved_at": datetime.now().isoformat()
    })

    # Check if all objections resolved
    all_objections = await get_process_objections(process.id)
    unresolved = [o for o in all_objections if o.status != "resolved"]

    if not unresolved:
        # Resume consent process
        await resume_consent_window(process)

        await post_to_channel(
            process.channel_id,
            f"✅ **Objection Resolved**\n\n"
            f"All objections to `{process.title}` have been resolved.\n"
            f"The consent window has resumed.\n"
            f"Window closes <t:{int(process.window_end.timestamp())}:R>"
        )

    else:
        # Notify but process still blocked
        thread = await get_thread(objection.resolution_thread_id)
        await thread.send(
            f"✅ This objection has been resolved.\n\n"
            f"However, {len(unresolved)} other objection(s) remain unresolved."
        )


async def handle_impasse(objection: Objection):
    """Handle declaration of impasse."""

    process = await get_consent_process(objection.consent_process_id)

    await update_objection(objection.id, {
        "status": "impasse",
        "impasse_declared_at": datetime.now().isoformat()
    })

    # Per constitution, impasse options:
    # 1. Proposer withdraws
    # 2. Full Commons discussion
    # 3. Stewardship mediation

    thread = await get_thread(objection.resolution_thread_id)
    await thread.send(
        f"⚠️ **Impasse Declared**\n\n"
        f"The parties have been unable to reach resolution.\n\n"
        f"**Options per Constitution:**\n"
        f"1. <@{process.proposer_id}> may withdraw the proposal\n"
        f"2. Either party may request full Commons discussion\n"
        f"3. Stewardship may offer mediation\n\n"
        f"The proposal remains blocked until resolution."
    )

    # Notify Stewardship
    await post_to_channel(
        STEWARDSHIP_CHANNEL_ID,
        f"⚠️ **Impasse in Consent Process**\n\n"
        f"**Proposal:** {process.title}\n"
        f"**Status:** Impasse declared\n\n"
        f"Thread: <#{objection.resolution_thread_id}>"
    )
```

---

## Recording

```python
async def record_objection_history(objection: Objection):
    """Record objection and resolution for transparency."""

    process = await get_consent_process(objection.consent_process_id)

    record = f"""## Objection: {objection.id}

| Field | Value |
|-------|-------|
| Objector | <@{objection.objector_id}> |
| Raised | {objection.raised_at} |
| Status | {objection.status} |
| Resolution | {objection.resolution_type or 'N/A'} |

### Reason

{objection.reason or 'Not provided'}

### Resolution Note

{objection.resolution_note or 'N/A'}
"""

    # This gets embedded in the consent record via finalize-decision
    return record
```

---

## Outputs

```yaml
outputs:
  on_objection_raised:
    - dm: sent to objector for reason
    - thread: created for resolution
    - consent: window paused
    - tracking: embed updated
    - log: objection_raised

  on_escalation:
    - notification: sent to stewardship
    - thread: updated
    - log: objection_escalated

  on_resolution:
    - objection: marked resolved
    - consent: window resumed (if all resolved)
    - notification: posted
    - log: objection_resolved

  on_impasse:
    - notification: sent to stewardship
    - options: presented to parties
    - log: objection_impasse
```

---

## Related Skills

- `track-consent.md` — Triggers this skill
- `finalize-decision.md` — Includes objection history
- `../accountability/process-concern.md` — For pattern concerns
