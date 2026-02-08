# Integration: Agent Messaging Protocol

Standardized messaging protocol for agent-to-agent and agent-to-human communication.

---

## Purpose

Enable reliable, traceable communication between:
- Local agents within the Re/acc Commons
- Federation agents from partner networks
- Agents and human members
- Agents and external services

---

## Message Schema

### Standard Message Format

```yaml
message:
  id: string          # Unique message ID (UUID)
  timestamp: string   # ISO-8601 timestamp
  version: "1.0"      # Protocol version

  sender:
    type: "agent" | "human" | "system"
    id: string        # Agent ID or Discord ID
    network: string   # "reacc-commons" or federation network

  recipient:
    type: "agent" | "human" | "channel" | "broadcast"
    id: string        # Recipient ID
    network: string   # Target network

  content:
    type: string      # Message type (see below)
    payload: object   # Type-specific payload
    priority: "low" | "normal" | "high" | "urgent"

  metadata:
    correlation_id: string   # For tracking related messages
    reply_to: string         # ID of message being replied to
    expires_at: string       # Optional expiration
    signature: string        # Cryptographic signature
```

---

## Message Types

### Skill Invocation

```yaml
type: "skill_invocation"
payload:
  skill: string           # Skill path (e.g., "governance/track-consent")
  inputs: object          # Skill inputs
  options:
    async: boolean        # Run async (default: true)
    timeout_ms: number    # Timeout in milliseconds
    callback_channel: string  # Where to send result
```

### Skill Result

```yaml
type: "skill_result"
payload:
  skill: string
  invocation_id: string   # ID of original invocation
  status: "success" | "failure" | "timeout"
  result: object          # Skill output
  error: string | null    # Error message if failed
  duration_ms: number
```

### Event Notification

```yaml
type: "event"
payload:
  event_type: string      # Event type
  source: string          # Event source
  data: object            # Event data
  requires_action: boolean
```

### Consent Request

```yaml
type: "consent_request"
payload:
  request_type: string    # Type of consent needed
  description: string
  eligible_roles: string  # Roles eligible to participate
  options:
    - label: string
      action: string
      payload: object
  window_hours: number    # Consent window duration
  quorum: number          # Required consents
```

### Consent Response

```yaml
type: "consent_response"
payload:
  request_id: string
  response: string        # Selected option (consent, objection, concern)
  responder_id: string
  responder_role: string
  timestamp: string
```

### Federation Request

```yaml
type: "federation_request"
payload:
  request_type: string
  target_network: string
  body: object
  requires_response: boolean
  timeout_ms: number
```

### Federation Response

```yaml
type: "federation_response"
payload:
  request_id: string
  status: "success" | "error" | "timeout"
  body: object
  source_network: string
```

---

## Communication Channels

### Internal Message Queue

```python
class AgentMessageQueue:
    """Internal message queue for local agent communication."""

    async def publish(self, message: Message) -> str:
        """Publish message to queue."""

        # Validate message
        validate_message_schema(message)

        # Sign message
        message.metadata.signature = sign_message(
            message.to_bytes(),
            AGENT_PRIVATE_KEY
        )

        # Route based on recipient type
        if message.recipient.type == "agent":
            await self._route_to_agent(message)
        elif message.recipient.type == "channel":
            await self._route_to_channel(message)
        elif message.recipient.type == "broadcast":
            await self._broadcast(message)

        # Log
        await log_message(message)

        return message.id

    async def subscribe(
        self,
        agent_id: str,
        message_types: List[str],
        callback: Callable
    ):
        """Subscribe to messages of specific types."""

        subscription = Subscription(
            agent_id=agent_id,
            message_types=message_types,
            callback=callback
        )

        await self._register_subscription(subscription)

    async def acknowledge(self, message_id: str, agent_id: str):
        """Acknowledge message receipt."""

        await self._mark_acknowledged(message_id, agent_id)
```

### Discord Integration

```python
class DiscordMessageBridge:
    """Bridge between agent messages and Discord."""

    async def agent_to_discord(self, message: Message):
        """Convert agent message to Discord message."""

        if message.content.type == "consent_request":
            return await self._create_consent_embed(message)
        elif message.content.type == "event":
            return await self._create_event_message(message)
        else:
            return await self._create_standard_message(message)

    async def discord_to_agent(self, discord_msg: DiscordMessage) -> Message:
        """Convert Discord message to agent message format."""

        return Message(
            id=generate_message_id(),
            timestamp=datetime.now().isoformat(),
            sender={
                "type": "human",
                "id": str(discord_msg.author.id),
                "network": "reacc-commons"
            },
            recipient={
                "type": "agent",
                "id": determine_target_agent(discord_msg),
                "network": "reacc-commons"
            },
            content={
                "type": "human_input",
                "payload": {
                    "text": discord_msg.content,
                    "channel_id": str(discord_msg.channel.id),
                    "attachments": [a.url for a in discord_msg.attachments]
                },
                "priority": "normal"
            }
        )
```

### Federation Gateway

```python
class FederationMessageGateway:
    """Gateway for cross-network messaging."""

    async def send_to_network(
        self,
        target_network: str,
        message: Message
    ) -> str:
        """Send message to federated network."""

        # Get network endpoint
        federation = await get_federation_agreement(target_network)

        if not federation:
            raise FederationError(f"Unknown network: {target_network}")

        # Prepare federation envelope
        envelope = FederationEnvelope(
            source_network="reacc-commons",
            target_network=target_network,
            message=message,
            timestamp=datetime.now().isoformat()
        )

        # Sign envelope
        envelope.signature = sign_envelope(envelope, FEDERATION_PRIVATE_KEY)

        # Send
        response = await http_post(
            f"{federation.messaging_endpoint}/receive",
            json=envelope.to_dict(),
            headers={"X-Federation-Key": get_our_federation_key(target_network)}
        )

        return response.json().get("message_id")

    async def receive_from_network(
        self,
        envelope: FederationEnvelope
    ) -> Message:
        """Receive and validate message from federated network."""

        # Verify source network
        federation = await get_federation_agreement(envelope.source_network)

        if not federation:
            raise FederationError(f"Unknown source: {envelope.source_network}")

        # Verify signature
        if not verify_envelope_signature(
            envelope,
            federation.public_key
        ):
            raise FederationError("Invalid envelope signature")

        # Extract and route message
        message = envelope.message
        await self._route_incoming(message)

        return message
```

---

## Reliability Features

### Delivery Guarantees

```python
class ReliableDelivery:
    """Ensure reliable message delivery."""

    async def send_with_retry(
        self,
        message: Message,
        max_retries: int = 3,
        backoff_base: float = 1.0
    ) -> DeliveryResult:
        """Send message with exponential backoff retry."""

        for attempt in range(max_retries):
            try:
                result = await self._send(message)

                if result.delivered:
                    return result

            except TransientError:
                if attempt < max_retries - 1:
                    delay = backoff_base * (2 ** attempt)
                    await asyncio.sleep(delay)
                continue

        # Store in dead letter queue
        await self._dead_letter(message)

        return DeliveryResult(
            delivered=False,
            error="Max retries exceeded"
        )

    async def ensure_at_least_once(self, message: Message):
        """Ensure message is delivered at least once."""

        # Store message before sending
        await self._persist_message(message)

        # Send
        result = await self.send_with_retry(message)

        if result.delivered:
            # Mark as delivered
            await self._mark_delivered(message.id)
        else:
            # Queue for later retry
            await self._queue_for_retry(message)
```

### Idempotency

```python
class IdempotentProcessor:
    """Process messages idempotently."""

    async def process(self, message: Message) -> ProcessResult:
        """Process message ensuring idempotency."""

        # Check if already processed
        existing = await self._get_processed(message.id)

        if existing:
            return existing.result

        # Process
        result = await self._process_message(message)

        # Store result
        await self._store_processed(message.id, result)

        return result
```

---

## Security

### Message Signing

```python
def sign_message(message_bytes: bytes, private_key: str) -> str:
    """Sign message with agent's private key."""

    signature = ed25519_sign(message_bytes, private_key)
    return base64_encode(signature)


def verify_message_signature(
    message: Message,
    signature: str,
    public_key: str
) -> bool:
    """Verify message signature."""

    message_bytes = message.to_bytes()
    signature_bytes = base64_decode(signature)

    return ed25519_verify(message_bytes, signature_bytes, public_key)
```

### Message Encryption

```python
async def encrypt_for_recipient(
    message: Message,
    recipient_public_key: str
) -> EncryptedMessage:
    """Encrypt message for specific recipient."""

    # Generate ephemeral key pair
    ephemeral_private, ephemeral_public = generate_keypair()

    # Derive shared secret
    shared_secret = ecdh(ephemeral_private, recipient_public_key)

    # Encrypt payload
    encrypted_payload = aes_gcm_encrypt(
        json.dumps(message.content.payload),
        shared_secret
    )

    return EncryptedMessage(
        ephemeral_public=ephemeral_public,
        encrypted_payload=encrypted_payload,
        original_message_id=message.id
    )
```

---

## Monitoring

### Message Metrics

```yaml
metrics:
  message_sent_total:
    type: counter
    labels: [sender_type, recipient_type, message_type]

  message_received_total:
    type: counter
    labels: [sender_type, message_type]

  message_delivery_latency:
    type: histogram
    labels: [message_type, recipient_network]

  message_failures:
    type: counter
    labels: [message_type, failure_reason]

  dead_letter_queue_size:
    type: gauge
```

### Alerting

```yaml
alerts:
  high_message_latency:
    condition: message_delivery_latency_p99 > 5s
    severity: warning

  message_delivery_failures:
    condition: message_failures_rate > 0.05
    severity: critical

  dead_letter_queue_full:
    condition: dead_letter_queue_size > 1000
    severity: critical
```

---

## Usage Examples

### Triggering a Skill

```python
# Agent A triggers consent tracking
await message_queue.publish(Message(
    sender={"type": "agent", "id": "governance-agent", "network": "reacc-commons"},
    recipient={"type": "agent", "id": "consent-tracker", "network": "reacc-commons"},
    content={
        "type": "skill_invocation",
        "payload": {
            "skill": "governance/track-consent",
            "inputs": {
                "consent_process_id": "consent-abc123"
            }
        },
        "priority": "normal"
    }
))
```

### Initiating Consent Process

```python
# Agent posts proposal for consent (humans and agents participate)
await message_queue.publish(Message(
    sender={"type": "agent", "id": "treasury-agent", "network": "reacc-commons"},
    recipient={"type": "channel", "id": PROPOSALS_CHANNEL_ID, "network": "reacc-commons"},
    content={
        "type": "consent_request",
        "payload": {
            "request_type": "treasury_disbursement",
            "description": "10 ETH disbursement to 0x... for bounty completion",
            "eligible_roles": "@Member",
            "options": [
                {"label": "Consent", "action": "consent", "payload": {"consent_id": "xyz"}},
                {"label": "Object", "action": "object", "payload": {}},
                {"label": "Concern", "action": "concern", "payload": {}}
            ],
            "window_hours": 48,
            "quorum": 3
        },
        "priority": "high"
    }
))
# Note: Agent executes autonomously once consent window closes with sufficient consents
```

---

## Related

- `discord.md` — Discord integration
- `github.md` — GitHub integration
- Skills that use messaging: all skills in `.agents/skills/`
