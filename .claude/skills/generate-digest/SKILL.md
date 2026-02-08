# Generate Digest Skill

Create activity summaries and digests of commons changes.

## Purpose

Automatically compile and distribute summaries of what's changed in the knowledge commons. Keeps stakeholders informed without requiring them to monitor every change.

## Digest Types

```yaml
digest_types:
  daily:
    frequency: every 24 hours
    audience: active contributors
    detail: high
    channels: [email, telegram, slack]

  weekly:
    frequency: every 7 days
    audience: all subscribers
    detail: medium
    channels: [email, newsletter]

  monthly:
    frequency: every 30 days
    audience: broader community
    detail: summary
    channels: [newsletter, blog_post]

  on_demand:
    frequency: manual trigger
    audience: specified
    detail: configurable
    channels: specified
```

## Digest Content

### What to Include

```yaml
content:
  # New content
  new_entities:
    include: true
    group_by: type
    limit: 10
    format: |
      ### New {type}s

      - [{title}]({url}) - {summary_snippet}

  # Updates
  updated_entities:
    include: true
    threshold: significant_changes  # Not typo fixes
    format: |
      ### Updated

      - [{title}]({url}) - {change_summary}

  # Merged PRs
  merged_contributions:
    include: true
    format: |
      ### Merged Contributions

      - PR #{number}: {title} by @{author}

  # Pending review
  pending_review:
    include: true
    for: [weekly, daily]
    format: |
      ### Needs Your Review

      - [{title}]({url}) - {days_pending} days pending

  # Statistics
  statistics:
    include: true
    metrics:
      - total_entities
      - entities_this_period
      - contributors_active
      - most_viewed (if available)

  # Highlights
  highlights:
    include: true
    for: [weekly, monthly]
    curated: true  # Can be manually set
    ai_selected: true  # Or auto-selected

  # Gaps and opportunities
  gaps:
    include: true
    for: [monthly]
    from: coverage_analysis
```

### Content Selection

```yaml
selection:
  # Prioritize important changes
  importance_scoring:
    factors:
      - entity_type_weight:
          pattern: 1.0
          protocol: 1.0
          playbook: 0.9
          person: 0.7
          organization: 0.7
      - change_magnitude: 0.5
      - contributor_reputation: 0.3
      - related_entity_count: 0.2

  # Avoid overwhelming
  limits:
    max_items_per_section: 10
    max_total_items: 30
    prioritize_by: importance_score

  # Deduplicate
  deduplication:
    same_entity: keep_latest
    similar_content: merge_mentions
```

## Digest Generation Pipeline

### 1. Gather Changes

```yaml
gather:
  sources:
    - git_log:
        since: <last_digest>
        filter: content_changes_only

    - entity_index:
        created_after: <last_digest>
        updated_after: <last_digest>

    - pr_history:
        merged_after: <last_digest>

    - review_queue:
        status: pending

  output:
    raw_changes: [...]
```

### 2. Analyze and Categorize

```yaml
analyze:
  - categorize_changes:
      by: [type, sector, scale]

  - score_importance:
      method: weighted_factors

  - detect_themes:
      method: topic_clustering
      output: ["governance updates", "new patterns"]

  - generate_highlights:
      method: ai_selection
      prompt: |
        Given these changes, select 3-5 highlights that would
        be most interesting to the commons community:
        {changes_summary}
```

### 3. Generate Content

```yaml
generate:
  # Header
  header:
    template: |
      # {commons_name} Digest

      **Period**: {start_date} to {end_date}
      **Published**: {publish_date}

  # Summary
  summary:
    method: ai_generated
    prompt: |
      Write a 2-3 sentence summary of these changes:
      {highlights}

      Tone: Friendly, informative, community-focused

  # Sections
  sections:
    - highlights
    - new_entities
    - updated_entities
    - merged_contributions
    - pending_review
    - statistics
    - coming_soon  # Teaser for upcoming)

  # Footer
  footer:
    template: |
      ---
      View all changes: {changes_url}
      Browse the commons: {site_url}
      Contribute: {contribute_url}
```

### 4. Format for Channels

```yaml
format:
  email:
    template: html
    include_images: true
    max_length: unlimited
    cta_buttons: true

  telegram:
    template: markdown
    max_length: 4096
    include_links: true
    use_preview: true

  slack:
    template: blocks
    max_length: 3000
    include_buttons: true

  newsletter:
    template: html
    include_branding: true
    include_social: true

  markdown:
    template: plain_markdown
    use_for: [blog_post, archive]
```

## Digest Templates

### Weekly Digest Template

```markdown
# Open Protocol Library Weekly Digest

**Week of {week_start}** | [View Online]({digest_url})

## 🌟 This Week's Highlights

{ai_generated_summary}

## 📥 New Additions

### Patterns
{new_patterns_list}

### Protocols
{new_protocols_list}

### People & Organizations
{new_people_orgs_list}

## ✏️ Notable Updates

{significant_updates_list}

## 🔀 Merged Contributions

{merged_prs_list}

## 👀 Needs Your Review

{pending_items_list}

## 📊 By the Numbers

- **Total entities**: {total_count}
- **Added this week**: {new_count}
- **Updated this week**: {updated_count}
- **Active contributors**: {contributor_count}

## 🔮 Coming Soon

{teaser_content}

---

[Browse the Library]({site_url}) | [Contribute]({contribute_url}) | [Unsubscribe]({unsubscribe_url})
```

### Daily Digest Template (Compact)

```markdown
# Daily Update - {date}

**{new_count}** new | **{updated_count}** updated | **{pending_count}** pending review

## New
{new_items_compact}

## Updated
{updated_items_compact}

## Pending Review
{pending_items_compact}

[Full details]({digest_url})
```

## Distribution

### Email

```yaml
email:
  provider: sendgrid  # or mailgun, ses
  from: "digest@{domain}"
  subject: "{commons_name} {frequency} Digest - {date}"

  lists:
    daily: daily-subscribers
    weekly: weekly-subscribers
    monthly: monthly-subscribers

  personalization:
    use_name: true
    highlight_their_contributions: true
```

### Telegram

```yaml
telegram:
  bot: <opal_bot>
  channels:
    - @{commons_channel}
  groups:
    - {contributor_group_id}

  formatting:
    use_markdown: true
    disable_preview: false
```

### Slack

```yaml
slack:
  webhook: <webhook_url>
  channel: "#commons-updates"

  formatting:
    use_blocks: true
    include_buttons: true
```

### Newsletter (Buttondown/Substack)

```yaml
newsletter:
  provider: buttondown  # or substack
  audience: all_subscribers
  schedule: weekly

  content:
    include_intro: true
    include_commentary: true  # Optional human addition
```

## Scheduling

```yaml
schedule:
  daily:
    time: "09:00"
    timezone: "America/Los_Angeles"
    skip_if_empty: true

  weekly:
    day: monday
    time: "09:00"
    timezone: "America/Los_Angeles"
    skip_if_empty: false

  monthly:
    day: 1  # First of month
    time: "09:00"
    timezone: "America/Los_Angeles"
```

## Configuration

### In `config/digest.yaml`

```yaml
digest:
  # Enable/disable
  enabled: true

  # Commons info
  commons:
    name: "Open Protocol Library"
    site_url: "https://commons.opencivics.co"
    contribute_url: "https://github.com/..."

  # Frequency settings
  frequencies:
    daily:
      enabled: true
      time: "09:00"
      channels: [telegram]
    weekly:
      enabled: true
      day: monday
      time: "09:00"
      channels: [email, slack]
    monthly:
      enabled: true
      day: 1
      channels: [newsletter]

  # Content settings
  content:
    max_items: 30
    include_statistics: true
    include_pending: true
    ai_highlights: true
    ai_summary: true

  # Distribution
  distribution:
    email:
      enabled: true
      provider: sendgrid
      from: "digest@opencivics.co"
    telegram:
      enabled: true
      channel: "@opl_updates"
    slack:
      enabled: false

  # Subscribers
  subscribers:
    source: _config/subscribers.yaml
    allow_self_subscribe: true
```

### Subscriber List

```yaml
# _config/subscribers.yaml
subscribers:
  daily:
    - email: "active@contributor.com"
      name: "Active Contributor"

  weekly:
    - email: "regular@reader.com"
      name: "Regular Reader"
    - telegram: "@username"

  monthly:
    - email: "occasional@reader.com"
```

## Commands

```yaml
commands:
  "/digest":
    description: "Generate digest now"
    options:
      --type: "daily, weekly, monthly"
      --preview: "Preview without sending"
      --since: "Custom start date"

  "/digest preview":
    description: "Preview next digest"

  "/digest send":
    description: "Send digest now"

  "/digest subscribe":
    description: "Subscribe to digests"
    options:
      --frequency: "daily, weekly, monthly"
      --channel: "email, telegram, slack"

  "/digest unsubscribe":
    description: "Unsubscribe from digests"
```

## Metrics

```yaml
metrics:
  track:
    - digests_sent
    - open_rate (email)
    - click_rate
    - unsubscribe_rate
    - most_clicked_items

  use_for:
    - content_prioritization
    - engagement_understanding
    - timing_optimization
```

## Archive

```yaml
archive:
  location: _digests/
  format: markdown
  naming: "{frequency}-{date}.md"

  index:
    generate: true
    path: _digests/index.md

  publish:
    to_site: true
    path: /digests/
```
