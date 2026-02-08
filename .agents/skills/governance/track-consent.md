# Skill: Track Consent

Monitor consent state for an active proposal and update status.

---

## Trigger

```yaml
trigger:
  type: reaction_add | reaction_remove
  conditions:
    - message_id == consent_process.tracking_message_id
    - emoji in ["✅", "🤔", "⏳", "🚫"]

  # Also scheduled check
  alternative_triggers:
    - type: scheduled
      frequency: every_5_minutes
      condition: has_open_consent_processes
```

---

## Process

### Step 1: Gather Current State

```python
async def gather_consent_state(consent_id: str) -> ConsentState:
    """Collect all reactions and determine current state."""

    process = await get_consent_process(consent_id)
    tracking_msg = await fetch_message(
        process.channel_id,
        process.tracking_message_id
    )

    consents = []
    concerns = []
    need_time = []
    objections = []

    for reaction in tracking_msg.reactions:
        emoji = str(reaction.emoji)
        users = [u async for u in reaction.users() if not u.bot]

        for user in users:
            user_data = {
                "user_id": user.id,
                "is_member": await has_role(user.id, ROLE_MEMBER),
                "timestamp": datetime.now()  # Approximate
            }

            if emoji == "✅":
                consents.append(user_data)
            elif emoji == "🤔":
                concerns.append(user_data)
            elif emoji == "⏳":
                need_time.append(user_data)
            elif emoji == "🚫":
                objections.append(user_data)

    # Count member consents
    member_consents = [c for c in consents if c["is_member"]]

    # Check quorum
    if process.quorum_type == "full_commons":
        all_members = await get_all_members()
        quorum_met = len(member_consents) == len(all_members)
    else:
        quorum_met = len(member_consents) >= process.quorum_required

    return ConsentState(
        consent_id=consent_id,
        consents=consents,
        concerns=concerns,
        need_time=need_time,
        objections=objections,
        member_consent_count=len(member_consents),
        quorum_met=quorum_met,
        has_objection=len(objections) > 0,
        window_open=datetime.now() < process.window_end
    )
```

### Step 2: Update Tracking Embed

```python
async def update_tracking_embed(
    process: ConsentProcess,
    state: ConsentState
):
    """Update the tracking embed with current state."""

    tracking_msg = await fetch_message(
        process.channel_id,
        process.tracking_message_id
    )

    # Build status string
    if state.has_objection:
        status_color = 0xff0000  # Red
        status_text = "🚫 **OBJECTION RAISED** - Resolution required"
    elif state.quorum_met and not state.window_open:
        status_color = 0x00ff00  # Green
        status_text = "✅ **APPROVED** - Quorum met, window closed"
    elif state.quorum_met:
        status_color = 0x00ff00  # Green
        status_text = "✅ Quorum met - Waiting for window to close"
    else:
        status_color = 0xffaa00  # Orange
        status_text = f"⏳ {state.member_consent_count}/{process.quorum_required} consents"

    embed = Embed(
        title=f"📋 {process.title}",
        description=f"Type: **{process.proposal_type.title()}**",
        color=status_color
    )

    embed.add_field(
        name="⏰ Window",
        value=(
            f"Closed <t:{int(process.window_end.timestamp())}:R>"
            if not state.window_open else
            f"Closes <t:{int(process.window_end.timestamp())}:R>"
        ),
        inline=True
    )

    embed.add_field(
        name="📊 Status",
        value=status_text,
        inline=True
    )

    embed.add_field(
        name="Responses",
        value=(
            f"✅ {len(state.consents)} | "
            f"🤔 {len(state.concerns)} | "
            f"⏳ {len(state.need_time)} | "
            f"🚫 {len(state.objections)}"
        ),
        inline=True
    )

    if state.concerns:
        embed.add_field(
            name="🤔 Members with Concerns",
            value=", ".join(f"<@{c['user_id']}>" for c in state.concerns if c['is_member']),
            inline=False
        )

    if state.objections:
        embed.add_field(
            name="🚫 Objections Raised By",
            value=", ".join(f"<@{o['user_id']}>" for o in state.objections),
            inline=False
        )

    embed.set_footer(text=f"Consent ID: {process.id}")

    await tracking_msg.edit(embed=embed)
```

### Step 3: Handle State Changes

```python
async def handle_state_change(
    process: ConsentProcess,
    state: ConsentState,
    previous_state: Optional[ConsentState]
):
    """React to significant state changes."""

    # New objection
    if state.has_objection and (
        not previous_state or not previous_state.has_objection
    ):
        await trigger_skill("governance/escalate-objection", {
            "consent_process_id": process.id,
            "objections": state.objections
        })

    # Quorum just met
    if state.quorum_met and (
        not previous_state or not previous_state.quorum_met
    ):
        await post_to_channel(
            process.channel_id,
            f"✅ **Quorum Met** for `{process.title}`\n"
            f"Window closes <t:{int(process.window_end.timestamp())}:R>"
        )

    # Window closed
    if not state.window_open and (
        not previous_state or previous_state.window_open
    ):
        await trigger_skill("governance/finalize-decision", {
            "consent_process_id": process.id,
            "final_state": state.to_dict()
        })

    # Store state
    await update_consent_process(process.id, {
        "current_state": state.to_dict()
    })
```

---

## Outputs

```yaml
outputs:
  on_state_change:
    - update: tracking_embed
    - trigger: appropriate_skill if needed
    - store: updated_state
    - log: consent_state_updated
```

---

## Participants in Consent

**Both humans and agents participate equally in consent processes.**

```yaml
consent_participants:
  humans:
    - All users with @Member role
    - Can consent, raise concerns, object
    - Reactions counted equally

  agents:
    - All registered governance agents
    - Can consent, raise concerns, object
    - Participation via agent messaging

quorum:
  standard: 3 consents (any mix of humans/agents)
  foundational: all registered participants
```

**Consent is not "human approval of agent proposal"**
Consent is collective decision-making where humans and agents participate on equal footing.

---

## Related Skills

- `process-proposal.md` — Initial setup
- `escalate-objection.md` — When objection raised
- `finalize-decision.md` — When window closes
