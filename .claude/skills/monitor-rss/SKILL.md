# Monitor RSS Skill

Subscribe to and monitor RSS/Atom feeds for relevant content.

## Purpose

Automatically watch external sources for new content that may be relevant to the knowledge commons. Surfaces potential additions without requiring manual checking.

## Design Philosophy

**Passive Capture**: Feeds are checked in the background. Relevant items are surfaced for review, not auto-ingested.

## When to Use

- `/watch <feed-url>` - Subscribe to a new feed
- Background monitoring - Runs automatically on schedule
- Content discovery - Find relevant external content

## Feed Types Supported

```yaml
feed_types:
  rss_2_0:
    mime: application/rss+xml
    detection: <rss version="2.0">

  atom:
    mime: application/atom+xml
    detection: <feed xmlns="http://www.w3.org/2005/Atom">

  json_feed:
    mime: application/feed+json
    detection: {"version": "https://jsonfeed.org/version/1"}
```

## Source Categories

```yaml
categories:
  academic:
    description: "Research papers and journals"
    examples:
      - arXiv RSS feeds
      - SSRN alerts
      - Journal table of contents

  news:
    description: "News and current events"
    examples:
      - Sector-specific news
      - Policy announcements
      - Community updates

  blogs:
    description: "Practitioner blogs"
    examples:
      - Governance blogs
      - Civic tech blogs
      - Community organizer blogs

  organizations:
    description: "Organization updates"
    examples:
      - Foundation announcements
      - NGO publications
      - Government releases

  aggregators:
    description: "Curated collections"
    examples:
      - Newsletter RSS
      - Curated link blogs
      - Topic aggregators
```

## Monitoring Pipeline

### 1. Subscription Management

```yaml
subscriptions:
  storage: _feeds/subscriptions.yaml

  structure:
    - url: https://example.com/feed.xml
      name: "Example Feed"
      category: blog
      sectors: [governance-and-political-systems]
      check_interval: 1h
      last_checked: 2026-02-01T10:00:00Z
      last_new_item: 2026-01-28T14:30:00Z
      status: active
      filters:
        keywords: [governance, community, decision-making]
        exclude: [advertisement, sponsored]
```

### 2. Feed Checking

```yaml
check:
  schedule:
    default_interval: 1h
    min_interval: 15m
    max_interval: 24h
    adaptive: true  # Slow down for inactive feeds

  process:
    - fetch_feed:
        timeout: 30s
        user_agent: "OPAL/1.0 (Knowledge Commons Monitor)"

    - parse_feed:
        extract: [title, link, description, published, author]

    - detect_new_items:
        compare_to: last_seen_guid
        max_new: 20  # Prevent flood on first check

    - store_state:
        update: last_checked
        save: new_item_guids
```

### 3. Relevance Filtering

```yaml
relevance:
  # Keyword matching
  keyword_filter:
    match_in: [title, description]
    require_any: <subscription_keywords>
    exclude_any: <subscription_excludes>

  # Semantic matching
  semantic_filter:
    enabled: true
    embed_item: [title, description]
    compare_to: taxonomy_embeddings
    threshold: 0.6

  # Sector matching
  sector_filter:
    enabled: true
    match_to: subscription_sectors
    threshold: 0.5

  # Combine scores
  scoring:
    keyword_weight: 0.3
    semantic_weight: 0.5
    sector_weight: 0.2
    threshold: 0.5
```

### 4. Queue for Review

```yaml
queue:
  storage: _inbox/feeds/pending.json

  item_structure:
    - id: unique_id
    - source: feed_name
    - title: item_title
    - url: item_link
    - description: item_description
    - published: publication_date
    - relevance_score: 0.75
    - matched_keywords: [governance, community]
    - suggested_sectors: [governance-and-political-systems]
    - status: pending  # pending | ingested | dismissed

  notification:
    on_new_items: true
    batch: true  # Combine notifications
    max_frequency: 1h
```

## Feed Discovery

Help users find relevant feeds:

```yaml
discovery:
  methods:
    - autodiscover:
        input: website_url
        check: [<link rel="alternate">, /feed, /rss, /atom.xml]

    - search:
        query: "{topic} RSS feed"
        filter: known_feed_patterns

    - suggest:
        based_on: taxonomy
        from: curated_feed_directory

  curated_directory:
    - category: governance
      feeds:
        - name: "Participatory Budgeting Project"
          url: "..."
        - name: "Open Government Partnership"
          url: "..."
```

## Configuration

### In `config/feeds.yaml`

```yaml
feeds:
  # Monitoring settings
  monitoring:
    enabled: true
    default_interval: 1h
    adaptive_intervals: true
    max_concurrent: 5

  # Relevance settings
  relevance:
    semantic_matching: true
    threshold: 0.5
    require_keywords: false

  # Storage
  storage:
    subscriptions: _feeds/subscriptions.yaml
    pending: _inbox/feeds/pending.json
    history: _feeds/history/

  # Notifications
  notifications:
    enabled: true
    channels: [telegram]
    batch_interval: 1h
    min_relevance: 0.6

  # Limits
  limits:
    max_subscriptions: 100
    max_items_per_check: 20
    history_days: 30
```

### Subscription File

```yaml
# _feeds/subscriptions.yaml
subscriptions:
  - url: https://participedia.net/feed
    name: "Participedia"
    category: academic
    sectors:
      - civic-engagement-and-participation-systems
      - governance-and-political-systems
    keywords:
      - participation
      - deliberation
      - civic engagement
    check_interval: 6h
    status: active

  - url: https://democracyos.org/blog/feed
    name: "DemocracyOS Blog"
    category: blog
    sectors:
      - digital-and-technological-systems
      - governance-and-political-systems
    keywords:
      - digital democracy
      - e-participation
      - voting
    check_interval: 12h
    status: active
```

## Commands

```yaml
commands:
  "/watch <url>":
    description: "Subscribe to a new feed"
    process:
      - discover_feed_url
      - prompt_for_sectors
      - prompt_for_keywords
      - add_subscription
      - initial_check

  "/watch list":
    description: "List all subscriptions"

  "/watch remove <feed>":
    description: "Unsubscribe from feed"

  "/watch check":
    description: "Force check all feeds now"

  "/watch pending":
    description: "Show pending items from feeds"

  "/watch ingest <item-id>":
    description: "Ingest a pending item"

  "/watch dismiss <item-id>":
    description: "Dismiss a pending item"
```

## Pending Items Review

```yaml
review:
  command: "/watch pending"

  output: |
    ## Pending Feed Items

    **5 new items** from 3 feeds

    ### From Participedia (3 items)

    1. **New Case Study: Porto Alegre PB** (0.85 relevance)
       Published: 2 hours ago
       [View](url) | [Ingest] | [Dismiss]

    2. **Deliberative Polling Methodology** (0.72 relevance)
       Published: 1 day ago
       [View](url) | [Ingest] | [Dismiss]

    ### From DemocracyOS Blog (2 items)

    1. **Digital Tools for Consensus** (0.68 relevance)
       Published: 3 days ago
       [View](url) | [Ingest] | [Dismiss]

  actions:
    ingest:
      - fetch full content
      - add to _inbox/documents/
      - trigger pipeline

    dismiss:
      - mark as dismissed
      - optional: add to exclude patterns
```

## Integration

### With Ingest

Seamlessly ingest feed items:

```yaml
ingest:
  from_feed:
    - fetch_full_content
    - convert_to_markdown
    - add_source_metadata
    - route_to_inbox
    - trigger_processing
```

### With Digest

Include feed activity in digests:

```yaml
digest:
  include:
    - new_feed_items: count
    - ingested_from_feeds: list
    - top_sources: by_ingestion
```

### With Entity Extraction

Use feed content for entity discovery:

```yaml
extraction:
  from_feeds:
    - extract_mentioned_entities
    - suggest_relationships
    - identify_new_patterns
```

## Background Processing

```yaml
background:
  scheduler:
    check_interval: 5m  # Check if any feeds due
    max_concurrent: 3
    stagger: true  # Don't check all at once

  adaptive:
    # Speed up for active feeds
    high_activity:
      new_items_per_check: ">2"
      reduce_interval_by: 0.5

    # Slow down for inactive feeds
    low_activity:
      days_without_new: 7
      increase_interval_by: 2

    # Disable broken feeds
    failures:
      consecutive: 5
      action: pause_and_notify

  resource_limits:
    cpu_threshold: 50%
    pause_on_battery: true
```

## Error Handling

```yaml
errors:
  feed_unavailable:
    retry: true
    backoff: exponential
    max_retries: 5
    notify_after: 3

  parse_error:
    log: true
    skip_item: true
    continue: true

  rate_limited:
    respect_retry_after: true
    fallback_delay: 1h

  feed_moved:
    follow_redirects: true
    update_subscription: true
    notify: true
```
