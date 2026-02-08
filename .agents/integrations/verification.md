# Identity & Wallet Verification Integration

Technical specification for verifying identity and wallet connections in the Re/acc Commons.

---

## Overview

This integration enables:
- Discord ↔ Wallet address linking
- NFT-based role verification
- Cross-platform identity consistency
- Sybil resistance without surveillance

---

## Verification Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     VERIFICATION FLOW                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. User initiates verification in Discord                      │
│     └─> Bot sends ephemeral message with verification link      │
│                                                                 │
│  2. User connects wallet on verification page                   │
│     └─> Sign message proving wallet ownership                   │
│                                                                 │
│  3. Backend verifies signature                                  │
│     └─> Store Discord ID ↔ Wallet mapping                       │
│                                                                 │
│  4. Check NFT holdings                                          │
│     └─> Query membership/stewardship/participation NFTs         │
│                                                                 │
│  5. Assign Discord roles based on holdings                      │
│     └─> Sync @Member, @Steward roles automatically              │
│                                                                 │
│  6. Log verification event                                      │
│     └─> Audit trail without storing sensitive data              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Components

### Verification Bot (Discord)

```python
@bot.command(name="verify")
async def start_verification(ctx: Context):
    """Initiate wallet verification process."""

    # Generate unique verification session
    session_id = generate_session_id()
    nonce = generate_nonce()

    # Store session temporarily
    await store_session(session_id, {
        "discord_id": ctx.author.id,
        "nonce": nonce,
        "expires": datetime.now() + timedelta(minutes=15)
    })

    verification_url = f"{VERIFICATION_BASE_URL}?session={session_id}"

    # Send ephemeral message (only visible to user)
    await ctx.send(
        f"🔐 **Wallet Verification**\n\n"
        f"Click to connect your wallet and verify membership:\n"
        f"{verification_url}\n\n"
        f"This link expires in 15 minutes.",
        ephemeral=True
    )
```

### Signature Message

```python
def generate_signature_message(nonce: str, discord_id: str) -> str:
    """Generate message for wallet signature."""
    return f"""Re/acc Commons Verification

I am verifying my wallet for the Re/acc Commons Discord.

Discord User: {discord_id}
Nonce: {nonce}
Timestamp: {int(datetime.now().timestamp())}

This signature does not authorize any transactions.
"""
```

### Verification Endpoint

```python
@app.post("/api/verify")
async def verify_wallet(request: VerificationRequest):
    """Process wallet verification."""

    # Retrieve session
    session = await get_session(request.session_id)
    if not session or session["expires"] < datetime.now():
        raise HTTPException(400, "Session expired")

    # Verify signature
    message = generate_signature_message(
        session["nonce"],
        session["discord_id"]
    )

    recovered_address = recover_address(message, request.signature)

    if recovered_address.lower() != request.wallet_address.lower():
        raise HTTPException(400, "Invalid signature")

    # Store verified mapping
    await store_verification(
        discord_id=session["discord_id"],
        wallet_address=recovered_address,
        verified_at=datetime.now()
    )

    # Check NFT holdings and sync roles
    await sync_roles_from_nfts(session["discord_id"], recovered_address)

    # Clean up session
    await delete_session(request.session_id)

    return {"success": True, "wallet": recovered_address}
```

---

## Identity Mapping Database

```yaml
# Schema for identity mappings
identity_mapping:
  discord_id: string (primary key)
  wallet_address: string (indexed)
  verified_at: timestamp
  last_sync: timestamp

  # Never store:
  # - Private keys
  # - Personal information
  # - IP addresses

# Index for reverse lookups
wallet_to_discord:
  wallet_address: string (primary key)
  discord_id: string
```

---

## Role Sync Operations

```python
async def sync_roles_from_nfts(discord_id: str, wallet_address: str):
    """Sync Discord roles based on NFT holdings."""

    # Check NFT holdings
    membership = await verify_membership(wallet_address)
    stewardship = await verify_stewardship(wallet_address)
    participation = await verify_participation(wallet_address)
    agent_registration = await verify_agent_registration(wallet_address)

    # Get Discord member
    guild = bot.get_guild(GUILD_ID)
    member = await guild.fetch_member(discord_id)

    # Current roles
    current_roles = set(role.id for role in member.roles)
    target_roles = set(current_roles)

    # Apply NFT-based roles
    if stewardship.is_steward:
        target_roles.add(ROLE_STEWARD)
        target_roles.add(ROLE_MEMBER)
        target_roles.add(ROLE_PARTICIPANT)
    elif membership.is_member:
        target_roles.add(ROLE_MEMBER)
        target_roles.add(ROLE_PARTICIPANT)
        target_roles.discard(ROLE_STEWARD)
    elif participation.is_participant:
        target_roles.add(ROLE_PARTICIPANT)
        target_roles.discard(ROLE_MEMBER)
        target_roles.discard(ROLE_STEWARD)

    if agent_registration.is_registered:
        target_roles.add(ROLE_AGENT)

    # Calculate changes
    to_add = target_roles - current_roles
    to_remove = current_roles - target_roles

    # Apply changes
    for role_id in to_add:
        role = guild.get_role(role_id)
        await member.add_roles(role, reason="NFT verification sync")

    for role_id in to_remove:
        if role_id in [ROLE_MEMBER, ROLE_STEWARD]:  # Only remove NFT-based roles
            role = guild.get_role(role_id)
            await member.remove_roles(role, reason="NFT verification sync")

    # Update last sync time
    await update_last_sync(discord_id)

    await log_action("role_sync", discord_id, wallet_address, {
        "added": list(to_add),
        "removed": list(to_remove)
    })
```

---

## Periodic Re-verification

```python
async def periodic_verification_check():
    """
    Periodically check NFT holdings and sync roles.
    Run daily or on-demand.
    """

    all_verifications = await get_all_verifications()

    for verification in all_verifications:
        try:
            await sync_roles_from_nfts(
                verification.discord_id,
                verification.wallet_address
            )
        except Exception as e:
            await log_error(f"Sync failed for {verification.discord_id}", e)

    await log_action("periodic_sync_complete", len(all_verifications))

# Schedule: Run daily at midnight UTC
@scheduler.scheduled_job('cron', hour=0)
async def daily_verification_sync():
    await periodic_verification_check()
```

---

## Cross-Platform Queries

```python
async def get_wallet_for_discord(discord_id: str) -> Optional[str]:
    """Get wallet address for a Discord user."""
    verification = await get_verification_by_discord(discord_id)
    return verification.wallet_address if verification else None

async def get_discord_for_wallet(wallet_address: str) -> Optional[str]:
    """Get Discord ID for a wallet address."""
    verification = await get_verification_by_wallet(wallet_address)
    return verification.discord_id if verification else None

async def is_verified_member(discord_id: str) -> bool:
    """Check if Discord user is a verified Member."""
    wallet = await get_wallet_for_discord(discord_id)
    if not wallet:
        return False

    membership = await verify_membership(wallet)
    return membership.is_member
```

---

## Federation Identity

```python
async def verify_federated_identity(
    source_network: str,
    identity_attestation: IdentityAttestation
) -> FederatedIdentityResult:
    """
    Verify identity from a federated network.
    Used for Trust Bridge federations.
    """

    # Verify attestation signature from source network
    if not await verify_attestation_signature(source_network, identity_attestation):
        return FederatedIdentityResult(valid=False, reason="Invalid attestation")

    # Check federation agreement
    federation = await get_federation_agreement(source_network)
    if not federation or federation.type not in ["trust_bridge", "economic"]:
        return FederatedIdentityResult(
            valid=False,
            reason="Network not federated at trust level"
        )

    # Map to local identity if exists
    local_mapping = await get_federated_mapping(
        source_network,
        identity_attestation.source_id
    )

    return FederatedIdentityResult(
        valid=True,
        source_network=source_network,
        source_id=identity_attestation.source_id,
        local_id=local_mapping.local_id if local_mapping else None,
        trust_level=identity_attestation.trust_level
    )
```

---

## Privacy Considerations

```yaml
data_minimization:
  - Only store Discord ID and wallet address
  - No personal information collected
  - No IP logging for verification
  - Session data deleted after verification

transparency:
  - User initiates all verification
  - Clear messaging about what is stored
  - User can request data deletion

security:
  - Signatures verified server-side
  - No private keys ever transmitted
  - Time-limited verification sessions
  - Rate limiting on verification attempts
```

---

## Error Handling

```python
async def handle_verification_error(error: VerificationError, context: dict):
    if isinstance(error, SessionExpiredError):
        await send_ephemeral(
            context["discord_id"],
            "Verification session expired. Please start again with /verify"
        )
    elif isinstance(error, SignatureInvalidError):
        await send_ephemeral(
            context["discord_id"],
            "Signature verification failed. Please try again."
        )
    elif isinstance(error, WalletAlreadyLinkedError):
        await send_ephemeral(
            context["discord_id"],
            "This wallet is already linked to another Discord account."
        )
    else:
        await log_error(error, context)
        await send_ephemeral(
            context["discord_id"],
            "Verification failed. Please contact Stewardship."
        )
```
