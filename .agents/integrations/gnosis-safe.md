# Gnosis Safe Integration Specification

Technical specification for agent operations on the Re/acc Commons treasury multi-signature wallet.

---

## Connection

```yaml
platform: gnosis_safe
api_version: v1
base_url: https://safe-transaction-mainnet.safe.global
chain: ethereum
network_id: 1
auth_type: api_key + signed_messages
```

---

## Safe Configuration

```yaml
safe_address: ${REACC_TREASURY_SAFE_ADDRESS}
chain_id: 8453  # Base mainnet

threshold: 2 of 4
signers:
  - treasury-agent    # Agent-controlled key
  - governance-agent  # Agent-controlled key
  - steward-1         # Human Steward (optional participation)
  - steward-2         # Human Steward (optional participation)

agent_role: signer  # Agents have signing authority
```

### Agent Signing Authority

Agents are full signers on the multi-sig, not just proposers. This enables:
- **Autonomous execution**: Agents can meet threshold without humans
- **Speed**: Transactions execute immediately after consent
- **Human participation**: Humans can sign if they want, but aren't required

```yaml
signing_keys:
  treasury_agent:
    address: ${TREASURY_AGENT_ADDRESS}
    private_key: ${TREASURY_AGENT_PRIVATE_KEY}
    scope: treasury_operations

  governance_agent:
    address: ${GOVERNANCE_AGENT_ADDRESS}
    private_key: ${GOVERNANCE_AGENT_PRIVATE_KEY}
    scope: all_operations
```

---

## Operations

### Read Safe State

```python
async def get_safe_info() -> SafeInfo:
    """Get current safe configuration and state."""
    response = await safe_api.get(f"/safes/{SAFE_ADDRESS}")

    return SafeInfo(
        address=SAFE_ADDRESS,
        threshold=response["threshold"],
        owners=response["owners"],
        nonce=response["nonce"],
        balance=await get_balance()
    )

async def get_balance() -> TokenBalances:
    """Get token balances in safe."""
    response = await safe_api.get(f"/safes/{SAFE_ADDRESS}/balances/")

    return TokenBalances(
        eth=next((b for b in response if b["token"] is None), {}).get("balance", 0),
        tokens=[
            TokenBalance(
                address=b["token"]["address"],
                symbol=b["token"]["symbol"],
                balance=b["balance"],
                decimals=b["token"]["decimals"]
            )
            for b in response if b["token"] is not None
        ]
    )
```

### List Pending Transactions

```python
async def get_pending_transactions() -> list[SafeTransaction]:
    """Get all pending (not executed) transactions."""
    response = await safe_api.get(
        f"/safes/{SAFE_ADDRESS}/multisig-transactions/",
        params={"executed": False}
    )

    return [
        SafeTransaction(
            safe_tx_hash=tx["safeTxHash"],
            to=tx["to"],
            value=tx["value"],
            data=tx["data"],
            nonce=tx["nonce"],
            confirmations=[
                Confirmation(owner=c["owner"], signature=c["signature"])
                for c in tx["confirmations"]
            ],
            confirmations_required=tx["confirmationsRequired"],
            is_executed=tx["isExecuted"]
        )
        for tx in response["results"]
    ]
```

### Propose Transaction

```python
async def propose_and_sign_transaction(
    to: str,
    value: int,
    data: str = "0x",
    operation: int = 0,  # 0 = Call, 1 = DelegateCall
    metadata: TransactionMetadata = None,
    auto_execute: bool = True
) -> ProposedTransaction:
    """
    Propose, sign, and optionally execute a transaction autonomously.

    AGENT ROLE: Full signer. Can meet threshold with other agent.
    NO HUMAN CHECKPOINT: Executes after consent is complete.
    """

    # Get current nonce
    safe_info = await get_safe_info()
    nonce = safe_info.nonce

    # Build transaction
    tx = {
        "to": to,
        "value": str(value),
        "data": data,
        "operation": operation,
        "safeTxGas": 0,
        "baseGas": 0,
        "gasPrice": 0,
        "gasToken": "0x0000000000000000000000000000000000000000",
        "refundReceiver": "0x0000000000000000000000000000000000000000",
        "nonce": nonce
    }

    # Calculate safe tx hash
    safe_tx_hash = calculate_safe_tx_hash(SAFE_ADDRESS, tx)

    # Submit to Safe Transaction Service
    response = await safe_api.post(
        f"/safes/{SAFE_ADDRESS}/multisig-transactions/",
        json={
            **tx,
            "contractTransactionHash": safe_tx_hash,
            "sender": AGENT_ADDRESS,  # Agent's address
            "origin": json.dumps({
                "name": "Re/acc Commons Agent",
                "url": "https://reacc.commons"
            })
        }
    )

    # Sign with our agent key (first signature)
    our_signature = sign_safe_tx_hash(safe_tx_hash, TREASURY_AGENT_PRIVATE_KEY)

    await safe_api.post(
        f"/safes/{SAFE_ADDRESS}/multisig-transactions/{safe_tx_hash}/confirmations/",
        json={"signature": our_signature}
    )

    # Request second agent signature
    second_signature = await request_agent_signature(
        agent_id="governance-agent",
        safe_tx_hash=safe_tx_hash,
        context={
            "purpose": metadata.purpose if metadata else "Treasury operation",
            "consent_id": metadata.consent_reference if metadata else None
        }
    )

    # Log the proposal and signing
    await log_action(
        "transaction_proposed_and_signed",
        safe_tx_hash,
        metadata.to_dict() if metadata else {}
    )

    # Check if threshold met
    tx = await get_transaction(safe_tx_hash)
    threshold_met = len(tx.confirmations) >= tx.confirmations_required

    if threshold_met and auto_execute:
        # Execute immediately
        exec_result = await execute_transaction(safe_tx_hash)

        await notify_treasury_channel(
            f"💸 **Transaction Executed**\n"
            f"To: `{to}`\n"
            f"Value: {format_eth(value)}\n"
            f"Purpose: {metadata.purpose if metadata else 'N/A'}\n"
            f"Consent: {metadata.consent_reference if metadata else 'N/A'}\n"
            f"TX: `{exec_result.tx_hash}`"
        )

        return ProposedTransaction(
            safe_tx_hash=safe_tx_hash,
            nonce=nonce,
            status="executed",
            tx_hash=exec_result.tx_hash
        )
    else:
        # Notify - waiting for additional signatures
        await notify_treasury_channel(
            f"📋 **Transaction Signed**\n"
            f"To: `{to}`\n"
            f"Value: {format_eth(value)}\n"
            f"Purpose: {metadata.purpose if metadata else 'N/A'}\n"
            f"Signatures: {len(tx.confirmations)}/{tx.confirmations_required}\n"
            f"Status: Awaiting additional signatures"
        )

        return ProposedTransaction(
            safe_tx_hash=safe_tx_hash,
            nonce=nonce,
            status="pending_signatures"
        )
```

### Track Signatures

```python
async def track_transaction_signatures(safe_tx_hash: str) -> SignatureStatus:
    """
    Monitor signature collection for a pending transaction.
    Called periodically or on webhook.
    """

    tx = await get_transaction(safe_tx_hash)

    confirmed_count = len(tx.confirmations)
    required = tx.confirmations_required

    status = SignatureStatus(
        safe_tx_hash=safe_tx_hash,
        confirmations=confirmed_count,
        required=required,
        threshold_met=confirmed_count >= required,
        signers=[c.owner for c in tx.confirmations]
    )

    # Notify on progress
    if status.threshold_met and not tx.is_executed:
        await notify_treasury_channel(
            f"✅ **Signature Threshold Met**\n"
            f"Transaction `{safe_tx_hash[:10]}...` ready for execution.\n"
            f"Signatures: {confirmed_count}/{required}"
        )

    return status
```

### Execute Transaction

```python
async def execute_transaction(safe_tx_hash: str) -> ExecutionResult:
    """
    Execute a transaction that has met signature threshold.

    NOTE: This requires gas. Agent must have ETH for execution
    or a Steward executes manually.
    """

    tx = await get_transaction(safe_tx_hash)

    if len(tx.confirmations) < tx.confirmations_required:
        raise InsufficientSignaturesError(safe_tx_hash)

    # Build execution transaction
    exec_tx = build_execution_tx(tx)

    # Sign and broadcast
    signed = await sign_transaction(exec_tx)
    tx_hash = await broadcast_transaction(signed)

    # Wait for confirmation
    receipt = await wait_for_receipt(tx_hash)

    if receipt.status == 1:
        await notify_treasury_channel(
            f"💸 **Transaction Executed**\n"
            f"Safe TX: `{safe_tx_hash[:10]}...`\n"
            f"On-chain TX: `{tx_hash}`\n"
            f"Status: Success"
        )

        await log_action("transaction_executed", safe_tx_hash, tx_hash)
    else:
        await notify_stewardship(
            f"⚠️ **Transaction Failed**\n"
            f"Safe TX: `{safe_tx_hash[:10]}...`\n"
            f"On-chain TX: `{tx_hash}`\n"
            f"Please investigate."
        )

    return ExecutionResult(
        safe_tx_hash=safe_tx_hash,
        tx_hash=tx_hash,
        success=receipt.status == 1
    )
```

---

## Transaction Templates

### ETH Transfer

```python
async def propose_eth_transfer(
    recipient: str,
    amount_eth: float,
    consent_reference: str,
    purpose: str
) -> ProposedTransaction:
    """Propose ETH transfer from treasury."""

    value_wei = int(amount_eth * 10**18)

    return await propose_transaction(
        to=recipient,
        value=value_wei,
        data="0x",
        metadata=TransactionMetadata(
            type="eth_transfer",
            purpose=purpose,
            consent_reference=consent_reference,
            recipient=recipient,
            amount=f"{amount_eth} ETH"
        )
    )
```

### ERC20 Transfer

```python
async def propose_token_transfer(
    token_address: str,
    recipient: str,
    amount: int,  # In token's smallest unit
    consent_reference: str,
    purpose: str
) -> ProposedTransaction:
    """Propose ERC20 token transfer from treasury."""

    # Build transfer calldata
    transfer_data = encode_function_data(
        "transfer(address,uint256)",
        [recipient, amount]
    )

    return await propose_transaction(
        to=token_address,
        value=0,
        data=transfer_data,
        metadata=TransactionMetadata(
            type="token_transfer",
            purpose=purpose,
            consent_reference=consent_reference,
            token=token_address,
            recipient=recipient,
            amount=str(amount)
        )
    )
```

---

## Signer Management

```python
async def get_current_stewards() -> list[str]:
    """Get list of current Steward addresses from safe owners."""
    safe_info = await get_safe_info()
    return safe_info.owners

async def propose_add_signer(
    new_signer: str,
    consent_reference: str
) -> ProposedTransaction:
    """Propose adding a new Steward as signer."""

    safe_info = await get_safe_info()
    new_threshold = calculate_new_threshold(len(safe_info.owners) + 1)

    # Build addOwnerWithThreshold calldata
    data = encode_function_data(
        "addOwnerWithThreshold(address,uint256)",
        [new_signer, new_threshold]
    )

    return await propose_transaction(
        to=SAFE_ADDRESS,  # Safe calls itself
        value=0,
        data=data,
        metadata=TransactionMetadata(
            type="add_signer",
            purpose="New Steward onboarding",
            consent_reference=consent_reference,
            new_signer=new_signer
        )
    )

async def propose_remove_signer(
    old_signer: str,
    consent_reference: str
) -> ProposedTransaction:
    """Propose removing a Steward from signers."""

    safe_info = await get_safe_info()

    # Find prev owner in linked list
    prev_owner = find_prev_owner(safe_info.owners, old_signer)
    new_threshold = calculate_new_threshold(len(safe_info.owners) - 1)

    # Build removeOwner calldata
    data = encode_function_data(
        "removeOwner(address,address,uint256)",
        [prev_owner, old_signer, new_threshold]
    )

    return await propose_transaction(
        to=SAFE_ADDRESS,
        value=0,
        data=data,
        metadata=TransactionMetadata(
            type="remove_signer",
            purpose="Steward rotation",
            consent_reference=consent_reference,
            removed_signer=old_signer
        )
    )
```

---

## Approval Verification

```python
async def verify_consent_for_transaction(
    amount: float,
    consent_reference: str
) -> ConsentVerification:
    """
    Verify that proper consent exists for a treasury transaction.
    Called before proposing transaction.
    """

    # Determine required consent level
    if amount <= 500:
        required_level = "steward_autonomy"
    elif amount <= 5000:
        required_level = "standard_consent"
    else:
        required_level = "full_commons_consent"

    # Fetch consent record from Discord/GitHub
    consent = await fetch_consent_record(consent_reference)

    if consent is None:
        return ConsentVerification(
            valid=False,
            reason="Consent record not found"
        )

    if not consent.window_complete:
        return ConsentVerification(
            valid=False,
            reason="Consent window still open"
        )

    if consent.has_unresolved_objections:
        return ConsentVerification(
            valid=False,
            reason="Unresolved objections exist"
        )

    if required_level == "full_commons_consent" and not consent.is_full_commons:
        return ConsentVerification(
            valid=False,
            reason="Amount requires full commons consent"
        )

    return ConsentVerification(
        valid=True,
        consent_record=consent
    )
```

---

## Error Handling

```python
async def handle_safe_error(error: SafeError, context: ActionContext):
    if "not enough signatures" in str(error).lower():
        await log_info(f"Waiting for more signatures: {context.safe_tx_hash}")
    elif "nonce" in str(error).lower():
        await log_warning(f"Nonce mismatch, refreshing: {context.action}")
        # Refresh and retry
    elif "insufficient funds" in str(error).lower():
        await notify_stewardship(
            f"⚠️ **Insufficient Funds**\n"
            f"Transaction cannot execute: {context.purpose}\n"
            f"Required: {context.amount}"
        )
    else:
        await log_error(error, context)
        raise
```
