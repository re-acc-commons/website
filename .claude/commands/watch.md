# /watch Command

Subscribe to and monitor RSS/Atom feeds.

## Usage

```
/watch <subcommand> [options]
```

## Subcommands

### Subscribe

Add a new feed subscription:

```bash
# Subscribe to a feed
/watch https://example.com/feed.xml

# With options
/watch https://example.com/feed.xml --sectors governance --keywords "participation,democracy"
```

### List

Show all subscriptions:

```bash
/watch list
```

### Remove

Unsubscribe from a feed:

```bash
/watch remove <feed-name-or-url>
```

### Check

Force check feeds now:

```bash
# Check all feeds
/watch check

# Check specific feed
/watch check <feed-name>
```

### Pending

Show pending items from feeds:

```bash
/watch pending
```

### Ingest

Ingest a pending item:

```bash
/watch ingest <item-id>
```

### Dismiss

Dismiss a pending item:

```bash
/watch dismiss <item-id>
```

## Options

| Option | Description |
|--------|-------------|
| `--sectors <sectors>` | Relevant sectors (comma-separated) |
| `--keywords <words>` | Keywords to match (comma-separated) |
| `--interval <time>` | Check interval (1h, 6h, 12h, 24h) |

## Output

### List Subscriptions

```
## Feed Subscriptions (5 active)

1. **Participedia** (academic)
   https://participedia.net/feed
   Sectors: Civic Engagement, Governance
   Last checked: 2 hours ago | 3 new items pending

2. **DemocracyOS Blog** (blog)
   https://democracyos.org/blog/feed
   Sectors: Digital, Governance
   Last checked: 6 hours ago | No new items

...
```

### Pending Items

```
## Pending Feed Items (5 items)

### From Participedia (3)

1. **New Case Study: Porto Alegre PB** (relevance: 0.85)
   Published: 2 hours ago
   /watch ingest item-123 | /watch dismiss item-123

2. **Deliberative Polling Methodology** (relevance: 0.72)
   Published: 1 day ago
   /watch ingest item-124 | /watch dismiss item-124

...
```

## Background Monitoring

Feeds are checked automatically in the background based on configured intervals. New relevant items appear in `/watch pending` and can be included in digests.

## Related Commands

- `/ingest` - Manual content ingestion
- `/digest` - Include feed activity in summaries

## Skill

Uses: `monitor-rss`
