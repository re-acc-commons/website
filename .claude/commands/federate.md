# /federate Command

Manage federation with other knowledge commons.

## Usage

```
/federate                  # Show federation status
/federate pull             # Pull from all sources
/federate pull <source>    # Pull from specific source
/federate publish          # Update outbox with recent commits
/federate add <repo>       # Add new source subscription
/federate remove <source>  # Remove source subscription
```

## Federation Status

```
/federate

🌐 Federation Status
━━━━━━━━━━━━━━━━━━━━

Mode: Publisher + Subscriber

📥 Subscribed Sources (2):
├── open-protocol-library
│   ├── Repo: omniharmonic/open-protocol-library
│   ├── Patterns: patterns/*, protocols/*
│   ├── Last sync: 2 hours ago
│   └── Status: ✅ Up to date
│
└── bioregional-commons
    ├── Repo: consortium/bioregional-commons
    ├── Patterns: playbooks/bioregional/*
    ├── Last sync: 1 day ago
    └── Status: ⚠️ 3 new items available

📤 Publishing:
├── Enabled: Yes
├── Include: patterns/*, protocols/*
├── License: CC-BY-SA-4.0
├── Last publish: 30 minutes ago
└── Subscribers: 5 repos watching

Suggested actions:
• /federate pull bioregional-commons
• /federate publish
```

## Pull from Sources

```
/federate pull

🌐 Pulling from Federation Sources
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[1/2] open-protocol-library
├── Checking for updates...
├── Last sync: abc123 (2 hours ago)
├── Current: def456
└── ✅ Already up to date

[2/2] bioregional-commons
├── Checking for updates...
├── Found 3 new items:
│   ├── playbooks/bioregional/watershed-mapping.md
│   ├── playbooks/bioregional/food-forest-design.md
│   └── patterns/mycelial-networks.md
├── Copying to _inbox/federation/
└── ✅ Pulled 3 items

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Summary:
• Sources checked: 2
• New items: 3
• Location: _inbox/federation/

Next: /process to integrate new items
```

## Publish to Outbox

```
/federate publish

📤 Publishing to Federation
━━━━━━━━━━━━━━━━━━━━━━━━━━━

Scanning recent commits...

Found 2 commits since last publish:

[1] abc123: [add] Add food sovereignty pattern
    ├── patterns/food-sovereignty.md ✅
    └── _index/entities.json (skipped - internal)

[2] def456: [update] Update participatory budgeting
    └── patterns/participatory-budgeting.md ✅

Writing to outbox...
✅ Created: _federation/outbox/2026-02-01.json

Notifying subscribers...
✅ Webhook sent to 5 repos

━━━━━━━━━━━━━━━━━━━━━━━━━━━
Published:
• Files: 2
• Commits: 2
• Subscribers notified: 5
```

## Add Source

```
/federate add omniharmonic/new-commons

🌐 Adding Federation Source
━━━━━━━━━━━━━━━━━━━━━━━━━━━

Checking repository...
✅ Repository found: omniharmonic/new-commons
✅ OPAL-compatible (has CLAUDE.md)
✅ Federation enabled (has _federation/)

What content do you want to subscribe to?
  1. All content
  2. Specific patterns (e.g., patterns/*)
  3. Custom filter

Choice: 2

Enter pattern (e.g., patterns/*, protocols/*):
> patterns/governance-*

Auto-merge incoming content? [y/N]
> n

✅ Added source: new-commons
   Pattern: patterns/governance-*
   Auto-merge: No

Run /federate pull new-commons to fetch content.
```

## Attribution

All federated content includes attribution:

```yaml
---
federation:
  source_repo: omniharmonic/open-protocol-library
  source_path: patterns/original-name.md
  source_commit: abc123
  imported: 2026-02-01
  license: CC-BY-SA-4.0
---
```

## Error Handling

```
⚠️ Federation Error

Source: bioregional-commons
Issue: Repository not accessible

Possible causes:
• Repository is private (need access token)
• Repository was deleted or moved
• Network connectivity issue

Actions:
• Check repository URL
• Verify access permissions
• /federate remove bioregional-commons (to remove)
```
