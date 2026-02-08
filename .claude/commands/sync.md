# /sync Command

Pull content from configured sources into the inbox.

## Usage

```
/sync                       # Sync all enabled sources
/sync <source>              # Sync specific source
/sync <source1> <source2>   # Sync multiple sources
/sync --status              # Show sync status for all sources
/sync --dry-run             # Preview what would be fetched
/sync --since <date>        # Override time range (ISO date)
/sync --force               # Ignore cursor, refetch all
/sync --retry-failed        # Retry previously failed items
/sync --discover            # Find new content sources
```

---

## EXECUTION INSTRUCTIONS

When this command is invoked, execute these steps IN ORDER using the specified tools.

### Step 1: Load Configuration

**Action:** Use Read and Glob tools to load source configuration.

1. Use Glob to find config files:
   - `.opal/sources.yaml`
   - `config/integrations.yaml`
   - `config/sources.yaml`

2. Read the first found config file to get list of enabled sources

3. Read `_index/sync-state.json` if it exists (for cursors/last sync times)

4. If `--status` flag: Display source status and STOP (don't sync)

5. If `--dry-run` flag: Set dry_run mode for reporting only

**Output:**
```
📥 Syncing Content Sources
━━━━━━━━━━━━━━━━━━━━━━━━━━

Found {N} enabled sources:
├── {source1}
├── {source2}
└── {source3}
```

**If no sources configured:**
```
⚠️ No sources configured.
Run /setup to configure content sources, or /sources add to add one.
```
STOP here.

### Step 2: Dispatch to Source Processors

For each enabled source (or specified source if argument given), dispatch to the appropriate source processor skill.

**CRITICAL:** Each source type has a dedicated skill with detailed EXECUTION INSTRUCTIONS. You MUST follow those skill instructions to perform the actual extraction.

#### Source Type → Skill Mapping

| Source Type | Skill Path | Description |
|-------------|------------|-------------|
| `meetily` | `.claude/skills/sync-meetily/SKILL.md` | Extract from local SQLite database |
| `rss` | `.claude/skills/sync-rss/SKILL.md` | Fetch RSS/Atom feeds |
| `filesystem` | `.claude/skills/sync-filesystem/SKILL.md` | Watch local directories |
| `telegram` | `.claude/skills/sync-telegram/SKILL.md` | Monitor Telegram channels |

#### Step 2a: For Each Enabled Source

**Action:** Read the corresponding skill file and execute its EXECUTION INSTRUCTIONS.

```
[{index}/{total}] {source_name}
      ├── Loading processor: sync-{source_type}
      ├── Executing EXECUTION INSTRUCTIONS...
```

**FOR meetily:**
1. Read `.claude/skills/sync-meetily/SKILL.md`
2. Execute ALL steps in its EXECUTION INSTRUCTIONS section:
   - Locate database at `$HOME/Library/Application Support/com.meetily.ai/meeting_minutes.sqlite`
   - Query meetings using sqlite3
   - Filter by duration, title exclusions, and cursor
   - Extract transcript content
   - Generate markdown files with proper frontmatter
   - Write to `_inbox/transcripts/`

**FOR rss:**
1. Read `.claude/skills/sync-rss/SKILL.md`
2. Execute ALL steps in its EXECUTION INSTRUCTIONS section:
   - Load feed URLs from configuration
   - Use WebFetch to fetch and parse each feed
   - Filter items by cursor/date
   - Fetch full article content for each new item
   - Generate markdown files with proper frontmatter
   - Write to `_inbox/feeds/`

**FOR filesystem:**
1. Read `.claude/skills/sync-filesystem/SKILL.md`
2. Execute ALL steps in its EXECUTION INSTRUCTIONS section:
   - Load watch paths from configuration
   - Use Glob to find matching files
   - Check modification times against seen_files
   - Process files by type (PDF, markdown, text, etc.)
   - Generate markdown files with proper frontmatter
   - Write to `_inbox/documents/`

**FOR telegram:**
1. Read `.claude/skills/sync-telegram/SKILL.md`
2. Execute ALL steps in its EXECUTION INSTRUCTIONS section:
   - Check for bot token in config or environment
   - Use Bash with curl to call Telegram API
   - Extract URLs from messages
   - Use WebFetch to get content from each URL
   - Generate markdown files with proper frontmatter
   - Write to `_inbox/links/telegram/`

#### Step 2b: Handle Unsupported Sources

If a source type doesn't have a dedicated processor skill:

```
[{index}/{total}] {source_name}
      └── ⚠️ No processor available for {source_type}
          Run /sources configure {source_type} for setup help
```

Continue to next source.

#### Step 2c: Dry Run Mode

If `--dry-run` is set, skills should report what WOULD happen without making changes:

```
[{index}/{total}] {source_name}
      ├── Would check: {database/feed/path/channel}
      ├── Estimated items: {count}
      └── 📋 Dry run - no changes made
```

### Step 3: Aggregate Results

After all source processors complete, collect their results:

1. Count total items synced across all sources
2. Count total errors
3. Note any sources that were skipped

### Step 4: Update Pipeline State

**Action:** Update `_index/pipeline-state.json` with sync summary.

```json
{
  "last_activity": "{current_timestamp}",
  "last_sync": "{current_timestamp}",
  "sync_summary": {
    "sources_checked": {count},
    "items_synced": {count},
    "errors": {count}
  }
}
```

### Step 5: Summary

**Action:** Report sync results.

```
━━━━━━━━━━━━━━━━━━━━━━━━━━
Sync Complete
━━━━━━━━━━━━━━━━━━━━━━━━━━

Sources:
{for each source:}
├── {source_name}: {count} items synced

Summary:
• Sources checked: {N}
• Items synced: {N}
• Failed: {N} (see _inbox/failed/)
• Total inbox items: {N}

New files:
{for each new file:}
├── {filename}

Next: Run /process to analyze new content
```

---

## Error Handling

If any source processor fails:

1. Log the error:
   ```
   ⚠️ Error syncing {source}
      {error description}
   ```

2. Continue to next source (don't abort entire sync)

3. Record failure in sync-state.json for later retry

4. Use AskUserQuestion if critical source fails:
   ```
   questions: [{
     question: "{source} failed. What would you like to do?",
     header: "Error",
     options: [
       {label: "Continue", description: "Skip this source, continue with others"},
       {label: "Retry", description: "Try this source again"},
       {label: "Abort", description: "Stop syncing"}
     ]
   }]
   ```

### Common Errors by Source

**Meetily:**
- Database not found → Check if Meetily is installed and has recordings
- Database locked → Meetily may be recording; wait and retry
- No meetings found → Filters may be too restrictive

**RSS:**
- Feed not found (404) → URL may have changed
- Parse error → Feed may not be valid RSS/Atom
- Article fetch failed → Site may be blocking; will retry

**Filesystem:**
- Path not found → Check watch path configuration
- Permission denied → Check file permissions
- File too large → Adjust max_file_size_mb setting

**Telegram:**
- Invalid bot token → Reconfigure with /sources configure telegram
- Bot not in channel → Add bot to the channel
- Rate limited → Wait and retry automatically

---

## Philosophy

**Pull, don't push.** OPAL proactively pulls content from your subscribed sources. Configure once, sync regularly.

**Intelligent fetching.** For URLs, OPAL acts as an agent: extracting content, handling pagination, and following relevant links.

**Incremental by default.** Only fetches content since last sync, tracked per-source.

---

## Available Sources

### Transcripts
| Source | Description | Auth |
|--------|-------------|------|
| `meetily` | Local SQLite database | None |
| `fathom` | Fathom.video transcripts | API Key |
| `otter` | Otter.ai transcripts | API Key |
| `read_ai` | Read.ai transcripts | API Key |
| `fireflies` | Fireflies.ai transcripts | API Key |

### Links & Articles
| Source | Description | Auth |
|--------|-------------|------|
| `telegram` | Links from monitored channels | Bot Token |
| `discord` | Links from monitored channels | Bot Token |
| `slack` | Links from monitored channels | App Token |
| `rss` | RSS/Atom feed articles | None |

### Events
| Source | Description | Auth |
|--------|-------------|------|
| `luma` | Events from lu.ma calendars | API Key |
| `eventbrite` | Events from organizers/searches | API Key |
| `meetup` | Events from Meetup groups | API Key |

### Media
| Source | Description | Auth |
|--------|-------------|------|
| `youtube` | Video transcripts/captions | API Key |
| `podcast` | Podcast episode transcription | None |
| `vimeo` | Video transcripts | API Key |

### Web
| Source | Description | Auth |
|--------|-------------|------|
| `urls` | Watch specific URLs for changes | None |
| `sitemap` | Monitor sitemaps for new pages | None |

### Documents
| Source | Description | Auth |
|--------|-------------|------|
| `filesystem` | Watch local directories | None |
| `gdrive` | Google Drive folders | OAuth |
| `dropbox` | Dropbox folders | OAuth |

---

## Example: Sync All Sources

```
/sync

📥 Syncing Content Sources
━━━━━━━━━━━━━━━━━━━━━━━━━━

[1/5] meetily
      ├── Checking local database...
      ├── Last sync: 2026-02-01T10:00:00Z
      ├── Found: 3 new meetings
      │   ├── 2026-02-02_team-planning.md (45 min)
      │   ├── 2026-02-02_client-call.md (28 min)
      │   └── 2026-02-01_workshop.md (90 min)
      └── ✅ Synced 3 items → _inbox/meetings/

[2/5] telegram
      ├── Checking 3 monitored channels...
      ├── #research-links: 5 new messages with links
      ├── #news: 2 new messages with links
      ├── Fetching URL content for 7 links...
      │   ├── ✅ https://example.com/article (fetched, 2.3kb)
      │   ├── ✅ https://research.org/paper.pdf (fetched, 156kb)
      │   ├── ✅ https://grants.gov/opportunity (fetched, 4.1kb)
      │   ├── ✅ https://event.io/conference (fetched, 3.2kb)
      │   ├── ✅ https://blog.example.com/post (fetched, 5.4kb)
      │   ├── ⚠️ https://paywalled.com/article (paywall detected)
      │   └── ❌ https://broken.link (404 Not Found)
      └── ✅ Synced 5 items → _inbox/links/telegram/

[3/5] rss
      ├── Checking 4 feeds...
      ├── Example Blog: 2 new articles
      ├── Tech News: 1 new article
      ├── Fetching full content...
      └── ✅ Synced 3 items → _inbox/feeds/

[4/5] urls
      ├── Checking 8 watched URLs...
      ├── grants.gov/opportunities: 3 new listings found
      ├── events.example.com: 1 new event
      ├── Following links on grants.gov...
      │   └── Fetched 3 grant detail pages
      └── ✅ Synced 4 items → _inbox/scraped/

[5/5] youtube
      ├── Checking subscribed channels...
      ├── Found: 2 new videos with captions
      ├── Downloading transcripts...
      └── ✅ Synced 2 items → _inbox/youtube/

━━━━━━━━━━━━━━━━━━━━━━━━━━
Summary:
• Sources checked: 5
• Items synced: 17
• Failed: 2 (see _inbox/failed/)
• Total inbox items: 42

Next: Run /process to analyze new content
```

---

## Sync Status

```
/sync --status

📊 Source Sync Status
━━━━━━━━━━━━━━━━━━━━━

┌─────────────┬─────────┬─────────────────────┬────────┬────────┐
│ Source      │ Status  │ Last Sync           │ Total  │ Errors │
├─────────────┼─────────┼─────────────────────┼────────┼────────┤
│ meetily     │ ✅ OK   │ 2 hours ago         │ 145    │ 0      │
│ telegram    │ ✅ OK   │ 30 min ago          │ 512    │ 8      │
│ rss         │ ✅ OK   │ 2 hours ago         │ 234    │ 0      │
│ urls        │ ⚠️ Warn │ 18 hours ago        │ 67     │ 3      │
│ youtube     │ ✅ OK   │ 1 day ago           │ 23     │ 0      │
│ fathom      │ ❌ Off  │ -                   │ -      │ -      │
│ podcast     │ ❌ Off  │ -                   │ -      │ -      │
└─────────────┴─────────┴─────────────────────┴────────┴────────┘

Telegram Channels:
├── #research-links (312 items)
├── #news (156 items)
└── #activities (44 items)

RSS Feeds:
├── Example Blog (89 items)
├── Tech News (78 items)
├── Research Weekly (45 items)
└── Grants Digest (22 items)

Watched URLs:
├── grants.gov/opportunities (34 items, 3 errors)
├── events.example.com (18 items)
└── jobs.example.org (15 items)

Next Scheduled:
├── telegram: in 12 minutes
├── rss: in 1h 30m
└── urls: tomorrow 6:00 AM
```

---

## Sync Specific Source

```
/sync telegram

📥 Syncing: Telegram
━━━━━━━━━━━━━━━━━━━━

Checking 3 monitored channels...

#research-links
├── Last message ID: 98765
├── Found 5 new messages with links
└── Processing links...

#news
├── Last message ID: 87654
├── Found 2 new messages with links
└── Processing links...

#activities
├── Last message ID: 76543
└── No new messages

Fetching URL Content:
━━━━━━━━━━━━━━━━━━━━━

[1/7] https://arxiv.org/abs/2401.12345
      ├── Type: PDF
      ├── Title: "Advances in Collective Intelligence"
      ├── Extracted: 24 pages, 8,432 words
      └── ✅ Saved: _inbox/links/telegram/arxiv-2401-12345.md

[2/7] https://grants.gov/opportunity/12345
      ├── Type: HTML
      ├── Title: "Community Development Grant"
      ├── Extracted: 1,234 words
      ├── Detected: grant opportunity (deadline: 2026-03-15)
      └── ✅ Saved: _inbox/links/telegram/grants-12345.md

[3/7] https://medium.com/@author/article
      ├── Type: Article
      ├── Title: "Building Resilient Communities"
      ├── Extracted: 2,456 words
      └── ✅ Saved: _inbox/links/telegram/medium-article.md

[4/7] https://youtube.com/watch?v=xxxxx
      ├── Type: Video
      ├── Title: "Governance Workshop Recording"
      ├── Fetching captions...
      ├── Extracted: 45 min transcript
      └── ✅ Saved: _inbox/links/telegram/youtube-xxxxx.md

[5/7] https://paywalled-site.com/article
      ├── Type: Paywall detected
      └── ⚠️ Skipped: Content behind paywall

[6/7] https://twitter.com/status/12345
      └── ⏭️ Skipped: Excluded domain (twitter.com)

[7/7] https://broken-link.example.com
      └── ❌ Failed: 404 Not Found

━━━━━━━━━━━━━━━━━━━━
Summary:
• Messages checked: 7
• Links processed: 7
• Successfully fetched: 4
• Skipped: 2
• Failed: 1

Cursor updated: telegram/research-links → 98770
```

---

## Intelligent Content Fetching

When syncing URLs, OPAL acts as an intelligent agent:

### Content Extraction
- **Readability extraction**: Removes navigation, ads, and boilerplate
- **PDF handling**: Extracts text from PDF documents
- **Metadata extraction**: Title, author, date, description
- **Image extraction**: Optional, for visual content

### Link Following
```
/sync urls --follow-links

Syncing: grants.gov/opportunities

Checking main page...
├── Found 12 grant listings
├── Following links to detail pages...
│   ├── /opportunity/12345 → fetched
│   ├── /opportunity/12346 → fetched
│   ├── /opportunity/12347 → fetched
│   └── ... (9 more)
└── ✅ Synced 12 grant opportunities

Following was enabled because:
  • Page contains list of items
  • Link selector: ".grant-listing a"
  • Max depth: 1
```

### Pagination Handling
```
/sync rss

Checking: Research Blog (paginated)

├── Page 1: 10 articles
├── Page 2: 10 articles
├── Page 3: 5 articles
└── Total: 25 new articles (stopped at max)
```

---

## Dry Run

Preview what would be fetched:

```
/sync --dry-run

📥 Sync Preview (Dry Run)
━━━━━━━━━━━━━━━━━━━━━━━━

Would sync from 5 sources:

[1] meetily
    ├── Would check database since: 2026-02-01T10:00:00Z
    ├── Estimated new items: 2-4
    └── Destination: _inbox/meetings/

[2] telegram
    ├── Would check 3 channels
    ├── Estimated new links: 5-15
    ├── Would fetch URL content for each
    └── Destination: _inbox/links/telegram/

[3] rss
    ├── Would check 4 feeds
    ├── Estimated new articles: 3-8
    └── Destination: _inbox/feeds/

[4] urls
    ├── Would check 8 watched URLs
    ├── Would follow links on 3 URLs
    └── Destination: _inbox/scraped/

[5] youtube
    ├── Would check 2 channels
    ├── Estimated new videos: 0-2
    └── Destination: _inbox/youtube/

━━━━━━━━━━━━━━━━━━━━━━━━
Estimated total: 15-35 new items

Run without --dry-run to proceed.
```

---

## Retry Failed Items

```
/sync --retry-failed

📥 Retrying Failed Items
━━━━━━━━━━━━━━━━━━━━━━━━

Found 5 failed items from previous syncs:

[1/5] telegram/msg-12345
      ├── URL: https://example.com/article
      ├── Original error: Connection timeout
      ├── Retrying...
      └── ✅ Success → _inbox/links/telegram/

[2/5] telegram/msg-12346
      ├── URL: https://broken.site/page
      ├── Original error: 404 Not Found
      ├── Retrying...
      └── ❌ Still failing (404)

[3/5] rss/article-xyz
      ├── URL: https://blog.example.com/post
      ├── Original error: SSL certificate error
      ├── Retrying with fallback...
      └── ✅ Success → _inbox/feeds/

[4/5] urls/grants-page
      ├── URL: https://grants.gov/opportunity/99999
      ├── Original error: Rate limited
      ├── Waiting 5s before retry...
      └── ✅ Success → _inbox/scraped/

[5/5] youtube/video-abc
      ├── URL: https://youtube.com/watch?v=abc
      ├── Original error: No captions available
      ├── Attempting Whisper transcription...
      └── ✅ Success → _inbox/youtube/

━━━━━━━━━━━━━━━━━━━━━━━━
Summary:
• Retried: 5
• Recovered: 4
• Still failing: 1

Permanently failed items moved to: _inbox/failed/
```

---

## Source Discovery

Find new sources based on your content:

```
/sync --discover

🔍 Source Discovery
━━━━━━━━━━━━━━━━━━━

Analyzing your existing content and links...

Frequently Referenced (not subscribed):
├── arxiv.org (47 references)
│   └── Suggestion: Subscribe to RSS for your research topics
├── grants.gov (23 references)
│   └── Suggestion: Add URL watch for /opportunities
├── eventbrite.com (18 references)
│   └── Suggestion: Add API integration for events

RSS Feeds Found in Links:
├── https://blog.example.com/feed
│   └── Referenced 12 times, not subscribed
├── https://newsletter.co/rss
│   └── Referenced 8 times, not subscribed

YouTube Channels Referenced:
├── @CivicTechTalks
│   └── 15 video links found

Add discovered sources? [y/n/select]
> select

Select sources to add:
  [x] arxiv.org RSS
  [x] grants.gov URL watch
  [ ] eventbrite.com API
  [x] blog.example.com RSS
  [ ] newsletter.co RSS
  [ ] @CivicTechTalks YouTube

Adding 3 sources...
✅ Added to configuration

Run /sync to fetch from new sources.
```

---

## Configuration

Sources are configured in `.opal/sources.yaml`:

```yaml
sources:
  telegram:
    enabled: true
    bot_token_env: TELEGRAM_BOT_TOKEN
    sync:
      schedule: "*/30 * * * *"
    channels:
      - id: -1001234567890
        name: research-links
        monitor_type: links
    link_handling:
      auto_fetch: true
      follow_links: false
      max_content_size_mb: 10
    filters:
      exclude_domains: [twitter.com, x.com]

  rss:
    enabled: true
    sync:
      schedule: "0 */2 * * *"
    feeds:
      - url: https://blog.example.com/feed
        name: Example Blog
    filters:
      max_age_days: 14

  urls:
    enabled: true
    sync:
      schedule: "0 6 * * *"
    watch:
      - url: https://grants.gov/opportunities
        follow_links: true
        link_selector: ".grant-listing a"
```

See `.claude/SOURCES.md` for complete configuration reference.

---

## State Tracking

Sync state is stored in `_index/sync-state.json`:

```json
{
  "sources": {
    "telegram": {
      "enabled": true,
      "last_sync": "2026-02-02T15:00:00Z",
      "cursors": {
        "research-links": 98770,
        "news": 87656
      },
      "items_synced": 512,
      "errors": 8
    },
    "rss": {
      "enabled": true,
      "last_sync": "2026-02-02T13:00:00Z",
      "cursors": {
        "example-blog": "2026-02-01T12:00:00Z"
      },
      "items_synced": 234
    }
  }
}
```

---

## Output Format

Synced items include standardized metadata:

```yaml
---
source: telegram
source_id: msg-98766
channel: research-links
synced_at: 2026-02-02T15:00:00Z
url: https://example.com/article
url_title: "Example Article Title"
url_author: "Author Name"
url_date: 2026-02-01
content_type: article
word_count: 2456
---

# Example Article Title

By Author Name | Published: 2026-02-01

## Source Context

Shared by @username in #research-links:
> "Great article on community governance!"

---

## Content

[Extracted article content...]
```

---

## Related Commands

- `/sources` - Manage source subscriptions
- `/sources add` - Add new sources
- `/sources test` - Test source connectivity
- `/process` - Process inbox items
- `/status inbox` - View inbox contents
- `/ingest` - Manual content ingestion
