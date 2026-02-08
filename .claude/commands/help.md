# /help Command

Contextual help and guidance for OPAL.

## Usage

```
/help                      # General overview
/help <command>            # Help for specific command
/help <topic>              # Help for topic
/help tutorial             # Interactive tutorial
```

## General Help

```
/help

📚 OPAL Help
━━━━━━━━━━━━

OPAL is your Open Protocol Agent Librarian.
I help you manage knowledge commons with AI-powered extraction and democratic governance.

Quick Start:
1. /setup     - Configure OPAL for your repo
2. /ingest    - Add content to process
3. /process   - Extract entities and generate pages
4. /review    - Review and approve changes
5. /github    - Manage PRs and voting

Common Commands:
┌─────────────────┬────────────────────────────────────┐
│ Command         │ Purpose                            │
├─────────────────┼────────────────────────────────────┤
│ /status         │ See current state                  │
│ /process        │ Process inbox items                │
│ /ingest <src>   │ Add content from source            │
│ /review         │ Review staged changes              │
│ /github         │ GitHub PR management               │
│ /federate       │ Federation operations              │
│ /setup          │ Configuration wizard               │
└─────────────────┴────────────────────────────────────┘

Get help on any command: /help <command>

Topics:
• /help pipeline    - How the processing pipeline works
• /help extraction  - How entity extraction works
• /help voting      - How democratic governance works
• /help federation  - How federation works
• /help taxonomy    - Understanding the taxonomy
• /help tutorial    - Interactive walkthrough
```

## Command Help

```
/help process

📖 /process Command
━━━━━━━━━━━━━━━━━━━

Purpose: Process items in the inbox through the knowledge pipeline.

Usage:
  /process                    # Process all inbox items
  /process --dry-run          # Preview what would happen
  /process --item <path>      # Process specific item
  /process --type transcript  # Process only transcripts
  /process --limit 5          # Process up to 5 items

Pipeline stages:
  INBOX → CLASSIFY → PREPROCESS → EXTRACT → RECONCILE → STAGE

After processing, run /review to approve changes.

Examples:
  /process                    # Process everything
  /process --dry-run          # See what would happen
  /process --type transcript  # Just transcripts

Related: /ingest, /review, /status
```

## Topic Help

```
/help voting

🗳️ Democratic Voting in OPAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

In commons mode, changes require community approval.

How it works:
1. Changes are committed to a branch
2. A PR is created for review
3. Contributors vote (approve/reject)
4. 3+ approvals → can merge
5. Any rejection → blocks until resolved

Voting commands:
  /github pr list           # See pending PRs
  /github vote 42 approve   # Approve PR #42
  /github vote 42 reject    # Reject PR #42
  /github merge 42          # Merge approved PR

Rules (from config/governance.yaml):
  • Required approvals: 3
  • Voting period: 72 hours
  • Minimum open: 24 hours
  • Rejections block

Who can vote:
  Anyone with GitHub push access to the repo.
  Authors cannot vote on their own PRs.
```

## Interactive Tutorial

```
/help tutorial

📚 OPAL Tutorial
━━━━━━━━━━━━━━━━

Let's walk through using OPAL step by step.

Choose a tutorial:
  1. Getting Started (5 min)
     Set up OPAL and process your first item

  2. Processing Transcripts (10 min)
     Ingest and extract from meeting transcripts

  3. Entity Management (10 min)
     Understanding extraction and deduplication

  4. GitHub Workflow (10 min)
     PRs, voting, and collaborative governance

  5. Federation (15 min)
     Connecting with other knowledge commons

Enter a number (or 'q' to quit):
> 1

━━━━━━━━━━━━━━━━
Getting Started
━━━━━━━━━━━━━━━━

Step 1 of 5: Check Status

First, let's see where we are.
Run: /status

[Waiting for you to run the command...]
```

## Contextual Help

OPAL provides contextual suggestions:

```
# After an error
❌ Processing failed: No taxonomy loaded

💡 Hint: Run /setup to configure your taxonomy,
   or check that taxonomy/ directory has a .yaml file.

   /help taxonomy for more info
```

```
# After completing a task
✅ Processed 3 items

💡 Next steps:
   • /review - Review the 5 staged items
   • /status - See full pipeline state

   /help review for more info
```
