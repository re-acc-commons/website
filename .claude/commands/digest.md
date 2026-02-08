# /digest Command

Generate and manage activity digests for the knowledge commons.

## Usage

```
/digest [subcommand] [options]
```

## Subcommands

### Generate

Create a digest for a specific period:

```bash
# Generate weekly digest
/digest generate --type weekly

# Generate daily digest
/digest generate --type daily

# Generate for custom period
/digest generate --since 2026-01-15 --until 2026-02-01
```

### Preview

Preview the next scheduled digest without sending:

```bash
/digest preview
/digest preview --type weekly
```

### Send

Send a digest immediately:

```bash
/digest send --type weekly
/digest send --type daily --channel telegram
```

### Subscribe

Manage subscriptions:

```bash
# Subscribe to weekly digest
/digest subscribe --frequency weekly --email user@example.com

# Subscribe to daily via Telegram
/digest subscribe --frequency daily --telegram @username

# List subscriptions
/digest subscribe --list
```

### Unsubscribe

```bash
/digest unsubscribe --email user@example.com
/digest unsubscribe --all
```

## Options

| Option | Description |
|--------|-------------|
| `--type` | Digest type: daily, weekly, monthly |
| `--since` | Start date for custom period |
| `--until` | End date for custom period |
| `--channel` | Distribution channel: email, telegram, slack |
| `--preview` | Preview without sending |
| `--dry-run` | Show what would be sent |

## Digest Contents

Each digest includes:

- **Highlights** - AI-selected notable changes
- **New Entities** - Additions grouped by type
- **Updates** - Significant modifications
- **Merged PRs** - Accepted contributions
- **Pending Review** - Items needing attention
- **Statistics** - Activity metrics
- **Coming Soon** - Teasers for upcoming content

## Example Output

```markdown
# Open Protocol Library Weekly Digest

**Week of January 27, 2026**

## 🌟 This Week's Highlights

The commons grew significantly this week with 5 new patterns
focused on community governance and 3 new protocols for
participatory decision-making.

## 📥 New Additions

### Patterns (5)
- [Consent-Based Decision Making](/patterns/consent/)
- [Advice Process](/patterns/advice-process/)
...

### Protocols (3)
- [Sociocracy](/protocols/sociocracy/)
...

## 📊 By the Numbers

- **Total entities**: 156
- **Added this week**: 8
- **Active contributors**: 12
```

## Scheduling

Digests are sent automatically based on configuration:

| Type | Default Schedule |
|------|------------------|
| Daily | 9:00 AM local time |
| Weekly | Monday 9:00 AM |
| Monthly | 1st of month 9:00 AM |

## Distribution Channels

### Email

Sends formatted HTML email via configured provider.

### Telegram

Posts to configured channel/group with markdown formatting.

### Slack

Posts to configured channel with rich blocks.

## Configuration

Configure in `config/digest.yaml`:

```yaml
digest:
  frequencies:
    weekly:
      enabled: true
      day: monday
      time: "09:00"
      channels: [email, slack]
```

## Related Commands

- `/status` - Current commons status
- `/process` - Trigger content processing

## Skill

Uses: `generate-digest`
