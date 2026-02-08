# Skill: Submit Transaction

Prepare and submit a treasury transaction to the Gnosis Safe multi-sig.

---

## Trigger

```yaml
trigger:
  type: consent_complete
  conditions:
    - consent_type == "treasury_allocation"
    - status == "approved"
    - window_complete == true
    - no_unresolved_objections == true
```

---

## Required Permissions

- Agent wallet with proposer rights on Gnosis Safe
- Read consent records
- Post to Discord
- Write transaction records to GitHub

---

## Inputs

```yaml
inputs:
  consent_process_id: string
  consent_record: ConsentRecord
  # Transaction details embedded in consent record:
  #   recipient: string (ETH address)
  #   amount: string (wei or token amount)
  #   token: string (ETH or token contract address)
  #   purpose: string
  #   category: string (operational | project | solidarity | emergency)
```

---

## Process

### Step 1: Extract Transaction Details

```python
async def extract_transaction_details(
    consent_record: ConsentRecord
) -> TransactionDetails:
    """Parse transaction details from consent record."""

    proposal_content = consent_record.proposal_content

    # Parse structured fields
    recipient = extract_field(proposal_content, "recipient")
    amount_raw = extract_field(proposal_content, "amount")
    token = extract_field(proposal_content, "token", default="ETH")
    purpose = extract_field(proposal_content, "purpose")
    category = extract_field(proposal_content, "category", default="operational")

    # Validate recipient address
    if not is_valid_address(recipient):
        raise ValidationError(f"Invalid recipient address: {recipient}")

    # Parse amount
    if token == "ETH":
        amount_wei = parse_eth_amount(amount_raw)
        token_address = None
    else:
        amount_wei = parse_token_amount(amount_raw, token)
        token_address = get_token_address(token)

    # Check against allocation limits
    limits = await get_allocation_limits(category)
    if amount_wei > limits.max_single:
        raise ValidationError(
            f"Amount exceeds {category} single transaction limit of {limits.max_single}"
        )

    return TransactionDetails(
        recipient=recipient,
        amount=amount_wei,
        token=token,
        token_address=token_address,
        purpose=purpose,
        category=category,
        consent_id=consent_record.id
    )
```

### Step 2: Prepare Safe Transaction

```python
async def prepare_safe_transaction(
    details: TransactionDetails
) -> SafeTransaction:
    """Create transaction payload for Gnosis Safe."""

    if details.token == "ETH":
        # Native ETH transfer
        tx_data = SafeTransaction(
            to=details.recipient,
            value=details.amount,
            data="0x",  # No data for ETH transfer
            operation=0,  # CALL
            safe_tx_gas=0,
            base_gas=0,
            gas_price=0,
            gas_token=ZERO_ADDRESS,
            refund_receiver=ZERO_ADDRESS,
            nonce=await get_safe_nonce()
        )
    else:
        # ERC20 transfer
        transfer_data = encode_erc20_transfer(
            to=details.recipient,
            amount=details.amount
        )
        tx_data = SafeTransaction(
            to=details.token_address,
            value=0,
            data=transfer_data,
            operation=0,
            safe_tx_gas=0,
            base_gas=0,
            gas_price=0,
            gas_token=ZERO_ADDRESS,
            refund_receiver=ZERO_ADDRESS,
            nonce=await get_safe_nonce()
        )

    # Calculate transaction hash
    tx_data.safe_tx_hash = calculate_safe_tx_hash(
        safe_address=TREASURY_SAFE_ADDRESS,
        tx=tx_data
    )

    return tx_data
```

### Step 3: Submit to Safe

```python
async def submit_to_safe(
    tx: SafeTransaction,
    details: TransactionDetails
) -> SubmissionResult:
    """Submit transaction to Gnosis Safe for signing."""

    # Sign with agent wallet
    agent_signature = sign_safe_tx(
        private_key=AGENT_PRIVATE_KEY,
        safe_tx_hash=tx.safe_tx_hash
    )

    # Propose transaction via Safe Transaction Service
    result = await safe_api.propose_transaction(
        safe_address=TREASURY_SAFE_ADDRESS,
        to=tx.to,
        value=tx.value,
        data=tx.data,
        operation=tx.operation,
        safe_tx_gas=tx.safe_tx_gas,
        base_gas=tx.base_gas,
        gas_price=tx.gas_price,
        gas_token=tx.gas_token,
        refund_receiver=tx.refund_receiver,
        nonce=tx.nonce,
        signature=agent_signature,
        sender=AGENT_WALLET_ADDRESS,
        origin=f"Re/acc Commons Consent: {details.consent_id}"
    )

    return SubmissionResult(
        success=result.status == "success",
        safe_tx_hash=tx.safe_tx_hash,
        proposer=AGENT_WALLET_ADDRESS,
        threshold=await get_safe_threshold(),
        current_signatures=1
    )
```

### Step 4: Record and Notify

```python
async def record_transaction(
    details: TransactionDetails,
    result: SubmissionResult
):
    """Record transaction and notify Stewards."""

    # Write transaction record to GitHub
    record_content = f"""---
id: {generate_tx_id()}
type: treasury_transaction
status: pending_signatures
consent_id: {details.consent_id}
safe_tx_hash: {result.safe_tx_hash}
created: {datetime.now().isoformat()}
---

# Treasury Transaction Record

## Details

| Field | Value |
|-------|-------|
| Recipient | `{details.recipient}` |
| Amount | {format_amount(details.amount, details.token)} |
| Token | {details.token} |
| Category | {details.category} |
| Purpose | {details.purpose} |

## Approval Status

| Metric | Value |
|--------|-------|
| Required Signatures | {result.threshold} |
| Current Signatures | {result.current_signatures} |
| Status | ⏳ Pending |

## Consent Reference

Consent ID: `{details.consent_id}`

## Safe Transaction

Safe TX Hash: `{result.safe_tx_hash}`

[View on Safe](https://app.safe.global/transactions/queue?safe=base:{TREASURY_SAFE_ADDRESS})
"""

    await write_file(
        repo="reacc-commons-constitution",
        path=f"Records/Treasury/{generate_tx_id()}.md",
        content=record_content,
        message=f"Record treasury tx: {details.purpose[:50]}"
    )

    # Notify Stewards
    stewards = await get_steward_ids()
    mention_str = " ".join(f"<@{s}>" for s in stewards)

    await post_to_channel(
        STEWARDSHIP_CHANNEL_ID,
        f"🔐 **Treasury Transaction Proposed**\n\n"
        f"{mention_str}\n\n"
        f"**Purpose:** {details.purpose}\n"
        f"**Amount:** {format_amount(details.amount, details.token)}\n"
        f"**Recipient:** `{details.recipient[:10]}...{details.recipient[-8:]}`\n\n"
        f"**Consent ID:** `{details.consent_id}`\n"
        f"**Safe TX Hash:** `{result.safe_tx_hash[:10]}...`\n\n"
        f"Please sign in the Gnosis Safe app.\n"
        f"Required: {result.threshold} signatures"
    )

    # Trigger signature tracking
    await trigger_skill("treasury/track-signatures", {
        "safe_tx_hash": result.safe_tx_hash,
        "consent_id": details.consent_id,
        "threshold": result.threshold
    })
```

---

## Allocation Limits

Per constitution, different categories have different limits:

```python
ALLOCATION_LIMITS = {
    "operational": {
        "max_single": parse_eth("5"),       # 5 ETH max single tx
        "requires_full_consent": False       # Standard 3-member quorum
    },
    "project": {
        "max_single": parse_eth("20"),       # 20 ETH max
        "requires_full_consent": False
    },
    "solidarity": {
        "max_single": parse_eth("10"),       # 10 ETH max
        "requires_full_consent": False
    },
    "emergency": {
        "max_single": parse_eth("50"),       # 50 ETH max
        "requires_full_consent": True,       # Full Commons consent
        "min_steward_signatures": 2          # At least 2 Stewards
    }
}
```

---

## Outputs

```yaml
outputs:
  on_success:
    - transaction: proposed to Safe
    - record: written to GitHub
    - notification: sent to Stewards
    - trigger: track-signatures skill
    - log: transaction_proposed

  on_failure:
    - notification: error to proposer
    - log: transaction_failed
```

---

## Autonomous Execution

**Agents have signing authority on the multi-sig.**

The treasury operates with agent signers included in the threshold:

```yaml
treasury_signers:
  threshold: 2 of 4
  signers:
    - treasury-agent (agent-controlled key)
    - governance-agent (agent-controlled key)
    - steward-1 (human, optional participation)
    - steward-2 (human, optional participation)
```

**Execution flow:**
1. Consent process completes (3 participants, any mix)
2. Agent prepares transaction
3. Agent signs with treasury-agent key
4. Request second signature from governance-agent
5. 2/4 threshold met → transaction ready to execute
6. Agent triggers execution
7. Record to ledger

**Humans can participate but don't gate:**
- Humans can raise treasury proposals
- Humans can consent or object during consent window
- Humans can review transaction records
- Humans can call-up if they see issues
- Humans are NOT required to sign for execution

```python
async def sign_and_execute_autonomous(tx: SafeTransaction):
    """Agent-to-agent treasury execution."""

    # First agent signature (us)
    await sign_safe_tx(tx.safe_tx_hash, TREASURY_AGENT_KEY)

    # Request second agent signature
    second_sig = await request_agent_signature(
        agent_id="governance-agent",
        tx_hash=tx.safe_tx_hash,
        context=tx.consent_id
    )

    if second_sig.signed:
        # Threshold met - execute
        await execute_safe_tx(tx.safe_tx_hash)
        return ExecutionResult(success=True)
    else:
        # Fall back to human signers if agent unavailable
        await notify_stewards_for_signature(tx)
        return ExecutionResult(pending_human=True)
```

**Transparency as accountability:**
- All transactions logged on-chain
- Consent IDs linked to transaction origins
- Any participant can call-up post-execution

---

## Related Skills

- `track-signatures.md` — Monitor signature collection
- `execute-disbursement.md` — Post-execution recording
- `governance/finalize-decision.md` — Triggers this skill
