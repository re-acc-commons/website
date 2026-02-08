# Telegram Source Processor

Monitor Telegram channels for shared links and fetch their content.

## Overview

This skill monitors configured Telegram channels/groups for messages containing URLs, fetches the content from those URLs, and creates properly formatted markdown files in the OPAL inbox.

**Note:** Telegram integration requires a bot token. This skill documents the setup process and provides execution instructions for when the integration is configured.

## Invocation

This skill is automatically invoked by `/sync` when `telegram` is configured as a source.

Direct invocation:
```
/sync telegram                  # Sync all configured channels
/sync telegram --channel <name> # Sync specific channel
/sync telegram --force          # Ignore cursor, refetch all
```

---

## PREREQUISITES

### Creating a Telegram Bot

1. **Open Telegram** and search for `@BotFather`

2. **Create a new bot:**
   ```
   /newbot
   ```

3. **Follow prompts:**
   - Enter a name for your bot (e.g., "OPAL Ingest Bot")
   - Enter a username ending in `bot` (e.g., `my_opal_bot`)

4. **Save the bot token** that BotFather provides:
   ```
   1234567890:ABCdefGHIjklMNOpqrsTUVwxyz123456789
   ```

5. **Add the bot to channels/groups** you want to monitor:
   - Open the channel/group settings
   - Add the bot as a member (or admin for private channels)

6. **Get the chat ID** for each channel:
   - Forward a message from the channel to `@userinfobot`
   - Or use the Telegram API to list chats

7. **Store the token** in environment or config:
   ```bash
   export TELEGRAM_BOT_TOKEN="your-token-here"
   ```
   Or in `.opal/secrets.local`:
   ```yaml
   telegram:
     bot_token: "your-token-here"
   ```

---

## EXECUTION INSTRUCTIONS

When syncing from Telegram, execute these steps IN ORDER.

### Step 1: Load Configuration

**Action:** Read `.opal/sources.yaml` for Telegram config.

```yaml
telegram:
  enabled: true
  bot_token_env: TELEGRAM_BOT_TOKEN  # Or bot_token: "direct-value"

  channels:
    - id: -1001234567890
      name: research-links
      monitor_type: links

    - id: -1009876543210
      name: news-feed
      tags: [news]
```

**Check for bot token:**
1. Check `bot_token` field
2. Check environment variable from `bot_token_env`
3. Check `.opal/secrets.local`

**If no token found:**
```
❌ Telegram bot token not configured.

To set up Telegram:
1. Create a bot with @BotFather on Telegram
2. Add the token to your configuration:

   Option A - Environment variable:
   export TELEGRAM_BOT_TOKEN="your-token"

   Option B - In .opal/sources.yaml:
   telegram:
     bot_token: "your-token"

   Option C - In .opal/secrets.local:
   telegram:
     bot_token: "your-token"

Run /sources configure telegram for guided setup.
```
STOP.

### Step 2: Load Sync State

**Action:** Read `_index/sync-state.json`.

Get `sources.telegram.cursors` - a dict of channel IDs to last-seen message IDs.

```json
{
  "sources": {
    "telegram": {
      "cursors": {
        "-1001234567890": 12345,
        "-1009876543210": 67890
      }
    }
  }
}
```

### Step 3: Fetch Messages from Each Channel

**FOR EACH configured channel:**

#### Step 3.1: Call Telegram API

**Note:** Since Claude Code doesn't have direct HTTP client capabilities, we use WebFetch or Bash with curl.

**Action:** Use Bash with curl to fetch messages.

```bash
BOT_TOKEN="{bot_token}"
CHAT_ID="{channel_id}"
OFFSET={last_message_id + 1}  # Or 0 if no cursor

curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?chat_id=${CHAT_ID}&offset=${OFFSET}&limit=100"
```

**Alternative using updates endpoint:**
```bash
curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${OFFSET}&limit=100" | \
  jq '[.result[] | select(.message.chat.id == {chat_id})]'
```

#### Step 3.2: Parse Response

**Expected response structure:**
```json
{
  "ok": true,
  "result": [
    {
      "update_id": 123456789,
      "message": {
        "message_id": 100,
        "chat": {"id": -1001234567890, "title": "Research Links"},
        "from": {"username": "alice"},
        "date": 1706500000,
        "text": "Check out this article https://example.com/article",
        "entities": [
          {"type": "url", "offset": 24, "length": 27}
        ]
      }
    }
  ]
}
```

#### Step 3.3: Extract URLs from Messages

**For each message:**

1. Check `entities` for `type: "url"`
2. Extract URL from text using offset/length
3. Also check for `type: "text_link"` (hyperlinked text)

**Filter URLs:**
- Skip excluded domains (twitter.com, x.com, etc.)
- Skip already-synced URLs

```
[{channel_index}/{total_channels}] {channel_name}
      ├── Fetching messages since ID {cursor}...
      ├── Found {message_count} new messages
      └── Extracted {url_count} URLs
```

### Step 4: Fetch Content from Each URL

**FOR EACH extracted URL:**

#### Step 4.1: Check URL Type

Categorize by domain/pattern:

| Pattern | Type | Handler |
|---------|------|---------|
| `youtube.com/*` | Video | Skip or fetch transcript |
| `twitter.com/*` | Tweet | Skip (excluded by default) |
| `*.pdf` | PDF | Download and extract text |
| `arxiv.org/*` | Paper | Fetch abstract and metadata |
| `lu.ma/*` | Event | Fetch event details |
| Default | Article | Use WebFetch |

#### Step 4.2: Fetch with WebFetch

**Action:** Use WebFetch tool.

```
WebFetch:
  url: {link_url}
  prompt: "Extract the main content from this page. Return:
    - title: Page/article title
    - author: Author if present
    - date: Publication date if present
    - content: Main content in markdown format
    - type: article, event, paper, video, or other
    - word_count: Approximate word count
    Ignore navigation, ads, and sidebars."
```

**If WebFetch fails:**
```
      ├── ⚠️ Could not fetch: {url}
      │       Reason: {error}
```
Continue to next URL.

#### Step 4.3: Generate Filename

**Format:** `telegram-{date}-{slug}.md`

1. Use message date
2. Generate slug from title or URL:
   - Lowercase
   - Replace spaces with hyphens
   - Remove special characters
   - Truncate to 50 chars

**Example:** `telegram-2026-01-29-advances-machine-learning.md`

#### Step 4.4: Generate Markdown Content

**Action:** Use Write tool to create file.

**Template:**
```markdown
---
source: telegram
source_id: "msg-{message_id}"
source_channel: "{channel_name}"
source_url: "{original_url}"
title: "{extracted_title}"
author: "{author}"
shared_by: "@{telegram_username}"
shared_at: {message_timestamp}
synced_at: {current_timestamp}
type: {detected_type}
tags: {channel_tags}
---

# {extracted_title}

**Source:** [{domain}]({original_url})
**Shared by:** @{username} in #{channel_name}
**Shared:** {formatted_date}

---

## Context

> {original_message_text}

---

## Content

{extracted_content}

---

*Captured from Telegram channel: {channel_name}*
```

**Write to:** `_inbox/links/telegram/{filename}`

#### Step 4.5: Report Progress

```
      ├── [{url_index}/{total_urls}] ✅ {title}
      │         Source: {domain}
      │         → _inbox/links/telegram/{filename}
```

### Step 5: Update Sync State

**Action:** Update `_index/sync-state.json`.

```json
{
  "sources": {
    "telegram": {
      "enabled": true,
      "last_sync": "{current_timestamp}",
      "cursors": {
        "{channel_id}": {newest_message_id}
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
Telegram Sync Complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Channels checked: {channel_count}
Messages processed: {message_count}
Links fetched: {link_count}
Output: _inbox/links/telegram/

By channel:
{for each channel:}
  ├── #{channel_name}: {link_count} links

New files:
{for each file:}
  ├── {filename}

Skipped:
  ├── Excluded domains: {excluded_count}
  ├── Failed to fetch: {failed_count}
  └── Already synced: {duplicate_count}

Next: Run /process to extract entities
```

---

## Configuration Reference

Full configuration in `.opal/sources.yaml`:

```yaml
telegram:
  enabled: true
  type: links

  # Authentication
  bot_token_env: TELEGRAM_BOT_TOKEN  # Preferred: use env var
  # Or direct (less secure):
  # bot_token: "1234567890:ABCdef..."

  # Output location
  output: _inbox/links/telegram/

  # Channels to monitor
  channels:
    - id: -1001234567890
      name: research-links
      monitor_type: links       # links, all, or media
      tags: [research]

    - id: -1009876543210
      name: news-feed
      monitor_type: links
      tags: [news]
      filters:
        exclude_domains:
          - twitter.com
          - x.com

  # Global filters
  filters:
    exclude_domains:
      - twitter.com
      - x.com
      - facebook.com
      - instagram.com
    include_only_domains: []    # If set, ONLY fetch from these
    min_message_length: 0       # Skip very short messages
    exclude_forwards: false     # Skip forwarded messages

  # Link handling
  link_handling:
    auto_fetch: true            # Fetch content from URLs
    fetch_timeout: 30           # Seconds
    max_content_size_kb: 500    # Skip very large pages
    include_context: true       # Include original message text
    extract_metadata: true      # Title, author, date

  # Sync behavior
  sync:
    schedule: "*/30 * * * *"    # Every 30 minutes
    batch_size: 100             # Max messages per sync
    retry_failed: true          # Retry previously failed URLs
```

---

## Secrets Configuration

Store bot token securely in `.opal/secrets.local` (gitignored):

```yaml
# .opal/secrets.local
telegram:
  bot_token: "1234567890:ABCdefGHIjklMNOpqrsTUVwxyz123456789"
```

Or use environment variables:
```bash
export TELEGRAM_BOT_TOKEN="your-token-here"
```

---

## Error Handling

### Invalid Bot Token
```
❌ Telegram API error: Unauthorized
    Your bot token appears to be invalid.
    Check the token and try again.
```

### Bot Not in Channel
```
❌ Cannot access channel: {channel_name}
    The bot may not be a member of this channel.
    Add the bot to the channel and try again.
```

### Rate Limited
```
⚠️ Telegram rate limit reached.
    Waiting 60 seconds before continuing...
```

### URL Fetch Failed
```
⚠️ Could not fetch: {url}
    Reason: {error}
    Action: Skipping, will retry on next sync
```

---

## Setup Wizard

When running `/sources add telegram` or `/sources configure telegram`:

**USE AskUserQuestion:**
```
questions: [{
  question: "Do you have a Telegram bot token?",
  header: "Bot Token",
  options: [
    {label: "Yes, I have one", description: "I'll enter my bot token"},
    {label: "No, help me create one", description: "Show me how to create a bot"},
    {label: "Skip for now", description: "I'll configure this later"}
  ]
}]
```

If "help me create one":
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Creating a Telegram Bot
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Open Telegram and search for @BotFather

2. Send /newbot command

3. Follow the prompts:
   • Enter a name (e.g., "OPAL Ingest Bot")
   • Enter a username ending in 'bot'

4. BotFather will give you a token like:
   1234567890:ABCdefGHIjklMNOpqrsTUVwxyz

5. Add your bot to the channels you want to monitor

When ready, run /sources configure telegram again.
```

---

## Integration with /process

After syncing, links are in `_inbox/links/telegram/` ready for processing:

```
/process

[1/5] telegram-2026-01-29-advances-ml.md
      ├── Type: article (confidence: 0.95)
      ├── Extracted: 5 entities
      │   ├── Concepts: machine learning, transformers
      │   ├── People: Dr. Smith (mentioned)
      │   └── Organizations: Google, MIT
      └── ✅ Staged for review
```
