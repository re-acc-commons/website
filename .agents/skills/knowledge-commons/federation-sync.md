# Skill: Federation Sync

Synchronize content with federated networks via trust bridges.

---

## Trigger

```yaml
trigger:
  type: scheduled | webhook | manual
  conditions:
    # Scheduled sync with active federations
    - type: scheduled
      frequency: daily
      condition: has_active_federation_agreements

    # Webhook from federated network
    - type: webhook
      source: federation_partner
      event: content_updated

    # Manual trigger for specific sync
    - type: manual
      command: "!sync-federation [partner]"
```

---

## Required Permissions

- Read federation agreements
- Read/write shared content
- Authenticate with federation partners
- Post sync reports

---

## Federation Architecture

```yaml
federation_model:
  trust_type: bilateral
  sync_scope:
    - shared_essays
    - cross_references
    - protocol_adoptions
    - member_verifications

  verification:
    - cryptographic_signatures
    - multi-sig_attestations
    - agent_registration_tokens
```

---

## Process

### Step 1: Load Federation Agreements

```python
async def load_active_federations() -> List[FederationAgreement]:
    """Load all active federation agreements."""

    agreements_path = "5. Federation/Agreements/"

    agreement_files = await list_files(
        repo="reacc-commons-constitution",
        path=agreements_path,
        pattern="*.md"
    )

    active = []

    for file in agreement_files:
        content = await read_file(
            repo="reacc-commons-constitution",
            path=file
        )

        frontmatter = parse_frontmatter(content)

        if frontmatter.get("status") == "active":
            active.append(FederationAgreement(
                id=frontmatter.get("id"),
                partner=frontmatter.get("partner"),
                partner_endpoint=frontmatter.get("api_endpoint"),
                shared_namespaces=frontmatter.get("shared_namespaces", []),
                sync_direction=frontmatter.get("sync_direction", "bidirectional"),
                trust_level=frontmatter.get("trust_level", "standard"),
                signing_keys=frontmatter.get("signing_keys", []),
                last_sync=frontmatter.get("last_sync"),
                content=content
            ))

    return active
```

### Step 2: Authenticate with Partner

```python
async def authenticate_with_partner(
    agreement: FederationAgreement
) -> AuthenticatedSession:
    """Establish authenticated connection with federation partner."""

    # Generate challenge
    challenge = generate_challenge()

    # Sign with agent key
    signature = sign_message(
        message=challenge,
        private_key=AGENT_PRIVATE_KEY
    )

    # Present to partner
    response = await http_post(
        f"{agreement.partner_endpoint}/federation/authenticate",
        json={
            "commons_id": "reacc-commons",
            "agent_id": AGENT_ID,
            "challenge": challenge,
            "signature": signature,
            "agreement_id": agreement.id
        }
    )

    if response.status != 200:
        raise AuthenticationError(
            f"Failed to authenticate with {agreement.partner}: {response.body}"
        )

    return AuthenticatedSession(
        partner=agreement.partner,
        session_token=response.json()["session_token"],
        expires_at=response.json()["expires_at"],
        permissions=response.json()["permissions"]
    )
```

### Step 3: Sync Content

```python
async def sync_content(
    agreement: FederationAgreement,
    session: AuthenticatedSession
) -> SyncResult:
    """Synchronize content with federation partner."""

    results = {
        "pulled": [],
        "pushed": [],
        "conflicts": [],
        "errors": []
    }

    for namespace in agreement.shared_namespaces:
        if agreement.sync_direction in ["bidirectional", "pull"]:
            pull_result = await pull_from_partner(
                session, namespace, agreement
            )
            results["pulled"].extend(pull_result.items)
            results["conflicts"].extend(pull_result.conflicts)

        if agreement.sync_direction in ["bidirectional", "push"]:
            push_result = await push_to_partner(
                session, namespace, agreement
            )
            results["pushed"].extend(push_result.items)
            results["errors"].extend(push_result.errors)

    return SyncResult(**results)


async def pull_from_partner(
    session: AuthenticatedSession,
    namespace: str,
    agreement: FederationAgreement
) -> PullResult:
    """Pull content from federation partner."""

    # Get changes since last sync
    last_sync = agreement.last_sync or "1970-01-01T00:00:00Z"

    response = await http_get(
        f"{agreement.partner_endpoint}/federation/content/{namespace}",
        headers={"Authorization": f"Bearer {session.session_token}"},
        params={"since": last_sync}
    )

    items = []
    conflicts = []

    for item in response.json()["items"]:
        # Verify signature
        if not verify_content_signature(item, agreement.signing_keys):
            conflicts.append(ContentConflict(
                item=item,
                reason="Invalid signature"
            ))
            continue

        # Check for local version
        local_version = await get_local_version(namespace, item["id"])

        if local_version:
            # Check for conflict
            if local_version.modified > item["modified"]:
                conflicts.append(ContentConflict(
                    item=item,
                    local=local_version,
                    reason="Local version is newer"
                ))
                continue

        # Store content
        await store_federated_content(namespace, item, agreement.partner)
        items.append(item)

    return PullResult(items=items, conflicts=conflicts)


async def push_to_partner(
    session: AuthenticatedSession,
    namespace: str,
    agreement: FederationAgreement
) -> PushResult:
    """Push content to federation partner."""

    # Get local changes since last sync
    last_sync = agreement.last_sync or "1970-01-01T00:00:00Z"

    local_changes = await get_local_changes(namespace, since=last_sync)

    items = []
    errors = []

    for item in local_changes:
        # Sign content
        signed_item = sign_content(item, AGENT_PRIVATE_KEY)

        # Push to partner
        response = await http_post(
            f"{agreement.partner_endpoint}/federation/content/{namespace}",
            headers={"Authorization": f"Bearer {session.session_token}"},
            json=signed_item
        )

        if response.status == 200:
            items.append(item)
        else:
            errors.append(PushError(
                item=item,
                error=response.body
            ))

    return PushResult(items=items, errors=errors)
```

### Step 4: Handle Cross-References

```python
async def sync_cross_references(
    agreement: FederationAgreement,
    session: AuthenticatedSession
):
    """Sync wiki-link cross-references between networks."""

    # Get our outbound references to partner
    our_refs = await get_outbound_references(agreement.partner)

    # Get partner's references to us
    response = await http_get(
        f"{agreement.partner_endpoint}/federation/references/reacc-commons",
        headers={"Authorization": f"Bearer {session.session_token}"}
    )
    partner_refs = response.json()["references"]

    # Update our reference index
    ref_index = await load_reference_index()

    for ref in partner_refs:
        ref_index[f"{agreement.partner}:{ref['source']}"] = {
            "target": ref["target"],
            "type": ref["type"],
            "verified": verify_reference_signature(ref, agreement.signing_keys)
        }

    await save_reference_index(ref_index)

    # Push our references
    await http_post(
        f"{agreement.partner_endpoint}/federation/references/reacc-commons",
        headers={"Authorization": f"Bearer {session.session_token}"},
        json={"references": sign_references(our_refs)}
    )
```

### Step 5: Record Sync and Report

```python
async def record_sync_result(
    agreement: FederationAgreement,
    result: SyncResult
):
    """Record sync result and update last_sync."""

    # Update agreement with last_sync
    await update_file(
        repo="reacc-commons-constitution",
        path=f"5. Federation/Agreements/{agreement.id}.md",
        updates={"last_sync": datetime.now().isoformat()}
    )

    # Create sync log entry
    log_entry = f"""---
type: federation_sync
partner: {agreement.partner}
timestamp: {datetime.now().isoformat()}
---

# Federation Sync: {agreement.partner}

## Summary

| Metric | Count |
|--------|-------|
| Pulled | {len(result.pulled)} |
| Pushed | {len(result.pushed)} |
| Conflicts | {len(result.conflicts)} |
| Errors | {len(result.errors)} |

## Details

### Pulled Content
{chr(10).join(f"- {item['id']}: {item['title']}" for item in result.pulled) or "None"}

### Pushed Content
{chr(10).join(f"- {item['id']}: {item['title']}" for item in result.pushed) or "None"}

### Conflicts
{format_conflicts(result.conflicts) or "None"}

### Errors
{format_errors(result.errors) or "None"}
"""

    await write_file(
        repo="reacc-commons-constitution",
        path=f"Records/Federation/{agreement.id}-{datetime.now().strftime('%Y%m%d')}.md",
        content=log_entry,
        message=f"Federation sync: {agreement.partner}"
    )

    # Notify if significant
    if result.conflicts or result.errors:
        await post_to_channel(
            STEWARDSHIP_CHANNEL_ID,
            f"⚠️ **Federation Sync Issues**\n\n"
            f"Partner: {agreement.partner}\n"
            f"Conflicts: {len(result.conflicts)}\n"
            f"Errors: {len(result.errors)}\n\n"
            f"See sync log for details."
        )
```

---

## Outputs

```yaml
outputs:
  on_success:
    - content: synchronized
    - references: updated
    - log: sync recorded
    - agreement: last_sync updated

  on_conflict:
    - notification: sent to stewardship
    - log: conflicts recorded

  on_auth_failure:
    - notification: sent to stewardship
    - log: auth_failed
```

---

## Autonomous Execution

**Fully autonomous:**
- Regular sync with active partners
- Content signature verification
- Reference updates
- Routine federation operations

**Human participation (via consent process):**
- Conflict resolution (humans and agents participate)
- New federation agreement approval (full commons consent)
- Trust level changes (consent process)

---

## Related Skills

- `index-content.md` — Index federated content
- `../membrane-crossing/register-agent.md` — Federation agent verification
