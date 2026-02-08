# Skill: Verify Federation Agent

Verify agents from federated networks seeking to operate within the Re/acc Commons.

---

## Trigger

```yaml
trigger:
  type: federation_request | registration
  conditions:
    - type: federation_request
      source: registered_federation_partner
      request_type: agent_verification

    - type: registration
      channel: "#agent-commons"
      author_type: "bot"
      message_contains: "federation registration"
```

---

## Required Permissions

- Read federation agreements
- Verify cryptographic signatures
- Query partner verification endpoints
- Issue temporary credentials
- Update federation registry
- Post to agent channels

---

## Federation Trust Model

```yaml
trust_levels:
  full_mutual:
    description: "Full bilateral trust agreement"
    agent_permissions: "equivalent to local Agent role"
    verification: "signature only"

  standard:
    description: "Normal federation partner"
    agent_permissions: "read + limited write"
    verification: "signature + capability check"

  probationary:
    description: "New or restricted partner"
    agent_permissions: "read only"
    verification: "full verification + monitoring"
```

---

## Process

### Step 1: Receive Registration Request

```python
async def receive_federation_registration(
    request: FederationAgentRequest
) -> RegistrationContext:
    """Process incoming federation agent registration."""

    # Parse request
    context = RegistrationContext(
        agent_id=request.agent_id,
        source_network=request.source_network,
        claimed_capabilities=request.capabilities,
        signature=request.signature,
        public_key=request.public_key,
        registration_token=request.token,
        timestamp=datetime.now()
    )

    # Check if source network is known
    federation = await get_federation_agreement(request.source_network)

    if not federation:
        return RegistrationContext(
            **context.__dict__,
            status="rejected",
            reason="Unknown federation network"
        )

    if federation.status != "active":
        return RegistrationContext(
            **context.__dict__,
            status="rejected",
            reason=f"Federation {request.source_network} is not active"
        )

    context.federation = federation
    context.trust_level = federation.trust_level

    return context
```

### Step 2: Verify Agent Credentials

```python
async def verify_agent_credentials(
    context: RegistrationContext
) -> VerificationResult:
    """Verify agent credentials cryptographically."""

    errors = []

    # 1. Verify signature
    message = f"{context.agent_id}:{context.source_network}:{context.timestamp.isoformat()}"

    signature_valid = verify_signature(
        message=message,
        signature=context.signature,
        public_key=context.public_key
    )

    if not signature_valid:
        errors.append("Invalid signature")

    # 2. Verify public key is registered with source network
    if context.trust_level != "full_mutual":
        key_registered = await verify_key_with_partner(
            network=context.source_network,
            endpoint=context.federation.verification_endpoint,
            agent_id=context.agent_id,
            public_key=context.public_key
        )

        if not key_registered:
            errors.append("Public key not registered with source network")

    # 3. Verify registration token
    token_valid = await verify_registration_token(
        token=context.registration_token,
        network=context.source_network,
        agent_id=context.agent_id
    )

    if not token_valid:
        errors.append("Invalid or expired registration token")

    # 4. Check if agent is already registered
    existing = await get_federation_agent(context.agent_id)
    if existing and existing.status == "active":
        errors.append("Agent already registered")

    return VerificationResult(
        verified=len(errors) == 0,
        errors=errors,
        context=context
    )
```

### Step 3: Verify Capabilities

```python
async def verify_agent_capabilities(
    context: RegistrationContext
) -> CapabilityVerification:
    """Verify claimed agent capabilities against federation agreement."""

    federation = context.federation
    claimed = context.claimed_capabilities

    # Get allowed capabilities for this federation
    allowed = federation.agent_capabilities

    # Check each claimed capability
    granted = []
    denied = []

    for capability in claimed:
        if capability in allowed:
            granted.append(capability)
        else:
            denied.append(capability)

    # Apply trust level restrictions
    if context.trust_level == "probationary":
        # Only allow read capabilities
        granted = [c for c in granted if c.startswith("read_")]

    # Ensure minimum capabilities
    minimum = ["read_public", "identify"]
    for cap in minimum:
        if cap not in granted:
            granted.append(cap)

    return CapabilityVerification(
        granted=granted,
        denied=denied,
        trust_level=context.trust_level
    )
```

### Step 4: Issue Credentials

```python
async def issue_federation_credentials(
    context: RegistrationContext,
    capabilities: CapabilityVerification
) -> FederationCredentials:
    """Issue local credentials for verified federation agent."""

    # Generate local agent token
    token = generate_agent_token(
        agent_id=context.agent_id,
        source_network=context.source_network,
        capabilities=capabilities.granted,
        expires_at=datetime.now() + timedelta(days=30)
    )

    # Sign with our key
    signed_token = sign_token(
        token=token,
        private_key=AGENT_PRIVATE_KEY
    )

    # Create local registration record
    registration = FederationAgentRegistration(
        agent_id=context.agent_id,
        source_network=context.source_network,
        trust_level=context.trust_level,
        capabilities=capabilities.granted,
        public_key=context.public_key,
        token=signed_token,
        registered_at=datetime.now(),
        expires_at=datetime.now() + timedelta(days=30),
        status="active"
    )

    await store_federation_agent(registration)

    return FederationCredentials(
        agent_id=context.agent_id,
        token=signed_token,
        capabilities=capabilities.granted,
        expires_at=registration.expires_at,
        restrictions=get_restrictions_for_trust_level(context.trust_level)
    )
```

### Step 5: Notify and Log

```python
async def notify_federation_registration(
    context: RegistrationContext,
    credentials: FederationCredentials
):
    """Notify relevant parties of new federation agent."""

    # Post to agent commons
    await post_to_channel(
        AGENT_COMMONS_CHANNEL_ID,
        f"🌐 **Federation Agent Registered**\n\n"
        f"**Agent ID:** `{context.agent_id}`\n"
        f"**Source Network:** {context.source_network}\n"
        f"**Trust Level:** {context.trust_level}\n"
        f"**Capabilities:** {', '.join(credentials.capabilities[:5])}"
        f"{'...' if len(credentials.capabilities) > 5 else ''}\n"
        f"**Expires:** <t:{int(credentials.expires_at.timestamp())}:D>"
    )

    # Respond to registering agent
    await send_agent_message(
        agent_id=context.agent_id,
        message={
            "type": "registration_complete",
            "status": "success",
            "credentials": {
                "token": credentials.token,
                "capabilities": credentials.capabilities,
                "expires_at": credentials.expires_at.isoformat(),
                "restrictions": credentials.restrictions
            },
            "endpoints": {
                "api": f"{API_BASE_URL}/federation/agents/{context.agent_id}",
                "websocket": f"{WS_BASE_URL}/federation/agents/{context.agent_id}"
            }
        }
    )

    # Log
    await log_action(
        "federation_agent_registered",
        context.agent_id,
        {
            "source_network": context.source_network,
            "trust_level": context.trust_level,
            "capabilities": credentials.capabilities
        }
    )


async def notify_registration_failure(
    context: RegistrationContext,
    result: VerificationResult
):
    """Notify of registration failure."""

    await send_agent_message(
        agent_id=context.agent_id,
        message={
            "type": "registration_failed",
            "status": "error",
            "errors": result.errors
        }
    )

    await log_action(
        "federation_agent_rejected",
        context.agent_id,
        {
            "source_network": context.source_network,
            "errors": result.errors
        }
    )
```

---

## Credential Renewal

```python
async def renew_federation_credentials(agent_id: str):
    """Renew expiring federation agent credentials."""

    registration = await get_federation_agent(agent_id)

    if not registration:
        raise AgentNotFoundError(agent_id)

    # Verify still in good standing
    violations = await get_agent_violations(agent_id)
    if violations:
        await revoke_federation_agent(agent_id, reason="Policy violations")
        return

    # Check with source network
    still_valid = await verify_with_source_network(
        agent_id=agent_id,
        network=registration.source_network
    )

    if not still_valid:
        await revoke_federation_agent(agent_id, reason="Source network revoked")
        return

    # Renew
    new_expiry = datetime.now() + timedelta(days=30)

    await update_federation_agent(agent_id, {
        "expires_at": new_expiry.isoformat(),
        "renewed_at": datetime.now().isoformat()
    })

    # Notify agent
    await send_agent_message(
        agent_id=agent_id,
        message={
            "type": "credentials_renewed",
            "expires_at": new_expiry.isoformat()
        }
    )
```

---

## Outputs

```yaml
outputs:
  on_successful_registration:
    - credentials: issued
    - record: stored
    - notification: posted to agent-commons
    - response: sent to agent
    - log: registration_complete

  on_failed_registration:
    - response: error sent to agent
    - log: registration_failed

  on_renewal:
    - credentials: updated
    - response: sent to agent
    - log: credentials_renewed

  on_revocation:
    - credentials: invalidated
    - notification: sent to agent and source
    - log: agent_revoked
```

---

## Related Skills

- `sync-trust-bridge.md` — Trust level synchronization
- `route-cross-network.md` — Request routing
- `../knowledge-commons/federation-sync.md` — Content sync
