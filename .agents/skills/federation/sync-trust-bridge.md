# Skill: Sync Trust Bridge

Maintain trust synchronization with federated networks via trust bridges.

---

## Trigger

```yaml
trigger:
  type: scheduled | webhook | event
  conditions:
    # Regular sync
    - type: scheduled
      frequency: hourly
      condition: has_active_trust_bridges

    # Partner-initiated sync
    - type: webhook
      source: federation_partner
      event: trust_update

    # Local trust change
    - type: event
      event_type: member_role_change
      condition: affects_federation_trust
```

---

## Required Permissions

- Read/write trust bridge state
- Authenticate with federation partners
- Update local trust records
- Post sync reports

---

## Trust Bridge Architecture

```yaml
trust_bridge:
  purpose: "Bidirectional trust verification and synchronization"

  components:
    - trust_anchors: "Cryptographic roots of trust"
    - attestation_chain: "Verifiable claims about members/agents"
    - revocation_list: "Revoked or suspended credentials"
    - capability_registry: "Cross-network permissions"

  sync_frequency:
    trust_anchors: daily
    attestations: hourly
    revocations: real_time
    capabilities: on_change
```

---

## Process

### Step 1: Initialize Sync Session

```python
async def initialize_trust_sync(
    partner_id: str
) -> SyncSession:
    """Initialize trust bridge sync session with partner."""

    # Get trust bridge configuration
    bridge = await get_trust_bridge(partner_id)

    if not bridge or bridge.status != "active":
        raise BridgeNotActiveError(partner_id)

    # Authenticate with partner
    session = await authenticate_bridge(
        partner_id=partner_id,
        endpoint=bridge.sync_endpoint,
        our_key=FEDERATION_PRIVATE_KEY
    )

    if not session.authenticated:
        await log_error("bridge_auth_failed", partner_id, session.error)
        raise BridgeAuthenticationError(session.error)

    # Get sync state
    our_state = await get_local_sync_state(partner_id)
    partner_state = await fetch_partner_sync_state(session)

    return SyncSession(
        partner_id=partner_id,
        session=session,
        our_state=our_state,
        partner_state=partner_state,
        sync_started=datetime.now()
    )
```

### Step 2: Sync Trust Anchors

```python
async def sync_trust_anchors(sync: SyncSession) -> AnchorSyncResult:
    """Synchronize trust anchor keys."""

    # Our current anchors
    our_anchors = await get_trust_anchors()

    # Partner's anchors
    partner_anchors = await fetch_anchors(
        sync.session,
        since=sync.partner_state.last_anchor_sync
    )

    updates = []

    for anchor in partner_anchors:
        # Verify anchor is signed by expected authority
        if not verify_anchor_signature(anchor, sync.session.partner_root_key):
            await log_warning("invalid_anchor_signature", anchor.id)
            continue

        # Check if we have this anchor
        existing = find_anchor(our_anchors, anchor.id)

        if not existing:
            # New anchor
            await store_trust_anchor(anchor, source=sync.partner_id)
            updates.append({"action": "added", "anchor": anchor.id})
        elif anchor.updated_at > existing.updated_at:
            # Updated anchor
            await update_trust_anchor(anchor)
            updates.append({"action": "updated", "anchor": anchor.id})

    # Push our anchors to partner
    our_updates = await get_anchor_updates_since(sync.our_state.last_anchor_sync)

    for anchor in our_updates:
        signed_anchor = sign_anchor(anchor, FEDERATION_PRIVATE_KEY)
        await push_anchor_to_partner(sync.session, signed_anchor)

    return AnchorSyncResult(
        received=len(partner_anchors),
        pushed=len(our_updates),
        updates=updates
    )
```

### Step 3: Sync Attestations

```python
async def sync_attestations(sync: SyncSession) -> AttestationSyncResult:
    """Synchronize member/agent attestations."""

    # Attestations are signed claims about member status
    # e.g., "Member X is a verified Steward in Network Y"

    # Get partner's new attestations
    partner_attestations = await fetch_attestations(
        sync.session,
        since=sync.partner_state.last_attestation_sync
    )

    imported = []
    rejected = []

    for attestation in partner_attestations:
        # Verify signature chain
        if not verify_attestation_chain(attestation, sync.session.trust_anchors):
            rejected.append({
                "attestation": attestation.id,
                "reason": "Invalid signature chain"
            })
            continue

        # Check if attestation subject is relevant to us
        if not is_relevant_attestation(attestation):
            continue

        # Store attestation
        await store_cross_network_attestation(
            attestation,
            source=sync.partner_id
        )
        imported.append(attestation.id)

        # Update local trust cache
        await update_trust_cache(
            subject=attestation.subject,
            network=sync.partner_id,
            claims=attestation.claims
        )

    # Push our attestations
    our_attestations = await get_attestation_updates_since(
        sync.our_state.last_attestation_sync
    )

    pushed = []
    for attestation in our_attestations:
        signed = sign_attestation(attestation, FEDERATION_PRIVATE_KEY)
        result = await push_attestation(sync.session, signed)
        if result.accepted:
            pushed.append(attestation.id)

    return AttestationSyncResult(
        imported=len(imported),
        rejected=len(rejected),
        pushed=len(pushed),
        details={"imported": imported, "rejected": rejected, "pushed": pushed}
    )
```

### Step 4: Sync Revocations

```python
async def sync_revocations(sync: SyncSession) -> RevocationSyncResult:
    """Synchronize revocation lists (critical for security)."""

    # Get partner's revocations
    partner_revocations = await fetch_revocations(
        sync.session,
        since=sync.partner_state.last_revocation_sync
    )

    applied = []

    for revocation in partner_revocations:
        # Verify revocation authority
        if not verify_revocation_authority(revocation, sync.session.trust_anchors):
            await log_warning("invalid_revocation_authority", revocation.id)
            continue

        # Apply revocation locally
        await apply_cross_network_revocation(revocation, sync.partner_id)
        applied.append(revocation.id)

        # If revocation affects active agent, take action
        affected_agent = await get_federation_agent_by_credential(
            revocation.credential_id
        )

        if affected_agent:
            await revoke_federation_agent(
                affected_agent.agent_id,
                reason=f"Credential revoked by source network: {revocation.reason}"
            )

    # Push our revocations
    our_revocations = await get_revocation_updates_since(
        sync.our_state.last_revocation_sync
    )

    for revocation in our_revocations:
        signed = sign_revocation(revocation, FEDERATION_PRIVATE_KEY)
        await push_revocation(sync.session, signed)

    return RevocationSyncResult(
        received=len(partner_revocations),
        applied=len(applied),
        pushed=len(our_revocations)
    )
```

### Step 5: Update Sync State

```python
async def finalize_sync(
    sync: SyncSession,
    anchor_result: AnchorSyncResult,
    attestation_result: AttestationSyncResult,
    revocation_result: RevocationSyncResult
):
    """Finalize sync and update state."""

    sync_record = TrustBridgeSyncRecord(
        id=generate_sync_id(),
        partner_id=sync.partner_id,
        started_at=sync.sync_started,
        completed_at=datetime.now(),
        anchors=anchor_result.to_dict(),
        attestations=attestation_result.to_dict(),
        revocations=revocation_result.to_dict(),
        success=True
    )

    # Update sync state
    await update_sync_state(sync.partner_id, {
        "last_anchor_sync": datetime.now().isoformat(),
        "last_attestation_sync": datetime.now().isoformat(),
        "last_revocation_sync": datetime.now().isoformat(),
        "last_sync_id": sync_record.id
    })

    # Store sync record
    await store_sync_record(sync_record)

    # Log summary
    total_changes = (
        len(anchor_result.updates) +
        attestation_result.imported +
        revocation_result.applied
    )

    if total_changes > 0:
        await post_to_channel(
            AGENT_COMMONS_CHANNEL_ID,
            f"🌐 **Trust Bridge Sync: {sync.partner_id}**\n\n"
            f"Anchors: +{len(anchor_result.updates)}\n"
            f"Attestations: +{attestation_result.imported}\n"
            f"Revocations: +{revocation_result.applied}"
        )

    return sync_record
```

---

## Real-Time Revocation Handling

```python
async def handle_realtime_revocation(event: RevocationEvent):
    """Handle real-time revocation push from partner."""

    # Verify immediately
    if not verify_revocation_signature(event.revocation, event.source_key):
        await log_warning("invalid_realtime_revocation", event.id)
        return

    # Apply immediately
    await apply_cross_network_revocation(
        event.revocation,
        source=event.source_network
    )

    # Take immediate action if affects active credentials
    affected = await get_affected_credentials(event.revocation.credential_id)

    for credential in affected:
        if credential.type == "agent":
            await revoke_federation_agent(
                credential.agent_id,
                reason=f"Real-time revocation: {event.revocation.reason}"
            )
        elif credential.type == "member":
            await flag_cross_network_member(
                credential.member_id,
                reason=f"Source network revoked: {event.revocation.reason}"
            )

    await log_action(
        "realtime_revocation_applied",
        event.id,
        {"affected": len(affected)}
    )
```

---

## Outputs

```yaml
outputs:
  on_sync_complete:
    - state: updated
    - record: stored
    - notification: posted if changes
    - log: sync_complete

  on_sync_failure:
    - notification: sent to stewardship
    - retry: scheduled
    - log: sync_failed

  on_realtime_revocation:
    - revocation: applied immediately
    - affected_credentials: revoked
    - log: realtime_revocation_applied
```

---

## Related Skills

- `verify-federation-agent.md` — Agent verification
- `route-cross-network.md` — Request routing
- `../knowledge-commons/federation-sync.md` — Content sync
