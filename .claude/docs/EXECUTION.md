# OPAL Execution Layer

This document defines how OPAL skills are executed. Skills are not just specifications—they are **instructions for Claude to follow using available tools**.

## Core Principle

Every skill must be written as **imperative instructions** that Claude can execute step-by-step using:
- `Read` - Read files
- `Write` - Create files
- `Edit` - Modify files
- `Glob` - Find files
- `Grep` - Search content
- `Bash` - Run commands (git, etc.)
- `AskUserQuestion` - Get user input (BLOCKING)

## Pipeline State

All pipeline state is tracked in `_index/pipeline-state.json`:

```json
{
  "version": "1.0",
  "last_run": "2026-02-02T12:00:00Z",
  "inbox": {
    "items": ["_inbox/transcripts/meeting.md", ...],
    "last_scanned": "2026-02-02T12:00:00Z"
  },
  "processing": {
    "current_item": null,
    "stage": null,
    "progress": []
  },
  "staging": {
    "new": ["_staging/new/patterns/foo.md", ...],
    "updates": ["_staging/updates/bar.yaml", ...],
    "merges": ["_staging/merges/baz.yaml", ...]
  },
  "review": {
    "in_progress": false,
    "current_item": null,
    "accepted": [],
    "rejected": [],
    "skipped": []
  }
}
```

## Execution Flow

```
/sync → /process → /review → /commit
  │         │          │         │
  ▼         ▼          ▼         ▼
Pull     Process    BLOCKING   Git
from     each       user       commit
sources  item       review     changes
```

## Critical Rule: User Interaction is BLOCKING

The `/review` command MUST use `AskUserQuestion` for EACH item and wait for the user's response before proceeding. This is non-negotiable.

```
WRONG:
  - Show all items
  - "Which would you like to accept?"
  - Batch process

RIGHT:
  - Show item 1
  - AskUserQuestion: Accept/Reject/Edit/Skip?
  - Wait for response
  - Process response
  - Show item 2
  - AskUserQuestion: Accept/Reject/Edit/Skip?
  - Wait for response
  - ... repeat for each item
```

## Skill Execution Format

Each skill file should have an `## Execution` section with numbered steps:

```markdown
## Execution

### Step 1: Validate Prerequisites
Use the Read tool to check that required files exist:
- Read `_index/entities.json` - if missing, create empty index
- Read `.opal/schema.yaml` or find schema in `.claude/templates/`

### Step 2: [Next Step]
[Explicit instructions using tool names]

### Step 3: [Next Step]
[...]
```

## Error Handling

Every step should handle errors:

```markdown
### Step N: Do Something
1. Use Read to load `some/file.json`
2. If file doesn't exist:
   - Report: "⚠️ Required file missing: some/file.json"
   - Use AskUserQuestion: "Create empty file?" / "Abort"
3. If file is malformed:
   - Report: "⚠️ File is malformed: [error details]"
   - Attempt recovery or ask user
```

## Standard Patterns

### Pattern: Load Schema
```markdown
1. Use Glob to find schema: `.opal/schema.yaml`, `.claude/templates/*/manifest.yaml`
2. Read the first match
3. If no schema found, use AskUserQuestion to select a template or create custom
```

### Pattern: Interactive List Processing
```markdown
1. Load list of items to process
2. For index, item in enumerate(items):
   a. Display item preview
   b. Use AskUserQuestion with options: Accept, Reject, Edit, Skip
   c. Based on response:
      - Accept: Move/copy to destination
      - Reject: Move to rejected/, log reason
      - Edit: Show content, allow modification, then accept
      - Skip: Leave in place, continue to next
   d. Update pipeline state
3. Show summary of actions taken
```

### Pattern: Update Entity Index
```markdown
1. Read `_index/entities.json`
2. For each change:
   - Add new entity: Add to entities object with generated ID
   - Update entity: Merge new data with existing
   - Remove entity: Delete from entities object
3. Update statistics
4. Update last_updated timestamp
5. Write back to `_index/entities.json`
```

## Command Execution Status

Commands with complete execution instructions:

| Command | Has Execution | User Interaction | Notes |
|---------|---------------|------------------|-------|
| `/process` | ✅ Complete | Optional error handling | Batch processing of inbox |
| `/review` | ✅ Complete | **BLOCKING per item** | Human-in-the-loop quality gate |
| `/status` | ✅ Complete | None | Read-only status report |
| `/sync` | ✅ Complete | Error recovery only | Pull from configured sources |
| `/github` | ✅ Complete | Commit/PR/Vote/Merge confirmation | Git operations |
| `/ingest` | ✅ Complete | None | Manual content ingestion |
| `/search` | ⏳ Pending | None | Query/response |
| `/ask` | ⏳ Pending | None | Query/response |
| `/setup` | ✅ Complete | **BLOCKING wizard** | Multi-phase configuration with smart suggestions |
| `/federate` | ⏳ Pending | Subscription confirmation | Federation management |

## Command → Skill Mapping

| Command | Primary Skill | Execution Type |
|---------|---------------|----------------|
| `/process` | process-pipeline | Batch, can interrupt |
| `/review` | review-interactive | **Must be interactive** |
| `/sync` | sync-sources | Batch |
| `/github commit` | git-commit | Single action with confirmation |
| `/search` | search-semantic | Query/response |
| `/ask` | qa-corpus | Query/response |

## State Files

OPAL uses these JSON files to track state:

### `_index/pipeline-state.json`
Tracks processing pipeline state:
- Inbox items pending
- Processing progress
- Staging areas (new/updates/merges)
- Review session state

### `_index/entities.json`
Master entity registry:
- Canonical names and aliases
- Entity types and metadata
- File paths and relationships
- Statistics

### `_index/sync-state.json`
Tracks sync cursors:
- Last sync time per source
- Cursor positions (message IDs, timestamps)
- Item counts and error counts

## Testing Execution

When testing a skill's execution:
1. Create sample data in `_inbox/`
2. Run the command
3. Verify each step produces expected output
4. Verify user interactions are properly blocking
5. Verify state is correctly updated
6. Verify error handling works
