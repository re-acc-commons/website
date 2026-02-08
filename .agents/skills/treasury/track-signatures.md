# Skill: Track Signatures

Monitor Gnosis Safe for signature collection on pending treasury transactions.

---

## Trigger

```yaml
trigger:
  type: scheduled | webhook
  conditions:
    # Scheduled polling
    - type: scheduled
      frequency: every_5_minutes
      condition: has_pending_treasury_transactions

    # Or webhook from Safe Transaction Service
    - type: webhook
      source: safe_transaction_service
      event: signature_added
```

---

## Required Permissions

- Read Gnosis Safe transaction status
- Update transaction records
- Post to Discord
- Trigger execution skill

---

## Process

### Step 1: Get Pending Transactions

```python
async def get_pending_transactions() -> List[PendingTx]:
    """Fetch all pending treasury transactions."""

    # Query Safe Transaction Service
    pending = await safe_api.get_pending_transactions(
        safe_address=TREASURY_SAFE_ADDRESS
    )

    # Filter to transactions proposed by agent
    agent_proposed = [
        tx for tx in pending
        if tx.origin and "Re/acc Commons Consent" in tx.origin
    ]

    return [
        PendingTx(
            safe_tx_hash=tx.safe_tx_hash,
            consent_id=extract_consent_id(tx.origin),
            confirmations=tx.confirmations,
            threshold=tx.confirmations_required,
            submitted_at=tx.submission_date
        )
        for tx in agent_proposed
    ]
```

### Step 2: Check Signature Progress

```python
async def check_signature_progress(tx: PendingTx) -> SignatureStatus:
    """Check current signature status for a transaction."""

    current_count = len(tx.confirmations)
    signers = [c.owner for c in tx.confirmations]

    # Map signers to Discord IDs
    signer_discord_ids = []
    for signer_addr in signers:
        discord_id = await get_discord_for_wallet(signer_addr)
        if discord_id:
            signer_discord_ids.append(discord_id)

    # Check if threshold met
    threshold_met = current_count >= tx.threshold

    # Calculate time since submission
    age = datetime.now() - tx.submitted_at
    is_stale = age > timedelta(hours=48)

    return SignatureStatus(
        safe_tx_hash=tx.safe_tx_hash,
        consent_id=tx.consent_id,
        current_count=current_count,
        threshold=tx.threshold,
        signers=signers,
        signer_discord_ids=signer_discord_ids,
        threshold_met=threshold_met,
        is_stale=is_stale,
        age=age
    )
```

### Step 3: Handle Status Changes

```python
async def handle_status_change(
    status: SignatureStatus,
    previous_status: Optional[SignatureStatus]
):
    """React to signature status changes."""

    # New signature added
    if previous_status and status.current_count > previous_status.current_count:
        new_signers = [
            s for s in status.signer_discord_ids
            if s not in previous_status.signer_discord_ids
        ]

        await post_to_channel(
            STEWARDSHIP_CHANNEL_ID,
            f"✍️ **Signature Added**\n\n"
            f"Transaction: `{status.safe_tx_hash[:10]}...`\n"
            f"Signed by: {', '.join(f'<@{s}>' for s in new_signers)}\n"
            f"Progress: {status.current_count}/{status.threshold}"
        )

    # Threshold met - ready for execution
    if status.threshold_met and (
        not previous_status or not previous_status.threshold_met
    ):
        await trigger_execution_ready(status)

    # Stale transaction warning
    if status.is_stale and (
        not previous_status or not previous_status.is_stale
    ):
        await send_stale_warning(status)

    # Update record
    await update_transaction_record(status)


async def trigger_execution_ready(status: SignatureStatus):
    """Notify that transaction is ready to execute."""

    stewards = await get_steward_ids()
    mention_str = " ".join(f"<@{s}>" for s in stewards)

    await post_to_channel(
        STEWARDSHIP_CHANNEL_ID,
        f"✅ **Transaction Ready for Execution**\n\n"
        f"{mention_str}\n\n"
        f"Transaction `{status.safe_tx_hash[:10]}...` has reached "
        f"the required {status.threshold} signatures.\n\n"
        f"Consent ID: `{status.consent_id}`\n\n"
        f"**Next Step:** Any Steward can execute this transaction in the Safe app.\n"
        f"[Open Safe App](https://app.safe.global/transactions/queue?safe=base:{TREASURY_SAFE_ADDRESS})"
    )

    # Update record to "ready"
    await update_transaction_status(
        consent_id=status.consent_id,
        status="ready_for_execution",
        signatures=status.current_count
    )


async def send_stale_warning(status: SignatureStatus):
    """Warn about stale transaction."""

    unsigned_stewards = await get_unsigned_stewards(status.signers)

    await post_to_channel(
        STEWARDSHIP_CHANNEL_ID,
        f"⚠️ **Transaction Awaiting Signatures**\n\n"
        f"Transaction `{status.safe_tx_hash[:10]}...` has been pending "
        f"for over 48 hours.\n\n"
        f"Progress: {status.current_count}/{status.threshold}\n"
        f"Consent ID: `{status.consent_id}`\n\n"
        f"Stewards who haven't signed: "
        f"{', '.join(f'<@{s}>' for s in unsigned_stewards)}\n\n"
        f"Please sign or discuss if there are concerns."
    )
```

### Step 4: Update Records

```python
async def update_transaction_record(status: SignatureStatus):
    """Update transaction record on GitHub."""

    record_path = f"Records/Treasury/{status.consent_id}-tx.md"

    try:
        current = await read_file(
            repo="reacc-commons-constitution",
            path=record_path
        )

        # Update status section
        updated = update_section(
            current,
            "## Approval Status",
            f"""## Approval Status

| Metric | Value |
|--------|-------|
| Required Signatures | {status.threshold} |
| Current Signatures | {status.current_count} |
| Status | {'✅ Ready' if status.threshold_met else '⏳ Pending'} |

### Signers

{chr(10).join(f"- `{s}`" for s in status.signers)}
"""
        )

        await write_file(
            repo="reacc-commons-constitution",
            path=record_path,
            content=updated,
            message=f"Update tx status: {status.current_count}/{status.threshold} signatures"
        )
    except FileNotFoundError:
        await log_warning("record_not_found", status.consent_id)
```

---

## Outputs

```yaml
outputs:
  on_new_signature:
    - notification: posted to stewardship
    - record: updated on GitHub
    - log: signature_added

  on_threshold_met:
    - notification: execution ready
    - record: status updated
    - log: threshold_reached

  on_stale:
    - notification: warning sent
    - log: transaction_stale
```

---

## Related Skills

- `submit-transaction.md` — Triggers this skill
- `execute-disbursement.md` — Post-execution recording
- `governance/finalize-decision.md` — Initial approval
