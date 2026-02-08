# /status Command

Show the current state of the knowledge commons.

## Usage

```
/status              # Full status overview
/status inbox        # Just inbox status
/status staging      # Just staging status
/status github       # GitHub and PR status
/status index        # Entity index statistics
/status integrations # Integration health
```

---

## EXECUTION INSTRUCTIONS

When this command is invoked, execute these steps IN ORDER using the specified tools.

### Step 1: Determine Scope

Parse any arguments to determine which status to show:
- No argument → Full status (execute all substeps)
- `inbox` → Only Step 2
- `staging` → Only Step 3
- `github` → Only Step 4
- `index` → Only Step 5
- `integrations` → Only Step 6

### Step 2: Inbox Status

**Action:** Use Glob tool to scan inbox directories.

1. Use Glob with patterns:
   - `_inbox/transcripts/**/*.md` → transcripts
   - `_inbox/links/**/*.md` → links
   - `_inbox/documents/**/*` → documents
   - `_inbox/feeds/**/*.md` → feeds

2. For each file found, note the modification time to determine age

3. Count files by subdirectory

**Output:**
```
📥 Inbox: {N} items awaiting processing
   ├── {n} transcripts
   ├── {n} links
   ├── {n} documents
   └── Oldest: {age} ago
```

### Step 3: Staging Status

**Action:** Use Glob tool to scan staging directories.

1. Use Glob with patterns:
   - `_staging/new/**/*.md` → new entities
   - `_staging/updates/*.yaml` → updates
   - `_staging/merges/*.yaml` → merges

2. Read `_index/pipeline-state.json` to get additional context

3. Count files by type

**Output:**
```
📝 Staging: {N} items awaiting review
   ├── {n} new entities
   ├── {n} updates to existing
   ├── {n} potential merges
   └── Ready for: /review
```

### Step 4: GitHub Status (if git repo)

**Action:** Use Bash tool for git operations.

1. Check if directory is a git repository:
   ```bash
   git rev-parse --git-dir 2>/dev/null
   ```

2. If git repo, run:
   ```bash
   git status --porcelain
   git log -1 --format="%H %s" origin/main 2>/dev/null
   gh pr list --json number,title,author,reviewDecision,reviews --limit 5 2>/dev/null
   ```

3. Parse results to show:
   - Branch status
   - Uncommitted changes
   - Open PRs and their approval status

**Output:**
```
🔀 GitHub: {status}
   ├── Branch: {branch} ({status})
   ├── Uncommitted: {n} files
   └── Open PRs: {n}
```

### Step 5: Entity Index Status

**Action:** Use Read tool to load entity index.

1. Read `_index/entities.json`

2. Count entities by type from the statistics section

3. Get last_updated timestamp

**Output:**
```
📊 Entity Index
   ├── Total entities: {N}
   ├── By type: {breakdown}
   ├── Last updated: {timestamp}
   └── Index health: ✅ Good
```

### Step 6: Integration Health (if full status)

**Action:** Check configuration and connectivity.

1. Read `config/integrations.yaml` or `.opal/sources.yaml`

2. For enabled integrations, check basic connectivity:
   - Notion: Check if token is configured
   - GitHub: Already checked in Step 4
   - Local sources: Check if paths exist

**Output:**
```
🔌 Integrations
   ├── {source}: {status}
   └── ...
```

### Step 7: Suggested Actions

Based on the status gathered, suggest next actions:

- If inbox has items → suggest `/process`
- If staging has items → suggest `/review`
- If uncommitted changes → suggest `/github commit`
- If PRs need votes → suggest `/github vote`

**Output:**
```
━━━━━━━━━━━━━━━━━━━━━
Suggested actions:
• {action1}
• {action2}
```

---

## Full Status Output

```
📚 OPAL Status Report
━━━━━━━━━━━━━━━━━━━━━

Mode: Commons (Open Protocol Library)
Repository: omniharmonic/open-protocol-library
Branch: main (up to date)
Last sync: 2 hours ago

📥 Inbox: 5 items awaiting processing
   ├── 3 transcripts (Otter, Fathom)
   ├── 2 links (Telegram)
   └── Oldest: 3 days ago

📝 Staging: 8 items awaiting review
   ├── 4 new entities
   ├── 3 updates to existing
   ├── 1 potential merge
   └── Ready for: /review

🔀 GitHub: 2 PRs pending
   ├── PR #42: Add participatory budgeting pattern
   │   └── Votes: 2/3 (needs 1 more) ⏳ 18h remaining
   └── PR #41: Update food sovereignty protocol
       └── Votes: 3/3 ✅ Ready to merge

📊 Entity Index
   ├── Total entities: 342
   ├── By type: 89 patterns, 45 protocols, 28 playbooks, 180 other
   ├── Last updated: 30 minutes ago
   └── Index health: ✅ Good

🔌 Integrations
   ├── Notion: ✅ Connected (last sync: 1h ago)
   ├── GitHub: ✅ Connected
   ├── Otter.ai: ✅ Connected (3 new transcripts)
   └── Telegram: ✅ Connected (2 new links)

━━━━━━━━━━━━━━━━━━━━━
Suggested actions:
• /process - Process 5 inbox items
• /review - Review 8 staged items
• /github vote 42 approve - Cast your vote
• /github merge 41 - Merge approved PR
```

## Inbox Status

```
/status inbox

📥 Inbox Status
━━━━━━━━━━━━━━━

Total: 5 items

By type:
├── transcripts/: 3 files
│   ├── food-council-2026-01-28.md (3 days old)
│   ├── bioregional-planning-2026-01-25.md (6 days old)
│   └── garden-workshop-2026-01-22.md (9 days old)
│
├── links/: 2 files
│   ├── telegram-2026-01-28-001.md (3 days old)
│   └── telegram-2026-01-27-003.md (4 days old)
│
└── documents/: 0 files

Recommendations:
• 2 items over 1 week old - consider processing soon
• Run /process to start pipeline
```

## Staging Status

```
/status staging

📝 Staging Status
━━━━━━━━━━━━━━━━━

Total: 8 items ready for review

New entities (4):
├── patterns/food-sovereignty.md
│   └── Extracted from: food-council-2026-01-28.md
├── protocols/seed-sharing-circle.md
│   └── Extracted from: garden-workshop-2026-01-22.md
├── people/elena-rodriguez.md
│   └── Mentioned in: 2 transcripts
└── organizations/bioregional-food-council.md
    └── Extracted from: food-council-2026-01-28.md

Updates (3):
├── patterns/participatory-budgeting.md
│   └── Adding: new mention, 2 relationships
├── people/sarah-chen.md
│   └── Adding: new role, organization link
└── protocols/community-garden-protocol.md
    └── Adding: 3 new steps from workshop

Merges (1):
└── "Community Food Systems" → "Food Sovereignty"
    └── Confidence: 0.82 (needs human review)

Run /review to process these items.
```

## GitHub Status

```
/status github

🔀 GitHub Status
━━━━━━━━━━━━━━━━

Repository: omniharmonic/open-protocol-library
Branch: main
Status: ✅ Up to date with remote

Open Pull Requests: 2

PR #42: Add participatory budgeting pattern
├── Author: @sarah-chen
├── Created: 3 days ago
├── Files: 2 changed (+145, -3)
├── Votes: ✅✅⬜ (2/3 required)
│   ├── @marcus-j: approved
│   └── @elena-r: approved
├── Deadline: 18 hours remaining
└── Action: /github vote 42 approve

PR #41: Update food sovereignty protocol
├── Author: @marcus-j
├── Created: 5 days ago
├── Files: 1 changed (+23, -8)
├── Votes: ✅✅✅ (3/3 required)
│   ├── @sarah-chen: approved
│   ├── @elena-r: approved
│   └── @ben-l: approved
└── Action: /github merge 41

Your pending reviews:
• PR #42 - awaiting your vote
```

## Integration Health

```
/status integrations

🔌 Integration Health
━━━━━━━━━━━━━━━━━━━━

Notion
├── Status: ✅ Connected
├── Workspace: Open Civic Commons
├── Last sync: 1 hour ago
├── Databases: 12 synced
└── Pending changes: 0

GitHub
├── Status: ✅ Connected
├── Repository: omniharmonic/open-protocol-library
├── Permissions: push, pull, admin
└── API calls remaining: 4,832/5,000

Otter.ai
├── Status: ✅ Connected
├── New transcripts: 3 available
├── Last check: 10 minutes ago
└── Quota: 42/100 hours this month

Fathom
├── Status: ⚠️ API key expiring
├── Expires: 7 days
├── New transcripts: 0
└── Action: Update API key in config/secrets.local

Telegram
├── Status: ✅ Connected
├── Bot: @opal_ingest_bot
├── Monitored channels: 3
└── New links: 2 available

Ollama
├── Status: ✅ Running
├── Endpoint: http://localhost:11434
├── Models: mistral:7b, llama3.2:7b
└── Used for: transcript cleanup, classification
```
