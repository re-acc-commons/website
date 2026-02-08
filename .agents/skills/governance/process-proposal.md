# Skill: Process Proposal

Initialize tracking for a governance proposal posted in `#proposals`.

---

## Trigger

```yaml
trigger:
  type: message_created
  channel: "#proposals"
  conditions:
    - message_contains: "**Proposal:**"
    - OR message_contains: "## Proposal"
    - author_has_role: "@Participant" OR "@Member" OR "@Steward"
```

---

## Required Permissions

- Read/write `#proposals`
- Add reactions
- Send embeds
- Store proposal state

---

## Process

### Step 1: Parse Proposal

```python
async def parse_proposal(message: Message) -> ProposalData:
    """Extract proposal fields from message."""

    content = message.content

    fields = {}
    required = ["proposal", "type", "proposer", "summary", "consent_window"]

    # Extract fields
    for field in required:
        patterns = [
            rf"\*\*{field.replace('_', ' ').title()}:\*\*\s*(.+?)(?=\n\*\*|\n##|$)",
            rf"##\s*{field.replace('_', ' ').title()}\s*\n(.+?)(?=\n##|$)"
        ]
        for pattern in patterns:
            match = re.search(pattern, content, re.IGNORECASE | re.DOTALL)
            if match:
                fields[field] = match.group(1).strip()
                break

    # Parse type
    type_str = fields.get("type", "").lower()
    if "foundational" in type_str:
        proposal_type = "foundational"
        default_window = 72
    elif "coordination" in type_str or "cross-domain" in type_str:
        proposal_type = "coordination"
        default_window = 48
    else:
        proposal_type = "standard"
        default_window = 48

    # Parse window
    window_match = re.search(r"(\d+)\s*h", fields.get("consent_window", ""))
    window_hours = int(window_match.group(1)) if window_match else default_window

    return ProposalData(
        message_id=message.id,
        channel_id=message.channel.id,
        proposer_id=message.author.id,
        title=fields.get("proposal", "Untitled Proposal"),
        type=proposal_type,
        summary=fields.get("summary"),
        raw_content=content,
        window_hours=window_hours,
        window_end=message.created_at + timedelta(hours=window_hours),
        valid=all(fields.get(f) for f in ["proposal", "type", "proposer"])
    )
```

### Step 2: Validate & Initialize

```python
async def initialize_proposal_tracking(
    message: Message,
    proposal: ProposalData
) -> ConsentProcess:
    """Create consent tracking for proposal."""

    if not proposal.valid:
        await send_validation_feedback(message, proposal)
        return None

    # Determine quorum requirements
    if proposal.type == "foundational":
        quorum_type = "full_commons"
        quorum_required = "all_members"
    else:
        quorum_type = "standard"
        quorum_required = 3

    consent_process = ConsentProcess(
        id=generate_consent_id(),
        type="governance_proposal",
        proposal_message_id=message.id,
        proposer_id=proposal.proposer_id,
        title=proposal.title,
        proposal_type=proposal.type,
        window_hours=proposal.window_hours,
        window_end=proposal.window_end,
        quorum_type=quorum_type,
        quorum_required=quorum_required,
        status="open",
        consents=[],
        concerns=[],
        objections=[]
    )

    await store_consent_process(consent_process)

    return consent_process
```

### Step 3: Post Tracking Embed

```python
async def post_tracking_embed(
    channel: Channel,
    message: Message,
    consent: ConsentProcess
):
    """Post consent tracking embed."""

    # Determine if full commons notification needed
    if consent.quorum_type == "full_commons":
        all_members = await get_all_members()
        mention_str = " ".join(f"<@{m}>" for m in all_members[:20])
        if len(all_members) > 20:
            mention_str += f" (+{len(all_members) - 20} more)"

        await channel.send(
            f"📢 **Foundational Proposal - All Members Notified**\n{mention_str}"
        )

    embed = Embed(
        title=f"📋 {consent.title}",
        description=f"Type: **{consent.proposal_type.title()}**",
        color=0x5865F2
    )

    embed.add_field(
        name="⏰ Window",
        value=f"Closes <t:{int(consent.window_end.timestamp())}:R>",
        inline=True
    )

    embed.add_field(
        name="✅ Quorum",
        value=f"{'All Members' if consent.quorum_type == 'full_commons' else '3 Members'}",
        inline=True
    )

    embed.add_field(
        name="📊 Current Status",
        value="0 consents | 0 concerns | 0 objections",
        inline=True
    )

    embed.add_field(
        name="React to Respond",
        value=(
            "✅ Consent | 🤔 Concerns | ⏳ Need time | 🚫 Paramount objection"
        ),
        inline=False
    )

    embed.set_footer(text=f"Consent ID: {consent.id}")

    tracking_msg = await channel.send(embed=embed)

    # Add reactions
    for emoji in ["✅", "🤔", "⏳", "🚫"]:
        await tracking_msg.add_reaction(emoji)

    # Update consent process with tracking message ID
    await update_consent_process(consent.id, {
        "tracking_message_id": tracking_msg.id
    })

    # Reply to original
    await message.reply(
        f"Proposal tracked. Consent window closes <t:{int(consent.window_end.timestamp())}:R>"
    )

    # Trigger consent monitoring
    await trigger_skill("governance/track-consent", {
        "consent_process_id": consent.id
    })

    return tracking_msg
```

---

## Outputs

```yaml
outputs:
  on_valid:
    - create: consent_process
    - post: tracking_embed
    - reactions: added
    - trigger: track-consent
    - log: proposal_initialized

  on_invalid:
    - reply: validation_feedback
    - log: proposal_validation_failed
```

---

## Related Skills

- `track-consent.md` — Monitor consent state
- `escalate-objection.md` — Handle objections
- `finalize-decision.md` — Close window
