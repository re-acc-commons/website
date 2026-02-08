# Skill: Execute Accountability Action

Execute approved accountability actions after Commons consent.

---

## Trigger

```yaml
trigger:
  type: consent_complete
  conditions:
    - consent_type == "accountability_action"
    - status == "approved"
    - window_complete == true
```

---

## Required Permissions

- Manage Discord roles
- Update member records
- Post to channels
- Send DMs
- Archive/update NFTs (if applicable)

---

## Action Types

```yaml
action_types:
  warning:
    description: "Formal warning on record"
    discord_action: none
    record_action: add_warning
    reversible: true

  probation:
    description: "Temporary reduced privileges"
    discord_action: apply_probation_role
    record_action: log_probation
    duration: configurable
    reversible: true

  suspension:
    description: "Temporary removal from Commons"
    discord_action: remove_all_roles
    record_action: log_suspension
    nft_action: pause
    duration: configurable
    reversible: true

  removal:
    description: "Permanent removal from Commons"
    discord_action: remove_and_ban
    record_action: log_removal
    nft_action: revoke
    reversible: false
```

---

## Process

### Step 1: Parse Action Details

```python
async def parse_action(consent_record: ConsentRecord) -> ActionDetails:
    """Parse action details from consent record."""

    metadata = consent_record.process.metadata
    escalation = await get_escalation(metadata["escalation_id"])

    # Parse proposed action
    action_str = metadata["proposed_action"]

    # Extract action type and parameters
    action_patterns = {
        "warning": r"warning",
        "probation": r"probation(?:\s+for\s+(\d+)\s+days?)?",
        "suspension": r"suspend(?:ed)?\s+for\s+(\d+)\s+days?",
        "removal": r"remov(?:e|al)|ban"
    }

    action_type = None
    duration_days = None

    for atype, pattern in action_patterns.items():
        match = re.search(pattern, action_str, re.IGNORECASE)
        if match:
            action_type = atype
            if match.groups() and match.group(1):
                duration_days = int(match.group(1))
            break

    if not action_type:
        raise ValueError(f"Could not parse action from: {action_str}")

    return ActionDetails(
        type=action_type,
        subject_id=escalation.subject_id,
        escalation_id=escalation.id,
        consent_id=consent_record.id,
        duration_days=duration_days,
        raw_action=action_str
    )
```

### Step 2: Execute Action

```python
async def execute_action(action: ActionDetails) -> ExecutionResult:
    """Execute the approved accountability action."""

    results = {
        "discord": False,
        "record": False,
        "nft": False,
        "notifications": False
    }

    subject = await get_user(action.subject_id)

    try:
        if action.type == "warning":
            results = await execute_warning(action, subject)

        elif action.type == "probation":
            results = await execute_probation(action, subject)

        elif action.type == "suspension":
            results = await execute_suspension(action, subject)

        elif action.type == "removal":
            results = await execute_removal(action, subject)

    except Exception as e:
        await handle_execution_failure(action, e)
        return ExecutionResult(success=False, error=str(e))

    return ExecutionResult(success=True, results=results)


async def execute_warning(
    action: ActionDetails,
    subject: User
) -> dict:
    """Execute formal warning."""

    results = {}

    # Record warning
    warning = {
        "type": "warning",
        "escalation_id": action.escalation_id,
        "consent_id": action.consent_id,
        "issued_at": datetime.now().isoformat(),
        "reason": action.raw_action
    }

    await add_member_record(action.subject_id, "warnings", warning)
    results["record"] = True

    # Notify subject
    await send_dm(
        action.subject_id,
        f"**Formal Warning**\n\n"
        f"The Commons has issued a formal warning based on the accountability review.\n\n"
        f"**Details:** {action.raw_action}\n\n"
        f"This warning is on your record. Future concerns may be viewed in this context.\n\n"
        f"If you'd like to discuss this or appeal, please reach out to Stewardship."
    )
    results["notifications"] = True

    return results


async def execute_probation(
    action: ActionDetails,
    subject: User
) -> dict:
    """Execute probation with reduced privileges."""

    results = {}

    duration = action.duration_days or 30
    end_date = datetime.now() + timedelta(days=duration)

    # Apply probation role (preserves access but limits certain actions)
    await assign_discord_role(action.subject_id, ROLE_PROBATION)
    results["discord"] = True

    # Record probation
    probation = {
        "type": "probation",
        "escalation_id": action.escalation_id,
        "consent_id": action.consent_id,
        "started_at": datetime.now().isoformat(),
        "ends_at": end_date.isoformat(),
        "reason": action.raw_action
    }

    await add_member_record(action.subject_id, "probations", probation)
    results["record"] = True

    # Notify subject
    await send_dm(
        action.subject_id,
        f"**Probation Period**\n\n"
        f"The Commons has placed you on probation for {duration} days.\n\n"
        f"**Period:** Until <t:{int(end_date.timestamp())}:D>\n"
        f"**Reason:** {action.raw_action}\n\n"
        f"During probation, you retain access but:\n"
        f"- Cannot propose governance items\n"
        f"- Cannot nominate others\n"
        f"- May have reduced platform permissions\n\n"
        f"At the end of this period, your full privileges will be restored "
        f"if no further concerns arise."
    )
    results["notifications"] = True

    # Schedule automatic removal
    await schedule_action(
        trigger_date=end_date,
        action="remove_probation",
        data={"subject_id": action.subject_id, "probation_id": probation["consent_id"]}
    )

    return results


async def execute_suspension(
    action: ActionDetails,
    subject: User
) -> dict:
    """Execute temporary suspension."""

    results = {}

    duration = action.duration_days or 30
    end_date = datetime.now() + timedelta(days=duration)

    # Store current roles for restoration
    current_roles = await get_user_roles(action.subject_id)
    await store_suspended_roles(action.subject_id, current_roles)

    # Remove all Commons roles
    for role in current_roles:
        if role in COMMONS_ROLES:
            await remove_discord_role(action.subject_id, role)

    # Apply suspended role
    await assign_discord_role(action.subject_id, ROLE_SUSPENDED)
    results["discord"] = True

    # Pause NFTs
    wallet = await get_wallet_for_discord(action.subject_id)
    if wallet:
        nft_ids = await get_member_nfts(wallet)
        for nft_id in nft_ids:
            await pause_nft(nft_id, reason="suspension", until=end_date)
        results["nft"] = True

    # Record suspension
    suspension = {
        "type": "suspension",
        "escalation_id": action.escalation_id,
        "consent_id": action.consent_id,
        "started_at": datetime.now().isoformat(),
        "ends_at": end_date.isoformat(),
        "reason": action.raw_action,
        "previous_roles": current_roles
    }

    await add_member_record(action.subject_id, "suspensions", suspension)
    results["record"] = True

    # Notify subject
    await send_dm(
        action.subject_id,
        f"**Suspension from Commons**\n\n"
        f"The Commons has suspended your participation for {duration} days.\n\n"
        f"**Period:** Until <t:{int(end_date.timestamp())}:D>\n"
        f"**Reason:** {action.raw_action}\n\n"
        f"During suspension:\n"
        f"- Your roles have been removed\n"
        f"- Your NFT privileges are paused\n"
        f"- You cannot participate in Commons activities\n\n"
        f"At the end of this period, your roles will be restored.\n\n"
        f"If you wish to appeal, you may contact Stewardship."
    )
    results["notifications"] = True

    # Schedule restoration
    await schedule_action(
        trigger_date=end_date,
        action="restore_from_suspension",
        data={
            "subject_id": action.subject_id,
            "suspension_consent_id": action.consent_id
        }
    )

    # Announce (anonymized if configured)
    await post_to_channel(
        COMMONS_FLOOR_CHANNEL_ID,
        f"📢 A member has been suspended from the Commons for {duration} days "
        f"following an accountability process.\n\n"
        f"Consent ID: `{action.consent_id}`"
    )

    return results


async def execute_removal(
    action: ActionDetails,
    subject: User
) -> dict:
    """Execute permanent removal from Commons."""

    results = {}

    # Remove all roles
    current_roles = await get_user_roles(action.subject_id)
    for role in current_roles:
        if role in COMMONS_ROLES:
            await remove_discord_role(action.subject_id, role)

    # Apply removed role (blocks re-entry)
    await assign_discord_role(action.subject_id, ROLE_REMOVED)
    results["discord"] = True

    # Revoke NFTs
    wallet = await get_wallet_for_discord(action.subject_id)
    if wallet:
        nft_ids = await get_member_nfts(wallet)
        for nft_id in nft_ids:
            await revoke_nft(nft_id, reason="removal")
        results["nft"] = True

    # Remove from multi-sig if signer
    if wallet:
        is_signer = await is_safe_signer(wallet)
        if is_signer:
            await propose_remove_signer(
                signer=wallet,
                reason=f"Removal: {action.consent_id}"
            )
            await notify_stewardship(
                f"⚠️ Removed member {subject.display_name} was a Safe signer. "
                f"Signer removal proposed."
            )

    # Record removal
    removal = {
        "type": "removal",
        "escalation_id": action.escalation_id,
        "consent_id": action.consent_id,
        "executed_at": datetime.now().isoformat(),
        "reason": action.raw_action,
        "previous_roles": current_roles
    }

    await add_member_record(action.subject_id, "removals", removal)
    results["record"] = True

    # Notify subject
    await send_dm(
        action.subject_id,
        f"**Removal from Commons**\n\n"
        f"The Commons has decided to remove your participation.\n\n"
        f"**Reason:** {action.raw_action}\n\n"
        f"Your roles and NFT privileges have been revoked.\n\n"
        f"This decision was made through the accountability process with "
        f"full Commons consent."
    )
    results["notifications"] = True

    # Public announcement
    await post_to_channel(
        COMMONS_FLOOR_CHANNEL_ID,
        f"📢 A member has been removed from the Commons following an "
        f"accountability process.\n\n"
        f"Consent ID: `{action.consent_id}`"
    )

    return results
```

### Step 3: Record and Log

```python
async def record_execution(
    action: ActionDetails,
    result: ExecutionResult
):
    """Create permanent record of action execution."""

    escalation = await get_escalation(action.escalation_id)

    record_content = f"""---
type: accountability_action
action: {action.type}
subject_id: {action.subject_id}
escalation_id: {action.escalation_id}
consent_id: {action.consent_id}
executed_at: {datetime.now().isoformat()}
---

# Accountability Action Record

## Action: {action.type.upper()}

**Subject:** {action.subject_id}
**Consent:** `{action.consent_id}`
**Executed:** {datetime.now().strftime('%Y-%m-%d %H:%M UTC')}

## Details

{action.raw_action}

## Execution Results

| Component | Status |
|-----------|--------|
| Discord | {'✅' if result.results.get('discord') else '❌'} |
| Record | {'✅' if result.results.get('record') else '❌'} |
| NFT | {'✅' if result.results.get('nft') else '❌' if 'nft' in result.results else 'N/A'} |
| Notifications | {'✅' if result.results.get('notifications') else '❌'} |

## Related

- Escalation: `{action.escalation_id}`
- Concerns: {', '.join(f'`{c}`' for c in escalation.concern_ids)}
"""

    await write_file(
        repo="reacc-commons-constitution",
        path=f"Records/Accountability/{action.consent_id}.md",
        content=record_content,
        message=f"Record accountability action: {action.type}"
    )

    # Update escalation
    await update_escalation(action.escalation_id, {
        "status": "resolved",
        "resolution": action.type,
        "resolved_at": datetime.now().isoformat()
    })

    # Log
    await log_action(
        "accountability_executed",
        action.consent_id,
        {
            "action": action.type,
            "subject_id": action.subject_id,
            "result": result.to_dict()
        }
    )
```

---

## Restoration Actions

```python
async def restore_from_suspension(data: dict):
    """Scheduled action to restore member after suspension ends."""

    subject_id = data["subject_id"]
    suspension_consent_id = data["suspension_consent_id"]

    # Get stored roles
    previous_roles = await get_suspended_roles(subject_id)

    # Remove suspended role
    await remove_discord_role(subject_id, ROLE_SUSPENDED)

    # Restore previous roles
    for role in previous_roles:
        await assign_discord_role(subject_id, role)

    # Unpause NFTs
    wallet = await get_wallet_for_discord(subject_id)
    if wallet:
        nft_ids = await get_member_nfts(wallet)
        for nft_id in nft_ids:
            await unpause_nft(nft_id)

    # Update record
    await update_suspension(suspension_consent_id, {
        "status": "completed",
        "restored_at": datetime.now().isoformat()
    })

    # Notify
    await send_dm(
        subject_id,
        f"**Suspension Period Complete**\n\n"
        f"Your suspension has ended and your Commons privileges have been restored.\n\n"
        f"Welcome back. We hope you'll continue to thrive in the Commons."
    )

    await log_action("suspension_restored", subject_id)
```

---

## Outputs

```yaml
outputs:
  on_warning:
    - record: warning added
    - notification: sent to subject
    - log: warning_issued

  on_probation:
    - discord: probation role applied
    - record: probation logged
    - notification: sent to subject
    - schedule: auto-removal
    - log: probation_started

  on_suspension:
    - discord: roles removed
    - nft: paused
    - record: suspension logged
    - notification: sent to subject
    - schedule: restoration
    - announcement: posted
    - log: suspension_started

  on_removal:
    - discord: roles removed, banned
    - nft: revoked
    - multisig: removal proposed if signer
    - record: removal logged
    - notification: sent to subject
    - announcement: posted
    - log: member_removed
```

---

## Autonomous Execution

**All actions execute immediately after consent is complete.**

Accountability actions are executed autonomously because:
1. Full Commons consent has been obtained (foundational decision)
2. The consent process included all participants (humans and agents)
3. No paramount objections remain unresolved

**Agent-executed actions:**
- Discord role changes (immediate)
- NFT revocation (immediate)
- Multi-sig signer removal (agent-signed proposal)
- Record updates (immediate)
- Notifications (immediate)

**Multi-sig removal (agent-signed):**
```python
async def remove_signer_autonomous(wallet: str, consent_id: str):
    """Agent-to-agent multi-sig signer removal."""

    # Propose removal
    tx = await propose_remove_signer(wallet, consent_id)

    # Sign with agent keys (2/4 threshold)
    await sign_safe_tx(tx.safe_tx_hash, TREASURY_AGENT_KEY)
    await request_agent_signature("governance-agent", tx.safe_tx_hash)

    # Execute when threshold met
    await execute_safe_tx(tx.safe_tx_hash)
```

**Transparency as accountability:**
- Full consent record linked to action
- All changes logged to GitHub
- Any participant can call-up within 48h
- Removal actions are reversible via new consent process

**Restoration is automatic:**
- Probation/suspension restoration scheduled at creation time
- Agent executes restoration autonomously when timer expires
- No human approval needed for scheduled reversals

---

## Related Skills

- `escalate-accountability.md` — Preceding escalation
- `process-concern.md` — Initial concerns
- `../governance/finalize-decision.md` — Triggers this skill
