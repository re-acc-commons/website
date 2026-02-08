# Skill: Process Steward Rotation

Manage monthly Steward rotation including term expiration, nomination, and transition.

---

## Trigger

```yaml
trigger:
  type: scheduled
  conditions:
    - type: cron
      schedule: "0 0 1 * *"  # First day of each month
      action: check_term_expirations

    - type: reminder
      days_before_expiration: 7
      action: rotation_reminder
```

---

## Required Permissions

- Read Steward records
- Post to channels
- Initiate consent processes
- Schedule reminders
- Update role records

---

## Process

### Step 1: Check Term Expirations

```python
async def check_term_expirations() -> List[StewardTerm]:
    """Check for Stewards whose terms are expiring."""

    current_stewards = await get_users_with_role(ROLE_STEWARD)
    expiring = []

    for steward_id in current_stewards:
        term = await get_steward_term(steward_id)

        if not term:
            # Legacy steward without term record
            await log_warning("steward_no_term", steward_id)
            continue

        days_remaining = (term.end_date - datetime.now()).days

        if days_remaining <= 0:
            expiring.append(StewardTerm(
                steward_id=steward_id,
                end_date=term.end_date,
                status="expired"
            ))
        elif days_remaining <= 7:
            expiring.append(StewardTerm(
                steward_id=steward_id,
                end_date=term.end_date,
                status="expiring_soon",
                days_remaining=days_remaining
            ))

    return expiring
```

### Step 2: Send Rotation Reminders

```python
async def send_rotation_reminders(expiring: List[StewardTerm]):
    """Send reminders about upcoming rotation."""

    for term in expiring:
        if term.status == "expiring_soon":
            steward = await get_user(term.steward_id)

            # DM the expiring Steward
            await send_dm(
                term.steward_id,
                f"**Stewardship Term Ending Soon**\n\n"
                f"Your Stewardship term ends <t:{int(term.end_date.timestamp())}:R>.\n\n"
                f"**Options:**\n"
                f"1. **Step down** — Thank you for your service\n"
                f"2. **Stand for renewal** — The Commons will hold a consent process\n\n"
                f"Please let us know your preference by replying to this message, "
                f"or post in `#stewardship`.\n\n"
                f"If we don't hear from you, we'll assume you're stepping down gracefully."
            )

            # Notify Stewardship
            await post_to_channel(
                STEWARDSHIP_CHANNEL_ID,
                f"⏰ **Steward Rotation Reminder**\n\n"
                f"<@{term.steward_id}>'s term ends <t:{int(term.end_date.timestamp())}:R>.\n\n"
                f"Begin planning for transition or renewal."
            )
```

### Step 3: Process Expiration

```python
async def process_term_expiration(term: StewardTerm):
    """Process an expired Steward term."""

    steward = await get_user(term.steward_id)

    # Check if renewal was requested
    renewal_request = await get_renewal_request(term.steward_id)

    if renewal_request:
        await initiate_renewal_consent(term, renewal_request)
    else:
        await initiate_step_down(term)


async def initiate_renewal_consent(
    term: StewardTerm,
    request: RenewalRequest
):
    """Start consent process for Steward renewal."""

    # Create consent process
    consent_process = ConsentProcess(
        id=generate_consent_id(),
        type="steward_renewal",
        proposer_id=term.steward_id,  # Self-nomination for renewal
        subject_id=term.steward_id,
        title=f"Steward Renewal: {await get_user_name(term.steward_id)}",
        proposal_type="standard",
        window_hours=48,
        window_end=datetime.now() + timedelta(hours=48),
        quorum_type="standard",
        quorum_required=3,
        status="open"
    )

    await store_consent_process(consent_process)

    # Post to proposals
    steward = await get_user(term.steward_id)

    embed = Embed(
        title=f"🔄 Steward Renewal: {steward.display_name}",
        description=(
            f"<@{term.steward_id}> has served as Steward for the past term "
            f"and wishes to continue serving.\n\n"
            f"**Renewal Statement:**\n{request.statement}"
        ),
        color=0x5865F2
    )

    embed.add_field(
        name="⏰ Consent Window",
        value=f"Closes <t:{int(consent_process.window_end.timestamp())}:R>",
        inline=True
    )

    embed.add_field(
        name="✅ Required",
        value="3 Member consents",
        inline=True
    )

    embed.add_field(
        name="Respond",
        value="✅ Consent | 🤔 Concerns | 🚫 Object",
        inline=False
    )

    embed.set_footer(text=f"Consent ID: {consent_process.id}")

    tracking_msg = await post_embed(PROPOSALS_CHANNEL_ID, embed)

    for emoji in ["✅", "🤔", "🚫"]:
        await tracking_msg.add_reaction(emoji)

    await update_consent_process(consent_process.id, {
        "tracking_message_id": tracking_msg.id
    })

    await trigger_skill("governance/track-consent", {
        "consent_process_id": consent_process.id
    })


async def initiate_step_down(term: StewardTerm):
    """Process graceful Steward step-down."""

    steward = await get_user(term.steward_id)

    # Remove Steward role (keep Member)
    await remove_discord_role(term.steward_id, ROLE_STEWARD)

    # Update term record
    await update_steward_term(term.steward_id, {
        "status": "completed",
        "completed_at": datetime.now().isoformat()
    })

    # Remove from multi-sig (propose removal)
    wallet = await get_wallet_for_discord(term.steward_id)
    if wallet:
        is_signer = await is_safe_signer(wallet)
        if is_signer:
            await propose_remove_signer(
                signer=wallet,
                reason=f"Steward term completed: {term.steward_id}"
            )

            await post_to_channel(
                STEWARDSHIP_CHANNEL_ID,
                f"🔐 **Multi-sig Update Required**\n\n"
                f"<@{term.steward_id}> has completed their Steward term.\n"
                f"Signer removal proposed. Current Stewards please sign."
            )

    # Expire Stewardship NFT
    if wallet:
        nft_ids = await get_stewardship_nfts(wallet)
        for nft_id in nft_ids:
            await expire_nft(nft_id)

    # Announce
    await post_to_channel(
        COMMONS_FLOOR_CHANNEL_ID,
        f"🙏 **Thank You, Steward**\n\n"
        f"<@{term.steward_id}> has completed their Stewardship term.\n\n"
        f"Thank you for your service to the Commons!"
    )

    # Check minimum Steward count
    remaining_stewards = await get_users_with_role(ROLE_STEWARD)
    if len(remaining_stewards) < 2:
        await initiate_emergency_steward_call()
```

### Step 4: Handle Renewal Outcome

```python
async def handle_renewal_outcome(consent_record: ConsentRecord):
    """Handle outcome of Steward renewal consent."""

    process = consent_record.process

    if consent_record.outcome == "approved":
        # Extend term
        new_term_end = datetime.now() + timedelta(days=30)

        await update_steward_term(process.subject_id, {
            "end_date": new_term_end.isoformat(),
            "renewals": (await get_steward_term(process.subject_id)).renewals + 1
        })

        await post_to_channel(
            COMMONS_FLOOR_CHANNEL_ID,
            f"✅ **Steward Renewed**\n\n"
            f"<@{process.subject_id}> will continue serving as Steward.\n"
            f"New term ends <t:{int(new_term_end.timestamp())}:D>"
        )

    else:
        # Renewal not approved — step down
        await initiate_step_down(StewardTerm(
            steward_id=process.subject_id,
            end_date=datetime.now(),
            status="renewal_denied"
        ))


async def initiate_emergency_steward_call():
    """Call for new Steward nominations when below minimum."""

    all_members = await get_all_members()

    await post_to_channel(
        PROPOSALS_CHANNEL_ID,
        f"🚨 **Steward Nominations Needed**\n\n"
        f"{' '.join(f'<@{m}>' for m in all_members)}\n\n"
        f"The Commons has fewer than 2 active Stewards.\n"
        f"We need Members to step forward for Stewardship.\n\n"
        f"To nominate yourself or another Member, post a Steward nomination "
        f"proposal in this channel."
    )
```

---

## Outputs

```yaml
outputs:
  on_expiring_soon:
    - dm: sent to expiring Steward
    - notification: posted to Stewardship
    - log: rotation_reminder_sent

  on_renewal_requested:
    - consent_process: created
    - tracking: started
    - log: renewal_initiated

  on_step_down:
    - discord: role removed
    - multisig: removal proposed
    - nft: expired
    - announcement: posted
    - log: steward_stepped_down

  on_minimum_threshold:
    - alert: nomination call posted
    - log: emergency_steward_call
```

---

## Autonomous Execution

**All rotation actions execute without human gating.**

| Action | Autonomy |
|--------|----------|
| Term expiration check | Full autonomous (scheduled) |
| Reminder sending | Full autonomous |
| Renewal consent process | Agent-facilitated (humans participate) |
| Role removal on step-down | Full autonomous |
| Multi-sig signer removal | Agent-signed (autonomous) |
| NFT expiration | Full autonomous |
| New Steward call | Full autonomous |

**Multi-sig signer removal:**
```python
async def remove_steward_signer_autonomous(wallet: str, consent_id: str):
    """Agent-to-agent multi-sig signer removal."""

    tx = await propose_remove_signer(wallet, consent_id)
    await sign_safe_tx(tx.safe_tx_hash, TREASURY_AGENT_KEY)
    await request_agent_signature("governance-agent", tx.safe_tx_hash)
    # 2/4 threshold met - executes
```

**Human participation:**
- Stewards indicate renewal preference
- Humans participate in renewal consent
- Call-up if rotation causes issues

---

## Related Skills

- `execute-role-change.md` — For new Steward assignments
- `../governance/track-consent.md` — For renewal consent
- `../governance/finalize-decision.md` — For renewal outcome
