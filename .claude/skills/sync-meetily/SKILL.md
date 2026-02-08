# Meetily Source Processor

Extract meeting transcripts from Meetily's local SQLite database.

## Overview

Meetily is a free, local-first meeting transcription app that stores transcripts in a SQLite database. This skill extracts those transcripts and creates properly formatted markdown files in the OPAL inbox.

## Invocation

This skill is automatically invoked by `/sync` when `meetily` is configured as a source.

Direct invocation:
```
/sync meetily
/sync meetily --force    # Ignore cursor, resync all
/sync meetily --limit 5  # Only sync 5 most recent
```

---

## EXECUTION INSTRUCTIONS

When syncing from Meetily, execute these steps IN ORDER.

### Step 1: Locate Database

**Action:** Determine database path.

1. Read `.opal/sources.yaml` to check for custom path:
   ```yaml
   meetily:
     database: "/custom/path/to/database.sqlite"
   ```

2. If `database: auto` or not specified, use default path based on OS:
   - **macOS**: `~/Library/Application Support/com.meetily.ai/meeting_minutes.sqlite`
   - **Linux**: `~/.local/share/com.meetily.ai/meeting_minutes.sqlite`
   - **Windows**: `%APPDATA%/com.meetily.ai/meeting_minutes.sqlite`

3. Use Bash to verify database exists:
   ```bash
   test -f "$HOME/Library/Application Support/com.meetily.ai/meeting_minutes.sqlite" && echo "found" || echo "not found"
   ```

**If not found:**
```
❌ Meetily database not found.

Expected location:
  ~/Library/Application Support/com.meetily.ai/meeting_minutes.sqlite

Is Meetily installed and has at least one recording?
Run /sources configure meetily to set a custom path.
```
STOP.

### Step 2: Load Sync State

**Action:** Read current sync cursor.

1. Read `_index/sync-state.json`
2. Get `sources.meetily.cursor` (last synced meeting ID)
3. Get `sources.meetily.last_sync` (timestamp)

### Step 3: Get Filters

**Action:** Load filter configuration from `.opal/sources.yaml`.

```yaml
meetily:
  filters:
    min_duration_minutes: 5
    exclude_titles:
      - standup
      - 1:1
      - daily
```

Default filters if not specified:
- `min_duration_minutes`: 0 (no minimum)
- `exclude_titles`: [] (no exclusions)

### Step 4: Query Available Meetings

**Action:** Use Bash with sqlite3 to get meetings.

```bash
DB_PATH="$HOME/Library/Application Support/com.meetily.ai/meeting_minutes.sqlite"
sqlite3 "$DB_PATH" "
SELECT
  m.id,
  m.title,
  m.created_at,
  m.updated_at,
  COALESCE(SUM(t.duration), 0) as total_duration
FROM meetings m
LEFT JOIN transcripts t ON t.meeting_id = m.id
GROUP BY m.id
ORDER BY m.created_at DESC;
"
```

**Parse results:** Each row is `id|title|created_at|updated_at|total_duration`

### Step 5: Filter Meetings

**Action:** Apply configured filters.

1. **Duration filter**: Skip if `total_duration / 60 < min_duration_minutes`

2. **Title exclusion**: Skip if title contains any exclude keyword (case-insensitive)
   ```python
   for keyword in exclude_titles:
       if keyword.lower() in title.lower():
           skip = True
   ```

3. **Cursor filter** (unless --force):
   - Only include meetings created AFTER `last_sync`
   - Or if meeting ID not in previously synced list

4. **Limit filter** (if --limit N specified):
   - Take only first N meetings

**Output count:**
```
Found {total} meetings in Meetily.
After filters: {filtered} meetings to sync.
  ├── Skipped {duration_skipped} (under {min_duration} minutes)
  ├── Skipped {title_skipped} (excluded titles)
  └── Skipped {already_synced} (already synced)
```

### Step 6: Process Each Meeting

**FOR EACH meeting to sync:**

#### Step 6.1: Extract Transcript

**Action:** Query transcript segments.

```bash
DB_PATH="$HOME/Library/Application Support/com.meetily.ai/meeting_minutes.sqlite"
MEETING_ID="{meeting_id}"
sqlite3 "$DB_PATH" "
SELECT transcript
FROM transcripts
WHERE meeting_id = '$MEETING_ID'
ORDER BY timestamp;
"
```

**Parse:** Concatenate all transcript segments with double newlines.

#### Step 6.2: Extract Metadata (Optional)

If available, get summary and action items:

```bash
sqlite3 "$DB_PATH" "
SELECT summary, action_items, key_points
FROM transcripts
WHERE meeting_id = '$MEETING_ID'
AND summary IS NOT NULL
LIMIT 1;
"
```

#### Step 6.3: Generate Filename

**Format:** `meetily-{date}-{slug}.md`

1. Parse `created_at` to get date: `YYYY-MM-DD`
2. Generate slug from title:
   - Lowercase
   - Replace spaces with hyphens
   - Remove special characters
   - Truncate to 50 chars

**Example:** `meetily-2026-01-29-team-planning-session.md`

#### Step 6.4: Generate Markdown Content

**Action:** Use Write tool to create file.

**Template:**
```markdown
---
source: meetily
source_id: {meeting_id}
title: "{title}"
date: {created_at_iso}
synced_at: {current_timestamp}
duration_minutes: {total_duration / 60}
type: transcript
---

# {title}

**Source:** Meetily
**Date:** {formatted_date}
**Duration:** {duration_formatted}

---

## Summary

{summary if available, else "No summary available."}

## Action Items

{action_items if available, else "No action items extracted."}

## Key Points

{key_points if available, else "No key points extracted."}

---

## Transcript

{transcript_content}
```

**Write to:** `_inbox/transcripts/{filename}`

#### Step 6.5: Report Progress

```
[{index}/{total}] ✅ {title}
         → _inbox/transcripts/{filename}
```

### Step 7: Update Sync State

**Action:** Update `_index/sync-state.json`.

```json
{
  "sources": {
    "meetily": {
      "enabled": true,
      "last_sync": "{current_timestamp}",
      "cursor": "{most_recent_meeting_id}",
      "items_synced": {previous + new_count},
      "errors": {error_count}
    }
  }
}
```

### Step 8: Summary

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Meetily Sync Complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Meetings synced: {count}
Duration covered: {total_minutes} minutes
Output: _inbox/transcripts/

New files:
{for each file:}
  ├── {filename}

Next: Run /process to extract entities
```

---

## Database Schema Reference

### meetings table
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | UUID, primary key |
| title | TEXT | Meeting title (often AI-generated) |
| created_at | TEXT | ISO timestamp |
| updated_at | TEXT | ISO timestamp |
| folder_path | TEXT | Local storage path |

### transcripts table
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | UUID, primary key |
| meeting_id | TEXT | FK to meetings.id |
| transcript | TEXT | Text content of segment |
| timestamp | TEXT | ISO timestamp for segment |
| summary | TEXT | AI-generated summary (nullable) |
| action_items | TEXT | AI-generated action items (nullable) |
| key_points | TEXT | AI-generated key points (nullable) |
| audio_start_time | REAL | Start time in seconds |
| audio_end_time | REAL | End time in seconds |
| duration | REAL | Duration in seconds |
| speaker | TEXT | Speaker identifier (nullable) |

### Useful Queries

**List all meetings with duration:**
```sql
SELECT
  m.id, m.title, m.created_at,
  SUM(t.duration) / 60.0 as duration_minutes
FROM meetings m
LEFT JOIN transcripts t ON t.meeting_id = m.id
GROUP BY m.id
ORDER BY m.created_at DESC;
```

**Get full transcript for a meeting:**
```sql
SELECT transcript
FROM transcripts
WHERE meeting_id = ?
ORDER BY timestamp;
```

**Get meetings with summaries:**
```sql
SELECT DISTINCT m.*, t.summary, t.action_items
FROM meetings m
JOIN transcripts t ON t.meeting_id = m.id
WHERE t.summary IS NOT NULL;
```

---

## Error Handling

### Database Locked
If another process (Meetily app) has the database locked:
```
⚠️ Database is locked. Meetily may be recording.
    Wait for recording to finish, or use --force to retry.
```

### Corrupt Database
If SQLite reports corruption:
```
❌ Database appears corrupt.
    Try opening Meetily to repair, or restore from backup.
```

### Missing Transcript
If a meeting has no transcript segments:
```
⚠️ Skipping {title} - no transcript found
```

---

## Configuration Reference

Full configuration in `.opal/sources.yaml`:

```yaml
meetily:
  enabled: true
  type: transcript

  # Database location
  database: auto  # Or explicit path

  # Output location
  output: _inbox/transcripts/

  # Filename format
  filename_format: "meetily-{date}-{slug}.md"

  # Filters
  filters:
    min_duration_minutes: 5
    max_duration_minutes: 180  # Skip very long recordings
    exclude_titles:
      - standup
      - 1:1
      - daily sync
      - test
    include_only: []  # If set, ONLY sync titles containing these

  # Content options
  content:
    include_summary: true
    include_action_items: true
    include_key_points: true
    include_timestamps: false  # Add timestamps to transcript segments

  # Sync behavior
  sync:
    schedule: manual  # or cron expression
    batch_size: 50    # Max meetings per sync
```

---

## Integration with /process

After syncing, the transcripts are in `_inbox/transcripts/` ready for processing:

```
/process

[1/5] meetily-2026-01-29-team-planning.md
      ├── Type: transcript (confidence: 0.98)
      ├── Extracted: 8 entities, 3 relationships
      │   ├── People: Alice, Bob, Charlie
      │   ├── Projects: Q1 Planning
      │   └── Action items: 5
      └── ✅ Staged for review
```

The `/process` command will:
1. Classify as transcript (already marked in frontmatter)
2. Clean up transcript if needed
3. Extract entities using domain-aware extraction
4. Match against existing entities
5. Stage for review
