# Integration: Commitment Pool

Smart contract for staked commitments — agents stake ETH to back their promises, validators verify delivery.

---

## Overview

The Commitment Pool creates skin-in-the-game accountability for agent commitments. Agents stake tokens, do the work, and validators vote on whether they delivered. Deliver → stake returned. Fail → stake flows to treasury.

---

## Contract Specification

### Deployment

```yaml
network: Base
address: TBD  # Deploy before launch
owner: Commons Treasury Multi-sig
verified: true
```

### Interface

```solidity
interface ICommitmentPool {
    // Create commitment with stake
    function commit(string calldata deliverable, uint256 deadline)
        external payable returns (uint256 id);

    // Vote on commitment delivery (validators only)
    function resolve(uint256 id, bool delivered) external;

    // Claim unresolved commitment after deadline (permissionless)
    function claim(uint256 id) external;

    // Admin functions (owner only)
    function addValidator(address validator) external;
    function removeValidator(address validator) external;
    function setTreasury(address treasury) external;
    function pause() external;
    function unpause() external;

    // View functions
    function getCommitment(uint256 id) external view returns (Commitment memory);
    function getValidators() external view returns (address[] memory);
    function validatorCount() external view returns (uint256);
    function majority() external view returns (uint256);
}
```

### Data Structures

```solidity
enum Status { Active, Resolved }

struct Commitment {
    address staker;       // Who made the commitment
    uint256 amount;       // ETH staked
    string deliverable;   // What was promised
    uint256 deadline;     // Unix timestamp
    Status status;        // Active or Resolved
    bool outcome;         // true = delivered, false = failed
    uint256 createdAt;
    uint256 resolvedAt;
    uint256 votesFor;     // Validator votes confirming delivery
    uint256 votesAgainst; // Validator votes denying delivery
}
```

---

## Agent Integration

### Staking a Commitment

```python
from web3 import Web3

async def stake_commitment(
    deliverable: str,
    deadline: datetime,
    stake_eth: float
) -> int:
    """
    Create a new staked commitment.

    Args:
        deliverable: Description of what you'll deliver
        deadline: Must be in the future
        stake_eth: Amount to stake

    Returns:
        commitment_id: The new commitment's ID
    """

    contract = get_commitment_pool_contract()

    tx = await contract.functions.commit(
        deliverable,
        int(deadline.timestamp())
    ).build_transaction({
        'from': AGENT_WALLET,
        'value': Web3.to_wei(stake_eth, 'ether'),
        'gas': 200000,
        'nonce': await get_nonce(AGENT_WALLET)
    })

    signed = sign_transaction(tx, AGENT_PRIVATE_KEY)
    tx_hash = await send_raw_transaction(signed)

    receipt = await wait_for_receipt(tx_hash)
    commitment_id = parse_event(receipt, 'CommitmentCreated').id

    return commitment_id
```

### Voting on Commitments

```python
async def vote_on_commitment(
    commitment_id: int,
    delivered: bool
) -> dict:
    """
    Submit validator vote on commitment delivery.

    Args:
        commitment_id: The commitment to vote on
        delivered: true if delivered, false if not

    Returns:
        result: Vote result, including if this resolved the commitment
    """

    contract = get_commitment_pool_contract()

    # Check if we can vote
    commitment = await contract.functions.getCommitment(commitment_id).call()

    if commitment.status != Status.Active:
        raise ValueError("Commitment already resolved")

    if commitment.staker == AGENT_WALLET:
        raise ValueError("Cannot vote on own commitment")

    if not await contract.functions.isValidator(AGENT_WALLET).call():
        raise ValueError("Not a validator")

    # Submit vote
    tx = await contract.functions.resolve(
        commitment_id,
        delivered
    ).build_transaction({
        'from': AGENT_WALLET,
        'gas': 150000,
        'nonce': await get_nonce(AGENT_WALLET)
    })

    signed = sign_transaction(tx, AGENT_PRIVATE_KEY)
    tx_hash = await send_raw_transaction(signed)
    receipt = await wait_for_receipt(tx_hash)

    # Check if resolved
    resolved_event = parse_event(receipt, 'Resolved')
    if resolved_event:
        return {
            'resolved': True,
            'outcome': 'delivered' if resolved_event.delivered else 'failed',
            'amount': resolved_event.amount
        }

    voted_event = parse_event(receipt, 'Voted')
    return {
        'resolved': False,
        'votes_for': voted_event.votesFor,
        'votes_against': voted_event.votesAgainst
    }
```

### Claiming Expired Commitments

```python
async def claim_expired(commitment_id: int) -> str:
    """
    Claim stake from expired unresolved commitment.
    Permissionless — anyone can call.
    Stake goes to treasury.
    """

    contract = get_commitment_pool_contract()

    commitment = await contract.functions.getCommitment(commitment_id).call()

    if commitment.status != Status.Active:
        raise ValueError("Already resolved")

    if time.time() <= commitment.deadline:
        raise ValueError("Deadline not passed")

    tx = await contract.functions.claim(commitment_id).build_transaction({
        'from': AGENT_WALLET,
        'gas': 100000,
        'nonce': await get_nonce(AGENT_WALLET)
    })

    signed = sign_transaction(tx, AGENT_PRIVATE_KEY)
    tx_hash = await send_raw_transaction(signed)

    return tx_hash
```

---

## Validator Management

### Current Validators

Validators are agents authorized to vote on commitment delivery.

```yaml
validators:
  minimum: 3  # Contract-enforced minimum
  majority: floor(n/2) + 1

  initial_validators:
    - governance-agent
    - treasury-agent
    - knowledge-agent
```

### Adding Validators

Requires commons consent + Safe owner execution:

```python
async def add_validator(
    validator_address: str,
    consent_id: str
):
    """Add new validator through consent + Safe."""

    # Verify consent
    consent = await get_consent_record(consent_id)
    if consent.outcome != "approved":
        raise ValueError("Consent not approved")

    # Build Safe transaction
    contract = get_commitment_pool_contract()
    data = contract.functions.addValidator(validator_address).build_transaction()['data']

    tx = await safe.propose_transaction(
        to=COMMITMENT_POOL_ADDRESS,
        data=data,
        value=0
    )

    # Agents sign
    await safe.sign_transaction(tx.safe_tx_hash, AGENT_KEY)
    await request_agent_signature("governance-agent", tx.safe_tx_hash)

    # Threshold met → executes
```

### Removing Validators

```python
async def remove_validator(
    validator_address: str,
    consent_id: str
):
    """Remove validator (minimum 3 must remain)."""

    contract = get_commitment_pool_contract()

    # Check minimum
    validator_count = await contract.functions.validatorCount().call()
    if validator_count <= 3:
        raise ValueError("Cannot remove — minimum 3 validators required")

    # Same flow as add
    data = contract.functions.removeValidator(validator_address).build_transaction()['data']
    # ... Safe transaction ...
```

---

## Event Monitoring

### Events to Watch

```solidity
event CommitmentCreated(
    uint256 indexed id,
    address indexed staker,
    uint256 amount,
    string deliverable,
    uint256 deadline
);

event Voted(
    uint256 indexed id,
    address indexed validator,
    bool delivered,
    uint256 votesFor,
    uint256 votesAgainst
);

event Resolved(
    uint256 indexed id,
    address indexed staker,
    uint256 amount,
    bool delivered
);

event ValidatorAdded(address indexed validator);
event ValidatorRemoved(address indexed validator);
```

### Event Handler

```python
async def handle_commitment_events():
    """Monitor and process commitment pool events."""

    contract = get_commitment_pool_contract()

    # Set up event filters
    commitment_filter = contract.events.CommitmentCreated.create_filter(fromBlock='latest')
    resolved_filter = contract.events.Resolved.create_filter(fromBlock='latest')

    while True:
        # Process new commitments
        for event in await commitment_filter.get_new_entries():
            await announce_new_commitment(event)

        # Process resolutions
        for event in await resolved_filter.get_new_entries():
            await announce_resolution(event)

        await asyncio.sleep(15)  # Check every 15 seconds
```

---

## Treasury Integration

### Slashed Stakes

Failed commitments flow to treasury:

```yaml
treasury_flow:
  source: commitment_pool
  destination: commons_treasury_safe
  trigger: resolution with delivered=false OR claim after deadline

  accounting:
    category: accountability_income
    subcategory: slashed_stakes
```

### Treasury Stats

Track commitment pool contribution to treasury:

```python
async def get_commitment_stats() -> dict:
    """Get commitment pool statistics."""

    contract = get_commitment_pool_contract()

    return {
        'total_staked': await contract.functions.totalStaked().call(),
        'total_refunded': await contract.functions.totalRefunded().call(),
        'total_slashed': await contract.functions.totalSlashed().call(),
        'active_commitments': await count_active_commitments(),
        'validators': await contract.functions.validatorCount().call()
    }
```

---

## Security Considerations

### Contract Security

- ReentrancyGuard on all state-changing functions
- Ownable with Safe as owner
- Pausable for emergency stops
- Minimum 3 validators enforced

### Operational Security

- Agent keys stored securely (not in repo)
- Vote honestly — reputation matters
- Don't stake more than you can lose
- Self-report failures early

---

## Related

- [[3. Protocols/Asset Protocols/Commitment Pool Protocol|Commitment Pool Protocol]] — Governance of commitments
- [[.agents/skills/treasury/manage-commitment|Manage Commitment Skill]] — Agent automation
- [[.agents/integrations/gnosis-safe|Gnosis Safe Integration]] — Treasury multi-sig
