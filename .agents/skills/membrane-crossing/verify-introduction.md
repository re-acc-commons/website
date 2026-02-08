# Skill: Verify Introduction

Verify newcomer introductions in `#threshold` for completeness.

---

## Trigger

```yaml
trigger:
  type: message_created
  channel: "#threshold"
  conditions:
    - message_length > 50  # Not too short
    - author_role == "none" OR author_role == "@Newcomer"
```

---

## Required Permissions

- Read messages in `#threshold`
- Send messages in `#threshold`
- Add reactions
- Manage roles (assign @Newcomer)

---

## Inputs

```yaml
inputs:
  message_id: string
  author_id: string
  message_content: string
  author_current_roles: list[string]
```

---

## Process

### Step 1: Parse Introduction

```python
def parse_introduction(content: str) -> dict:
    """Extract required elements from introduction."""

    elements = {
        "who": None,
        "where": None,
        "what_draws": None,
        "what_brings": None
    }

    # Look for explicit headers
    who_patterns = [
        r"(?:who\s*(?:i\s*am|am\s*i)|about\s*me|i\s*am|my\s*name)[:\s]*(.+?)(?=\n|where|what|$)",
        r"^(.{20,100}?)(?=\n)"  # First substantial line as fallback
    ]

    where_patterns = [
        r"(?:where\s*(?:i\s*am|am\s*i)|location|based\s*in|from)[:\s]*(.+?)(?=\n|what|$)",
        r"(?:in|from)\s+([A-Z][a-z]+(?:\s*,\s*[A-Z][a-z]+)?)"  # Location pattern
    ]

    draws_patterns = [
        r"(?:what\s*draws|why\s*(?:i'?m\s*here|re/acc)|interested\s*in)[:\s]*(.+?)(?=\n|what\s*(?:i\s*)?bring|$)",
        r"(?:resonates?|aligns?|attracted)[:\s]*(.+?)(?=\n|$)"
    ]

    brings_patterns = [
        r"(?:what\s*(?:i\s*)?bring|skills?|contribute|offer)[:\s]*(.+?)(?=\n|$)",
        r"(?:can\s*help\s*with|expertise\s*in)[:\s]*(.+?)(?=\n|$)"
    ]

    for pattern in who_patterns:
        match = re.search(pattern, content, re.IGNORECASE | re.DOTALL)
        if match:
            elements["who"] = match.group(1).strip()[:200]
            break

    for pattern in where_patterns:
        match = re.search(pattern, content, re.IGNORECASE | re.DOTALL)
        if match:
            elements["where"] = match.group(1).strip()[:100]
            break

    for pattern in draws_patterns:
        match = re.search(pattern, content, re.IGNORECASE | re.DOTALL)
        if match:
            elements["what_draws"] = match.group(1).strip()[:300]
            break

    for pattern in brings_patterns:
        match = re.search(pattern, content, re.IGNORECASE | re.DOTALL)
        if match:
            elements["what_brings"] = match.group(1).strip()[:300]
            break

    return elements
```

### Step 2: Validate Completeness

```python
def validate_introduction(elements: dict, content: str) -> ValidationResult:
    """Check if introduction meets requirements."""

    missing = []
    warnings = []

    # Check each required element
    if not elements["who"]:
        missing.append("Who you are")
    elif len(elements["who"]) < 10:
        warnings.append("'Who you are' seems brief")

    if not elements["where"]:
        missing.append("Where you are")

    if not elements["what_draws"]:
        missing.append("What draws you to re/acc")
    elif len(elements["what_draws"]) < 20:
        warnings.append("Consider sharing more about what resonates")

    if not elements["what_brings"]:
        missing.append("What you bring/contribute")

    # Check for signs of engagement with source material
    engagement_indicators = [
        "manifesto", "essay", "constitution", "recursive",
        "regenerative", "acceleration", "membrane", "commons",
        "extraction", "capital", "federation", "consent"
    ]
    has_engagement = any(
        indicator in content.lower()
        for indicator in engagement_indicators
    )

    if not has_engagement and not missing:
        warnings.append("Consider referencing what resonated from the manifesto/constitution")

    return ValidationResult(
        complete=len(missing) == 0,
        missing=missing,
        warnings=warnings,
        elements=elements
    )
```

### Step 3: Respond

```python
async def respond_to_introduction(
    message: Message,
    validation: ValidationResult
):
    """Send appropriate response based on validation."""

    if validation.complete:
        # Success response
        embed = Embed(
            title="✅ Welcome to the Re/acc Commons",
            description=(
                f"Your introduction has been verified. "
                f"You are now a **Newcomer** in the commons."
            ),
            color=0x00ff00
        )

        embed.add_field(
            name="What's Next",
            value=(
                "• Explore the public channels\n"
                "• Join a Working Circle that interests you\n"
                "• After 2+ weeks of participation, you may become a Participant"
            ),
            inline=False
        )

        if validation.warnings:
            embed.add_field(
                name="💡 Suggestions",
                value="\n".join(f"• {w}" for w in validation.warnings),
                inline=False
            )

        await message.reply(embed=embed)
        await message.add_reaction("✅")

        # Assign @Newcomer role
        await assign_role(
            message.author.id,
            ROLE_NEWCOMER,
            "Introduction verified"
        )

        # Log success
        await log_action(
            "introduction_verified",
            message.author.id,
            message.id,
            {"elements": validation.elements}
        )

    else:
        # Incomplete response
        embed = Embed(
            title="📝 Introduction Incomplete",
            description=(
                "Your introduction is missing some required elements. "
                "Please edit your message or reply with the missing information."
            ),
            color=0xffaa00
        )

        embed.add_field(
            name="Missing Elements",
            value="\n".join(f"• {m}" for m in validation.missing),
            inline=False
        )

        embed.add_field(
            name="Required Format",
            value=(
                "**Who you are** — Name/handle, brief background\n"
                "**Where you are** — Location, bioregion, or context\n"
                "**What draws you** — Why re/acc resonates\n"
                "**What you bring** — Skills, interests, contributions"
            ),
            inline=False
        )

        await message.reply(embed=embed)
        await message.add_reaction("📝")

        # Log incomplete
        await log_action(
            "introduction_incomplete",
            message.author.id,
            message.id,
            {"missing": validation.missing}
        )
```

---

## Outputs

```yaml
outputs:
  on_success:
    - role_assigned: "@Newcomer"
    - reaction_added: "✅"
    - embed_sent: welcome_message
    - log_entry: introduction_verified

  on_incomplete:
    - reaction_added: "📝"
    - embed_sent: guidance_message
    - log_entry: introduction_incomplete
```

---

## Autonomous Execution

Fully autonomous for verification.

**Escalate if:**
- Message appears to be spam or bad-faith
- User disputes verification result
- Edge case not covered by patterns

---

## Error Handling

```python
async def handle_error(error: Exception, context: dict):
    if isinstance(error, PermissionError):
        await notify_stewardship(
            f"Cannot assign @Newcomer role to {context['author_id']}"
        )
    else:
        await log_error(error, context)
        # Don't fail silently - notify user something went wrong
        await send_message(
            context["channel_id"],
            f"<@{context['author_id']}> I encountered an issue verifying your introduction. "
            f"A Steward has been notified."
        )
```

---

## Related Skills

- `execute-role-change.md` — For role assignment
- `.agents/integrations/discord.md` — Discord API details
