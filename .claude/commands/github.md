# /github Command

Comprehensive GitHub management for distributed knowledge commons.

## Usage

```
/github                      # Show GitHub status
/github check                # Check for updates
/github branch <name>        # Create feature branch
/github commit               # Commit staged changes
/github pr create            # Create pull request
/github pr list              # List open PRs
/github vote <pr#> <vote>    # Vote on PR
/github merge <pr#>          # Merge approved PR
/github sync                 # Sync with remote
```

---

## EXECUTION INSTRUCTIONS

When this command is invoked, execute based on the subcommand provided.

### Routing

Parse the arguments to determine subcommand:
- No argument or `check` → Execute Check Flow
- `branch <name>` → Execute Branch Flow
- `commit` → Execute Commit Flow
- `pr create` → Execute PR Create Flow
- `pr list` → Execute PR List Flow
- `vote <pr#> <vote>` → Execute Vote Flow
- `merge <pr#>` → Execute Merge Flow
- `sync` → Execute Sync Flow

---

### Check Flow

**Action:** Use Bash tool for git operations.

1. Verify git repository:
   ```bash
   git rev-parse --git-dir 2>/dev/null
   ```
   If not a git repo, report error and STOP.

2. Fetch remote and check status:
   ```bash
   git fetch origin 2>/dev/null
   git status --porcelain
   git log HEAD..origin/main --oneline 2>/dev/null
   ```

3. Check for open PRs:
   ```bash
   gh pr list --json number,title,author,reviewDecision --limit 10 2>/dev/null
   ```

4. Report status and suggest actions

---

### Branch Flow

**Action:** Use Bash tool to create branch.

1. Validate branch name (no spaces, valid characters)

2. Create and checkout branch:
   ```bash
   git checkout -b {branch_name}
   ```

3. Report success:
   ```
   ✅ Created branch: {branch_name}
      From: main (commit {hash})
   ```

---

### Commit Flow

**⚠️ REQUIRES USER CONFIRMATION**

**Action:** Use Bash and AskUserQuestion tools.

**Step 1:** Check for changes to commit
```bash
git status --porcelain
git diff --stat HEAD
```

If no changes:
```
📝 No changes to commit.
```
STOP here.

**Step 2:** Generate commit message

Analyze the changed files to generate a structured message:
- Read changed files to understand what was modified
- Determine commit type: [add], [update], [fix], [remove]
- List affected entities

**Step 3:** Ask user to confirm

**USE AskUserQuestion - THIS IS MANDATORY:**
```
questions: [{
  question: "Generated commit message:\n\n{message}\n\nProceed with this commit?",
  header: "Commit",
  options: [
    {label: "Yes, commit", description: "Create commit with this message"},
    {label: "Edit message", description: "Modify the commit message"},
    {label: "Cancel", description: "Don't commit"}
  ],
  multiSelect: false
}]
```

**WAIT FOR USER RESPONSE.**

**Step 4:** Process response

**If "Yes, commit":**
```bash
git add -A
git commit -m "{message}

Co-authored-by: OPAL <opal@opencivics.co>"
```

**If "Edit message":**
- Ask user what to change
- Regenerate message
- Return to Step 3

**If "Cancel":**
```
❌ Commit cancelled.
```
STOP.

**Step 5:** Report success
```
✅ Committed: {hash}
   Branch: {branch}
   Files: {n} changed
```

---

### PR Create Flow

**⚠️ REQUIRES USER CONFIRMATION**

**Action:** Use Bash and AskUserQuestion tools.

**Step 1:** Check prerequisites
```bash
git branch --show-current
git log origin/main..HEAD --oneline
```

If no commits ahead of main:
```
⚠️ No commits to create PR from.
```
STOP.

**Step 2:** Generate PR description

Analyze commits to generate:
- Title (short summary)
- Summary of changes
- Source information
- Related entities

**Step 3:** Ask user to confirm

**USE AskUserQuestion - THIS IS MANDATORY:**
```
questions: [{
  question: "Create PR with this description?\n\nTitle: {title}\n\n{summary}",
  header: "Create PR",
  options: [
    {label: "Yes, create", description: "Create PR with this description"},
    {label: "Edit", description: "Modify title or description"},
    {label: "Cancel", description: "Don't create PR"}
  ],
  multiSelect: false
}]
```

**WAIT FOR USER RESPONSE.**

**Step 4:** Process response

**If "Yes, create":**
```bash
git push -u origin {branch}
gh pr create --title "{title}" --body "{description}"
```

**If "Edit":**
- Ask user what to change
- Return to Step 3

**If "Cancel":**
```
❌ PR creation cancelled.
```
STOP.

**Step 5:** Report success
```
✅ Created PR #{number}: {title}
   URL: {url}
```

---

### Vote Flow

**⚠️ REQUIRES USER CONFIRMATION**

**Action:** Use Bash and AskUserQuestion tools.

**Step 1:** Get PR details
```bash
gh pr view {pr_number} --json title,author,files,body
```

**Step 2:** Display PR summary

**Step 3:** Ask user to confirm vote (unless vote already specified in args)

If vote not specified:
```
questions: [{
  question: "How do you want to vote on PR #{number}?",
  header: "Vote",
  options: [
    {label: "Approve", description: "Support merging this PR"},
    {label: "Reject", description: "Block this PR (requires reason)"},
    {label: "Abstain", description: "Acknowledge without voting"},
    {label: "Cancel", description: "Don't vote"}
  ],
  multiSelect: false
}]
```

**WAIT FOR USER RESPONSE.**

**Step 4:** Process vote

**If "Approve":**
```bash
gh pr review {pr_number} --approve --body "{optional_comment}"
```

**If "Reject":**
- Ask for rejection reason
- ```bash
  gh pr review {pr_number} --request-changes --body "{reason}"
  ```

**Step 5:** Report result
```
✅ Vote recorded: {vote_type}
   PR #{number}: {title}
```

---

### Merge Flow

**⚠️ REQUIRES USER CONFIRMATION**

**Action:** Use Bash and AskUserQuestion tools.

**Step 1:** Check merge eligibility
```bash
gh pr view {pr_number} --json state,reviews,mergeable,mergeStateStatus
```

Check:
- Has required approvals
- No blocking rejections
- No merge conflicts
- CI passing (if configured)

If not eligible, report blockers and STOP.

**Step 2:** Ask user to confirm

```
questions: [{
  question: "Merge PR #{number}?\n\nTitle: {title}\nApprovals: {n}/{required}",
  header: "Merge",
  options: [
    {label: "Yes, merge", description: "Squash and merge"},
    {label: "Cancel", description: "Don't merge"}
  ],
  multiSelect: false
}]
```

**WAIT FOR USER RESPONSE.**

**Step 3:** Execute merge

**If "Yes, merge":**
```bash
gh pr merge {pr_number} --squash --delete-branch
git pull origin main
```

**Step 4:** Post-merge actions
- Update local entity index
- Update pipeline state

---

### Sync Flow

**Action:** Use Bash tool.

```bash
git fetch origin
git pull origin main
git status
```

Report what was updated.

---

## Subcommands

### /github check

Check for remote updates and pending work:

```
/github check

🔍 Checking GitHub...

Remote: omniharmonic/open-protocol-library

Updates available:
├── 2 new commits on main
│   ├── abc123: [add] Add bioregional mapping framework
│   └── def456: [update] Fix typo in participatory budgeting
└── Action: /github sync to pull changes

Your local changes:
├── 3 uncommitted files
│   ├── patterns/food-sovereignty.md (new)
│   ├── _index/entities.json (modified)
│   └── people/elena-rodriguez.md (new)
└── Action: /github commit to save changes

Pending PRs needing your review:
├── PR #42: Add participatory budgeting pattern (2/3 votes)
└── Action: /github vote 42 approve
```

### /github branch

Create a feature branch:

```
/github branch add-food-patterns

✅ Created branch: add-food-patterns
   From: main (commit abc123)

Now on branch: add-food-patterns

Next steps:
• Make your changes
• /github commit to save
• /github pr create to submit for review
```

### /github commit

Commit changes with structured message:

```
/github commit

📝 Preparing commit...

Changes to commit:
├── patterns/food-sovereignty.md (new file)
├── _index/entities.json (modified)
└── people/elena-rodriguez.md (new file)

Generated commit message:
┌─────────────────────────────────────────────
│ [add] Add food sovereignty pattern and Elena Rodriguez
│
│ New entities extracted from Food Council transcript:
│ - patterns/food-sovereignty.md
│ - people/elena-rodriguez.md
│
│ Source: food-council-2026-01-28.md
│ Entities: food-sovereignty, elena-rodriguez
│
│ Co-authored-by: OPAL <opal@opencivics.co>
└─────────────────────────────────────────────

Proceed with this commit? [Y/n/edit]
> y

✅ Committed: ghi789
   Branch: add-food-patterns
   Files: 3 changed (+178, -2)
```

### /github pr create

Create a pull request:

```
/github pr create

📋 Creating Pull Request...

From: add-food-patterns → main
Commits: 1

Generated PR description:
┌─────────────────────────────────────────────
│ ## Summary
│ Extracted new entities from Food Council meeting transcript.
│
│ ## Changes
│ - **New Pattern**: Food Sovereignty
│ - **New Person**: Elena Rodriguez
│ - Updated entity index
│
│ ## Source
│ - Transcript: food-council-2026-01-28.md
│ - Date: January 28, 2026
│ - Speakers: Sarah Chen, Marcus Johnson, Elena Rodriguez
│
│ ## Related Entities
│ - [[patterns/participatory-budgeting.md]]
│ - [[organizations/bioregional-food-council.md]]
└─────────────────────────────────────────────

Create PR with this description? [Y/n/edit]
> y

✅ Created PR #43: Add food sovereignty pattern and Elena Rodriguez
   URL: https://github.com/omniharmonic/open-protocol-library/pull/43
   Status: Open, awaiting votes (0/3)
   Voting deadline: 72 hours (Feb 4, 2026 14:30)

Contributors have been notified.
```

### /github vote

Cast a vote on a PR:

```
/github vote 42 approve

🗳️ Casting vote on PR #42...

PR #42: Add participatory budgeting pattern
Author: @sarah-chen
Changes: 2 files (+145, -3)

Your vote: ✅ APPROVE

Add a comment (optional, press Enter to skip):
> Good extraction, verified against source transcript. Minor suggestion: add link to related PB resources.

✅ Vote recorded!

Current tally:
├── ✅ Approve: 3 (you, @marcus-j, @elena-r)
├── ❌ Reject: 0
└── Required: 3

Status: ✅ Ready to merge!
Action: /github merge 42
```

Vote options:
- `approve` - Support merging
- `reject` - Block merge (requires reason)
- `abstain` - Acknowledge without voting

### /github merge

Merge an approved PR:

```
/github merge 42

🔀 Merging PR #42...

Pre-merge checks:
├── ✅ Required approvals: 3/3
├── ✅ No rejections
├── ✅ No conflicts
├── ✅ CI checks passing
└── ✅ Voting period elapsed (24h minimum)

Merge strategy: squash

Proceed? [Y/n]
> y

✅ Merged PR #42 into main
   Commit: jkl012
   Method: squash

Post-merge actions:
├── ✅ Pulled latest main
├── ✅ Updated local entity index
├── ✅ Synced to Notion
└── ✅ Updated federation outbox
```

### /github sync

Sync local with remote:

```
/github sync

🔄 Syncing with remote...

Pulling from origin/main...
├── 2 commits fetched
├── Files updated:
│   ├── patterns/bioregional-mapping.md
│   └── _index/entities.json
└── ✅ Now up to date

Local changes:
├── No uncommitted changes
└── ✅ Clean working tree

Federation:
├── Notified 2 subscribed repos
└── ✅ Outbox updated
```

## Democratic Governance

### Voting Rules

From `config/governance.yaml`:

```yaml
required_approvals: 3          # Votes needed to merge
rejection_blocks: true         # Any rejection blocks
voting_period_hours: 72        # Time limit for voting
minimum_open_hours: 24         # Must be open at least this long
auto_merge_enabled: true       # Auto-merge when conditions met
```

### Voting Dashboard

```
/github pr list

🗳️ Open Pull Requests
━━━━━━━━━━━━━━━━━━━━━

PR #43: Add food sovereignty pattern
├── Author: @you
├── Votes: ⬜⬜⬜ (0/3)
├── Status: Awaiting votes
└── Deadline: 71 hours

PR #42: Add participatory budgeting pattern
├── Author: @sarah-chen
├── Votes: ✅✅✅ (3/3)
├── Status: Ready to merge
└── Action: /github merge 42

PR #41: Update bioregional framework
├── Author: @marcus-j
├── Votes: ✅❌⬜ (blocked)
├── Status: Rejected by @elena-r
└── Reason: "Needs source citation for new claims"

Your pending actions:
• Vote on PR #43 (new)
• Merge PR #42 (ready)
```

## Error Handling

```
⚠️ Cannot merge PR #42

Blocking issues:
├── ❌ Merge conflict with main
│   └── Conflicting file: _index/entities.json
├── Resolution: Pull latest main, resolve conflicts, push
└── Command: /github sync then resolve conflicts

---

⚠️ Cannot vote on PR #41

Issue:
├── ❌ You authored this PR
└── Authors cannot vote on their own PRs
```
