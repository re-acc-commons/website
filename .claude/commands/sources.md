# /sources Command

Manage content source subscriptions for intelligent content acquisition.

## Usage

```
/sources                        # List all configured sources
/sources status                 # Show sync status for all sources
/sources add <type>             # Add a new source (interactive)
/sources add rss <url>          # Quick-add RSS feed
/sources add url <url>          # Quick-add URL to watch
/sources remove <name>          # Remove a source
/sources enable <name>          # Enable a disabled source
/sources disable <name>         # Disable a source
/sources edit <name>            # Edit source configuration
/sources test <name>            # Test source connectivity
/sources discover               # Find potential sources
```

## List Sources

```
/sources

📥 Configured Sources
━━━━━━━━━━━━━━━━━━━━━

Transcripts
├── ✅ meetily
│   └── Local SQLite database
│       Schedule: manual
│       Last sync: 2 hours ago (45 items total)
│
├── ❌ fathom (disabled)
│   └── API: not configured
│
└── ❌ otter (disabled)
    └── API: not configured

Links & Feeds
├── ✅ telegram
│   └── 3 channels monitored
│       Schedule: every 30 min
│       Last sync: 12 min ago (312 items total)
│
├── ✅ rss
│   └── 5 feeds subscribed
│       Schedule: every 2 hours
│       Last sync: 45 min ago (89 items total)
│
└── ✅ urls
    └── 8 URLs watched
        Schedule: daily at 6am
        Last sync: 18 hours ago (23 items total)

Media
├── ❌ youtube (disabled)
└── ❌ podcast (disabled)

━━━━━━━━━━━━━━━━━━━━━
Active sources: 4
Total items synced: 469

Commands:
• /sources add <type> - Add new source
• /sync - Pull from all sources
• /sources edit <name> - Modify configuration
```

## Add Source (Interactive)

```
/sources add

📥 Add Content Source
━━━━━━━━━━━━━━━━━━━━━

What type of source would you like to add?

Transcripts (meeting recordings)
  [1] Meetily - Local transcription (no cloud)
  [2] Fathom - Video call recordings
  [3] Otter.ai - Meeting transcripts
  [4] Read.ai - Meeting transcripts

Links & Articles
  [5] RSS Feed - Subscribe to a feed
  [6] Telegram - Monitor a channel
  [7] URL Watch - Monitor specific URLs
  [8] Sitemap - Monitor a website

Media
  [9] YouTube - Channel or playlist
  [10] Podcast - Subscribe to a podcast

Advanced
  [11] Custom API - Poll any REST API
  [12] Webhook - Receive pushed content

Choice: 5

━━━━━━━━━━━━━━━━━━━━━

Adding: RSS Feed

Enter the feed URL:
> https://blog.example.com/feed

Checking feed... ✅ Valid RSS feed found

Feed Info:
  Title: Example Blog
  Items: 47 articles
  Latest: "Understanding Systems Thinking" (2 days ago)

Configuration:
  • Name for this feed? [Example Blog]
  • Category/tags? [articles]
  • How often to check? [every 2 hours]
  • Fetch full article content? [Y/n]
  • Max age of articles to import? [14 days]

✅ RSS feed added!

Configuration saved to: .opal/sources.yaml

To sync now: /sync rss
To see all feeds: /sources show rss
```

## Quick Add

### Add RSS Feed

```
/sources add rss https://blog.example.com/feed

Checking feed... ✅ Valid

Adding "Example Blog" to RSS sources
  Schedule: every 2 hours
  Directory: _inbox/feeds/

✅ Added! Run /sync rss to fetch articles.
```

### Add URL to Watch

```
/sources add url https://grants.gov/opportunities

Checking URL... ✅ Accessible

What should I monitor?
  [1] Full page content
  [2] Specific section (CSS selector)
  [3] Links on the page
  [4] Changes only (diff)

Choice: 3

Enter CSS selector for links (or Enter for all links):
> .grant-listing a

How often to check?
  [1] Every hour
  [2] Every 6 hours
  [3] Daily
  [4] Weekly

Choice: 3

✅ URL added to watch list

Configuration:
  URL: https://grants.gov/opportunities
  Monitor: Links matching ".grant-listing a"
  Schedule: Daily at 6am
  Output: _inbox/scraped/

Run /sync urls to fetch now.
```

### Add Telegram Channel

```
/sources add telegram

📱 Add Telegram Channel
━━━━━━━━━━━━━━━━━━━━━━

To monitor a Telegram channel, I need:

1. Bot token (set TELEGRAM_BOT_TOKEN env var)
   Status: ✅ Configured

2. Channel ID
   To find it: Add @userinfobot to the channel,
   or forward a message to @getidsbot

Enter channel ID (e.g., -1001234567890):
> -1001234567890

Checking access... ✅ Bot can read channel

Channel Info:
  Name: research-links
  Members: 1,234
  Recent messages with links: 12

Configuration:
  • Friendly name? [research-links]
  • What to monitor? [links]
      1. Links only
      2. All messages
      3. Media only
  • Auto-fetch linked content? [Y/n]
  • Apply tags? [telegram, research]

✅ Telegram channel added!

Monitoring: research-links
Schedule: Every 30 minutes
Output: _inbox/links/telegram/
```

### Add Luma Events

```
/sources add luma

📅 Add Luma Events
━━━━━━━━━━━━━━━━━━

Luma (lu.ma) can sync events from calendars you follow or host.

1. API key (set LUMA_API_KEY env var)
   Status: ✅ Configured
   Get yours at: https://lu.ma/settings/api

How do you want to find events?

  [1] Monitor a calendar
  [2] Monitor events by a host
  [3] Search for events

Choice: 1

Enter calendar URL or ID (e.g., lu.ma/calendar/cal-xxxxx):
> https://lu.ma/calendar/cal-abc123

Checking access... ✅ Calendar found

Calendar Info:
  Name: Bay Area Civic Tech
  Events: 24 upcoming
  Managed by: civic-tech-org

Configuration:
  • Friendly name? [Bay Area Civic Tech]
  • What resource type should events become? [event]
      (Based on your schema: event, gathering, activity)
  • Extract hosts as people? [Y/n]
  • Extract organizations? [Y/n]
  • Apply tags? [luma, civic-tech]

✅ Luma calendar added!

Monitoring: Bay Area Civic Tech
Schedule: Every 6 hours
Output: _inbox/events/

Schema routing:
  Events → event (your schema type)
  Hosts → people/ (extracted as references)
  Orgs → organizations/ (extracted as references)
```

### Add Notion Sync

```
/sources add notion

📝 Add Notion Sync
━━━━━━━━━━━━━━━━━━

Sync databases from your Notion workspace.

1. Integration token (set NOTION_TOKEN env var)
   Status: ✅ Configured

2. Select databases to sync

Fetching your Notion databases...

Available Databases:
  [1] Projects (45 pages)
  [2] People (78 pages)
  [3] Meeting Notes (123 pages)
  [4] Resources (56 pages)

Select databases (space to toggle, Enter when done):
> [x] Projects
> [x] Meeting Notes
> [ ] People
> [ ] Resources

Mapping to OPAL types:
  Projects → project (matches your schema)
  Meeting Notes → meeting (matches your schema)

Sync options:
  • Sync frequency? [every 2 hours]
  • Sync direction? [Notion → OPAL only]
  • Include page content? [Y/n]

✅ Notion sync configured!

Syncing: 2 databases
Schedule: Every 2 hours
Output: _inbox/notion/

Run /sync notion to pull now.
```

## Source Status

```
/sources status

📊 Source Sync Status
━━━━━━━━━━━━━━━━━━━━━

┌─────────────┬─────────┬─────────────────────┬────────┬────────┐
│ Source      │ Status  │ Last Sync           │ Total  │ Errors │
├─────────────┼─────────┼─────────────────────┼────────┼────────┤
│ meetily     │ ✅ OK   │ 2 hours ago         │ 45     │ 0      │
│ telegram    │ ✅ OK   │ 12 min ago          │ 312    │ 3      │
│ rss         │ ✅ OK   │ 45 min ago          │ 89     │ 0      │
│ urls        │ ⚠️ Warn │ 18 hours ago        │ 23     │ 2      │
│ youtube     │ ❌ Off  │ -                   │ -      │ -      │
└─────────────┴─────────┴─────────────────────┴────────┴────────┘

Recent Activity:
├── 45 min ago: RSS synced 3 new articles
├── 12 min ago: Telegram synced 7 new links
└── 2 hours ago: Meetily synced 2 new transcripts

Warnings:
└── urls: 2 URLs returning errors (run /sources test urls)

Next Scheduled:
├── telegram: in 18 minutes
├── rss: in 1 hour 15 minutes
└── urls: tomorrow at 6:00 AM
```

## Edit Source

```
/sources edit telegram

📝 Edit Source: telegram
━━━━━━━━━━━━━━━━━━━━━━━━

Current Configuration:

enabled: true
channels:
  - id: -1001234567890
    name: research-links
    monitor_type: links
  - id: -1009876543210
    name: news-feed
    monitor_type: links

sync:
  schedule: "*/30 * * * *"

What would you like to change?

  [1] Add channel
  [2] Remove channel
  [3] Change sync schedule
  [4] Edit filters
  [5] Edit link handling
  [6] View full config
  [7] Edit raw YAML

Choice:
```

## Test Source

```
/sources test rss

🧪 Testing Source: rss
━━━━━━━━━━━━━━━━━━━━━━

Testing 5 configured feeds...

[1/5] Example Blog
      URL: https://blog.example.com/feed
      ✅ Accessible (200 OK)
      ✅ Valid RSS format
      ✅ 47 items available
      └── Latest: "Understanding Systems Thinking" (2 days ago)

[2/5] Tech News Daily
      URL: https://technews.example.com/rss
      ✅ Accessible (200 OK)
      ✅ Valid RSS format
      ✅ 120 items available
      └── Latest: "AI Governance Update" (4 hours ago)

[3/5] Research Updates
      URL: https://research.broken.org/feed
      ❌ Connection failed: DNS resolution error
      └── Suggestion: Check URL or try again later

[4/5] Grants Weekly
      URL: https://grants.example.com/atom.xml
      ✅ Accessible (200 OK)
      ✅ Valid Atom format
      ✅ 23 items available

[5/5] Community Forum
      URL: https://forum.example.com/rss
      ⚠️ Accessible but slow (3.2s response)
      ✅ Valid RSS format
      ✅ 89 items available

━━━━━━━━━━━━━━━━━━━━━━
Summary:
• Healthy: 4/5
• Errors: 1/5
• Warnings: 1/5

Action needed:
• Remove or fix: Research Updates (DNS error)
```

## Discover Sources

```
/sources discover

🔍 Source Discovery
━━━━━━━━━━━━━━━━━━━

Analyzing your existing content for potential sources...

Found in your content:

RSS/Atom Feeds (detected from URLs):
├── https://blog.example.com/feed
│   └── Referenced 12 times, not subscribed
├── https://newsletter.co/rss
│   └── Referenced 8 times, not subscribed
└── https://research.edu/atom.xml
    └── Referenced 5 times, not subscribed

Frequently Referenced Domains:
├── grants.gov (47 references)
│   └── Suggestion: Add URL watch for /opportunities
├── arxiv.org (23 references)
│   └── Suggestion: Add RSS feed for your topics
└── eventbrite.com (15 references)
    └── Suggestion: Add API integration

Based on Your Schema:

Your schema includes: paper, grant, event

Suggested sources for "paper":
├── ArXiv RSS feeds
├── Google Scholar alerts
└── Semantic Scholar API

Suggested sources for "grant":
├── Grants.gov RSS
├── Foundation Directory API
└── Candid API

Suggested sources for "event":
├── Eventbrite API
├── Meetup API
└── Lu.ma API

━━━━━━━━━━━━━━━━━━━
Add suggested sources?

  [1] Add all detected RSS feeds
  [2] Select individually
  [3] Skip

Choice:
```

## Remove Source

```
/sources remove rss:research-updates

Remove "Research Updates" from RSS feeds?

This will:
• Remove the feed configuration
• Keep previously synced items in inbox/knowledge base
• Stop future syncs from this feed

Confirm? [y/N] y

✅ Removed: Research Updates

Remaining RSS feeds: 4
```

## Source Types Reference

| Type | Command | Description |
|------|---------|-------------|
| `meetily` | `/sources add meetily` | Local meeting transcripts |
| `fathom` | `/sources add fathom` | Fathom video transcripts |
| `otter` | `/sources add otter` | Otter.ai transcripts |
| `telegram` | `/sources add telegram` | Telegram channel links |
| `rss` | `/sources add rss <url>` | RSS/Atom feeds |
| `urls` | `/sources add url <url>` | Watch specific URLs |
| `sitemap` | `/sources add sitemap <url>` | Monitor sitemaps |
| `luma` | `/sources add luma` | Luma (lu.ma) events |
| `eventbrite` | `/sources add eventbrite` | Eventbrite events |
| `meetup` | `/sources add meetup` | Meetup events |
| `youtube` | `/sources add youtube` | YouTube transcripts |
| `podcast` | `/sources add podcast <url>` | Podcast transcription |
| `notion` | `/sources add notion` | Notion database sync |
| `api` | `/sources add api` | Custom REST API |
| `webhook` | `/sources add webhook` | Receive webhooks |

## Configuration Files

Sources are stored in `.opal/sources.yaml`:

```yaml
sources:
  meetily:
    enabled: true
    database:
      path: auto

  telegram:
    enabled: true
    channels:
      - id: -1001234567890
        name: research-links

  rss:
    enabled: true
    feeds:
      - url: https://blog.example.com/feed
        name: Example Blog
```

## Related Commands

- `/sync` - Pull content from sources
- `/setup` - Configure sources during setup
- `/status inbox` - View inbox state
- `/process` - Process synced content
