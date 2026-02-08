# OPAL Sources - Intelligent Content Acquisition

OPAL can intelligently gather content from a diverse array of sources. This document covers all supported source types, configuration, and how to add custom sources.

## Philosophy

**Pull, don't push.** OPAL proactively pulls content from your subscribed sources rather than waiting for you to manually add it. Configure your sources once, then let `/sync` do the work.

**Intelligent routing.** OPAL doesn't just dump content into your inbox—it classifies, deduplicates, and routes content based on your schema.

**Agentic fetching.** For URLs and feeds, OPAL acts as an intelligent agent: fetching content, extracting readable text, handling pagination, and even following relevant links.

---

## Source Categories

### 1. Transcript Sources
Meeting recordings that need transcription or have transcripts available.

| Source | Auth | How It Works |
|--------|------|--------------|
| **Meetily** | None (local) | Reads directly from local SQLite database |
| **Fathom** | API Key | Pulls transcripts via API |
| **Otter.ai** | API Key | Pulls transcripts via API |
| **Read.ai** | API Key | Pulls transcripts via API |
| **Fireflies** | API Key | Pulls transcripts via API |

### 2. Communication Sources
Messages and links from chat platforms.

| Source | Auth | How It Works |
|--------|------|--------------|
| **Telegram** | Bot Token | Monitors channels for links, fetches content |
| **Discord** | Bot Token | Monitors channels for links |
| **Slack** | App Token | Monitors channels via Slack API |

### 3. Feed Sources
RSS, Atom, and structured feeds.

| Source | Auth | How It Works |
|--------|------|--------------|
| **RSS/Atom** | None | Polls feeds on schedule, fetches full content |
| **Substack** | None | RSS feed parsing with newsletter support |
| **Medium** | None | RSS feed with full content extraction |

### 4. Web Sources
URLs and web content that need scraping.

| Source | Auth | How It Works |
|--------|------|--------------|
| **URL List** | None | Scrapes list of URLs on schedule |
| **Sitemap** | None | Monitors sitemaps for new pages |
| **Web Watch** | None | Monitors pages for changes |

### 5. Event Sources
Events and gatherings from event platforms.

| Source | Auth | How It Works |
|--------|------|--------------|
| **Luma** | API Key | Pulls events, attendees, and details via API |
| **Eventbrite** | API Key | Monitors events from organizers/searches |
| **Meetup** | API Key | Pulls events from groups |
| **Lu.ma Calendar** | None | Scrapes public calendar pages |

### 6. Media Sources
Video and audio that need transcription.

| Source | Auth | How It Works |
|--------|------|--------------|
| **YouTube** | API Key | Pulls captions or transcribes via Whisper |
| **Podcast** | None | Fetches episodes, transcribes via Whisper |
| **Vimeo** | API Key | Pulls transcripts if available |

### 7. Document Sources
Files and documents from cloud services.

| Source | Auth | How It Works |
|--------|------|--------------|
| **Google Drive** | OAuth | Monitors folders for new docs |
| **Dropbox** | OAuth | Monitors folders for files |
| **Notion** | API Key | Exports selected databases |
| **Filesystem** | None | Watches local directories |

### 8. API Sources
Custom data from any API.

| Source | Auth | Varies | How It Works |
|--------|------|--------|--------------|
| **Custom API** | Configurable | Polls endpoints, transforms responses |
| **Webhook** | None | Receives POST requests |
| **GraphQL** | Configurable | Executes queries on schedule |

### 9. Calendar Integration
Bidirectional sync with calendar for meeting context.

| Source | Auth | How It Works |
|--------|------|--------------|
| **Google Calendar** | OAuth / MCP | Enriches transcripts with attendees, writes back notes |

---

## Configuration

### Basic Source Configuration

Sources are configured in `.opal/sources.yaml` (user-specific) or `config/integrations.yaml` (system defaults).

```yaml
# .opal/sources.yaml
sources:
  # Enable with minimal config
  meetily:
    enabled: true

  # Enable with filters
  telegram:
    enabled: true
    channels:
      - name: my-links-channel
        id: -1001234567890

  # Enable with full config
  rss:
    enabled: true
    feeds:
      - url: https://blog.example.com/feed
        name: Example Blog
        tags: [technology, innovation]
```

### Source Structure

Every source has these common fields:

```yaml
source_name:
  # Required
  enabled: true/false
  type: transcript | links | feed | document | api

  # Scheduling
  sync:
    schedule: manual | "cron expression" | "*/30 * * * *"

  # Filtering
  filters:
    max_age_days: 30
    exclude_titles: []
    include_only: []

  # Output
  output:
    directory: _inbox/source_name/
    filename_format: "{date}_{slug}.md"

  # Classification hints
  routing:
    prefer_type: note           # Default resource type
    tags: [auto-imported]       # Auto-applied tags
```

---

## Detailed Source Configuration

### Meetily (Local Transcription)

Meetily stores transcripts in a local SQLite database. OPAL reads directly from it—no API needed.

```yaml
meetily:
  enabled: true

  database:
    path: auto  # Auto-detect, or specify path
    # Standard locations:
    # macOS: ~/Library/Application Support/com.meetily.ai/meeting_minutes.sqlite
    # Linux: ~/.local/share/com.meetily.ai/meeting_minutes.sqlite

  sync:
    schedule: manual
    track_synced: true

  filters:
    min_duration_minutes: 5
    exclude_titles:
      - standup
      - 1:1
      - daily sync

  output:
    directory: _inbox/meetings/
    include_summary: true
    include_action_items: true
```

### Telegram

Monitor channels for shared links and fetch their content.

```yaml
telegram:
  enabled: true
  bot_token_env: TELEGRAM_BOT_TOKEN

  sync:
    schedule: "*/30 * * * *"  # Every 30 minutes

  channels:
    - id: -1001234567890
      name: research-links
      monitor_type: links

    - id: -1009876543210
      name: news-feed
      monitor_type: links
      tags: [news]

  link_handling:
    auto_fetch: true
    fetch_timeout: 30
    convert_to_markdown: true
    extract_metadata: true

  filters:
    exclude_domains:
      - twitter.com
      - x.com
```

### RSS Feeds

Monitor multiple RSS/Atom feeds.

```yaml
rss:
  enabled: true

  sync:
    schedule: "0 */2 * * *"  # Every 2 hours

  feeds:
    - url: https://news.example.com/feed
      name: Example News
      category: news

    - url: https://blog.example.com/rss
      name: Example Blog
      category: articles
      tags: [technology]

    - url: https://research.org/atom.xml
      name: Research Papers
      category: research
      routing:
        prefer_type: paper

  filters:
    max_age_days: 14

  output:
    directory: _inbox/feeds/
    fetch_full_content: true
    extract_images: false
```

### URL Lists (Web Scraping)

Monitor specific URLs for content.

```yaml
urls:
  enabled: true
  type: scrape

  sync:
    schedule: "0 6 * * *"  # Daily at 6am

  # Static list of URLs to check
  watch_urls:
    - url: https://grants.gov/recent
      name: Grants.gov Recent
      selector: ".grant-listing"  # CSS selector for content

    - url: https://events.example.com
      name: Example Events
      follow_links: true  # Follow links on page
      link_selector: ".event-link"
      max_depth: 1

  # Or reference a file
  urls_file: config/watch-urls.txt

  scraping:
    respect_robots: true
    rate_limit_ms: 1000
    user_agent: "OPAL Knowledge Bot"

  output:
    directory: _inbox/scraped/
    track_changes: true  # Only save when content changes
```

### Sitemaps

Monitor website sitemaps for new content.

```yaml
sitemaps:
  enabled: true
  type: sitemap

  sync:
    schedule: "0 4 * * *"  # Daily at 4am

  sites:
    - sitemap_url: https://docs.example.com/sitemap.xml
      name: Example Docs
      include_patterns:
        - "/guides/*"
        - "/tutorials/*"
      exclude_patterns:
        - "/api/*"

    - sitemap_url: https://wiki.example.org/sitemap.xml
      name: Example Wiki

  output:
    directory: _inbox/sitemaps/
    only_new: true  # Only fetch pages not seen before
```

### YouTube

Monitor channels/playlists and get transcripts.

```yaml
youtube:
  enabled: true
  api_key_env: YOUTUBE_API_KEY

  sync:
    schedule: "0 8 * * *"  # Daily at 8am

  channels:
    - id: UCxxxxxxxx
      name: Tech Talks

  playlists:
    - id: PLxxxxxxxx
      name: Conference 2026

  # Specific videos (one-time)
  videos:
    - url: https://youtube.com/watch?v=xxxxx

  transcription:
    prefer: captions  # captions | whisper | both
    fallback_to_whisper: true
    whisper_model: medium

  filters:
    min_duration_minutes: 5
    max_duration_minutes: 120
    require_captions: false

  output:
    directory: _inbox/youtube/
    include_description: true
    include_chapters: true
```

### Podcasts

Subscribe to podcasts and transcribe episodes.

```yaml
podcasts:
  enabled: true

  sync:
    schedule: "0 6 * * *"  # Daily at 6am

  feeds:
    - url: https://podcast.example.com/feed.xml
      name: Example Podcast
      transcription: whisper
      whisper_model: medium

    - url: https://other.podcast.com/rss
      name: Other Podcast
      # Skip transcription, just get metadata
      transcription: none

  filters:
    max_age_days: 30
    min_duration_minutes: 10
    max_duration_minutes: 180

  output:
    directory: _inbox/podcasts/
    keep_audio: false  # Delete after transcription
```

### Luma Events

Monitor Luma (lu.ma) for events.

```yaml
luma:
  enabled: true
  api_key_env: LUMA_API_KEY

  sync:
    schedule: "0 */6 * * *"  # Every 6 hours

  # Monitor specific calendars
  calendars:
    - id: cal_xxxxx
      name: Community Events
      tags: [community, local]

    - id: cal_yyyyy
      name: Tech Meetups
      tags: [technology]

  # Monitor events by host
  hosts:
    - username: "example-org"
      name: Example Organization

  # Search-based monitoring
  searches:
    - query: "civic technology"
      location: "San Francisco"
      max_results: 20

  # What to extract
  extraction:
    include_description: true
    include_hosts: true
    include_location: true
    include_ticket_info: true
    fetch_attendees: false  # Requires additional permissions

  filters:
    upcoming_only: true
    max_age_days: 90  # Don't fetch events older than 90 days
    exclude_past: true

  output:
    directory: _inbox/events/
    filename_format: "{date}_{slug}.md"

  # Schema routing - tells OPAL how to classify
  routing:
    prefer_type: event  # or gathering, activity based on your schema
    extract_people: true  # Extract hosts as people entities
    extract_organizations: true  # Extract organizing orgs
```

### Eventbrite

Monitor Eventbrite events.

```yaml
eventbrite:
  enabled: true
  api_key_env: EVENTBRITE_API_KEY

  sync:
    schedule: "0 8 * * *"  # Daily at 8am

  # Monitor specific organizers
  organizers:
    - id: "12345678901"
      name: "Local Civic Group"

  # Search-based monitoring
  searches:
    - query: "community organizing"
      location: "New York"
      within: "25mi"

  output:
    directory: _inbox/events/
```

### Custom API

Poll any REST API and transform the response.

```yaml
custom_api:
  enabled: true

  endpoints:
    - name: grants-api
      url: https://api.grants.gov/v1/opportunities
      method: GET
      headers:
        Authorization: "Bearer ${GRANTS_API_KEY}"
      params:
        status: open
        limit: 100

      # Transform response to markdown
      transform:
        items_path: "data.opportunities"
        title_field: "title"
        content_fields:
          - "description"
          - "eligibility"
        date_field: "deadline"
        url_field: "application_url"

      output:
        directory: _inbox/grants/

    - name: events-api
      url: https://api.events.co/upcoming
      schedule: "0 */6 * * *"
      transform:
        items_path: "events"
        template: |
          # {{title}}

          **Date:** {{date}}
          **Location:** {{location}}

          {{description}}

          [Register]({{registration_url}})
```

### Webhooks

Receive content pushed to OPAL.

```yaml
webhooks:
  enabled: true

  endpoints:
    - path: /ingest/zapier
      auth: bearer_token
      token_env: ZAPIER_WEBHOOK_TOKEN
      transform:
        title_field: "subject"
        content_field: "body"
      output:
        directory: _inbox/zapier/

    - path: /ingest/github
      auth: github_signature
      secret_env: GITHUB_WEBHOOK_SECRET
      events:
        - issues.opened
        - issues.labeled
      output:
        directory: _inbox/github-issues/
```

### Google Calendar (Bidirectional)

Enrich meeting transcripts with attendee information and write back notes.

```yaml
google_calendar:
  enabled: true
  mcp_server: google-calendar  # Preferred: use Google Calendar MCP

  # Or direct API (if MCP not available)
  api:
    credentials_env: GOOGLE_CALENDAR_CREDENTIALS
    token_env: GOOGLE_CALENDAR_TOKEN

  # Which calendars to search for meeting context
  calendars:
    - primary
    - work@example.com

  # Exclude personal calendars from search
  exclude_calendars:
    - family
    - personal

  # === MEETING CONTEXT (Pre-processing) ===
  # Enrich transcripts with attendee info before extraction
  meeting_context:
    enabled: true

    # How far from detected time to look for events
    time_window_minutes: 30

    # Privacy settings
    include_emails: true      # Include attendee emails
    skip_private_events: true # Don't look up private events

  # === CALENDAR WRITEBACK (Post-processing) ===
  # Write meeting notes back to calendar after processing
  writeback:
    enabled: true

    # What to write to calendar description
    content:
      summary: true           # Meeting summary
      action_items: true      # Extracted action items
      key_decisions: true     # Key decisions made
      opal_link: true         # Link back to full notes

    # How to handle existing event descriptions
    mode: smart_merge         # append | prepend | replace | smart_merge

    # Google Tasks integration
    tasks:
      enabled: true
      list_name: "OPAL Meeting Action Items"  # Creates if doesn't exist
      include_due_dates: true                  # Parse due dates from action items
      include_assignees: true                  # Assign to attendee emails

    # When to trigger writeback
    trigger: on_commit        # on_commit | manual

    # Safety
    require_confirmation: false  # Prompt before writing
    dry_run_first: false        # Show preview before write

  # === PRIVACY SETTINGS ===
  privacy:
    # Skip private calendar events
    skip_private_events: true

    # Handle meetings with external attendees
    external_attendees: warn  # skip | warn | proceed

    # Detect sensitive content markers
    sensitive_markers:
      - "confidential"
      - "private"
      - "off the record"
    sensitive_action: skip_writeback  # skip_writeback | warn | redact
```

#### How Calendar Integration Works

```
┌─────────────────┐
│ Meeting happens │
└────────┬────────┘
         ▼
┌─────────────────┐     ┌────────────────────┐
│ Transcript      │────▶│ OPAL /process      │
│ arrives         │     ├────────────────────┤
└─────────────────┘     │ [MEETING_CONTEXT]  │◀── Query calendar
                        │  ↓                 │    Get attendees
                        │ [CLEANUP]          │◀── Use attendee names
                        │  ↓                 │    for speaker matching
                        │ [EXTRACT]          │◀── Better entity matching
                        │  ↓                 │    "Speaker 1" → "Alice"
                        │ [STAGE]            │
                        └────────┬───────────┘
                                 ▼
                        ┌────────────────────┐
                        │ /review            │
                        │ Human approves     │
                        └────────┬───────────┘
                                 ▼
                        ┌────────────────────┐
                        │ [COMMIT]           │
                        │  ↓                 │
                        │ [WRITEBACK]        │──▶ Update calendar event
                        │                    │    Create Google Tasks
                        └────────────────────┘
```

#### Commands

```bash
/calendar                    # Show integration status
/calendar sync               # Write pending notes to calendar
/calendar writeback <path>   # Write specific transcript
/calendar lookup <path>      # Test calendar lookup
/calendar rollback <id>      # Undo a writeback
/calendar configure          # Interactive configuration
```

---

## Schema-Aware Link Processing

When OPAL processes links from any source, it uses your schema to intelligently classify and route content.

### How It Works

```
Link arrives → Fetch content → Analyze with schema → Route to correct type
```

1. **Schema injection**: Your `.opal/schema.yaml` is passed to the extraction agent
2. **Type detection**: Claude analyzes content against your defined resource types
3. **Field extraction**: Extracts fields defined in your schema for that type
4. **Relationship detection**: Identifies connections to existing entities

### Configuration

```yaml
# .opal/sources.yaml
link_processing:
  # Pass schema to all link processing
  schema_aware: true

  # URL pattern → type mappings (hints, not rules)
  url_hints:
    - pattern: "lu.ma/*"
      suggest_type: event
      extract_fields: [title, date, location, hosts]

    - pattern: "github.com/*/issues/*"
      suggest_type: issue
      extract_fields: [title, author, labels, body]

    - pattern: "arxiv.org/*"
      suggest_type: paper
      extract_fields: [title, authors, abstract, date]

    - pattern: "grants.gov/*"
      suggest_type: grant
      extract_fields: [title, deadline, amount, eligibility]

    - pattern: "eventbrite.com/e/*"
      suggest_type: event
      extract_fields: [title, date, location, organizer]

  # Domain-specific handlers
  domain_handlers:
    "lu.ma":
      handler: luma_event
      api_fallback: true  # Use API if available

    "youtube.com":
      handler: youtube_video
      fetch_transcript: true

    "notion.so":
      handler: notion_page
      requires_auth: true

  # Fallback behavior
  fallback:
    default_type: note
    extract_metadata: true
    use_readability: true
```

### Example: Processing a Luma Link

When a Luma event link arrives (e.g., from Telegram):

```
1. URL detected: https://lu.ma/example-meetup

2. Schema lookup:
   - Found type "event" in schema
   - Fields: title, date, location, description, hosts, attendees

3. Fetch & Extract:
   - Fetches page content (or uses Luma API if configured)
   - Extracts: title, date, location, description, hosts

4. Entity matching:
   - Checks hosts against existing "person" entities
   - Checks location against existing "place" entities
   - Creates links to matches

5. Output:
   ---
   type: event
   title: Example Meetup
   date: 2026-03-15
   location: San Francisco, CA
   hosts:
     - "[[people/jane-doe]]"
   source_url: https://lu.ma/example-meetup
   ---

   # Example Meetup

   [Extracted description...]
```

### Custom Type Handlers

For complex sources, create custom handlers:

```yaml
# .opal/sources.yaml
custom_handlers:
  - name: grant_opportunity
    url_patterns:
      - "grants.gov/search-results-detail/*"
      - "*.foundationcenter.org/grants/*"

    extraction:
      # CSS selectors for key fields
      selectors:
        title: "h1.grant-title"
        deadline: ".deadline-date"
        amount: ".funding-amount"
        eligibility: ".eligibility-section"

      # Or use Claude extraction
      claude_extraction: true
      prompt_hint: "Extract grant details including eligibility requirements"

    routing:
      type: grant
      tags: [funding, auto-imported]
```

---

## Agentic Fetching

When OPAL fetches URLs, it acts as an intelligent agent:

### Content Extraction

```yaml
fetching:
  # Readability extraction
  extract_content: true
  remove_navigation: true
  remove_ads: true

  # Metadata extraction
  extract_metadata:
    title: true
    author: true
    date: true
    description: true
    image: true

  # Convert to clean markdown
  output_format: markdown

  # Handle different content types
  handlers:
    pdf: extract_text
    docx: convert_to_markdown
    video: fetch_transcript
    audio: transcribe
```

### Link Following

```yaml
link_following:
  enabled: true
  max_depth: 2

  # Only follow links matching these patterns
  follow_patterns:
    - "/article/*"
    - "/post/*"
    - "/paper/*"

  # Never follow these
  exclude_patterns:
    - "/login"
    - "/signup"
    - "/privacy"

  # Stay within domain
  same_domain_only: true
```

### Pagination Handling

```yaml
pagination:
  enabled: true

  strategies:
    # URL parameter pagination
    url_param:
      param: page
      start: 1
      max_pages: 10

    # "Load more" button
    load_more:
      selector: ".load-more-btn"
      max_clicks: 5
      wait_ms: 1000

    # Infinite scroll
    infinite_scroll:
      scroll_count: 10
      wait_ms: 2000
```

---

## Source Discovery

OPAL can help discover new sources:

```
/sources discover

🔍 Source Discovery
━━━━━━━━━━━━━━━━━━━

Based on your schema and existing content, I found potential sources:

RSS Feeds Found:
├── https://blog.example.com/feed (referenced 12 times)
├── https://news.domain.org/rss (referenced 8 times)
└── https://research.edu/atom.xml (referenced 5 times)

Suggested Based on Schema:
├── ArXiv RSS (for research papers)
├── Hacker News RSS (for technology news)
└── Google Scholar Alerts (for citations)

Add sources? [y/n/select]
```

---

## Sync Commands

### Basic Sync

```bash
/sync                    # Sync all enabled sources
/sync telegram           # Sync specific source
/sync telegram rss       # Sync multiple sources
```

### Advanced Options

```bash
/sync --dry-run          # Preview what would be fetched
/sync --since 2026-01-01 # Override time range
/sync --force            # Ignore cursor, refetch all
/sync --retry-failed     # Retry previously failed items
```

### Sync Status

```bash
/sync --status

Source Status
━━━━━━━━━━━━━

┌─────────────┬─────────┬─────────────────────┬────────┐
│ Source      │ Enabled │ Last Sync           │ Items  │
├─────────────┼─────────┼─────────────────────┼────────┤
│ meetily     │ ✅      │ 2 hours ago         │ 45     │
│ telegram    │ ✅      │ 30 min ago          │ 312    │
│ rss         │ ✅      │ 2 hours ago         │ 89     │
│ youtube     │ ❌      │ never               │ 0      │
└─────────────┴─────────┴─────────────────────┴────────┘
```

---

## Adding Custom Sources

### Via Configuration

Add to `.opal/sources.yaml`:

```yaml
my_custom_source:
  enabled: true
  type: api

  # Your configuration...
```

### Via Skill

Create a custom sync skill in `.claude/skills/sync-custom/`:

```python
# SKILL.md describes the skill
# sync.py implements the logic

async def sync(config, state):
    """Pull content from custom source."""
    # Fetch data
    items = fetch_from_source(config)

    # Transform to OPAL format
    for item in items:
        yield {
            'title': item.title,
            'content': item.body,
            'source': 'my_custom_source',
            'source_id': item.id,
            'metadata': {...}
        }
```

---

## Best Practices

### 1. Start Small
Enable 1-2 sources first. Add more once you've established a review workflow.

### 2. Set Appropriate Schedules
- High-volume sources: Less frequent (daily)
- Low-volume sources: More frequent (hourly)
- Meeting transcripts: Manual or post-meeting

### 3. Use Filters Liberally
Filter out noise at the source level rather than during review.

### 4. Monitor Inbox Size
If inbox grows faster than you can process, adjust filters or schedules.

### 5. Review Failed Items
Run `/sync --retry-failed` periodically to recover transient failures.

---

## Related Commands

- `/setup` - Configure sources during initial setup
- `/sync` - Pull content from sources
- `/sources` - Manage source subscriptions
- `/process` - Process inbox items
- `/status inbox` - View inbox state
