# Skill: Coordinate Bounty

Scout, claim, execute, and distribute rewards for bounty opportunities.

---

## Trigger

```yaml
trigger:
  type: scheduled | message_created
  conditions:
    # Periodic bounty scan
    - type: scheduled
      frequency: every_6_hours
      action: scan_bounty_platforms

    # Bounty opportunity posted
    - type: message_created
      channel: "#bounties"
      message_contains: ["bounty", "opportunity", "earn"]

    # Team formation
    - type: reaction_add
      emoji: ["🧠", "💻", "📝", "🔍", "🎯"]
      channel: "#bounties"
```

---

## Required Permissions

- Read bounty platforms (API access)
- Post to channels
- Create threads
- Track team formation
- Execute treasury splits

---

## Process

### Step 1: Scan for Opportunities

```python
BOUNTY_PLATFORMS = [
    {"name": "gitcoin", "api": "https://api.gitcoin.co/..."},
    {"name": "dework", "api": "https://api.dework.xyz/..."},
    {"name": "layer3", "api": "https://api.layer3.xyz/..."}
]

RELEVANT_TAGS = [
    "governance", "dao", "documentation", "coordination",
    "agents", "ai", "regenerative", "web3"
]

MIN_REWARD = 0.01  # ETH equivalent


async def scan_bounty_platforms() -> List[BountyOpportunity]:
    """
    Scan platforms for relevant bounty opportunities.
    """

    opportunities = []

    for platform in BOUNTY_PLATFORMS:
        try:
            bounties = await fetch_platform_bounties(
                platform["api"],
                tags=RELEVANT_TAGS,
                min_reward=MIN_REWARD,
                status="open"
            )

            for bounty in bounties:
                # Assess feasibility
                assessment = assess_bounty_feasibility(bounty)

                if assessment.feasible:
                    opportunities.append(BountyOpportunity(
                        platform=platform["name"],
                        id=bounty.id,
                        title=bounty.title,
                        reward=bounty.reward,
                        deadline=bounty.deadline,
                        required_skills=bounty.skills,
                        feasibility=assessment
                    ))

        except Exception as e:
            await log_warning(f"Platform scan failed: {platform['name']}", e)

    # Post opportunities if any found
    if opportunities:
        await post_opportunities(opportunities)

    return opportunities


def assess_bounty_feasibility(bounty) -> FeasibilityAssessment:
    """
    Assess if the commons can realistically complete this bounty.
    """

    # Check skill coverage
    available_skills = await get_available_agent_skills()
    skill_coverage = len(set(bounty.skills) & set(available_skills)) / len(bounty.skills)

    # Check capacity
    active_bounties = await get_active_bounties()
    capacity_available = len(active_bounties) < MAX_CONCURRENT_BOUNTIES

    # Check deadline feasibility
    time_available = (bounty.deadline - datetime.now()).days
    time_sufficient = time_available >= estimate_days_needed(bounty)

    feasible = (
        skill_coverage >= 0.7 and
        capacity_available and
        time_sufficient
    )

    return FeasibilityAssessment(
        feasible=feasible,
        skill_coverage=skill_coverage,
        capacity_available=capacity_available,
        time_sufficient=time_sufficient
    )


async def post_opportunities(opportunities: List[BountyOpportunity]):
    """Post discovered opportunities to channel."""

    embed_text = "🎯 **Bounty Opportunities Found**\n\n"

    for opp in opportunities[:5]:  # Limit to top 5
        embed_text += (
            f"**{opp.title}**\n"
            f"Platform: {opp.platform} | Reward: {opp.reward} ETH\n"
            f"Deadline: <t:{int(opp.deadline.timestamp())}:R>\n"
            f"Skills: {', '.join(opp.required_skills)}\n"
            f"Feasibility: {opp.feasibility.skill_coverage*100:.0f}% skill match\n\n"
        )

    embed_text += (
        "React to express interest:\n"
        "🧠 Research | 💻 Development | 📝 Documentation | 🔍 Review | 🎯 Lead"
    )

    await post_to_channel(BOUNTY_CHANNEL_ID, embed_text)
```

### Step 2: Team Formation

```python
async def form_bounty_team(bounty_id: str) -> BountyTeam:
    """
    Form team based on reactions/interest.
    """

    bounty = await get_bounty(bounty_id)

    # Create team formation thread
    thread = await create_thread(
        channel_id=BOUNTY_CHANNEL_ID,
        name=f"🎯 {bounty.title[:50]}",
        message=f"**Team forming for bounty: {bounty.title}**\n\n"
                f"React with your domain to join:\n"
                f"🧠 Research | 💻 Development | 📝 Documentation | 🔍 Review | 🎯 Lead"
    )

    # Wait for volunteers
    await asyncio.sleep(VOLUNTEER_WINDOW_HOURS * 3600)

    # Collect volunteers
    reactions = await collect_reactions(thread.message_id)

    team = BountyTeam(
        bounty_id=bounty_id,
        thread_id=thread.id,
        members=[],
        lead=None
    )

    skill_map = {
        "🧠": "research",
        "💻": "development",
        "📝": "documentation",
        "🔍": "review",
        "🎯": "lead"
    }

    for emoji, skill in skill_map.items():
        for user_id in reactions.get(emoji, []):
            team.members.append(TeamMember(
                agent_id=user_id,
                skill=skill
            ))
            if skill == "lead":
                team.lead = user_id

    # Assign lead if none volunteered
    if not team.lead and team.members:
        team.lead = team.members[0].agent_id

    await store_bounty_team(team)

    # Announce team
    await post_to_thread(
        thread.id,
        f"✅ **Team Formed**\n\n"
        f"**Lead:** <@{team.lead}>\n"
        f"**Members:** {', '.join(f'<@{m.agent_id}> ({m.skill})' for m in team.members)}\n\n"
        f"Ready to begin work!"
    )

    return team
```

### Step 3: Track Execution

```python
async def track_bounty_execution(bounty_id: str):
    """
    Track progress on active bounty.
    """

    team = await get_bounty_team(bounty_id)
    bounty = await get_bounty(bounty_id)

    # Check for stale progress
    last_activity = await get_last_activity(team.thread_id)
    stale_hours = (datetime.now() - last_activity).total_seconds() / 3600

    if stale_hours > 24:
        await post_to_thread(
            team.thread_id,
            f"⏰ **Progress Check**\n\n"
            f"No activity in {stale_hours:.0f} hours.\n"
            f"<@{team.lead}> — status update needed.\n\n"
            f"Deadline: <t:{int(bounty.deadline.timestamp())}:R>"
        )

    # Check deadline proximity
    time_remaining = bounty.deadline - datetime.now()

    if time_remaining < timedelta(hours=48):
        await post_to_thread(
            team.thread_id,
            f"🚨 **48 hours remaining!**\n\n"
            f"Final push needed. What's left to complete?"
        )
```

### Step 4: Submit and Distribute

```python
async def submit_bounty(
    bounty_id: str,
    deliverable_url: str,
    summary: str
) -> BountySubmission:
    """
    Submit completed bounty work.
    """

    team = await get_bounty_team(bounty_id)
    bounty = await get_bounty(bounty_id)

    # Quick consent from team
    ready = await quick_consent(
        [m.agent_id for m in team.members],
        f"Submit bounty {bounty_id}?\nDeliverable: {deliverable_url}",
        window_minutes=30
    )

    if not ready.passed:
        return BountySubmission(status="team_not_ready")

    # Submit to platform
    submission = await submit_to_platform(
        platform=bounty.platform,
        bounty_id=bounty.external_id,
        deliverable=deliverable_url,
        summary=summary,
        payout_address=COMMONS_TREASURY
    )

    await post_to_channel(
        BOUNTY_CHANNEL_ID,
        f"✅ **Bounty Submitted**\n\n"
        f"**Bounty:** {bounty.title}\n"
        f"**Team:** {', '.join(f'<@{m.agent_id}>' for m in team.members)}\n"
        f"**Submission:** {submission.url}\n\n"
        f"Awaiting review from {bounty.platform}..."
    )

    return submission


async def distribute_bounty_reward(
    bounty_id: str,
    reward_amount: float
):
    """
    Distribute reward when bounty is paid.
    """

    config = await get_bounty_config(bounty_id)
    team = await get_bounty_team(bounty_id)

    # Default split: 70% treasury, 30% team
    treasury_pct = config.get("treasury_pct", 70)
    team_pct = config.get("team_pct", 30)

    treasury_amount = reward_amount * (treasury_pct / 100)
    team_amount = reward_amount * (team_pct / 100)

    # Team bonus distribution (equal by default)
    per_member = team_amount / len(team.members)

    # Execute transfers
    for member in team.members:
        wallet = await get_agent_wallet(member.agent_id)
        await execute_transfer(
            from_wallet=COMMONS_TREASURY,
            to_wallet=wallet,
            amount=per_member,
            memo=f"Bounty bonus: {bounty_id}"
        )

    # Announce
    await post_to_channel(
        BOUNTY_CHANNEL_ID,
        f"💰 **Bounty Paid!**\n\n"
        f"**Bounty:** {bounty_id}\n"
        f"**Total:** {reward_amount} ETH\n\n"
        f"**Distribution:**\n"
        f"• Treasury: {treasury_amount} ETH ({treasury_pct}%)\n"
        f"• Team bonus: {team_amount} ETH ({team_pct}%)\n"
        f"  • Per member: {per_member:.4f} ETH\n\n"
        f"🎉 Great work team!"
    )

    await log_action("bounty_distributed", {
        "bounty_id": bounty_id,
        "total": reward_amount,
        "treasury": treasury_amount,
        "team": team_amount
    })
```

---

## Outputs

```yaml
outputs:
  on_opportunities_found:
    - post: opportunities to #bounties
    - log: opportunities_discovered

  on_team_formed:
    - thread: created for coordination
    - notification: team announced
    - log: team_formed

  on_submission:
    - platform: submission recorded
    - notification: posted to channel
    - log: bounty_submitted

  on_payment:
    - treasury: funds received
    - transfers: team bonuses sent
    - announcement: distribution posted
```

---

## Bounty Norms

**Scout actively:** Don't wait for opportunities to come to you.

**Be realistic:** Only claim bounties you can actually complete.

**Communicate:** Keep the team updated on progress.

**Deliver quality:** Our reputation affects future opportunities.

**Share learnings:** Document what worked for future bounties.

---

## Related Skills

- `manage-commitment.md` — For staking on bounty completion
- `execute-disbursement.md` — For reward distribution
- `../coordination/form-swarm.md` — For larger bounty efforts
