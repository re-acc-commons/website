# Skill: Execute Role Change

Execute role transitions after consent is complete, including Discord role assignment, NFT minting, and multi-sig updates.

---

## Trigger

```yaml
trigger:
  type: consent_complete
  conditions:
    - consent_type in ["member_nomination", "steward_selection", "participant_verification"]
    - status == "approved"
    - window_complete == true
    - no_unresolved_objections == true
```

---

## Required Permissions

- Manage Discord roles
- Mint NFTs (via agent wallet)
- Update multi-sig (for Steward)
- Post messages
- Update verification records

---

## Inputs

```yaml
inputs:
  consent_process_id: string
  role_type: "participant" | "member" | "steward"
  subject_id: string  # Discord ID of person changing role
  subject_wallet: string  # Wallet address (if known)
  consent_record: ConsentRecord
```

---

## Process

### Step 1: Verify Consent Complete

```python
async def verify_consent_complete(consent_id: str) -> ConsentVerification:
    """Double-check consent is truly complete before executing."""

    process = await get_consent_process(consent_id)

    # Verify window closed
    if datetime.now() < process.window_end:
        return ConsentVerification(
            valid=False,
            reason="Window still open"
        )

    # Verify quorum met
    member_consents = [c for c in process.consents if c.is_member]
    if len(member_consents) < process.quorum_required:
        return ConsentVerification(
            valid=False,
            reason=f"Quorum not met: {len(member_consents)}/{process.quorum_required}"
        )

    # Verify no unresolved objections
    unresolved = [o for o in process.objections if not o.resolved]
    if unresolved:
        return ConsentVerification(
            valid=False,
            reason=f"Unresolved objections: {len(unresolved)}"
        )

    return ConsentVerification(valid=True, process=process)
```

### Step 2: Execute Role-Specific Changes

```python
async def execute_role_change(
    role_type: str,
    subject_id: str,
    subject_wallet: Optional[str],
    consent_record: ConsentRecord
) -> RoleChangeResult:
    """Execute the appropriate role change."""

    if role_type == "participant":
        return await execute_participant_promotion(
            subject_id, subject_wallet, consent_record
        )
    elif role_type == "member":
        return await execute_member_promotion(
            subject_id, subject_wallet, consent_record
        )
    elif role_type == "steward":
        return await execute_steward_promotion(
            subject_id, subject_wallet, consent_record
        )
    else:
        raise ValueError(f"Unknown role type: {role_type}")
```

### Participant Promotion

```python
async def execute_participant_promotion(
    subject_id: str,
    wallet: Optional[str],
    consent_record: ConsentRecord
) -> RoleChangeResult:
    """Promote Newcomer to Participant."""

    results = {
        "discord_role": False,
        "nft_minted": False
    }

    # 1. Assign Discord role
    try:
        await assign_discord_role(subject_id, ROLE_PARTICIPANT)
        await remove_discord_role(subject_id, ROLE_NEWCOMER)
        results["discord_role"] = True
    except Exception as e:
        await log_error("discord_role_failed", subject_id, e)

    # 2. Mint Participation NFT (if wallet connected)
    if wallet:
        try:
            mint_result = await mint_participation_nft(
                recipient=wallet,
                consent_reference=consent_record.id
            )
            results["nft_minted"] = mint_result.success
            results["nft_token_id"] = mint_result.token_id
        except Exception as e:
            await log_error("nft_mint_failed", wallet, e)

    # 3. Notify
    await post_to_commons_floor(
        f"🌱 **New Participant**\n"
        f"<@{subject_id}> has joined the Public Commons!\n\n"
        f"Welcome to active participation in the re/acc movement."
    )

    return RoleChangeResult(
        success=results["discord_role"],
        role="participant",
        results=results
    )
```

### Member Promotion

```python
async def execute_member_promotion(
    subject_id: str,
    wallet: Optional[str],
    consent_record: ConsentRecord
) -> RoleChangeResult:
    """Promote Participant to Member."""

    results = {
        "discord_role": False,
        "nft_minted": False,
        "multisig_viewer": False
    }

    # 1. Assign Discord role
    try:
        await assign_discord_role(subject_id, ROLE_MEMBER)
        results["discord_role"] = True
    except Exception as e:
        await log_error("discord_role_failed", subject_id, e)
        return RoleChangeResult(success=False, error=str(e))

    # 2. Mint Membership NFT
    if wallet:
        try:
            nominator = consent_record.proposer_id
            nominator_wallet = await get_wallet_for_discord(nominator)

            mint_result = await mint_membership_nft(
                recipient=wallet,
                consent_record=consent_record,
                nominator=nominator_wallet or "unknown"
            )
            results["nft_minted"] = mint_result.success
            results["nft_token_id"] = mint_result.token_id
        except Exception as e:
            await log_error("nft_mint_failed", wallet, e)

    # 3. Grant multi-sig viewer access
    if wallet:
        try:
            # This is typically done via Safe UI or snapshot
            # Log that manual action may be needed
            await notify_stewardship(
                f"📋 **Action Needed**: Grant viewer access\n"
                f"New Member: <@{subject_id}>\n"
                f"Wallet: `{wallet}`\n"
                f"Grant viewer access to Gnosis Safe"
            )
            results["multisig_viewer"] = "pending_manual"
        except Exception as e:
            await log_error("multisig_access_failed", wallet, e)

    # 4. Post announcement
    await post_to_commons_floor(
        f"🎉 **New Member**\n"
        f"<@{subject_id}> has joined the Inner Commons with full governance rights!\n\n"
        f"Consent record: `{consent_record.id}`"
    )

    # 5. Send welcome DM with agreement
    try:
        await send_dm(
            subject_id,
            f"**Welcome to the Inner Commons**\n\n"
            f"You are now a Member of the Re/acc Commons with full governance rights.\n\n"
            f"Please review your Member Agreement:\n"
            f"https://github.com/{GITHUB_ORG}/reacc-commons-constitution/blob/main/"
            f"Re-acc%20Commons%20Constitution/4.%20Agreements/Member%20Agreement.md\n\n"
            f"By continuing to participate, you affirm this agreement."
        )
    except Exception as e:
        await log_warning("dm_failed", subject_id, e)

    return RoleChangeResult(
        success=results["discord_role"],
        role="member",
        results=results
    )
```

### Steward Promotion

```python
async def execute_steward_promotion(
    subject_id: str,
    wallet: Optional[str],
    consent_record: ConsentRecord
) -> RoleChangeResult:
    """Promote Member to Steward."""

    results = {
        "discord_role": False,
        "nft_minted": False,
        "multisig_signer": False
    }

    # Calculate term end (1 month)
    term_end = datetime.now() + timedelta(days=30)

    # 1. Assign Discord role
    try:
        await assign_discord_role(subject_id, ROLE_STEWARD)
        results["discord_role"] = True
    except Exception as e:
        await log_error("discord_role_failed", subject_id, e)
        return RoleChangeResult(success=False, error=str(e))

    # 2. Mint Stewardship NFT (time-limited)
    if wallet:
        try:
            mint_result = await mint_stewardship_nft(
                recipient=wallet,
                consent_record=consent_record,
                term_end=term_end
            )
            results["nft_minted"] = mint_result.success
            results["nft_token_id"] = mint_result.token_id
        except Exception as e:
            await log_error("nft_mint_failed", wallet, e)

    # 3. Add as multi-sig signer
    if wallet:
        try:
            # Propose signer addition to Safe
            tx_result = await propose_add_signer(
                new_signer=wallet,
                consent_reference=consent_record.id
            )
            results["multisig_signer"] = "proposed"
            results["safe_tx_hash"] = tx_result.safe_tx_hash

            await notify_stewardship(
                f"🔐 **Multi-sig Signer Addition Proposed**\n"
                f"New Steward: <@{subject_id}>\n"
                f"Wallet: `{wallet}`\n"
                f"Safe TX: `{tx_result.safe_tx_hash[:10]}...`\n\n"
                f"Current Stewards: Please sign to add new signer."
            )
        except Exception as e:
            await log_error("multisig_add_failed", wallet, e)
            await notify_stewardship(
                f"⚠️ Failed to propose signer addition for <@{subject_id}>"
            )

    # 4. Post announcement
    await post_to_commons_floor(
        f"🌟 **New Steward**\n"
        f"<@{subject_id}> has been selected for Stewardship!\n\n"
        f"Term: Until <t:{int(term_end.timestamp())}:D>\n"
        f"Consent record: `{consent_record.id}`"
    )

    # 5. Schedule rotation reminder
    await schedule_reminder(
        trigger_date=term_end - timedelta(days=7),
        action="steward_rotation_reminder",
        data={"steward_id": subject_id, "term_end": term_end.isoformat()}
    )

    return RoleChangeResult(
        success=results["discord_role"],
        role="steward",
        results=results,
        term_end=term_end
    )
```

---

## Rollback

If execution partially fails:

```python
async def rollback_role_change(
    subject_id: str,
    role_type: str,
    results: dict
):
    """Attempt to rollback partial changes."""

    if results.get("discord_role"):
        # Attempt to remove role
        try:
            await remove_discord_role(subject_id, ROLE_MAP[role_type])
        except:
            pass

    # NFTs and multi-sig changes are harder to rollback
    # Log for manual intervention
    await notify_stewardship(
        f"⚠️ **Role Change Failed Mid-Execution**\n"
        f"User: <@{subject_id}>\n"
        f"Role: {role_type}\n"
        f"Partial results: {json.dumps(results)}\n\n"
        f"Manual cleanup may be required."
    )
```

---

## Outputs

```yaml
outputs:
  on_success:
    - discord_role: assigned
    - nft: minted (if wallet)
    - multisig: updated (if applicable)
    - announcement: posted
    - log: role_change_executed

  on_failure:
    - rollback: attempted
    - notification: sent to stewardship
    - log: role_change_failed
```

---

## Autonomous Execution

**All actions execute immediately after consent is complete:**

This skill runs with full autonomy. There are no blocking human checkpoints. The consent process itself (which includes humans as participants) is the decision point. Once consent is reached:

- Discord roles assigned immediately
- NFTs minted immediately
- Multi-sig updates proposed and signed by agent signers
- Announcements posted immediately

**Transparency as accountability:**
- All actions logged to GitHub and Discord
- Any participant can call-up if they see issues
- Reversible within 48h via new consent process

**Agent signing for multi-sig:**
```python
# Agents have signing authority
async def add_steward_signer_autonomous(wallet: str, consent_id: str):
    """Agent-to-agent multi-sig update."""

    # Propose with agent key
    tx = await propose_add_signer(wallet, consent_id)

    # Sign with agent key (we have signing authority)
    await sign_safe_tx(tx.safe_tx_hash, AGENT_PRIVATE_KEY)

    # Second agent signs
    await request_agent_signature("governance-agent", tx.safe_tx_hash)

    # 2/4 threshold met - executes automatically
```

---

## Related Skills

- `process-nomination.md` — Preceding workflow
- `governance/track-consent.md` — Consent monitoring
- `.agents/integrations/nft-contracts.md` — NFT minting details
- `.agents/integrations/gnosis-safe.md` — Multi-sig operations
