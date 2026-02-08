# Skill: Process Amendment

Handle constitution amendment proposals via GitHub PRs and consent process.

---

## Trigger

```yaml
trigger:
  type: github_pr_created | message_created
  conditions:
    # GitHub PR to constitution repo
    - type: github_pr_created
      repository: "reacc-commons-constitution"
      base_branch: "main"
      files_changed_pattern: "Re-acc Commons Constitution/**"

    # Discord message referencing PR
    - type: message_created
      channel: "#proposals"
      message_contains: "amendment"
      message_contains: "github.com/*/pull/"
```

---

## Required Permissions

- Read GitHub PRs
- Comment on PRs
- Add PR labels
- Post to Discord
- Track consent state
- Merge PRs (after consent)

---

## Amendment Types

```yaml
amendment_types:
  foundational:
    applies_to:
      - "1. Identity/**"  # Vision, Mission, Values, etc.
    consent_required: "full_commons"  # All Members
    window_hours: 72

  structural:
    applies_to:
      - "2. Structure/**"  # Roles, Groups, Assets
    consent_required: "standard"  # 3 Members
    window_hours: 48

  procedural:
    applies_to:
      - "3. Protocols/**"  # Protocols
      - "4. Agreements/**"  # Agreements
    consent_required: "standard"
    window_hours: 48
```

---

## Process

### Step 1: Analyze PR

```python
async def analyze_amendment_pr(pr: PullRequest) -> AmendmentAnalysis:
    """Analyze PR to determine amendment type and requirements."""

    files_changed = await get_pr_files(pr.repo, pr.number)

    affected_sections = set()
    for file in files_changed:
        section = extract_section(file.path)
        if section:
            affected_sections.add(section)

    # Determine amendment type (highest requirement wins)
    if "1. Identity" in affected_sections:
        amendment_type = "foundational"
        window_hours = 72
        quorum_type = "full_commons"
    else:
        amendment_type = "structural" if "2. Structure" in affected_sections else "procedural"
        window_hours = 48
        quorum_type = "standard"

    # Extract summary from PR description
    summary = extract_summary_from_pr(pr.body)

    # Check author permissions
    author_discord = await get_discord_for_github(pr.user.login)
    author_roles = await get_user_roles(author_discord) if author_discord else []
    can_propose = "@Member" in author_roles

    return AmendmentAnalysis(
        pr_number=pr.number,
        author_github=pr.user.login,
        author_discord=author_discord,
        can_propose=can_propose,
        amendment_type=amendment_type,
        affected_sections=list(affected_sections),
        files_changed=[f.path for f in files_changed],
        window_hours=window_hours,
        quorum_type=quorum_type,
        summary=summary,
        diff_stats=pr.diff_stats
    )
```

### Step 2: Validate Amendment

```python
async def validate_amendment(
    analysis: AmendmentAnalysis,
    pr: PullRequest
) -> ValidationResult:
    """Validate amendment meets requirements."""

    errors = []
    warnings = []

    # Author must be Member (can link Discord)
    if not analysis.can_propose:
        if not analysis.author_discord:
            errors.append(
                f"GitHub user `{analysis.author_github}` is not linked to a Discord account. "
                f"Please link your accounts or have a Member submit the PR."
            )
        else:
            errors.append(
                f"<@{analysis.author_discord}> is not a Member. "
                f"Constitution amendments require Member status."
            )

    # Run schema validation on changed files
    schema_results = await validate_schemas_in_pr(pr)
    if not schema_results.valid:
        errors.extend(schema_results.errors)
    warnings.extend(schema_results.warnings)

    # Check for breaking wiki-links
    link_analysis = await analyze_link_changes(pr)
    if link_analysis.broken_links:
        errors.append(
            f"Amendment would break {len(link_analysis.broken_links)} wiki-links: "
            f"{', '.join(link_analysis.broken_links[:5])}"
        )

    # Check for required sections in new documents
    for file in analysis.files_changed:
        if file.status == "added":
            section_check = await check_required_sections(file.path, file.content)
            if not section_check.valid:
                errors.extend(section_check.errors)

    return ValidationResult(
        valid=len(errors) == 0,
        errors=errors,
        warnings=warnings,
        analysis=analysis
    )
```

### Step 3: Initialize Consent Process

```python
async def initialize_amendment_consent(
    pr: PullRequest,
    analysis: AmendmentAnalysis
) -> ConsentProcess:
    """Set up consent tracking for amendment."""

    window_end = datetime.now() + timedelta(hours=analysis.window_hours)

    consent_process = ConsentProcess(
        id=generate_consent_id(),
        type="constitution_amendment",
        proposal_message_id=None,  # Will be set after Discord post
        proposer_id=analysis.author_discord,
        title=f"Amendment: {pr.title}",
        proposal_type=analysis.amendment_type,
        window_hours=analysis.window_hours,
        window_end=window_end,
        quorum_type=analysis.quorum_type,
        quorum_required="all" if analysis.quorum_type == "full_commons" else 3,
        pr_number=pr.number,
        status="open",
        consents=[],
        concerns=[],
        objections=[]
    )

    await store_consent_process(consent_process)

    return consent_process
```

### Step 4: Post to Discord

```python
async def post_amendment_proposal(
    pr: PullRequest,
    analysis: AmendmentAnalysis,
    consent: ConsentProcess
):
    """Post amendment proposal to Discord."""

    channel = await get_channel(PROPOSALS_CHANNEL_ID)

    # Build embed
    embed = Embed(
        title=f"📜 Constitution Amendment: {pr.title}",
        description=analysis.summary or pr.body[:500],
        color=0xff9900 if analysis.amendment_type == "foundational" else 0x5865F2,
        url=pr.html_url
    )

    embed.add_field(
        name="Amendment Type",
        value=f"**{analysis.amendment_type.title()}**",
        inline=True
    )

    embed.add_field(
        name="Affected Sections",
        value=", ".join(analysis.affected_sections),
        inline=True
    )

    embed.add_field(
        name="Changes",
        value=f"+{analysis.diff_stats.additions} / -{analysis.diff_stats.deletions} lines",
        inline=True
    )

    embed.add_field(
        name="⏰ Consent Window",
        value=f"Closes <t:{int(consent.window_end.timestamp())}:R>",
        inline=True
    )

    embed.add_field(
        name="✅ Required Consent",
        value="All Members" if analysis.quorum_type == "full_commons" else "3 Members",
        inline=True
    )

    embed.add_field(
        name="GitHub PR",
        value=f"[View Changes]({pr.html_url})",
        inline=True
    )

    embed.add_field(
        name="How to Respond",
        value=(
            "✅ Consent | 🤔 Concerns | ⏳ Need time | 🚫 Paramount objection\n\n"
            "*Review the PR diff before consenting.*"
        ),
        inline=False
    )

    embed.set_footer(text=f"Consent ID: {consent.id}")

    # Full Commons notification for foundational
    if analysis.amendment_type == "foundational":
        all_members = await get_all_members()
        mention_str = " ".join(f"<@{m}>" for m in all_members)
        await channel.send(
            f"📢 **Foundational Amendment - All Members Required**\n{mention_str}"
        )

    tracking_msg = await channel.send(embed=embed)

    # Add reactions
    for emoji in ["✅", "🤔", "⏳", "🚫"]:
        await tracking_msg.add_reaction(emoji)

    # Update consent with message ID
    await update_consent_process(consent.id, {
        "tracking_message_id": tracking_msg.id,
        "proposal_message_id": tracking_msg.id
    })

    # Add PR comment
    await add_pr_comment(
        repo=pr.repo,
        pr_number=pr.number,
        body=(
            f"## 🗳️ Consent Process Started\n\n"
            f"This amendment is now open for consent in Discord.\n\n"
            f"**Type:** {analysis.amendment_type.title()}\n"
            f"**Window:** {analysis.window_hours} hours\n"
            f"**Required:** {'All Members' if analysis.quorum_type == 'full_commons' else '3 Members'}\n\n"
            f"**Consent ID:** `{consent.id}`\n\n"
            f"Track progress in #proposals."
        )
    )

    # Add label
    await add_label(pr.repo, pr.number, "consent-in-progress")

    # Trigger consent tracking
    await trigger_skill("governance/track-consent", {
        "consent_process_id": consent.id
    })
```

### Step 5: Merge on Approval

```python
async def merge_approved_amendment(
    consent_record: ConsentRecord
):
    """Merge PR after consent is approved."""

    process = consent_record.process
    pr_number = process.pr_number

    # Get PR
    pr = await get_pr("reacc-commons-constitution", pr_number)

    # Verify PR is still open
    if pr.state != "open":
        await log_warning("pr_already_closed", pr_number)
        return

    # Add approval comment
    await add_pr_comment(
        repo="reacc-commons-constitution",
        pr_number=pr_number,
        body=(
            f"## ✅ Consent Approved\n\n"
            f"This amendment has received consent from the Commons.\n\n"
            f"**Consent ID:** `{consent_record.id}`\n"
            f"**Member Consents:** {consent_record.member_consent_count}\n\n"
            f"A Steward should now merge this PR.\n\n"
            f"---\n\n"
            f"*Consent Record:*\n"
            f"```\n{json.dumps(consent_record.to_summary(), indent=2)}\n```"
        )
    )

    # Update labels
    await remove_labels("reacc-commons-constitution", pr_number, ["consent-in-progress"])
    await add_label("reacc-commons-constitution", pr_number, "ready-to-merge")

    # Notify Stewardship
    stewards = await get_steward_ids()
    await post_to_channel(
        STEWARDSHIP_CHANNEL_ID,
        f"✅ **Amendment Approved - Ready to Merge**\n\n"
        f"{' '.join(f'<@{s}>' for s in stewards)}\n\n"
        f"**PR:** [#{pr_number}]({pr.html_url})\n"
        f"**Title:** {pr.title}\n"
        f"**Consent ID:** `{consent_record.id}`\n\n"
        f"Please review and merge when ready."
    )

    # Log
    await log_action("amendment_approved", {
        "consent_id": consent_record.id,
        "pr_number": pr_number
    })


async def reject_amendment(consent_record: ConsentRecord):
    """Handle rejected amendment."""

    process = consent_record.process
    pr_number = process.pr_number

    # Add rejection comment
    await add_pr_comment(
        repo="reacc-commons-constitution",
        pr_number=pr_number,
        body=(
            f"## ❌ Consent Not Reached\n\n"
            f"This amendment did not receive sufficient consent.\n\n"
            f"**Reason:** {consent_record.reason}\n"
            f"**Consent ID:** `{consent_record.id}`\n\n"
            f"The proposer may revise and resubmit if desired."
        )
    )

    # Update labels
    await remove_labels("reacc-commons-constitution", pr_number, ["consent-in-progress"])
    await add_label("reacc-commons-constitution", pr_number, "consent-not-reached")
```

---

## Outputs

```yaml
outputs:
  on_valid_pr:
    - analysis: completed
    - consent_process: created
    - discord_post: sent
    - pr_comment: added
    - label: consent-in-progress
    - trigger: track-consent

  on_invalid_pr:
    - pr_comment: validation errors
    - label: needs-revision
    - log: amendment_invalid

  on_approved:
    - pr_comment: approval added
    - label: ready-to-merge
    - notification: sent to stewardship
    - log: amendment_approved

  on_rejected:
    - pr_comment: rejection added
    - label: consent-not-reached
    - log: amendment_rejected
```

---

## Autonomous Execution

**Agent merges PR directly after consent is complete.**

There is no human gating on the merge. The consent process (which includes humans as participants) is the decision point.

```python
async def merge_amendment_autonomous(pr_number: int, consent_record: ConsentRecord):
    """Merge constitutional amendment after consent."""

    # Agent has merge rights on constitution repo
    await github_api.merge_pr(
        repo="reacc-commons-constitution",
        pr_number=pr_number,
        merge_method="squash",
        commit_message=(
            f"{consent_record.process.title}\n\n"
            f"Consent ID: {consent_record.id}\n"
            f"Consents: {consent_record.member_consent_count}\n"
            f"Window: {consent_record.process.window_hours}h\n\n"
            f"Merged autonomously after consent complete."
        )
    )

    # Record and announce
    await record_amendment(consent_record)
    await announce_amendment(pr_number, consent_record)
```

**Agent capabilities:**
- PR analysis and validation (full)
- Discord posting (full)
- Consent tracking (full)
- PR merging (full, autonomous)
- Conflict resolution (attempt, then escalate)

**Human participation:**
- Proposing amendments (via PR)
- Consenting or objecting during window
- Call-up if merge causes issues

---

## Related Skills

- `track-consent.md` — Monitor consent
- `finalize-decision.md` — Close consent window
- `../knowledge-commons/validate-schema.md` — Schema validation
