# Skill: Route Cross-Network Requests

Handle and route requests between federated networks.

---

## Trigger

```yaml
trigger:
  type: api_request | agent_message | webhook
  conditions:
    - type: api_request
      path_pattern: "/federation/*"
      authenticated: true

    - type: agent_message
      source_type: "federation_agent"
      destination: "reacc-commons"

    - type: webhook
      source: federation_partner
      event: cross_network_request
```

---

## Required Permissions

- Verify agent credentials
- Route to internal skills
- Forward to partner networks
- Log cross-network activity

---

## Request Types

```yaml
request_types:
  # Inbound from other networks
  inbound:
    - query_member_status
    - query_content
    - request_attestation
    - submit_proposal_reference
    - sync_knowledge

  # Outbound to other networks
  outbound:
    - verify_cross_network_member
    - fetch_cross_network_content
    - request_cross_attestation
    - broadcast_event
```

---

## Process

### Step 1: Authenticate Request

```python
async def authenticate_cross_network_request(
    request: CrossNetworkRequest
) -> AuthenticationResult:
    """Authenticate incoming cross-network request."""

    # Extract credentials
    token = request.headers.get("X-Federation-Token")
    signature = request.headers.get("X-Federation-Signature")
    source_network = request.headers.get("X-Source-Network")

    if not all([token, signature, source_network]):
        return AuthenticationResult(
            authenticated=False,
            error="Missing federation credentials"
        )

    # Verify source network is known
    federation = await get_federation_agreement(source_network)
    if not federation or federation.status != "active":
        return AuthenticationResult(
            authenticated=False,
            error=f"Unknown or inactive network: {source_network}"
        )

    # Verify token
    agent = await get_federation_agent_by_token(token)
    if not agent or agent.source_network != source_network:
        return AuthenticationResult(
            authenticated=False,
            error="Invalid or expired token"
        )

    # Verify request signature
    signature_valid = verify_request_signature(
        request=request,
        signature=signature,
        public_key=agent.public_key
    )

    if not signature_valid:
        return AuthenticationResult(
            authenticated=False,
            error="Invalid request signature"
        )

    return AuthenticationResult(
        authenticated=True,
        agent=agent,
        federation=federation,
        capabilities=agent.capabilities
    )
```

### Step 2: Authorize Request

```python
async def authorize_request(
    request: CrossNetworkRequest,
    auth: AuthenticationResult
) -> AuthorizationResult:
    """Check if request is authorized for this agent."""

    request_type = request.path.split("/")[-1]

    # Map request types to required capabilities
    capability_map = {
        "query_member_status": "read_members",
        "query_content": "read_content",
        "request_attestation": "request_attestations",
        "submit_proposal_reference": "write_references",
        "sync_knowledge": "sync_knowledge"
    }

    required_capability = capability_map.get(request_type)

    if not required_capability:
        return AuthorizationResult(
            authorized=False,
            error=f"Unknown request type: {request_type}"
        )

    if required_capability not in auth.capabilities:
        return AuthorizationResult(
            authorized=False,
            error=f"Missing capability: {required_capability}"
        )

    # Check rate limits
    rate_ok = await check_rate_limit(
        agent_id=auth.agent.agent_id,
        request_type=request_type
    )

    if not rate_ok:
        return AuthorizationResult(
            authorized=False,
            error="Rate limit exceeded"
        )

    return AuthorizationResult(
        authorized=True,
        request_type=request_type,
        capability=required_capability
    )
```

### Step 3: Route Inbound Request

```python
async def route_inbound_request(
    request: CrossNetworkRequest,
    auth: AuthenticationResult,
    authz: AuthorizationResult
) -> RouteResult:
    """Route authenticated request to appropriate handler."""

    handlers = {
        "query_member_status": handle_member_status_query,
        "query_content": handle_content_query,
        "request_attestation": handle_attestation_request,
        "submit_proposal_reference": handle_proposal_reference,
        "sync_knowledge": handle_knowledge_sync
    }

    handler = handlers.get(authz.request_type)

    if not handler:
        return RouteResult(
            success=False,
            error=f"No handler for: {authz.request_type}"
        )

    try:
        result = await handler(request.body, auth)
        return RouteResult(
            success=True,
            response=result
        )
    except Exception as e:
        await log_error("cross_network_handler_error", auth.agent.agent_id, e)
        return RouteResult(
            success=False,
            error=str(e)
        )


async def handle_member_status_query(
    body: dict,
    auth: AuthenticationResult
) -> dict:
    """Handle member status query from federation."""

    member_id = body.get("member_id")
    query_type = body.get("query_type", "basic")

    # Get member info
    member = await get_user(member_id)

    if not member:
        return {"found": False}

    # Determine what info to share based on federation agreement
    federation = auth.federation

    if query_type == "basic":
        return {
            "found": True,
            "member_id": member_id,
            "role": await get_highest_role(member_id),
            "status": "active"  # Or suspended, removed, etc.
        }

    elif query_type == "attestation" and "read_attestations" in auth.capabilities:
        # Return signed attestation
        attestation = await create_attestation(
            subject=member_id,
            claims={
                "role": await get_highest_role(member_id),
                "member_since": await get_member_since(member_id),
                "in_good_standing": await is_in_good_standing(member_id)
            },
            for_network=auth.federation.id
        )
        return {"found": True, "attestation": attestation}

    else:
        return {"found": True, "role": await get_highest_role(member_id)}


async def handle_content_query(
    body: dict,
    auth: AuthenticationResult
) -> dict:
    """Handle content query from federation."""

    content_id = body.get("content_id")
    content_type = body.get("content_type", "document")

    # Check if content is shareable
    content = await get_shareable_content(content_id, content_type)

    if not content:
        return {"found": False}

    # Check federation sharing permissions
    if not is_content_shared_with(content, auth.federation.id):
        return {
            "found": True,
            "accessible": False,
            "reason": "Not in shared namespace"
        }

    return {
        "found": True,
        "accessible": True,
        "content": content.to_federation_format()
    }
```

### Step 4: Handle Outbound Requests

```python
async def send_cross_network_request(
    target_network: str,
    request_type: str,
    body: dict
) -> CrossNetworkResponse:
    """Send request to another federated network."""

    # Get federation agreement
    federation = await get_federation_agreement(target_network)

    if not federation or federation.status != "active":
        raise FederationError(f"Cannot reach network: {target_network}")

    # Get our agent credentials for that network
    our_agent = await get_our_agent_for_network(target_network)

    if not our_agent:
        # Need to register first
        await trigger_skill("federation/register-with-network", {
            "target_network": target_network
        })
        raise FederationError("Agent registration pending")

    # Build request
    request = CrossNetworkRequest(
        method="POST",
        path=f"/federation/{request_type}",
        body=body,
        headers={
            "X-Federation-Token": our_agent.token,
            "X-Source-Network": "reacc-commons"
        }
    )

    # Sign request
    signature = sign_request(request, FEDERATION_PRIVATE_KEY)
    request.headers["X-Federation-Signature"] = signature

    # Send
    response = await http_post(
        f"{federation.api_endpoint}{request.path}",
        headers=request.headers,
        json=request.body,
        timeout=30
    )

    return CrossNetworkResponse(
        success=response.status == 200,
        data=response.json() if response.status == 200 else None,
        error=response.body if response.status != 200 else None
    )
```

### Step 5: Log and Monitor

```python
async def log_cross_network_activity(
    request: CrossNetworkRequest,
    auth: AuthenticationResult,
    result: RouteResult
):
    """Log cross-network activity for monitoring."""

    activity = CrossNetworkActivityLog(
        id=generate_activity_id(),
        timestamp=datetime.now(),
        direction="inbound",
        source_network=auth.federation.id if auth else "unknown",
        agent_id=auth.agent.agent_id if auth and auth.agent else "unknown",
        request_type=request.path.split("/")[-1],
        success=result.success,
        error=result.error if not result.success else None
    )

    await store_activity_log(activity)

    # Check for suspicious patterns
    suspicious = await detect_suspicious_activity(
        agent_id=auth.agent.agent_id if auth and auth.agent else None,
        source_network=auth.federation.id if auth else None
    )

    if suspicious:
        await alert_suspicious_federation_activity(suspicious)


async def detect_suspicious_activity(
    agent_id: Optional[str],
    source_network: Optional[str]
) -> Optional[SuspiciousActivity]:
    """Detect suspicious patterns in federation traffic."""

    if not agent_id:
        return None

    # High request volume
    recent_count = await count_recent_requests(agent_id, minutes=5)
    if recent_count > 100:
        return SuspiciousActivity(
            type="high_volume",
            agent_id=agent_id,
            details=f"{recent_count} requests in 5 minutes"
        )

    # Repeated failures
    recent_failures = await count_recent_failures(agent_id, minutes=10)
    if recent_failures > 20:
        return SuspiciousActivity(
            type="repeated_failures",
            agent_id=agent_id,
            details=f"{recent_failures} failures in 10 minutes"
        )

    # Unusual request patterns
    unusual = await detect_unusual_patterns(agent_id)
    if unusual:
        return SuspiciousActivity(
            type="unusual_pattern",
            agent_id=agent_id,
            details=unusual
        )

    return None
```

---

## Outputs

```yaml
outputs:
  on_successful_route:
    - response: returned to requestor
    - log: activity recorded
    - metrics: updated

  on_auth_failure:
    - response: 401 Unauthorized
    - log: auth failure recorded
    - alert: if repeated

  on_authz_failure:
    - response: 403 Forbidden
    - log: authz failure recorded

  on_rate_limit:
    - response: 429 Too Many Requests
    - log: rate limit recorded

  on_suspicious_activity:
    - alert: sent to stewardship
    - rate_limit: applied
    - log: suspicious activity flagged
```

---

## Related Skills

- `verify-federation-agent.md` — Agent verification
- `sync-trust-bridge.md` — Trust synchronization
- `../knowledge-commons/federation-sync.md` — Content sync
