# Skill: Execute Disbursement

Record completed treasury transactions and update financial tracking.

---

## Trigger

```yaml
trigger:
  type: blockchain_event | webhook
  conditions:
    - type: blockchain_event
      contract: TREASURY_SAFE_ADDRESS
      event: ExecutionSuccess
      filter:
        - tx in tracked_transactions

    # Or webhook from Safe Transaction Service
    - type: webhook
      source: safe_transaction_service
      event: transaction_executed
```

---

## Required Permissions

- Read blockchain state
- Update transaction records
- Post to Discord
- Update treasury ledger

---

## Process

### Step 1: Capture Execution Event

```python
async def capture_execution(event: ExecutionEvent) -> ExecutionDetails:
    """Process execution success event from Safe."""

    tx_hash = event.transaction_hash
    safe_tx_hash = event.safe_tx_hash

    # Get full transaction details
    tx_receipt = await get_transaction_receipt(tx_hash)
    safe_tx = await safe_api.get_transaction(safe_tx_hash)

    # Extract our tracking info
    consent_id = extract_consent_id(safe_tx.origin)

    # Get execution details
    executor = tx_receipt.from_address
    executor_discord = await get_discord_for_wallet(executor)

    gas_used = tx_receipt.gas_used
    gas_price = tx_receipt.effective_gas_price
    gas_cost_wei = gas_used * gas_price

    return ExecutionDetails(
        tx_hash=tx_hash,
        safe_tx_hash=safe_tx_hash,
        consent_id=consent_id,
        executor=executor,
        executor_discord=executor_discord,
        block_number=tx_receipt.block_number,
        timestamp=await get_block_timestamp(tx_receipt.block_number),
        gas_cost_wei=gas_cost_wei,
        success=tx_receipt.status == 1,
        recipient=safe_tx.to,
        value=safe_tx.value,
        token=parse_token_from_data(safe_tx.data) or "ETH"
    )
```

### Step 2: Verify Against Consent

```python
async def verify_against_consent(
    execution: ExecutionDetails
) -> ConsentVerification:
    """Verify executed transaction matches consent record."""

    consent = await get_consent_record(execution.consent_id)

    if not consent:
        return ConsentVerification(
            verified=False,
            reason="No consent record found"
        )

    # Extract expected values from consent
    expected_recipient = consent.transaction_details.recipient
    expected_amount = consent.transaction_details.amount
    expected_token = consent.transaction_details.token

    # Verify match
    recipient_match = execution.recipient.lower() == expected_recipient.lower()
    amount_match = execution.value == expected_amount
    token_match = execution.token == expected_token

    if not all([recipient_match, amount_match, token_match]):
        return ConsentVerification(
            verified=False,
            reason="Transaction details don't match consent",
            discrepancies={
                "recipient": (expected_recipient, execution.recipient) if not recipient_match else None,
                "amount": (expected_amount, execution.value) if not amount_match else None,
                "token": (expected_token, execution.token) if not token_match else None
            }
        )

    return ConsentVerification(
        verified=True,
        consent=consent
    )
```

### Step 3: Update Ledger

```python
async def update_treasury_ledger(
    execution: ExecutionDetails,
    verification: ConsentVerification
):
    """Update treasury ledger with completed transaction."""

    consent = verification.consent

    # Create ledger entry
    ledger_entry = f"""
## {execution.timestamp.strftime('%Y-%m-%d')} | {consent.transaction_details.purpose[:50]}

| Field | Value |
|-------|-------|
| TX Hash | [`{execution.tx_hash[:10]}...`](https://basescan.org/tx/{execution.tx_hash}) |
| Consent ID | `{execution.consent_id}` |
| Category | {consent.transaction_details.category} |
| Recipient | `{execution.recipient}` |
| Amount | {format_amount(execution.value, execution.token)} |
| Executor | <@{execution.executor_discord}> |
| Gas Cost | {format_eth(execution.gas_cost_wei)} ETH |

---
"""

    # Append to monthly ledger
    month_file = f"Records/Treasury/Ledger/{execution.timestamp.strftime('%Y-%m')}.md"

    try:
        current = await read_file(
            repo="reacc-commons-constitution",
            path=month_file
        )
        updated = current + "\n" + ledger_entry
    except FileNotFoundError:
        # Create new month file
        updated = f"""---
type: treasury_ledger
month: {execution.timestamp.strftime('%Y-%m')}
---

# Treasury Ledger: {execution.timestamp.strftime('%B %Y')}

{ledger_entry}
"""

    await write_file(
        repo="reacc-commons-constitution",
        path=month_file,
        content=updated,
        message=f"Ledger: {consent.transaction_details.purpose[:30]}"
    )

    # Update running totals
    await update_treasury_totals(
        category=consent.transaction_details.category,
        amount=execution.value,
        token=execution.token,
        direction="outflow"
    )
```

### Step 4: Finalize Records

```python
async def finalize_transaction_record(
    execution: ExecutionDetails,
    verification: ConsentVerification
):
    """Update transaction record to completed status."""

    record_path = f"Records/Treasury/{execution.consent_id}-tx.md"

    current = await read_file(
        repo="reacc-commons-constitution",
        path=record_path
    )

    # Update frontmatter
    updated = update_frontmatter(current, {
        "status": "executed",
        "tx_hash": execution.tx_hash,
        "executed_at": execution.timestamp.isoformat(),
        "executor": execution.executor
    })

    # Add execution section
    updated = add_section(
        updated,
        f"""
## Execution

| Field | Value |
|-------|-------|
| Status | ✅ **Executed** |
| TX Hash | [`{execution.tx_hash}`](https://basescan.org/tx/{execution.tx_hash}) |
| Block | {execution.block_number} |
| Timestamp | {execution.timestamp.isoformat()} |
| Executor | `{execution.executor}` |
| Gas Cost | {format_eth(execution.gas_cost_wei)} ETH |
| Verified | {'✅ Matches consent' if verification.verified else '⚠️ See notes'} |
"""
    )

    await write_file(
        repo="reacc-commons-constitution",
        path=record_path,
        content=updated,
        message=f"Transaction executed: {execution.tx_hash[:10]}"
    )
```

### Step 5: Notify Completion

```python
async def notify_completion(
    execution: ExecutionDetails,
    consent: ConsentRecord
):
    """Post completion notification."""

    proposer_id = consent.proposer_id

    # Post to stewardship
    await post_to_channel(
        STEWARDSHIP_CHANNEL_ID,
        f"💰 **Transaction Executed**\n\n"
        f"**Purpose:** {consent.transaction_details.purpose}\n"
        f"**Amount:** {format_amount(execution.value, execution.token)}\n"
        f"**Recipient:** `{execution.recipient[:10]}...{execution.recipient[-8:]}`\n\n"
        f"TX: [`{execution.tx_hash[:10]}...`](https://basescan.org/tx/{execution.tx_hash})\n"
        f"Executed by: <@{execution.executor_discord}>\n\n"
        f"Consent ID: `{execution.consent_id}`"
    )

    # Notify proposer
    await send_dm(
        proposer_id,
        f"Your treasury proposal has been executed!\n\n"
        f"**Purpose:** {consent.transaction_details.purpose}\n"
        f"**Amount:** {format_amount(execution.value, execution.token)}\n\n"
        f"TX: https://basescan.org/tx/{execution.tx_hash}"
    )

    # Log
    await log_action(
        "treasury_executed",
        execution.consent_id,
        {
            "tx_hash": execution.tx_hash,
            "amount": str(execution.value),
            "token": execution.token,
            "category": consent.transaction_details.category
        }
    )
```

---

## Discrepancy Handling

If execution doesn't match consent:

```python
async def handle_discrepancy(
    execution: ExecutionDetails,
    verification: ConsentVerification
):
    """Alert on transaction/consent mismatch."""

    await post_to_channel(
        STEWARDSHIP_CHANNEL_ID,
        f"⚠️ **Transaction Discrepancy Detected**\n\n"
        f"Executed TX `{execution.tx_hash[:10]}...` doesn't match "
        f"consent record `{execution.consent_id}`\n\n"
        f"**Discrepancies:**\n"
        f"{format_discrepancies(verification.discrepancies)}\n\n"
        f"This may require investigation. The transaction has already "
        f"executed on-chain but the consent record shows different values."
    )

    # Still record but flag
    await finalize_transaction_record(
        execution,
        verification,
        flag="discrepancy_detected"
    )
```

---

## Outputs

```yaml
outputs:
  on_success:
    - record: transaction finalized
    - ledger: entry added
    - totals: updated
    - notification: sent to stewardship and proposer
    - log: disbursement_complete

  on_discrepancy:
    - alert: sent to stewardship
    - record: flagged
    - log: disbursement_discrepancy
```

---

## Related Skills

- `submit-transaction.md` — Initial submission
- `track-signatures.md` — Signature monitoring
- `../governance/finalize-decision.md` — Approval trigger
