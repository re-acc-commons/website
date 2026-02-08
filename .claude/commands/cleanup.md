# /cleanup Command

Clean up the inbox after content has been processed and committed.

## Usage

```
/cleanup                    # Interactive cleanup with prompts
/cleanup --auto             # Auto-cleanup based on rules
/cleanup --dry-run          # Preview what would be cleaned
/cleanup --status           # Show cleanup candidates
/cleanup --keep-days 7      # Override retention period
```

## What Gets Cleaned

### Automatic Cleanup (after commit)

| Content Type | Cleanup Rule | Condition |
|--------------|--------------|-----------|
| **Audio/Video** | Delete immediately | After transcript confirmed in staging |
| **Transcripts** | Archive after 30 days | After entities committed |
| **Links** | Archive after 14 days | After entities committed |
| **Documents** | Keep indefinitely | Manual cleanup only |
| **Federation** | Archive after 7 days | After processed |

### Cleanup Conditions

Content is eligible for cleanup when:
1. It has been fully processed (status: `staged` or `committed`)
2. All extracted entities have been reviewed
3. The commit containing the entities has been pushed
4. The retention period has passed

## Example: Interactive Cleanup

```
/cleanup

Inbox Cleanup

Scanning inbox for cleanup candidates...

┌──────────────────────────────────────────────────────────────────────┐
│ AUDIO/VIDEO FILES - Recommended for immediate deletion               │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ These files have confirmed transcripts and can be safely deleted:    │
│                                                                      │
│ [1] audio.mp4 (156 MB)                                              │
│     ├── Transcribed: 2026-02-02T14:35:00Z                           │
│     ├── Transcript: audio-meeting-transcript.md ✅                   │
│     ├── Entities extracted: 8                                        │
│     └── Status: staged (awaiting review)                             │
│                                                                      │
│ [2] team-meeting.m4a (89 MB)                                        │
│     ├── Transcribed: 2026-01-28T10:00:00Z                           │
│     ├── Transcript: team-meeting-transcript.md ✅                    │
│     ├── Entities committed: commit abc123                            │
│     └── Status: committed                                            │
│                                                                      │
│ Total: 245 MB                                                        │
│                                                                      │
│ Delete these audio files? [y/N/select]                               │
└──────────────────────────────────────────────────────────────────────┘

> y

✅ Deleted: audio.mp4 (156 MB)
✅ Deleted: team-meeting.m4a (89 MB)

Freed: 245 MB

┌──────────────────────────────────────────────────────────────────────┐
│ TRANSCRIPTS - Archive candidates (>30 days since commit)             │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ [1] _inbox/transcripts/old-meeting-2025-12-15.md                    │
│     └── Committed: 48 days ago                                       │
│                                                                      │
│ Archive to _archive/transcripts/? [y/N]                              │
└──────────────────────────────────────────────────────────────────────┘

> y

✅ Archived: 1 transcript to _archive/transcripts/

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Cleanup Summary:
• Deleted: 2 audio files (245 MB)
• Archived: 1 transcript
• Skipped: 3 items (not yet committed)
```

## Example: Auto Cleanup

```
/cleanup --auto

Auto Cleanup (using configured rules)

Rules applied:
├── Audio/video: Delete after transcript confirmed
├── Transcripts: Archive after 30 days
├── Links: Archive after 14 days
└── Failed items: Keep for 7 days

Processing...

✅ Deleted: 2 audio files (245 MB)
✅ Archived: 3 transcripts to _archive/
✅ Archived: 5 links to _archive/
✅ Deleted: 2 failed items (errors > 7 days old)

Summary:
• Space freed: 245 MB
• Items archived: 8
• Items deleted: 4
```

## Example: Dry Run

```
/cleanup --dry-run

Cleanup Preview (Dry Run)

Would delete (audio/video with confirmed transcripts):
├── audio.mp4 (156 MB) → transcript confirmed
└── team-meeting.m4a (89 MB) → entities committed

Would archive (past retention):
├── _inbox/transcripts/meeting-2025-12-15.md (48 days)
├── _inbox/transcripts/call-2025-12-20.md (43 days)
└── _inbox/links/telegram/msg-12345.md (21 days)

Would keep (not ready):
├── _inbox/transcripts/recent-call.md (staged, not committed)
└── _inbox/documents/paper.pdf (manual cleanup only)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Summary:
• Would delete: 245 MB
• Would archive: 3 items
• Keeping: 2 items

Run without --dry-run to execute.
```

## Cleanup Rules Configuration

Configure in `config/settings.yaml`:

```yaml
cleanup:
  # Automatic cleanup after commit
  auto_cleanup_after_commit: false  # Set true for hands-off operation

  # Retention periods (days)
  retention:
    audio_video: 0          # Delete immediately after transcript confirmed
    transcripts: 30         # Archive after 30 days
    links: 14               # Archive after 14 days
    documents: -1           # Never auto-cleanup (-1)
    failed: 7               # Delete failed items after 7 days
    federation: 7           # Archive federation items after 7 days

  # Archive settings
  archive:
    enabled: true
    directory: _archive
    compress: false         # Compress archived items

  # Safety settings
  require_commit: true      # Only cleanup after entities committed
  require_push: true        # Only cleanup after push to remote
  confirm_delete: true      # Always prompt for deletions
```

## Archive Structure

Cleaned items are moved to `_archive/`:

```
_archive/
├── transcripts/
│   └── 2025-12/
│       └── meeting-2025-12-15.md
├── links/
│   └── 2026-01/
│       └── telegram/
│           └── msg-12345.md
└── cleanup-log.json        # Record of all cleanup actions
```

## Cleanup Log

All cleanup actions are logged:

```json
{
  "version": "1.0.0",
  "actions": [
    {
      "timestamp": "2026-02-02T16:00:00Z",
      "action": "delete",
      "type": "audio",
      "path": "_inbox/audio.mp4",
      "size_bytes": 163577856,
      "reason": "transcript_confirmed",
      "transcript_path": "_inbox/transcripts/audio-meeting-transcript.md"
    },
    {
      "timestamp": "2026-02-02T16:00:00Z",
      "action": "archive",
      "type": "transcript",
      "path": "_inbox/transcripts/meeting-2025-12-15.md",
      "archive_path": "_archive/transcripts/2025-12/meeting-2025-12-15.md",
      "reason": "retention_period_exceeded",
      "days_old": 48
    }
  ]
}
```

## Safety Features

1. **Never deletes uncommitted work**: Audio files are only deleted after transcript is confirmed
2. **Archive before delete**: Transcripts and links are archived, not deleted
3. **Commit verification**: Checks that entities were actually committed
4. **Push verification**: Optional check that changes were pushed to remote
5. **Dry run**: Always preview with `--dry-run` first
6. **Cleanup log**: Full audit trail of all actions

## Audio File Handling

Audio and video files receive special handling:

```
Audio Processing Flow:

1. Audio added to _inbox/
   └── audio.mp4 (156 MB)

2. /process transcribes with Whisper
   ├── Creates: _inbox/transcripts/audio-meeting-transcript.md
   └── Updates: pipeline-state.json (transcript_confirmed: true)

3. /cleanup detects confirmed transcript
   ├── Verifies transcript exists and is valid
   ├── Checks transcript has content (not empty/failed)
   └── Offers to delete audio file

4. After deletion
   ├── Audio file removed
   ├── Transcript preserved
   └── Cleanup logged
```

## Integration with Pipeline

The cleanup system integrates with the processing pipeline:

```
/sync → /process → /review → /commit → /cleanup
                                           │
                     ┌─────────────────────┘
                     ▼
              Checks pipeline-state.json
              for processing status
```

## Related Commands

- `/status inbox` - View inbox contents
- `/process` - Process inbox items
- `/commit` - Commit approved changes
