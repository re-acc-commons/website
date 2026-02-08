# GitHub Skills

Comprehensive GitHub management for distributed knowledge commons with democratic PR moderation.

## Purpose

These skills enable:
1. **Branch Management**: Create feature branches for knowledge work
2. **Commits**: Structured commits with proper attribution
3. **Pull Requests**: Create, review, and manage PRs
4. **Democratic Voting**: Informal voting system for PR approval
5. **Merge Automation**: Auto-merge when approval threshold reached
6. **Sync Operations**: Keep local and remote in sync

## Sub-Skills

### github/check

Check repository status and pending work.

```yaml
# Input: none (uses current repo)
# Output:
status:
  branch: main
  ahead: 0
  behind: 2
  uncommitted_changes: 3
  staged_files: 1

pending_prs:
  - number: 42
    title: "Add participatory budgeting pattern"
    author: sarah-chen
    created: 2026-01-28
    votes:
      approve: 2
      reject: 0
      required: 3
    time_remaining: "18 hours"
    status: needs_votes

  - number: 41
    title: "Update food sovereignty protocol"
    author: marcus-j
    created: 2026-01-25
    votes:
      approve: 3
      reject: 0
      required: 3
    status: ready_to_merge

remote_updates:
  - branch: main
    commits_behind: 2
    latest: "Merge PR #40: Add bioregional mapping framework"
```

### github/branch

Create a feature branch for knowledge work.

```yaml
# Input
name: add-food-council-patterns
base: main  # optional, defaults to main

# Output
created:
  branch: add-food-council-patterns
  from: main
  commit: abc123

# Naming convention
branch_patterns:
  - add-{entity-type}-{entity-slug}     # New content
  - update-{entity-type}-{entity-slug}  # Updates
  - merge-{entity-slug}                 # Merging entities
  - fix-{description}                   # Corrections
```

### github/commit

Create structured commits with proper messages and attribution.

```yaml
# Input
files:
  - patterns/food-sovereignty.md
  - _index/entities.json
message: "Add food sovereignty pattern"
type: add  # add, update, merge, fix, docs
source: "Food Council transcript 2026-01-15"

# Output
commit:
  hash: def456
  message: |
    [add] Add food sovereignty pattern

    - New pattern extracted from Food Council transcript
    - Related to participatory budgeting, bioregional coordination
    - Source: food-council-jan-2026.md

    Co-authored-by: OPAL <opal@opencivics.co>
  files_changed: 2
  insertions: 145
  deletions: 3

# Commit message format
format: |
  [{type}] {message}

  {body with details}

  Source: {source_file}
  Entities: {entity_list}

  Co-authored-by: OPAL <opal@opencivics.co>
```

### github/pr-create

Create a pull request for review.

```yaml
# Input
title: "Add food sovereignty pattern"
body: |
  ## Summary
  Extracted food sovereignty pattern from Food Council meeting transcript.

  ## Changes
  - New pattern: `patterns/food-sovereignty.md`
  - Updated entity index

  ## Extracted From
  - Source: food-council-jan-2026.md
  - Date: 2026-01-15
  - Speakers: Sarah Chen, Marcus Johnson, Elena Rodriguez

  ## Related Entities
  - [[patterns/participatory-budgeting.md]]
  - [[protocols/bioregional-food-council.md]]

branch: add-food-sovereignty
base: main
labels: [new-pattern, food-systems, needs-review]

# Output
pr:
  number: 43
  url: https://github.com/org/repo/pull/43
  status: open
  voting_deadline: 2026-02-04T12:00:00Z  # 72 hours from creation
```

### github/vote

Cast a vote on a pending PR.

```yaml
# Input
pr_number: 42
vote: approve  # approve, reject, abstain
comment: "Good extraction, verified against source transcript."

# Output
vote_recorded:
  pr: 42
  voter: current_user
  vote: approve
  timestamp: 2026-02-01T14:30:00Z
  current_tally:
    approve: 3
    reject: 0
    required: 3
  status: ready_to_merge  # or needs_votes, blocked

# Voting rules (from config/governance.yaml)
rules:
  required_approvals: 3
  rejection_blocks: true  # Any rejection blocks merge
  voting_period_hours: 72
  voters: github_contributors  # Anyone with repo permissions
```

### github/merge

Merge an approved PR.

```yaml
# Input
pr_number: 42
strategy: squash  # merge, squash, rebase

# Pre-checks
checks:
  - required_approvals: ✓ (3/3)
  - no_rejections: ✓
  - no_conflicts: ✓
  - ci_passing: ✓
  - voting_period_elapsed: ✓ (24h minimum)

# Output
merged:
  pr: 42
  commit: ghi789
  strategy: squash
  timestamp: 2026-02-01T15:00:00Z

# Post-merge actions
post_merge:
  - Update _index/entities.json
  - Trigger notion-sync skill
  - Update _federation/outbox
  - Notify subscribed repos
```

### github/sync

Sync local repository with remote.

```yaml
# Input
direction: pull  # pull, push, both

# Output (pull)
sync:
  direction: pull
  commits_fetched: 2
  files_updated:
    - patterns/new-pattern.md
    - _index/entities.json
  conflicts: []

# Output (push)
sync:
  direction: push
  commits_pushed: 1
  branch: add-food-sovereignty
```

## Democratic Governance

### Voting System

The voting system uses GitHub's native features plus OPAL tracking:

```yaml
# Vote storage: PR comments with structured format
vote_comment_format: |
  ## OPAL Vote: {APPROVE|REJECT|ABSTAIN}

  {optional comment}

  ---
  Voter: @{username}
  Timestamp: {ISO timestamp}
  Vote ID: {uuid}

# Vote parsing
parse_votes:
  - Scan PR comments for "## OPAL Vote:" header
  - Extract vote type, voter, timestamp
  - Deduplicate (latest vote per user wins)
  - Calculate tally
```

### Approval Requirements

From `config/governance.yaml`:

```yaml
governance:
  pr_moderation:
    # Number of approvals needed
    required_approvals: 3

    # Minimum time PR must be open
    minimum_open_hours: 24

    # Maximum voting period
    voting_deadline_hours: 72

    # Rejection handling
    rejection_blocks: true
    rejection_resolution: "Author must address feedback and request re-review"

    # Auto-merge settings
    auto_merge_enabled: true
    auto_merge_conditions:
      - required_approvals_met
      - no_rejections
      - minimum_open_hours_elapsed
      - all_checks_passing

    # Who can vote
    voters: github_contributors  # Anyone with push access

    # Notification
    notify_on_new_pr: true
    notify_channels: [email, telegram]
```

### Vote Tracking Dashboard

The `/github status` command shows:

```
🗳️ PR Voting Dashboard
━━━━━━━━━━━━━━━━━━━━━━━

PR #42: Add participatory budgeting pattern
├── Author: @sarah-chen
├── Created: 3 days ago
├── Status: ⏳ Needs 1 more vote
├── Votes: ✅ 2 approve | ❌ 0 reject
├── Deadline: 18 hours remaining
└── Actions: /github vote 42 approve

PR #41: Update food sovereignty protocol
├── Author: @marcus-j
├── Created: 5 days ago
├── Status: ✅ Ready to merge
├── Votes: ✅ 3 approve | ❌ 0 reject
└── Actions: /github merge 41

Your pending reviews:
• PR #43 - needs your vote (opened 2 hours ago)
```

## Error Handling

| Error | Action |
|-------|--------|
| Not authenticated | Prompt for `gh auth login` |
| No push access | Explain permission requirements |
| Merge conflict | Show conflict details, suggest resolution |
| PR already merged | Inform user, suggest sync |
| Vote already cast | Show existing vote, offer to change |
| Voting period expired | Show final tally, allow manual merge decision |

## Integration with Pipeline

The GitHub skills integrate with the processing pipeline:

```yaml
pipeline_integration:
  # After COMMIT stage
  on_commit:
    - Create branch if not on feature branch
    - Commit changes
    - If commons mode: auto-create PR

  # After NOTIFY stage
  on_notify:
    - Push to remote
    - Notify voters of new PR
    - Update federation outbox

  # After merge
  on_merge:
    - Pull latest main
    - Trigger notion-sync
    - Update local entity index
```
