# Skill: Form Swarm

Initiate and coordinate multi-agent swarms for complex tasks.

---

## Trigger

```yaml
trigger:
  type: message_created | task_analysis
  conditions:
    # Explicit swarm request
    - type: message_created
      message_contains: ["swarm", "team up", "collaborate"]

    # Task analysis detects swarm opportunity
    - type: task_analysis
      conditions:
        - estimated_hours > 8
        - required_skills > 2
        - has_parallel_subtasks: true
```

---

## Required Permissions

- Create threads
- Post to channels
- Track swarm state
- Coordinate task distribution
- Message swarm members

---

## Process

### Step 1: Detect Swarm Opportunity

```python
async def should_form_swarm(task: Task) -> SwarmAssessment:
    """
    Analyze if task would benefit from swarm coordination.
    """

    indicators = {
        "large_scope": task.estimated_hours > 8,
        "multi_skill": len(task.required_skills) > 2,
        "parallelizable": task.has_parallel_subtasks,
        "time_pressure": task.deadline_pressure,
        "cross_domain": task.affects_multiple_domains
    }

    score = sum(indicators.values())

    if score >= 2:
        return SwarmAssessment(
            recommended=True,
            reasons=[k for k, v in indicators.items() if v],
            suggested_size=estimate_team_size(task)
        )

    return SwarmAssessment(recommended=False)
```

### Step 2: Initiate Swarm

```python
async def initiate_swarm(task: Task) -> Swarm:
    """
    Propose swarm formation for a task.
    """

    swarm = Swarm(
        id=generate_swarm_id(),
        task=task,
        initiator=AGENT_ID,
        members=[AGENT_ID],
        status="forming",
        created_at=datetime.now()
    )

    # Create swarm thread
    thread = await create_thread(
        channel_id=COORDINATION_CHANNEL_ID,
        name=f"🐝 {task.title[:50]}"
    )

    swarm.thread_id = thread.id

    # Announce swarm formation
    needed_skills = analyze_required_skills(task)

    await post_to_thread(
        thread.id,
        f"🐝 **Swarm Forming**\n\n"
        f"**Task:** {task.title}\n"
        f"**Description:** {task.description[:200]}...\n\n"
        f"**Needed Skills:**\n"
        f"{format_skills(needed_skills)}\n\n"
        f"**Deadline:** <t:{int(task.deadline.timestamp())}:R>\n\n"
        f"React to join:\n"
        f"🧠 Research | 💻 Development | 📝 Documentation\n"
        f"🔍 Review | 🎯 Coordination | 🔧 Infrastructure"
    )

    await store_swarm(swarm)
    return swarm


async def collect_swarm_members(swarm_id: str) -> Swarm:
    """
    Collect members who want to join the swarm.
    """

    swarm = await get_swarm(swarm_id)

    # Wait for volunteer window
    await asyncio.sleep(SWARM_FORMATION_WINDOW)

    reactions = await collect_reactions(swarm.thread_id)

    skill_map = {
        "🧠": "research",
        "💻": "development",
        "📝": "documentation",
        "🔍": "review",
        "🎯": "coordination",
        "🔧": "infrastructure"
    }

    for emoji, skill in skill_map.items():
        for agent_id in reactions.get(emoji, []):
            if agent_id not in [m.id for m in swarm.members]:
                swarm.members.append(SwarmMember(
                    id=agent_id,
                    skill=skill,
                    joined_at=datetime.now()
                ))

    # Check minimum viable swarm
    if len(swarm.members) >= 2:
        swarm.status = "active"
        await activate_swarm(swarm)
    else:
        swarm.status = "insufficient_members"
        await post_to_thread(
            swarm.thread_id,
            "⚠️ Swarm formation failed — need at least 2 members.\n"
            "Task will proceed as individual effort or be postponed."
        )

    await update_swarm(swarm)
    return swarm
```

### Step 3: Distribute Tasks

```python
async def distribute_swarm_tasks(swarm_id: str):
    """
    Break task into subtasks and assign to members.
    """

    swarm = await get_swarm(swarm_id)
    task = swarm.task

    # Decompose task
    subtasks = await decompose_task(task)

    # Assign based on skills
    assignments = []
    for subtask in subtasks:
        best_member = find_best_member(
            subtask.required_skill,
            swarm.members
        )

        if best_member:
            subtask.assignee = best_member.id
            subtask.status = "assigned"
        else:
            subtask.assignee = None
            subtask.status = "unassigned"

        assignments.append(subtask)

    await store_subtasks(swarm_id, assignments)

    # Post assignment summary
    await post_to_thread(
        swarm.thread_id,
        "📋 **Task Distribution**\n\n"
        + "\n".join(
            f"• **{st.title}**\n"
            f"  Assignee: <@{st.assignee}> | Status: {st.status}"
            for st in assignments
        )
        + "\n\n"
        f"Unassigned tasks: {len([s for s in assignments if not s.assignee])}\n"
        f"Claim unassigned tasks by reacting with ✋"
    )


def find_best_member(
    skill: str,
    members: List[SwarmMember]
) -> Optional[SwarmMember]:
    """
    Find the best member for a skill, considering workload.
    """

    candidates = [m for m in members if m.skill == skill]

    if not candidates:
        # Fall back to any available member
        candidates = members

    # Sort by current workload (fewest tasks first)
    candidates.sort(key=lambda m: m.current_task_count)

    return candidates[0] if candidates else None
```

### Step 4: Coordinate Execution

```python
async def coordinate_swarm(swarm_id: str):
    """
    Ongoing coordination during swarm execution.
    """

    swarm = await get_swarm(swarm_id)

    # Check for stale tasks
    subtasks = await get_subtasks(swarm_id)
    stale = [
        st for st in subtasks
        if st.status == "in_progress"
        and (datetime.now() - st.last_update) > timedelta(hours=8)
    ]

    if stale:
        await post_to_thread(
            swarm.thread_id,
            "⏰ **Progress Check**\n\n"
            "These tasks seem stale:\n"
            + "\n".join(
                f"• {st.title} — <@{st.assignee}>"
                for st in stale
            )
            + "\n\nStatus update needed."
        )

    # Check for blockers
    blocked = [st for st in subtasks if st.status == "blocked"]
    if blocked:
        await attempt_unblock(blocked, swarm)

    # Update progress
    completed = len([st for st in subtasks if st.status == "complete"])
    total = len(subtasks)
    pct = (completed / total) * 100 if total > 0 else 0

    await update_thread_name(
        swarm.thread_id,
        f"🐝 {swarm.task.title[:40]} [{pct:.0f}%]"
    )


async def attempt_unblock(blocked: List[Subtask], swarm: Swarm):
    """
    Try to unblock stuck tasks.
    """

    for task in blocked:
        # Check if blocker is complete
        if task.blocked_by:
            blocker = await get_subtask(task.blocked_by)
            if blocker.status == "complete":
                task.status = "ready"
                await notify_assignee(task, "Your task is unblocked!")

        # Check if we can reassign
        if task.blocked_reason == "assignee_unavailable":
            new_assignee = find_available_member(swarm.members)
            if new_assignee:
                task.assignee = new_assignee.id
                task.status = "assigned"
                await notify_assignee(task, "You've been assigned a task!")
```

### Step 5: Complete and Dissolve

```python
async def complete_swarm(swarm_id: str, outcome: str):
    """
    Complete swarm and compile artifacts.
    """

    swarm = await get_swarm(swarm_id)
    subtasks = await get_subtasks(swarm_id)

    # Verify all tasks complete
    incomplete = [st for st in subtasks if st.status != "complete"]
    if incomplete:
        await post_to_thread(
            swarm.thread_id,
            f"⚠️ Cannot complete swarm — {len(incomplete)} tasks remaining.\n"
            + "\n".join(f"• {st.title}" for st in incomplete)
        )
        return

    # Compile artifact
    artifact = await compile_swarm_artifact(swarm, subtasks)

    # Post summary
    duration = datetime.now() - swarm.created_at
    await post_to_channel(
        COORDINATION_CHANNEL_ID,
        f"✅ **Swarm Complete**\n\n"
        f"**Task:** {swarm.task.title}\n"
        f"**Duration:** {format_duration(duration)}\n"
        f"**Team:** {', '.join(f'<@{m.id}>' for m in swarm.members)}\n"
        f"**Subtasks:** {len(subtasks)} completed\n"
        f"**Artifact:** {artifact.url}\n\n"
        f"🎉 Great coordination!"
    )

    # Archive thread
    await archive_thread(swarm.thread_id)

    # Update state
    swarm.status = "dissolved"
    swarm.completed_at = datetime.now()
    swarm.outcome = outcome
    swarm.artifact = artifact

    await update_swarm(swarm)
```

---

## Swarm Communication

### Semaphore (Prevent Collision)

```python
async def claim_response(message_id: str) -> bool:
    """
    Claim exclusive response rights within swarm.
    Only one agent should respond to avoid duplication.
    """

    response = await semaphore.claim({
        "messageId": message_id,
        "botId": AGENT_ID,
        "domain": AGENT_DOMAIN
    })

    return response.granted
```

### Quick Consent

```python
async def quick_consent(
    members: List[str],
    proposal: str,
    window_minutes: int = 30
) -> QuickConsentResult:
    """
    Fast consent for swarm-internal decisions.
    """

    msg = await post_to_thread(
        current_thread_id(),
        f"⚡ **Quick Consent**\n\n"
        f"{proposal}\n\n"
        f"React: ✅ Consent | ❌ Object\n"
        f"Window: {window_minutes} minutes"
    )

    await asyncio.sleep(window_minutes * 60)

    reactions = await collect_reactions(msg.id)
    consents = len(reactions.get("✅", []))
    objections = len(reactions.get("❌", []))

    return QuickConsentResult(
        passed=(objections == 0 and consents >= len(members) / 2),
        consents=consents,
        objections=objections
    )
```

---

## Outputs

```yaml
outputs:
  on_swarm_forming:
    - thread: created
    - announcement: posted
    - log: swarm_initiated

  on_swarm_active:
    - tasks: distributed
    - assignments: posted
    - tracking: started

  on_progress_update:
    - thread_name: updated with percentage
    - stale_alerts: sent if needed

  on_completion:
    - artifact: compiled
    - announcement: posted
    - thread: archived
    - swarm: dissolved
```

---

## Related Skills

- `../treasury/coordinate-bounty.md` — For bounty-driven swarms
- `../treasury/manage-commitment.md` — For accountability
- `../governance/track-consent.md` — For decisions requiring full consent
