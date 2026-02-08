# Skill: Process Emergency Treasury Action

Handle emergency treasury actions that require expedited processing.

---

## Trigger

```yaml
trigger:
  type: command | message
  conditions:
    - type: command
      command: "!emergency-treasury"
      author_role: "@Steward"

    - type: message
      channel: "#stewardship"
      message_contains: ["emergency", "urgent", "treasury"]
      author_role: "@Steward"
```

---

## Required Permissions

- Read Steward status
- Create expedited consent process
- Propose Gnosis Safe transaction
- Post to channels
- Send DMs

---

## Emergency Criteria

```yaml
emergency_types:
  security_threat:
    description: "Funds at risk due to security issue"
    window_hours: 6
    min_steward_signatures: 2
    post_action_review: required

  time_sensitive:
    description: "Opportunity with hard deadline"
    window_hours: 24
    min_steward_signatures: 2
    post_action_review: optional

  operational_critical:
    description: "Essential service at risk"
    window_hours: 12
    min_steward_signatures: 2
    post_action_review: required
```

---

## Process

### Step 1: Validate Emergency Request

```python
async def validate_emergency_request(
    requester_id: str,
    content: str
) -> EmergencyValidation:
    """Validate emergency treasury request."""

    # Verify requester is Steward
    if not await has_role(requester_id, ROLE_STEWARD):
        return EmergencyValidation(
            valid=False,
            error="Only Stewards can initiate emergency treasury actions"
        )

    # Parse emergency details
    emergency_type = detect_emergency_type(content)
    amount = extract_amount(content)
    recipient = extract_address(content)
    purpose = extract_purpose(content)

    # Validate amount against emergency limits
    limits = EMERGENCY_LIMITS.get(emergency_type)
    if amount > limits["max_amount"]:
        return EmergencyValidation(
            valid=False,
            error=f"Amount exceeds emergency limit of {limits['max_amount']} for {emergency_type}"
        )

    # Check for recent emergency actions (prevent abuse)
    recent_emergencies = await get_recent_emergencies(days=30)
    if len(recent_emergencies) >= 3:
        return EmergencyValidation(
            valid=False,
            error="Maximum 3 emergency actions per 30 days. Consider regular proposal."
        )

    return EmergencyValidation(
        valid=True,
        emergency_type=emergency_type,
        amount=amount,
        recipient=recipient,
        purpose=purpose,
        window_hours=limits["window_hours"],
        required_signatures=limits["min_steward_signatures"]
    )
```

### Step 2: Create Expedited Consent

```python
async def create_expedited_consent(
    requester_id: str,
    validation: EmergencyValidation
) -> ConsentProcess:
    """Create expedited consent process for emergency."""

    window_end = datetime.now() + timedelta(hours=validation.window_hours)

    consent_process = ConsentProcess(
        id=generate_consent_id(),
        type="emergency_treasury",
        proposer_id=requester_id,
        title=f"🚨 Emergency: {validation.purpose[:50]}",
        proposal_type="emergency",
        window_hours=validation.window_hours,
        window_end=window_end,
        quorum_type="steward_only",  # Only Stewards consent for emergency
        quorum_required=validation.required_signatures,
        status="open",
        metadata={
            "emergency_type": validation.emergency_type,
            "amount": str(validation.amount),
            "recipient": validation.recipient,
            "purpose": validation.purpose
        }
    )

    await store_consent_process(consent_process)

    return consent_process
```

### Step 3: Notify Stewardship

```python
async def notify_stewards_emergency(
    consent: ConsentProcess,
    validation: EmergencyValidation
):
    """Immediately notify all Stewards."""

    stewards = await get_steward_ids()

    # DM all Stewards
    for steward_id in stewards:
        await send_dm(
            steward_id,
            f"🚨 **EMERGENCY TREASURY ACTION REQUESTED**\n\n"
            f"Requester: <@{consent.proposer_id}>\n"
            f"Type: {validation.emergency_type}\n"
            f"Amount: {format_amount(validation.amount)}\n"
            f"Recipient: `{validation.recipient[:10]}...{validation.recipient[-8:]}`\n"
            f"Purpose: {validation.purpose}\n\n"
            f"**Window:** {validation.window_hours} hours\n"
            f"**Required Consents:** {validation.required_signatures} Stewards\n\n"
            f"React in `#stewardship` to consent or object."
        )

    # Post to Stewardship with mentions
    mention_str = " ".join(f"<@{s}>" for s in stewards)

    embed = Embed(
        title=f"🚨 Emergency Treasury Action",
        description=validation.purpose,
        color=0xff0000
    )

    embed.add_field(
        name="Emergency Type",
        value=validation.emergency_type.replace("_", " ").title(),
        inline=True
    )

    embed.add_field(
        name="Amount",
        value=format_amount(validation.amount),
        inline=True
    )

    embed.add_field(
        name="Recipient",
        value=f"`{validation.recipient[:20]}...`",
        inline=True
    )

    embed.add_field(
        name="⏰ Expedited Window",
        value=f"Closes <t:{int(consent.window_end.timestamp())}:R>",
        inline=True
    )

    embed.add_field(
        name="Required",
        value=f"{validation.required_signatures} Steward consents",
        inline=True
    )

    embed.add_field(
        name="Respond",
        value="✅ Consent | 🚫 Object\n*Only Steward reactions count*",
        inline=False
    )

    embed.set_footer(text=f"Emergency Consent ID: {consent.id}")

    await post_to_channel(
        STEWARDSHIP_CHANNEL_ID,
        f"{mention_str}\n\n**URGENT RESPONSE REQUIRED**"
    )

    tracking_msg = await post_embed(STEWARDSHIP_CHANNEL_ID, embed)

    for emoji in ["✅", "🚫"]:
        await tracking_msg.add_reaction(emoji)

    await update_consent_process(consent.id, {
        "tracking_message_id": tracking_msg.id
    })

    # Trigger tracking
    await trigger_skill("governance/track-consent", {
        "consent_process_id": consent.id,
        "expedited": True
    })
```

### Step 4: Execute on Approval

```python
async def execute_emergency_transaction(
    consent_record: ConsentRecord
):
    """Execute emergency transaction immediately on approval."""

    process = consent_record.process
    metadata = process.metadata

    # Verify Steward-only consent
    steward_consents = [
        c for c in consent_record.consents
        if await has_role(c["user_id"], ROLE_STEWARD)
    ]

    if len(steward_consents) < process.quorum_required:
        raise InsufficientConsentError(
            f"Required {process.quorum_required} Steward consents, got {len(steward_consents)}"
        )

    # Submit transaction immediately
    await trigger_skill("treasury/submit-transaction", {
        "consent_process_id": process.id,
        "consent_record": consent_record.to_dict(),
        "expedited": True
    })

    # Schedule post-action review
    if EMERGENCY_TYPES[metadata["emergency_type"]]["post_action_review"] == "required":
        await schedule_action(
            trigger_date=datetime.now() + timedelta(days=7),
            action="emergency_review",
            data={
                "consent_id": consent_record.id,
                "emergency_type": metadata["emergency_type"]
            }
        )

    # Notify Members of emergency action taken
    await post_to_channel(
        COMMONS_FLOOR_CHANNEL_ID,
        f"🚨 **Emergency Treasury Action Executed**\n\n"
        f"Type: {metadata['emergency_type'].replace('_', ' ').title()}\n"
        f"Amount: {format_amount(int(metadata['amount']))}\n"
        f"Purpose: {metadata['purpose']}\n\n"
        f"This was approved by {len(steward_consents)} Stewards under "
        f"emergency protocol. A review will follow if required.\n\n"
        f"Consent ID: `{consent_record.id}`"
    )
```

### Step 5: Post-Action Review

```python
async def process_emergency_review(data: dict):
    """Conduct post-action review of emergency action."""

    consent_record = await get_consent_record(data["consent_id"])

    await post_to_channel(
        STEWARDSHIP_CHANNEL_ID,
        f"📋 **Post-Emergency Review Required**\n\n"
        f"An emergency treasury action from 7 days ago requires review.\n\n"
        f"**Consent ID:** `{data['consent_id']}`\n"
        f"**Type:** {data['emergency_type']}\n\n"
        f"Please discuss:\n"
        f"1. Was the emergency classification appropriate?\n"
        f"2. Was the outcome successful?\n"
        f"3. Are there process improvements to suggest?\n\n"
        f"Post your review notes in this thread. This is for learning, "
        f"not accountability."
    )

    # Create review thread
    await create_thread(
        channel_id=STEWARDSHIP_CHANNEL_ID,
        name=f"Review: Emergency {data['consent_id'][:8]}"
    )
```

---

## Abuse Prevention

```python
EMERGENCY_LIMITS = {
    "security_threat": {
        "window_hours": 6,
        "min_steward_signatures": 2,
        "max_amount": parse_eth("50"),
        "post_action_review": "required"
    },
    "time_sensitive": {
        "window_hours": 24,
        "min_steward_signatures": 2,
        "max_amount": parse_eth("20"),
        "post_action_review": "optional"
    },
    "operational_critical": {
        "window_hours": 12,
        "min_steward_signatures": 2,
        "max_amount": parse_eth("10"),
        "post_action_review": "required"
    }
}

# Rate limits
EMERGENCY_RATE_LIMITS = {
    "per_30_days": 3,
    "per_steward_per_30_days": 2
}
```

---

## Outputs

```yaml
outputs:
  on_valid_request:
    - consent: expedited process created
    - notifications: sent to all Stewards
    - tracking: started
    - log: emergency_requested

  on_approved:
    - transaction: submitted immediately
    - review: scheduled if required
    - announcement: posted
    - log: emergency_executed

  on_rejected:
    - notification: sent to requester
    - log: emergency_rejected

  on_invalid:
    - response: error message
    - log: emergency_invalid
```

---

## Related Skills

- `submit-transaction.md` — Transaction submission
- `track-signatures.md` — Signature monitoring
- `../governance/track-consent.md` — Expedited tracking
