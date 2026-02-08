# Skill: Process Concern

Receive and process accountability concerns from Commons members.

---

## Trigger

```yaml
trigger:
  type: message_created | reaction_add | dm_received
  conditions:
    # Direct message to agent
    - type: dm_received
      message_contains: ["concern", "issue", "accountability", "problem"]

    # Concern reaction on message
    - type: reaction_add
      emoji: "⚠️"
      reactor_has_role: "@Participant" OR "@Member"

    # Dedicated concern form/command
    - type: message_created
      message_contains: "!concern"
```

---

## Required Permissions

- Read DMs
- Create private threads
- Post to Stewardship channel
- Store concern records
- Send notifications

---

## Concern Categories

```yaml
categories:
  behavioral:
    description: "Conduct not aligned with Commons values"
    examples:
      - "Disrespectful communication"
      - "Failure to fulfill commitments"
      - "Violating consent process"
    initial_response: facilitated_dialogue

  structural:
    description: "Issues with roles, processes, or resources"
    examples:
      - "Role not functioning as intended"
      - "Protocol causing problems"
      - "Resource allocation concerns"
    initial_response: working_circle_review

  safety:
    description: "Threats to member wellbeing or Commons integrity"
    examples:
      - "Harassment"
      - "Privacy violations"
      - "Bad faith actions"
    initial_response: immediate_stewardship
```

---

## Process

### Step 1: Receive Concern

```python
async def receive_concern(event: ConcernEvent) -> ConcernRecord:
    """Receive and categorize an incoming concern."""

    # Determine source
    if event.type == "dm_received":
        reporter_id = event.author.id
        content = event.content
        context = None
    elif event.type == "reaction_add":
        reporter_id = event.reactor.id
        content = None  # Need to prompt for details
        context = event.message
    else:
        reporter_id = event.author.id
        content = parse_concern_command(event.content)
        context = event.message

    # Create initial record
    concern = ConcernRecord(
        id=generate_concern_id(),
        reporter_id=reporter_id,
        reported_at=datetime.now(),
        status="received",
        category=None,  # To be determined
        subject_id=None,  # To be determined if person-related
        description=content,
        context_message_id=context.id if context else None,
        context_channel_id=context.channel.id if context else None,
        confidential=True  # Default to confidential
    )

    await store_concern(concern)

    # Acknowledge receipt
    await send_dm(
        reporter_id,
        f"Thank you for raising this concern. I've recorded it as `{concern.id}`.\n\n"
        f"To help me route this appropriately, I have a few questions.\n\n"
        f"**1. What category best fits your concern?**\n"
        f"- 🧑 **Behavioral**: About someone's conduct\n"
        f"- 🔧 **Structural**: About processes, roles, or resources\n"
        f"- 🔒 **Safety**: About wellbeing or Commons integrity\n\n"
        f"Reply with the emoji or word that fits best."
    )

    return concern
```

### Step 2: Gather Details

```python
async def gather_concern_details(
    concern_id: str,
    reporter_response: Message
) -> ConcernDetails:
    """Gather additional details through conversation."""

    concern = await get_concern(concern_id)
    response = reporter_response.content.lower()

    # Categorize
    if any(word in response for word in ["behavioral", "🧑", "conduct", "person"]):
        category = "behavioral"
    elif any(word in response for word in ["structural", "🔧", "process", "role"]):
        category = "structural"
    elif any(word in response for word in ["safety", "🔒", "wellbeing", "urgent"]):
        category = "safety"
    else:
        # Ask again or default
        await send_dm(
            concern.reporter_id,
            "I didn't catch the category. Let me default to 'structural' for now. "
            "A Steward can recategorize if needed."
        )
        category = "structural"

    await update_concern(concern_id, {"category": category})

    # Category-specific questions
    if category == "behavioral":
        await send_dm(
            concern.reporter_id,
            f"For a **behavioral** concern:\n\n"
            f"**2. Who is this about?** (You can provide a Discord @mention or username)\n\n"
            f"**3. Please describe the specific behavior you observed.**\n\n"
            f"**4. Would you like to:**\n"
            f"- 🗣️ Have a facilitated dialogue with this person\n"
            f"- 📝 Submit anonymously to Stewardship\n"
            f"- 🤝 Request mediation\n\n"
            f"Take your time. Your response will be kept confidential unless you choose otherwise."
        )

    elif category == "structural":
        await send_dm(
            concern.reporter_id,
            f"For a **structural** concern:\n\n"
            f"**2. What role, process, or resource is this about?**\n\n"
            f"**3. Please describe the issue you've observed.**\n\n"
            f"**4. Do you have suggestions for improvement?**\n\n"
            f"This will be routed to the appropriate Working Circle or Stewardship."
        )

    elif category == "safety":
        # Immediate escalation
        await immediate_safety_escalation(concern)
        await send_dm(
            concern.reporter_id,
            f"🔒 **Safety concerns are taken seriously.**\n\n"
            f"I've immediately notified Stewardship. A Steward will reach out to you directly.\n\n"
            f"If you're in immediate danger, please also contact appropriate authorities.\n\n"
            f"Would you like to provide any additional context while you wait?"
        )

    return await get_concern(concern_id)


async def immediate_safety_escalation(concern: ConcernRecord):
    """Immediately escalate safety concerns."""

    stewards = await get_steward_ids()

    await post_to_channel(
        STEWARDSHIP_CHANNEL_ID,
        f"🚨 **Safety Concern Reported**\n\n"
        f"{' '.join(f'<@{s}>' for s in stewards)}\n\n"
        f"A safety concern has been raised and requires immediate attention.\n\n"
        f"**Concern ID:** `{concern.id}`\n"
        f"**Reporter:** <@{concern.reporter_id}>\n"
        f"**Time:** {concern.reported_at.strftime('%Y-%m-%d %H:%M UTC')}\n\n"
        f"Please DM the reporter to gather details and respond appropriately."
    )

    await update_concern(concern.id, {
        "status": "escalated_safety",
        "escalated_at": datetime.now().isoformat()
    })
```

### Step 3: Process Detailed Response

```python
async def process_detailed_response(
    concern_id: str,
    details: Message
):
    """Process the detailed concern response."""

    concern = await get_concern(concern_id)
    content = details.content

    # Extract subject if mentioned
    subject_mention = extract_mention(content)
    if subject_mention:
        await update_concern(concern_id, {"subject_id": subject_mention})

    # Store full description
    await update_concern(concern_id, {
        "description": concern.description + "\n\n" + content if concern.description else content,
        "status": "details_gathered"
    })

    # Determine response preference
    response_pref = detect_response_preference(content)

    if response_pref == "facilitated_dialogue":
        await initiate_facilitated_dialogue(concern)
    elif response_pref == "anonymous":
        await submit_anonymous_to_stewardship(concern)
    elif response_pref == "mediation":
        await request_mediation(concern)
    else:
        # Ask for preference
        await send_dm(
            concern.reporter_id,
            f"Thank you for the details.\n\n"
            f"How would you like to proceed?\n"
            f"- 🗣️ **Facilitated dialogue**: You and the other party meet with a facilitator\n"
            f"- 📝 **Anonymous submission**: Your identity is kept from the subject\n"
            f"- 🤝 **Mediation**: A neutral third party helps find resolution\n"
        )
```

### Step 4: Route to Resolution

```python
async def initiate_facilitated_dialogue(concern: ConcernRecord):
    """Set up facilitated dialogue between parties."""

    # Find available facilitator (Steward or designated Member)
    facilitator = await find_facilitator(
        exclude=[concern.reporter_id, concern.subject_id]
    )

    if not facilitator:
        await escalate_to_stewardship(concern, reason="No facilitator available")
        return

    # Notify facilitator
    await send_dm(
        facilitator,
        f"**Facilitation Request**\n\n"
        f"A facilitated dialogue has been requested.\n\n"
        f"**Concern ID:** `{concern.id}`\n"
        f"**Category:** {concern.category}\n"
        f"**Party 1:** <@{concern.reporter_id}>\n"
        f"**Party 2:** <@{concern.subject_id}>\n\n"
        f"Please confirm you can facilitate by reacting ✅, or decline with ❌."
    )

    await update_concern(concern.id, {
        "status": "awaiting_facilitator",
        "assigned_facilitator": facilitator
    })


async def submit_anonymous_to_stewardship(concern: ConcernRecord):
    """Submit concern anonymously to Stewardship."""

    # Create anonymized version
    anon_description = anonymize_content(concern.description)

    await post_to_channel(
        STEWARDSHIP_CHANNEL_ID,
        f"📝 **Anonymous Concern Submitted**\n\n"
        f"**Concern ID:** `{concern.id}`\n"
        f"**Category:** {concern.category}\n"
        f"**Subject:** <@{concern.subject_id}> (if applicable)\n\n"
        f"**Description:**\n{anon_description}\n\n"
        f"*Reporter identity is confidential.*"
    )

    await update_concern(concern.id, {
        "status": "submitted_anonymous",
        "submitted_at": datetime.now().isoformat()
    })

    await send_dm(
        concern.reporter_id,
        f"Your concern has been submitted anonymously to Stewardship.\n\n"
        f"I'll notify you of any updates. Concern ID: `{concern.id}`"
    )


async def request_mediation(concern: ConcernRecord):
    """Request formal mediation."""

    await post_to_channel(
        STEWARDSHIP_CHANNEL_ID,
        f"🤝 **Mediation Requested**\n\n"
        f"**Concern ID:** `{concern.id}`\n"
        f"**Category:** {concern.category}\n"
        f"**Parties:** <@{concern.reporter_id}> and <@{concern.subject_id}>\n\n"
        f"A formal mediation process has been requested. "
        f"Please assign a mediator."
    )

    await update_concern(concern.id, {
        "status": "mediation_requested",
        "requested_at": datetime.now().isoformat()
    })
```

---

## Recording

```python
async def record_concern_for_patterns(concern: ConcernRecord):
    """Record concern for pattern recognition (anonymized)."""

    pattern_record = {
        "concern_id": concern.id,
        "category": concern.category,
        "subject_id": concern.subject_id,  # For pattern detection
        "reported_at": concern.reported_at.isoformat(),
        "status": concern.status,
        "keywords": extract_keywords(concern.description)
    }

    await append_to_pattern_log(pattern_record)

    # Check for concerning patterns
    if concern.subject_id:
        history = await get_concern_history(concern.subject_id)
        if len(history) >= 3:
            await flag_pattern(
                subject_id=concern.subject_id,
                concerns=history
            )
```

---

## Outputs

```yaml
outputs:
  on_concern_received:
    - acknowledgment: sent to reporter
    - record: created
    - log: concern_received

  on_safety_concern:
    - escalation: immediate to stewardship
    - notification: sent
    - log: safety_escalated

  on_details_gathered:
    - concern: updated
    - routing: based on preference
    - log: details_gathered

  on_pattern_detected:
    - flag: raised
    - notification: to stewardship
    - log: pattern_flagged
```

---

## Related Skills

- `escalate-accountability.md` — Formal escalation
- `execute-accountability-action.md` — Resolution actions
- `../membrane-crossing/verify-participation.md` — Pattern data feeds
