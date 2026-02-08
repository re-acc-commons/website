# Skill: Process Member Nomination

Process nomination of Participant for Member status through consent workflow.

---

## Trigger

```yaml
trigger:
  type: message_created
  channel: "#proposals"
  conditions:
    - message_contains: "nominate"
    - message_contains: "@"  # Mentions someone
    - author_has_role: "@Member"
```

---

## Required Permissions

- Read/write in `#proposals`
- Query user roles
- Add reactions
- Send embeds
- Track consent state

---

## Inputs

```yaml
inputs:
  nominator_id: string
  nominee_id: string  # Extracted from mention
  nomination_message: string
  message_id: string
```

---

## Process

### Step 1: Validate Nomination

```python
async def validate_nomination(
    nominator_id: str,
    nominee_id: str
) -> NominationValidation:
    """Validate that nomination meets requirements."""

    errors = []
    warnings = []

    # Check nominator is Member
    nominator_roles = await get_user_roles(nominator_id)
    if ROLE_MEMBER not in nominator_roles:
        errors.append("Nominator must be a Member")

    # Check nominee is Participant
    nominee_roles = await get_user_roles(nominee_id)
    if ROLE_PARTICIPANT not in nominee_roles:
        errors.append("Nominee must be a Participant")

    if ROLE_MEMBER in nominee_roles:
        errors.append("Nominee is already a Member")

    # Check nominee has been flagged as ready
    readiness = await get_participant_readiness(nominee_id)
    if not readiness or not readiness.ready:
        warnings.append(
            "Nominee has not been flagged as ready by pattern recognition. "
            "Nomination can proceed but may warrant discussion."
        )

    # Check no pending accountability process
    accountability = await check_accountability_status(nominee_id)
    if accountability and accountability.active:
        errors.append("Nominee has active accountability process")

    return NominationValidation(
        valid=len(errors) == 0,
        errors=errors,
        warnings=warnings,
        readiness=readiness
    )
```

### Step 2: Initialize Consent Tracking

```python
async def initialize_consent_process(
    message: Message,
    nominator_id: str,
    nominee_id: str,
    validation: NominationValidation
) -> ConsentProcess:
    """Set up consent tracking for nomination."""

    window_end = datetime.now() + timedelta(hours=48)

    consent_process = ConsentProcess(
        id=generate_consent_id(),
        type="member_nomination",
        proposal_message_id=message.id,
        proposer_id=nominator_id,
        subject_id=nominee_id,
        window_hours=48,
        window_end=window_end,
        quorum_type="standard",  # 3 members
        quorum_required=3,
        status="open",
        consents=[],
        objections=[]
    )

    await store_consent_process(consent_process)

    return consent_process
```

### Step 3: Post Consent Embed

```python
async def post_consent_embed(
    channel: Channel,
    nomination_message: Message,
    consent_process: ConsentProcess,
    validation: NominationValidation
):
    """Post the consent tracking embed."""

    nominee = await get_user(consent_process.subject_id)
    nominator = await get_user(consent_process.proposer_id)

    embed = Embed(
        title=f"🗳️ Member Nomination: {nominee.display_name}",
        description=(
            f"<@{nominator.id}> has nominated <@{nominee.id}> for Member status."
        ),
        color=0x5865F2
    )

    # Add readiness info if available
    if validation.readiness:
        embed.add_field(
            name="📊 Pattern Recognition",
            value=f"Score: {validation.readiness.score}/{validation.readiness.threshold}",
            inline=True
        )

    embed.add_field(
        name="⏰ Consent Window",
        value=f"Closes <t:{int(consent_process.window_end.timestamp())}:R>",
        inline=True
    )

    embed.add_field(
        name="✅ Required",
        value="3 Member consents + no paramount objections",
        inline=True
    )

    if validation.warnings:
        embed.add_field(
            name="⚠️ Notes",
            value="\n".join(f"• {w}" for w in validation.warnings),
            inline=False
        )

    embed.add_field(
        name="How to Respond",
        value=(
            "✅ — Consent\n"
            "🤔 — Concerns (want discussion)\n"
            "⏳ — Need more time\n"
            "🚫 — Paramount objection"
        ),
        inline=False
    )

    embed.set_footer(text=f"Consent ID: {consent_process.id}")

    consent_message = await channel.send(embed=embed)

    # Add reaction options
    for emoji in ["✅", "🤔", "⏳", "🚫"]:
        await consent_message.add_reaction(emoji)

    # Store consent message ID
    await update_consent_process(
        consent_process.id,
        {"consent_message_id": consent_message.id}
    )

    # Reply to original nomination
    await nomination_message.reply(
        f"Nomination received. Consent tracking started above. "
        f"Window closes <t:{int(consent_process.window_end.timestamp())}:R>"
    )

    return consent_message
```

### Step 4: Handle Errors

```python
async def handle_invalid_nomination(
    message: Message,
    validation: NominationValidation
):
    """Respond to invalid nomination."""

    embed = Embed(
        title="❌ Nomination Invalid",
        description="This nomination cannot proceed.",
        color=0xff0000
    )

    embed.add_field(
        name="Issues",
        value="\n".join(f"• {e}" for e in validation.errors),
        inline=False
    )

    await message.reply(embed=embed)
```

---

## Consent Monitoring

This skill initializes the consent process. The `track-consent.md` skill monitors ongoing consent.

```python
# Handoff to consent tracking
await trigger_skill(
    "governance/track-consent",
    {"consent_process_id": consent_process.id}
)
```

---

## Outputs

```yaml
outputs:
  on_valid_nomination:
    - create: consent_process record
    - post: consent_embed with reactions
    - reply: confirmation to nominator
    - trigger: track-consent skill
    - log: nomination_initiated

  on_invalid_nomination:
    - reply: error embed
    - log: nomination_rejected
```

---

## Autonomous Execution

**Fully autonomous:**
- Validation of roles
- Consent embed posting
- Reaction tracking
- Role change execution (after consent)

**Human participation (via consent process):**
- Members consent, object, or raise concerns
- Objection resolution through dialogue
- Agents and humans participate equally in governance

---

## Related Skills

- `governance/track-consent.md` — Monitor consent state
- `governance/escalate-objection.md` — Handle objections
- `execute-role-change.md` — Final role assignment
