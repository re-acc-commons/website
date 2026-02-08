# /ingest Command

Add content to the inbox for processing.

## Usage

```
/ingest <source>           # Ingest from configured source
/ingest file <path>        # Ingest specific file
/ingest url <url>          # Ingest from URL
/ingest transcript <source># Pull transcripts from service
/ingest telegram           # Pull links from Telegram
/ingest clipboard          # Ingest from clipboard
```

---

## EXECUTION INSTRUCTIONS

When this command is invoked, execute based on the subcommand provided.

### Routing

Parse the arguments to determine ingestion type:
- `file <path>` → Execute File Flow
- `url <url>` → Execute URL Flow
- `transcript <source>` → Execute Transcript Flow
- `telegram` → Execute Telegram Flow
- `clipboard` → Execute Clipboard Flow
- `<source>` (other) → Treat as source name, use appropriate flow

---

### File Flow

**Action:** Use Read, Write, and Bash tools.

**Step 1:** Validate file exists
```bash
test -f "{path}" && echo "exists" || echo "not found"
```

If not found:
```
⚠️ File not found: {path}
```
STOP.

**Step 2:** Detect file type and classify

Based on extension and path:
- `.md` in transcripts/ → `_inbox/transcripts/`
- `.pdf` → `_inbox/documents/`
- `.md` with URL in content → `_inbox/links/`
- Other → `_inbox/documents/`

**Step 3:** Read file content

Use Read tool to get file content.

**Step 4:** Create inbox file

Generate filename: `{original_name}` or `{date}-{slug}.md`

Add frontmatter:
```yaml
---
source: file
source_path: {original_path}
ingested: {timestamp}
---
```

Use Write tool to save to appropriate inbox subdirectory.

**Step 5:** Report success
```
📥 Ingested: {filename}
   └── Saved to: {inbox_path}

Next: Run /process to extract entities
```

---

### URL Flow

**Action:** Use WebFetch and Write tools.

**Step 1:** Validate URL format

Check URL is well-formed. If not:
```
⚠️ Invalid URL: {url}
```
STOP.

**Step 2:** Fetch URL content

Use WebFetch tool:
```
url: {url}
prompt: "Extract the main content of this page. Return the title, author (if available), publication date (if available), and the full article/document text in markdown format."
```

**Step 3:** Classify content type

Based on URL domain and content:
- `arxiv.org` → research paper
- `lu.ma`, `eventbrite.com` → event
- `grants.gov` → grant
- `youtube.com` → video (fetch transcript)
- Default → article

**Step 4:** Create inbox file

Generate filename: `{domain}-{slug}-{date}.md`

Add frontmatter:
```yaml
---
source: url
url: {url}
fetched: {timestamp}
content_type: {detected_type}
title: {extracted_title}
author: {if available}
---
```

Write to `_inbox/links/`

**Step 5:** Report success
```
📥 Ingested: {title}
   ├── URL: {url}
   ├── Type: {content_type}
   └── Saved to: _inbox/links/{filename}

Next: Run /process to extract entities
```

---

### Transcript Flow

**Action:** Use appropriate tools based on source.

**Step 1:** Identify transcript source

If `--all` flag, process all configured sources.
Otherwise, use the specified source.

**Step 2:** Fetch transcripts by source type

**For meetily (local):**
- Note: Would query SQLite database at known path
- For now, report what would be fetched

**For otter/fathom/readai:**
- Note: Requires MCP server or API integration
- If not configured, report:
  ```
  ⚠️ {source} not configured.
  Run /sources add {source} to set up integration.
  ```

**Step 3:** For each transcript found

1. Generate filename: `{meeting_title}-{date}.md`
2. Format content with speaker labels
3. Add frontmatter with source metadata
4. Write to `_inbox/transcripts/`

**Step 4:** Report results
```
📥 Ingested Transcripts
━━━━━━━━━━━━━━━━━━━━━━

Source: {source}

[1] {meeting_title} - {date}
    ├── Duration: {duration}
    ├── Speakers: {count}
    └── ✅ Saved to: _inbox/transcripts/{filename}

[2] ...

━━━━━━━━━━━━━━━━━━━━━━
Ingested: {n} transcripts

Next: Run /process to extract entities
```

---

### Telegram Flow

**Action:** Note current limitations.

**Step 1:** Check Telegram configuration

Read config to find bot token and channel settings.

If not configured:
```
⚠️ Telegram not configured.
Run /sources add telegram to set up the bot integration.
```
STOP.

**Step 2:** Note integration requirement
```
📥 Telegram Ingestion

⚠️ Telegram ingestion requires MCP server or bot integration.

To set up:
1. Create a bot via @BotFather
2. Add bot token to config/secrets.local
3. Add bot to channels to monitor

Alternative: Copy message links manually
/ingest url <telegram_message_url>
```

---

### Clipboard Flow

**Action:** Use Bash and Write tools.

**Step 1:** Get clipboard content
```bash
pbpaste
```

If empty:
```
⚠️ Clipboard is empty.
```
STOP.

**Step 2:** Classify content

Analyze clipboard text:
- If starts with `http` → Treat as URL, use URL Flow
- If has speaker labels → Treat as transcript
- Otherwise → Treat as note/clipping

**Step 3:** Create inbox file

Generate filename: `clipboard-{timestamp}.md`

Add frontmatter:
```yaml
---
source: clipboard
ingested: {timestamp}
---
```

Write to `_inbox/clippings/`

**Step 4:** Report success
```
📥 Ingested from clipboard
   └── Saved to: _inbox/clippings/{filename}

Next: Run /process to extract entities
```

---

## Sources

### File Ingestion

```
/ingest file ~/Documents/meeting-notes.md
/ingest file ./paper.pdf
/ingest file /path/to/transcript.txt
```

Copies file to appropriate inbox subdirectory based on type detection.

### URL Ingestion

```
/ingest url https://example.com/article
/ingest url https://arxiv.org/pdf/2024.12345.pdf
```

Fetches content, converts to markdown, stores in `_inbox/links/`.

### Transcript Sources

```
/ingest transcript otter     # Pull from Otter.ai
/ingest transcript fathom    # Pull from Fathom
/ingest transcript readai    # Pull from Read.ai
/ingest transcript meetily   # Pull from local Meetily DB
/ingest transcript --all     # Pull from all configured sources
```

Uses MCP servers or API fallback to fetch recent transcripts.

### Telegram Links

```
/ingest telegram             # Pull new links from configured channels
/ingest telegram --since 7d  # Links from last 7 days
/ingest telegram --channel "Consortium Chat"  # Specific channel
```

Fetches links shared in Telegram channels via bot integration.

### Clipboard

```
/ingest clipboard            # Ingest clipboard contents
```

Takes current clipboard text, creates file in inbox.

## Example Output

```
📥 Ingesting Content
━━━━━━━━━━━━━━━━━━━

Source: Otter.ai (last 7 days)

Found 4 new transcripts:

[1] Food Council Meeting - Jan 28, 2026
    ├── Duration: 47 minutes
    ├── Speakers: 4 identified
    └── ✅ Saved to: _inbox/transcripts/food-council-2026-01-28.md

[2] Bioregional Planning Session - Jan 25, 2026
    ├── Duration: 1h 12m
    ├── Speakers: 6 identified
    └── ✅ Saved to: _inbox/transcripts/bioregional-planning-2026-01-25.md

[3] Weekly Standup - Jan 24, 2026
    ├── Duration: 15 minutes
    ├── Speakers: 3 identified
    └── ⏭️ Skipped: matches exclusion filter "standup"

[4] Community Garden Workshop - Jan 22, 2026
    ├── Duration: 2h 5m
    ├── Speakers: 8 identified
    └── ✅ Saved to: _inbox/transcripts/garden-workshop-2026-01-22.md

━━━━━━━━━━━━━━━━━━━
Ingested: 3 transcripts
Skipped: 1 (filter match)

Next: Run /process to extract entities
```

## Filtering

Configure ingestion filters in `config/integrations.yaml`:

```yaml
otter:
  enabled: true
  filters:
    exclude_titles:
      - "standup"
      - "1:1"
      - "daily sync"
    min_duration_minutes: 10
    max_age_days: 30
```

## Inbox Organization

Ingested content is automatically sorted:

```
_inbox/
├── transcripts/           # From Otter, Fathom, Read.ai, Meetily
│   ├── food-council-2026-01-28.md
│   └── bioregional-planning-2026-01-25.md
├── links/                 # From Telegram, manual URLs
│   ├── telegram-2026-01-28-001.md
│   └── arxiv-paper-12345.md
├── documents/             # PDFs, Word docs, etc.
│   └── handbook.pdf
└── clippings/             # Quick captures, clipboard
    └── clipboard-2026-01-28-1430.md
```

## Metadata Preservation

Each ingested file includes source metadata:

```yaml
---
source: otter
source_id: abc123
ingested: 2026-01-28T14:30:00Z
original_title: "Food Council Meeting"
duration: 47:23
speakers:
  - Sarah Chen
  - Marcus Johnson
  - Elena Rodriguez
  - Unknown Speaker 1
---

[transcript content...]
```

## Options Reference

| Option | Description |
|--------|-------------|
| `--since <duration>` | Only content newer than duration (e.g., 7d, 24h) |
| `--limit <n>` | Ingest at most n items |
| `--dry-run` | Show what would be ingested |
| `--force` | Ingest even if already exists |
| `--project <name>` | Tag with project for routing |
