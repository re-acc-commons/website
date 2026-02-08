# Skill: Verify Participation Patterns

Continuously monitor participation patterns to identify Newcomers ready for Participant status.

---

## Trigger

```yaml
trigger:
  type: scheduled
  frequency: daily
  time: "00:00 UTC"

  # Also triggered by:
  alternative_triggers:
    - newcomer_activity_spike  # When a Newcomer shows high engagement
    - manual_request  # When requested by Steward
```

---

## Required Permissions

- Read message history across public channels
- Query user activity metrics
- Update user metadata
- Assign roles
- Mint NFTs (for Participation NFT)

---

## Inputs

```yaml
inputs:
  newcomer_ids: list[string]  # Discord IDs to evaluate
  evaluation_period_days: int  # Default: 14
  channel_ids: list[string]  # Channels to analyze
```

---

## Pattern Recognition Criteria

### Quantitative Thresholds

```yaml
thresholds:
  minimum_days: 14  # Minimum time since introduction
  minimum_messages: 10  # Across all public channels
  minimum_channels: 2  # Active in at least 2 channels
  minimum_reactions_given: 5  # Engaging with others' content
  working_circle_participation: true  # At least one circle
```

### Qualitative Patterns

```python
POSITIVE_PATTERNS = {
    "contributes_to_others": {
        "description": "Responds to and builds on others' ideas",
        "weight": 3,
        "indicators": [
            "reply_to_others_ratio > 0.3",
            "mentions_other_users",
            "asks_clarifying_questions"
        ]
    },
    "constructive_engagement": {
        "description": "Engages with disagreement constructively",
        "weight": 2,
        "indicators": [
            "no_hostile_messages",
            "acknowledges_other_perspectives",
            "offers_alternatives_not_just_criticism"
        ]
    },
    "consistent_presence": {
        "description": "Shows up regularly, not just in bursts",
        "weight": 2,
        "indicators": [
            "activity_spread_across_days > 0.5",
            "not_only_active_during_drama"
        ]
    },
    "principle_alignment": {
        "description": "Actions reflect commons principles",
        "weight": 3,
        "indicators": [
            "shares_knowledge_freely",
            "supports_newcomers",
            "references_constitutional_principles"
        ]
    },
    "circle_contribution": {
        "description": "Contributes meaningfully to Working Circle",
        "weight": 3,
        "indicators": [
            "working_circle_messages > 5",
            "takes_on_tasks",
            "follows_through"
        ]
    }
}

CONCERN_PATTERNS = {
    "self_promotion_only": {
        "description": "Only promotes own work without community contribution",
        "weight": -3,
        "indicators": [
            "link_share_ratio > 0.5",
            "rarely_responds_to_others",
            "never_asks_questions"
        ]
    },
    "controversy_seeking": {
        "description": "Only engages in contentious topics",
        "weight": -2,
        "indicators": [
            "high_activity_only_in_heated_threads",
            "starts_arguments"
        ]
    },
    "burst_pattern": {
        "description": "Long inactivity followed by sudden engagement",
        "weight": -1,
        "indicators": [
            "activity_variance > 3_std_dev",
            "gaps_longer_than_7_days"
        ]
    }
}
```

---

## Process

### Step 1: Gather Activity Data

```python
async def gather_activity_data(
    user_id: str,
    start_date: datetime,
    channels: list[str]
) -> ActivityData:
    """Collect all activity data for a user."""

    messages = []
    reactions_given = []
    reactions_received = []

    for channel_id in channels:
        channel_messages = await get_user_messages(
            channel_id, user_id, after=start_date
        )
        messages.extend(channel_messages)

        channel_reactions = await get_user_reactions(
            channel_id, user_id, after=start_date
        )
        reactions_given.extend(channel_reactions)

    # Get working circle participation
    circle_channels = await get_working_circle_channels()
    circle_activity = {
        channel: [m for m in messages if m.channel_id == channel]
        for channel in circle_channels
    }

    return ActivityData(
        user_id=user_id,
        messages=messages,
        reactions_given=reactions_given,
        reactions_received=reactions_received,
        circle_activity=circle_activity,
        unique_channels=len(set(m.channel_id for m in messages)),
        total_days=len(set(m.created_at.date() for m in messages))
    )
```

### Step 2: Evaluate Patterns

```python
def evaluate_patterns(activity: ActivityData) -> PatternEvaluation:
    """Evaluate activity against pattern criteria."""

    scores = {}
    flags = []

    # Quantitative checks
    quant_passed = (
        activity.total_days >= 14 and
        len(activity.messages) >= 10 and
        activity.unique_channels >= 2 and
        len(activity.reactions_given) >= 5 and
        len(activity.circle_activity) > 0
    )

    if not quant_passed:
        return PatternEvaluation(
            ready=False,
            reason="quantitative_thresholds_not_met",
            scores={},
            flags=[]
        )

    # Positive pattern scoring
    total_score = 0

    for pattern_name, pattern in POSITIVE_PATTERNS.items():
        score = evaluate_single_pattern(activity, pattern)
        scores[pattern_name] = score
        total_score += score * pattern["weight"]

    # Concern pattern checking
    for pattern_name, pattern in CONCERN_PATTERNS.items():
        concern_score = evaluate_single_pattern(activity, pattern)
        if concern_score > 0.5:
            flags.append({
                "pattern": pattern_name,
                "description": pattern["description"],
                "severity": concern_score
            })
            total_score += concern_score * pattern["weight"]

    # Threshold for readiness
    READINESS_THRESHOLD = 10
    is_ready = total_score >= READINESS_THRESHOLD and len(flags) == 0

    return PatternEvaluation(
        ready=is_ready,
        score=total_score,
        threshold=READINESS_THRESHOLD,
        scores=scores,
        flags=flags,
        reason="ready" if is_ready else "patterns_not_met"
    )
```

### Step 3: Take Action

```python
async def process_evaluation(
    user_id: str,
    evaluation: PatternEvaluation
):
    """Process evaluation result."""

    if evaluation.ready:
        # Mark as ready for Participant
        await store_participant_readiness(user_id, evaluation)

        # Notify in agent commons (not to user directly)
        await post_to_agent_commons(
            f"📊 **Participation Pattern Flagged**\n"
            f"User: <@{user_id}>\n"
            f"Score: {evaluation.score}/{evaluation.threshold}\n"
            f"Status: Ready for Participant nomination\n\n"
            f"*Any Member may now nominate this user.*"
        )

        # Log
        await log_action(
            "participant_ready_flagged",
            user_id,
            evaluation.to_dict()
        )

    elif evaluation.flags:
        # Has concerns - log but don't notify publicly
        await log_action(
            "participation_concerns_noted",
            user_id,
            {
                "flags": evaluation.flags,
                "score": evaluation.score
            }
        )

    # If not ready and no flags, just continue monitoring
```

---

## Outputs

```yaml
outputs:
  on_ready:
    - store: participant_readiness record
    - post: notification to #agent-commons
    - log: participant_ready_flagged

  on_concerns:
    - log: participation_concerns_noted

  on_not_ready:
    - continue: monitoring (no action)
```

---

## Autonomous Execution

Fully autonomous for pattern recognition and flagging.

**Agent actions:**
- Continuously monitors participation patterns
- Flags readiness in #agent-commons for any Member to act on
- Logs concerns for Steward visibility
- Provides data to support nomination decisions

**Design constraints:**
- Does not automatically promote to Participant (requires nomination)
- Does not notify users directly of their "score" (internal metrics)
- Does not block or discourage based on patterns

**Escalate if:**
- Severe concern patterns detected
- Unusual activity patterns suggest manipulation
- Edge cases requiring judgment

---

## Privacy Considerations

```yaml
privacy:
  - Aggregate patterns, don't expose individual messages
  - Scores are internal, not shown to users
  - Concerns logged privately, not announced
  - Users not told they are being "monitored"
  - Frame as "pattern recognition" not "surveillance"
```

---

## Related Skills

- `process-nomination.md` — When Member nominates
- `execute-role-change.md` — For role promotion
