# RSS Source Processor

Fetch and process articles from RSS/Atom feeds.

## Overview

This skill fetches articles from configured RSS and Atom feeds, extracts full content from linked pages, and creates properly formatted markdown files in the OPAL inbox.

## Invocation

This skill is automatically invoked by `/sync` when `rss` is configured as a source.

Direct invocation:
```
/sync rss                  # Sync all configured feeds
/sync rss --feed <name>    # Sync specific feed
/sync rss --force          # Ignore cursor, refetch all
/sync rss --limit 10       # Only fetch 10 most recent per feed
```

---

## EXECUTION INSTRUCTIONS

When syncing from RSS feeds, execute these steps IN ORDER.

### Step 1: Load Feed Configuration

**Action:** Read `.opal/sources.yaml` to get feed list.

```yaml
rss:
  enabled: true
  feeds:
    - url: https://blog.example.com/feed
      name: Example Blog
      tags: [technology]
    - url: https://news.site.org/rss.xml
      name: News Site
      category: news
```

**Extract for each feed:**
- `url`: Feed URL (required)
- `name`: Display name (optional, derive from feed title)
- `tags`: Auto-applied tags (optional)
- `category`: Category subdirectory (optional)

### Step 2: Load Sync State

**Action:** Read `_index/sync-state.json`.

Get `sources.rss.cursors` - a dict of feed URLs to last-seen timestamps or GUIDs.

```json
{
  "sources": {
    "rss": {
      "cursors": {
        "https://blog.example.com/feed": "2026-01-28T12:00:00Z",
        "https://news.site.org/rss.xml": "guid-12345"
      }
    }
  }
}
```

### Step 3: Fetch Each Feed

**FOR EACH configured feed:**

#### Step 3.1: Fetch Feed XML

**Action:** Use WebFetch to get the feed.

```
WebFetch:
  url: {feed_url}
  prompt: "Parse this RSS/Atom feed and return a JSON array of items with: title, link, published (ISO date), author, description, guid. Return the raw JSON only."
```

**Parse response:** Extract array of feed items.

#### Step 3.2: Filter New Items

**Action:** Filter based on cursor.

1. If cursor is a date: Include items with `published > cursor`
2. If cursor is a GUID: Include items after that GUID in the feed
3. If `--force`: Include all items (up to limit)

**Apply additional filters:**
- `max_age_days`: Skip items older than N days
- `include_only`: Only items with titles containing keywords
- `exclude_titles`: Skip items with titles containing keywords

#### Step 3.3: Report Feed Status

```
[{feed_index}/{total_feeds}] {feed_name}
      ├── Fetching feed...
      ├── Found {total} items, {new} new since last sync
```

### Step 4: Process Each Item

**FOR EACH new feed item:**

#### Step 4.1: Fetch Full Content

**Action:** Use WebFetch to get the full article.

```
WebFetch:
  url: {item.link}
  prompt: "Extract the main article content from this page. Return:
    - title: The article title
    - author: Author name if present
    - published_date: Publication date if present
    - content: The full article text in clean markdown format
    - word_count: Approximate word count
    Ignore navigation, ads, sidebars. Just the article content."
```

**If WebFetch fails:**
- Log warning
- Fall back to using description from feed
- Continue to next item

#### Step 4.2: Generate Filename

**Format:** `rss-{date}-{slug}.md`

1. Use item published date or current date
2. Generate slug from title:
   - Lowercase
   - Replace spaces with hyphens
   - Remove special characters
   - Truncate to 50 chars

**Example:** `rss-2026-01-29-advances-in-machine-learning.md`

#### Step 4.3: Generate Markdown Content

**Action:** Use Write tool to create file.

**Template:**
```markdown
---
source: rss
source_id: "{guid or link hash}"
source_feed: "{feed_name}"
title: "{title}"
author: "{author}"
url: "{original_link}"
published: {published_date}
synced_at: {current_timestamp}
word_count: {word_count}
type: article
tags: {feed_tags}
---

# {title}

**Author:** {author}
**Published:** {formatted_date}
**Source:** [{feed_name}]({original_link})

---

{content}

---

*Fetched from RSS feed: {feed_name}*
```

**Write to:** `_inbox/feeds/{category}/{filename}` or `_inbox/feeds/{filename}`

#### Step 4.4: Report Progress

```
      ├── [{item_index}/{total_items}] ✅ {title}
      │         → _inbox/feeds/{filename}
```

### Step 5: Update Sync State

**Action:** Update `_index/sync-state.json` for each feed.

```json
{
  "sources": {
    "rss": {
      "enabled": true,
      "last_sync": "{current_timestamp}",
      "cursors": {
        "{feed_url}": "{newest_item_date_or_guid}"
      },
      "items_synced": {previous + new_count},
      "errors": {error_count}
    }
  }
}
```

### Step 6: Summary

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RSS Sync Complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Feeds checked: {feed_count}
Articles synced: {total_articles}
Output: _inbox/feeds/

By feed:
{for each feed with new items:}
  ├── {feed_name}: {count} articles

New files:
{for each file:}
  ├── {filename}

Next: Run /process to extract entities
```

---

## Feed Discovery

If no feeds are configured, suggest discovery:

```
⚠️ No RSS feeds configured.

Would you like me to discover feeds?
I can check common locations on domains you've bookmarked.

Or add feeds manually:
  /sources add rss https://blog.example.com/feed

Common feed patterns:
  • /feed
  • /rss
  • /atom.xml
  • /feed.xml
  • /index.xml
```

---

## Configuration Reference

Full configuration in `.opal/sources.yaml`:

```yaml
rss:
  enabled: true
  type: feed

  # Output location
  output: _inbox/feeds/

  # Sync settings
  sync:
    schedule: "0 */2 * * *"  # Every 2 hours
    batch_size: 100           # Max items per sync

  # Global filters (apply to all feeds)
  filters:
    max_age_days: 14
    exclude_titles: []

  # Feed list
  feeds:
    - url: https://blog.example.com/feed
      name: Example Blog
      tags: [technology, programming]
      category: tech

    - url: https://news.example.org/rss
      name: Example News
      tags: [news]
      filters:
        max_age_days: 7  # Override global

    - url: https://research.edu/atom.xml
      name: Research Updates
      tags: [research, academic]
      routing:
        prefer_type: paper  # Suggest this entity type

  # Content fetching
  fetch_content:
    enabled: true              # Fetch full articles (vs just descriptions)
    timeout_seconds: 30        # Per-article timeout
    max_content_size_kb: 500   # Skip very large pages
    extract_images: false      # Include images in markdown
    respect_robots: true       # Respect robots.txt

  # Deduplication
  dedup:
    by_url: true              # Skip if URL already synced
    by_title: true            # Skip if similar title exists
    similarity_threshold: 0.9  # For title matching
```

---

## Error Handling

### Feed Not Found (404)
```
⚠️ Feed not found: {url}
    The feed may have moved. Check the URL or remove with:
    /sources remove rss {feed_name}
```

### Parse Error
```
⚠️ Could not parse feed: {url}
    Feed format not recognized. Expected RSS 2.0 or Atom.
```

### Article Fetch Failed
```
⚠️ Could not fetch article: {url}
    Reason: {error}
    Using description from feed instead.
```

### Rate Limited
```
⚠️ Rate limited by {domain}
    Waiting 60 seconds before retrying...
```

---

## WebFetch Prompts

### Feed Parsing Prompt
```
Parse this RSS/Atom feed XML and return a JSON array of items.
For each item, extract:
- title: string
- link: string (URL to full article)
- published: string (ISO 8601 date)
- author: string (if present)
- description: string (summary/excerpt)
- guid: string (unique identifier)

Return ONLY valid JSON, no other text.
```

### Article Extraction Prompt
```
Extract the main article content from this webpage.
Ignore: navigation, ads, sidebars, comments, related articles.
Include: title, author, date, article body.

Return as markdown with:
- Clean formatting
- Preserved headings
- Code blocks if present
- Blockquotes for quotes

Also return:
- word_count: number
- has_images: boolean
- reading_time_minutes: number
```

---

## Integration with /process

After syncing, articles are in `_inbox/feeds/` ready for processing:

```
/process

[1/5] rss-2026-01-29-advances-ml.md
      ├── Type: article (confidence: 0.95)
      ├── Extracted: 5 entities, 2 relationships
      │   ├── Concepts: machine learning, neural networks
      │   ├── People: Dr. Smith (mentioned)
      │   └── Organizations: MIT, Google
      └── ✅ Staged for review
```
