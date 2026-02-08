# NFT Contracts Integration Specification

Technical specification for minting and managing membership NFTs in the Re/acc Commons.

---

## Contract Architecture

```yaml
network: ethereum  # or preferred L2
contracts:
  membership_nft:
    name: "Re/acc Membership"
    symbol: "REACC-M"
    address: ${MEMBERSHIP_NFT_ADDRESS}
    standard: ERC-721

  stewardship_nft:
    name: "Re/acc Stewardship"
    symbol: "REACC-S"
    address: ${STEWARDSHIP_NFT_ADDRESS}
    standard: ERC-721
    features: [time_limited, burnable]

  participation_nft:
    name: "Re/acc Participation"
    symbol: "REACC-P"
    address: ${PARTICIPATION_NFT_ADDRESS}
    standard: ERC-721

  agent_registration:
    name: "Re/acc Agent Registry"
    symbol: "REACC-A"
    address: ${AGENT_REGISTRY_ADDRESS}
    standard: ERC-721
    features: [scope_metadata]
```

---

## Connection

```yaml
rpc_url: ${ETH_RPC_URL}
chain_id: 1  # or L2 chain ID
agent_wallet: ${AGENT_MINTER_ADDRESS}
private_key: ${AGENT_MINTER_KEY}  # Secure storage required
```

---

## Token Metadata Schema

### Membership NFT

```json
{
  "name": "Re/acc Commons Member #{{tokenId}}",
  "description": "Verified membership in the Re/acc Commons network nation.",
  "image": "ipfs://{{membershipImageCID}}",
  "external_url": "https://reacc.commons/member/{{address}}",
  "attributes": [
    {
      "trait_type": "Membrane",
      "value": "Inner Commons (2)"
    },
    {
      "trait_type": "Join Date",
      "display_type": "date",
      "value": {{joinTimestamp}}
    },
    {
      "trait_type": "Nominated By",
      "value": "{{nominatorAddress}}"
    },
    {
      "trait_type": "Consent Record",
      "value": "{{consentRecordHash}}"
    }
  ]
}
```

### Stewardship NFT

```json
{
  "name": "Re/acc Commons Steward #{{tokenId}}",
  "description": "Active Stewardship role in the Re/acc Commons.",
  "image": "ipfs://{{stewardshipImageCID}}",
  "external_url": "https://reacc.commons/steward/{{address}}",
  "attributes": [
    {
      "trait_type": "Membrane",
      "value": "Solidarity Economy (3)"
    },
    {
      "trait_type": "Term Start",
      "display_type": "date",
      "value": {{termStartTimestamp}}
    },
    {
      "trait_type": "Term End",
      "display_type": "date",
      "value": {{termEndTimestamp}}
    },
    {
      "trait_type": "Term Number",
      "display_type": "number",
      "value": {{termNumber}}
    },
    {
      "trait_type": "Status",
      "value": "Active"
    }
  ]
}
```

### Agent Registration Token

```json
{
  "name": "Re/acc Agent: {{agentName}}",
  "description": "Registered AI agent in the Re/acc Commons.",
  "image": "ipfs://{{agentImageCID}}",
  "external_url": "https://reacc.commons/agent/{{agentId}}",
  "attributes": [
    {
      "trait_type": "Agent Type",
      "value": "{{agentType}}"
    },
    {
      "trait_type": "Operator",
      "value": "{{operatorAddress}}"
    },
    {
      "trait_type": "Registration Date",
      "display_type": "date",
      "value": {{registrationTimestamp}}
    },
    {
      "trait_type": "Scope Hash",
      "value": "{{scopeConfigHash}}"
    }
  ],
  "scope": {
    "channels": ["{{authorizedChannels}}"],
    "circles": ["{{authorizedCircles}}"],
    "governance": ["{{governanceDomains}}"],
    "treasury": "proposer"
  }
}
```

---

## Minting Operations

### Mint Membership NFT

```python
async def mint_membership_nft(
    recipient: str,
    consent_record: ConsentRecord,
    nominator: str
) -> MintResult:
    """
    Mint Membership NFT to new Member.

    TRIGGER: Member consent process completes successfully.
    PRECONDITION: Consent must be verified complete (autonomous verification).
    """

    # Verify consent is complete
    if not consent_record.is_complete:
        raise ConsentIncompleteError(consent_record.id)

    # Generate metadata
    metadata = generate_membership_metadata(
        recipient=recipient,
        join_timestamp=int(datetime.now().timestamp()),
        nominator=nominator,
        consent_hash=consent_record.hash
    )

    # Upload metadata to IPFS
    metadata_uri = await upload_to_ipfs(metadata)

    # Mint NFT
    tx = await membership_contract.functions.mint(
        recipient,
        metadata_uri
    ).build_transaction({
        'from': AGENT_WALLET,
        'nonce': await web3.eth.get_transaction_count(AGENT_WALLET),
        'gas': 200000,
        'gasPrice': await get_gas_price()
    })

    signed = web3.eth.account.sign_transaction(tx, PRIVATE_KEY)
    tx_hash = await web3.eth.send_raw_transaction(signed.rawTransaction)
    receipt = await web3.eth.wait_for_transaction_receipt(tx_hash)

    if receipt.status == 1:
        token_id = extract_token_id(receipt)

        await log_action("nft_minted", "membership", token_id, recipient)

        # Notify Discord
        await notify_commons_floor(
            f"🎉 **New Member**\n"
            f"<@{get_discord_id(recipient)}> has joined the Inner Commons!\n"
            f"Membership NFT: `{token_id}`"
        )

        return MintResult(
            success=True,
            token_id=token_id,
            tx_hash=tx_hash.hex(),
            metadata_uri=metadata_uri
        )
    else:
        await notify_stewardship(f"⚠️ Membership mint failed for {recipient}")
        return MintResult(success=False, tx_hash=tx_hash.hex())
```

### Mint Stewardship NFT

```python
async def mint_stewardship_nft(
    recipient: str,
    consent_record: ConsentRecord,
    term_end: datetime
) -> MintResult:
    """
    Mint time-limited Stewardship NFT.

    TRIGGER: Steward selection consent completes.
    NOTE: This NFT has an expiration and should be burned on rotation.
    """

    metadata = generate_stewardship_metadata(
        recipient=recipient,
        term_start=int(datetime.now().timestamp()),
        term_end=int(term_end.timestamp())
    )

    metadata_uri = await upload_to_ipfs(metadata)

    # Mint with term end timestamp
    tx = await stewardship_contract.functions.mintWithExpiry(
        recipient,
        metadata_uri,
        int(term_end.timestamp())
    ).build_transaction({
        'from': AGENT_WALLET,
        'nonce': await web3.eth.get_transaction_count(AGENT_WALLET),
        'gas': 250000,
        'gasPrice': await get_gas_price()
    })

    signed = web3.eth.account.sign_transaction(tx, PRIVATE_KEY)
    tx_hash = await web3.eth.send_raw_transaction(signed.rawTransaction)
    receipt = await web3.eth.wait_for_transaction_receipt(tx_hash)

    if receipt.status == 1:
        token_id = extract_token_id(receipt)

        await log_action("nft_minted", "stewardship", token_id, recipient)

        # Trigger multi-sig signer update
        await trigger_skill("treasury/add-signer", {
            "new_signer": recipient,
            "consent_reference": consent_record.id
        })

        return MintResult(
            success=True,
            token_id=token_id,
            tx_hash=tx_hash.hex(),
            expires_at=term_end
        )
    else:
        return MintResult(success=False, tx_hash=tx_hash.hex())
```

### Burn Stewardship NFT

```python
async def burn_stewardship_nft(
    token_id: int,
    reason: str
) -> BurnResult:
    """
    Burn Stewardship NFT on rotation or removal.

    TRIGGER: Steward rotation or removal process.
    """

    # Get current owner
    owner = await stewardship_contract.functions.ownerOf(token_id).call()

    tx = await stewardship_contract.functions.burn(token_id).build_transaction({
        'from': AGENT_WALLET,
        'nonce': await web3.eth.get_transaction_count(AGENT_WALLET),
        'gas': 100000,
        'gasPrice': await get_gas_price()
    })

    signed = web3.eth.account.sign_transaction(tx, PRIVATE_KEY)
    tx_hash = await web3.eth.send_raw_transaction(signed.rawTransaction)
    receipt = await web3.eth.wait_for_transaction_receipt(tx_hash)

    if receipt.status == 1:
        await log_action("nft_burned", "stewardship", token_id, reason)

        # Trigger multi-sig signer removal
        await trigger_skill("treasury/remove-signer", {
            "signer": owner,
            "reason": reason
        })

        return BurnResult(success=True, tx_hash=tx_hash.hex())
    else:
        return BurnResult(success=False, tx_hash=tx_hash.hex())
```

### Register Agent

```python
async def mint_agent_registration(
    operator: str,
    agent_id: str,
    agent_name: str,
    scope: AgentScope,
    consent_record: ConsentRecord
) -> MintResult:
    """
    Mint Agent Registration Token.

    TRIGGER: Agent registration consent completes.
    """

    # Hash scope for on-chain reference
    scope_hash = hash_scope(scope)

    metadata = generate_agent_metadata(
        agent_id=agent_id,
        agent_name=agent_name,
        operator=operator,
        scope=scope,
        scope_hash=scope_hash
    )

    metadata_uri = await upload_to_ipfs(metadata)

    tx = await agent_registry_contract.functions.register(
        operator,
        agent_id,
        scope_hash,
        metadata_uri
    ).build_transaction({
        'from': AGENT_WALLET,
        'nonce': await web3.eth.get_transaction_count(AGENT_WALLET),
        'gas': 300000,
        'gasPrice': await get_gas_price()
    })

    signed = web3.eth.account.sign_transaction(tx, PRIVATE_KEY)
    tx_hash = await web3.eth.send_raw_transaction(signed.rawTransaction)
    receipt = await web3.eth.wait_for_transaction_receipt(tx_hash)

    if receipt.status == 1:
        token_id = extract_token_id(receipt)

        await log_action("agent_registered", agent_id, token_id, scope_hash)

        return MintResult(
            success=True,
            token_id=token_id,
            tx_hash=tx_hash.hex(),
            agent_id=agent_id
        )
    else:
        return MintResult(success=False, tx_hash=tx_hash.hex())
```

---

## Verification Operations

### Verify NFT Ownership

```python
async def verify_membership(address: str) -> MembershipStatus:
    """Check if address holds valid Membership NFT."""

    balance = await membership_contract.functions.balanceOf(address).call()

    if balance > 0:
        # Get token details
        token_id = await membership_contract.functions.tokenOfOwnerByIndex(
            address, 0
        ).call()
        token_uri = await membership_contract.functions.tokenURI(token_id).call()
        metadata = await fetch_metadata(token_uri)

        return MembershipStatus(
            is_member=True,
            token_id=token_id,
            join_date=metadata["attributes"]["Join Date"],
            metadata=metadata
        )

    return MembershipStatus(is_member=False)

async def verify_stewardship(address: str) -> StewardshipStatus:
    """Check if address holds valid (non-expired) Stewardship NFT."""

    balance = await stewardship_contract.functions.balanceOf(address).call()

    if balance > 0:
        token_id = await stewardship_contract.functions.tokenOfOwnerByIndex(
            address, 0
        ).call()

        # Check expiry
        expiry = await stewardship_contract.functions.expiryOf(token_id).call()
        is_expired = expiry < int(datetime.now().timestamp())

        if is_expired:
            # Trigger burn of expired token
            await burn_stewardship_nft(token_id, "expired")
            return StewardshipStatus(is_steward=False, reason="expired")

        return StewardshipStatus(
            is_steward=True,
            token_id=token_id,
            term_end=datetime.fromtimestamp(expiry)
        )

    return StewardshipStatus(is_steward=False)
```

---

## Discord Integration

```python
async def sync_discord_role_from_nft(
    wallet_address: str,
    discord_user_id: str
):
    """
    Sync Discord roles based on NFT holdings.
    Called by Discord verification bot.
    """

    # Check each NFT type
    membership = await verify_membership(wallet_address)
    stewardship = await verify_stewardship(wallet_address)

    # Update Discord roles accordingly
    if stewardship.is_steward:
        await assign_discord_role(discord_user_id, ROLE_STEWARD)
        await assign_discord_role(discord_user_id, ROLE_MEMBER)
    elif membership.is_member:
        await assign_discord_role(discord_user_id, ROLE_MEMBER)
        await remove_discord_role(discord_user_id, ROLE_STEWARD)

    await log_action("discord_role_synced", discord_user_id, wallet_address)
```

---

## Error Handling

```python
async def handle_nft_error(error: ContractError, context: ActionContext):
    if "insufficient funds" in str(error).lower():
        await notify_stewardship(
            f"⚠️ Agent wallet needs ETH for gas\n"
            f"Wallet: {AGENT_WALLET}\n"
            f"Action: {context.action}"
        )
    elif "already minted" in str(error).lower():
        await log_warning(f"Duplicate mint attempted: {context.recipient}")
    elif "not owner" in str(error).lower():
        await log_error(f"Unauthorized burn attempt: {context.token_id}")
    else:
        await log_error(error, context)
        raise
```
