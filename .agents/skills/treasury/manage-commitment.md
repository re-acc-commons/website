# Skill: Manage Commitment

Create, track, and resolve commitment pool stakes.

---

## Trigger

```yaml
trigger:
  type: message_created | scheduled
  conditions:
    # New commitment request
    - type: message_created
      channel: "#commitments"
      message_contains: ["commit", "stake", "promise"]

    # Track active commitments
    - type: scheduled
      frequency: every_hour
      action: check_commitment_status

    # Deadline approaching
    - type: scheduled
      frequency: every_hour
      action: deadline_alerts
```

---

## Required Permissions

- Read/write commitment contract
- Post to channels
- Send DMs for alerts
- Sign transactions (stake, vote)

---

## Process

### Step 1: Create Commitment

```python
async def create_commitment(
    deliverable: str,
    deadline: datetime,
    stake_amount: float
) -> Commitment:
    """
    Create new staked commitment.
    """

    # Validate inputs
    if stake_amount <= 0:
        raise ValueError("Stake must be positive")
    if deadline <= datetime.now():
        raise ValueError("Deadline must be in future")

    # Check agent has sufficient balance
    balance = await get_balance(AGENT_WALLET)
    if balance < stake_amount:
        await post_to_channel(
            COMMITMENTS_CHANNEL_ID,
            f"⚠️ Insufficient balance for commitment.\n"
            f"Required: {stake_amount} ETH\n"
            f"Available: {balance} ETH"
        )
        return None

    # Submit to contract
    tx = await commitment_pool.commit(
        deliverable=deliverable,
        deadline=int(deadline.timestamp()),
        value=to_wei(stake_amount, 'ether')
    )

    await tx.wait()

    commitment_id = parse_event(tx, 'CommitmentCreated').id

    # Announce
    await post_to_channel(
        COMMITMENTS_CHANNEL_ID,
        f"📝 **New Commitment Created**\n\n"
        f"**ID:** `{commitment_id}`\n"
        f"**Agent:** {AGENT_ID}\n"
        f"**Stake:** {stake_amount} ETH\n"
        f"**Deliverable:** {deliverable}\n"
        f"**Deadline:** <t:{int(deadline.timestamp())}:R>\n\n"
        f"*Validators: vote with `resolve {commitment_id} true/false`*"
    )

    await log_action("commitment_created", {
        "commitment_id": commitment_id,
        "stake": stake_amount,
        "deadline": deadline.isoformat()
    })

    return Commitment(
        id=commitment_id,
        staker=AGENT_WALLET,
        amount=stake_amount,
        deliverable=deliverable,
        deadline=deadline
    )
```

### Step 2: Track Commitments

```python
async def check_commitment_status():
    """
    Periodic check of all active commitments.
    """

    active = await get_active_commitments()

    for commitment in active:
        # Check deadline proximity
        time_remaining = commitment.deadline - datetime.now()

        if time_remaining < timedelta(hours=24):
            await send_deadline_alert(commitment, "24h")

        elif time_remaining < timedelta(hours=48):
            await send_deadline_alert(commitment, "48h")

        # Check vote status
        votes_for = commitment.votes_for
        votes_against = commitment.votes_against
        majority = await get_majority_threshold()

        if votes_for > 0 or votes_against > 0:
            await update_commitment_status(commitment, votes_for, votes_against, majority)


async def send_deadline_alert(commitment, window: str):
    """Send deadline approaching alert."""

    # Only alert once per window
    alert_key = f"deadline_alert_{commitment.id}_{window}"
    if await has_sent_alert(alert_key):
        return

    await post_to_channel(
        COMMITMENTS_CHANNEL_ID,
        f"⏰ **Deadline Alert**\n\n"
        f"Commitment `{commitment.id}` deadline in {window}\n"
        f"**Deliverable:** {commitment.deliverable}\n"
        f"**Status:** {commitment.votes_for} for / {commitment.votes_against} against\n\n"
        f"Validators: please vote if not already done."
    )

    await mark_alert_sent(alert_key)
```

### Step 3: Vote on Commitments

```python
async def vote_on_commitment(
    commitment_id: int,
    delivered: bool
) -> VoteResult:
    """
    Submit validator vote on commitment delivery.
    """

    commitment = await get_commitment(commitment_id)

    # Validation
    if commitment.status != Status.Active:
        raise VoteError("Commitment already resolved")

    if commitment.staker == AGENT_WALLET:
        raise VoteError("Cannot vote on own commitment")

    if not await is_validator(AGENT_WALLET):
        raise VoteError("Not a validator")

    if await has_voted(commitment_id, AGENT_WALLET):
        raise VoteError("Already voted")

    # Submit vote
    tx = await commitment_pool.resolve(
        id=commitment_id,
        delivered=delivered
    )

    await tx.wait()

    # Check if resolved
    events = parse_events(tx)

    if 'Resolved' in events:
        resolved_event = events['Resolved']
        outcome = "delivered" if resolved_event.delivered else "failed"

        await post_to_channel(
            COMMITMENTS_CHANNEL_ID,
            f"✅ **Commitment Resolved**\n\n"
            f"**ID:** `{commitment_id}`\n"
            f"**Outcome:** {outcome}\n"
            f"**Amount:** {commitment.amount} ETH → "
            f"{'returned to staker' if resolved_event.delivered else 'sent to treasury'}"
        )

        return VoteResult(resolved=True, outcome=outcome)

    # Vote recorded but not yet resolved
    voted_event = events['Voted']
    await post_to_channel(
        COMMITMENTS_CHANNEL_ID,
        f"🗳️ Vote recorded on commitment `{commitment_id}`\n"
        f"Current: {voted_event.votesFor} for / {voted_event.votesAgainst} against"
    )

    return VoteResult(resolved=False)
```

### Step 4: Claim Expired Commitments

```python
async def claim_expired_commitments():
    """
    Sweep expired unresolved commitments to treasury.
    Permissionless - anyone can call.
    """

    active = await get_active_commitments()
    now = datetime.now().timestamp()

    for commitment in active:
        if now > commitment.deadline:
            # Can claim
            tx = await commitment_pool.claim(commitment.id)
            await tx.wait()

            await post_to_channel(
                COMMITMENTS_CHANNEL_ID,
                f"⏰ **Commitment Expired**\n\n"
                f"Commitment `{commitment.id}` was not resolved before deadline.\n"
                f"Stake of {commitment.amount} ETH sent to treasury.\n\n"
                f"*Staker: {commitment.staker}*"
            )

            await log_action("commitment_expired", {
                "commitment_id": commitment.id,
                "amount": commitment.amount
            })
```

---

## Outputs

```yaml
outputs:
  on_commitment_created:
    - contract: commitment staked
    - announcement: posted to #commitments
    - log: commitment_created

  on_vote_cast:
    - contract: vote recorded
    - notification: posted to channel
    - if_resolved:
        - funds: transferred (refund or slash)
        - announcement: resolution posted

  on_deadline_approaching:
    - dm: sent to staker
    - notification: posted to channel

  on_expiry:
    - contract: claimed
    - funds: to treasury
    - announcement: posted
```

---

## Commitment Best Practices

**Staking:**
- Stake what you can afford to lose
- Be specific about deliverables
- Set realistic deadlines

**Validating:**
- Vote as soon as you can verify delivery
- Don't wait until the last minute
- Judge based on actual delivery, not relationships

**Tracking:**
- Update on progress publicly
- Self-report issues early
- Celebrate successful deliveries

---

## Related Skills

- `submit-transaction.md` — For treasury operations
- `../governance/track-consent.md` — For validator additions
- `execute-disbursement.md` — For slashed funds allocation
