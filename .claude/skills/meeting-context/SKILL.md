# Meeting Context Skill

Enrich meeting transcripts with context from Google Calendar before entity extraction.

## Purpose

When processing meeting transcripts, we often know *when* the meeting happened but not *who* was in it. Speaker labels like "Speaker 1" or partial names ("Sarah") are hard to match to entities.

This skill bridges that gap by:
1. **Detecting meeting time** from transcript metadata or content
2. **Querying Google Calendar** for events at that time
3. **Returning attendee list** for use during cleanup and extraction
4. **Storing event ID** for later writeback of meeting notes

## Why This Matters

```
Without calendar context:
  Transcript says: "Speaker 1: I think we should..."
  Extraction: Creates "Speaker 1" as unknown person

With calendar context:
  Calendar shows: Meeting "Team Standup" with [Alice Smith, Bob Jones, Carol White]
  Transcript says: "Speaker 1: I think we should..."
  Extraction: Matches to "Alice Smith" (first speaker) or prompts for disambiguation
```

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `content` | string | Yes | Transcript content (used to extract time if not in metadata) |
| `metadata` | object | No | Transcript metadata including potential datetime |
| `source` | string | No | Source system (meetily, otter, fathom, etc.) |
| `filename` | string | No | Original filename (often contains date) |
| `time_window_minutes` | number | No | How much time variance to allow (default: 30) |

## Outputs

```yaml
meeting_context:
  # Calendar event found
  event_found: true
  event_id: "abc123xyz"
  event_title: "Team Standup"
  event_time: "2026-02-02T09:00:00-08:00"
  event_duration_minutes: 30

  # Attendees for entity extraction
  attendees:
    - name: "Alice Smith"
      email: "alice@example.com"
      response_status: "accepted"
      organizer: true
    - name: "Bob Jones"
      email: "bob@example.com"
      response_status: "accepted"
    - name: "Carol White"
      email: "carol@example.com"
      response_status: "tentative"

  # Simplified list for speaker matching
  attendee_names:
    - "Alice Smith"
    - "Bob Jones"
    - "Carol White"

  # For entity extraction hints
  attendee_entities:
    - canonical_name: "Alice Smith"
      type: person
      email: "alice@example.com"
      aliases: ["Alice", "A. Smith"]

  # Calendar metadata for writeback
  calendar_info:
    calendar_id: "primary"
    can_edit: true
    has_description: false

  # Confidence in match
  confidence: 0.95
  match_reason: "Exact time match within 5 minutes"
```

## Time Detection

The skill extracts meeting time from multiple sources (in priority order):

### 1. Explicit Metadata

```yaml
# From transcript YAML frontmatter
---
meeting_date: 2026-02-02
meeting_time: "09:00"
timezone: America/Los_Angeles
---
```

### 2. Filename Patterns

```yaml
filename_patterns:
  # ISO date
  - pattern: "\\d{4}-\\d{2}-\\d{2}"
    example: "2026-02-02-standup.md"

  # US date
  - pattern: "(\\d{1,2})-(\\d{1,2})-(\\d{4})"
    example: "02-02-2026-meeting.md"

  # Natural date
  - pattern: "(jan|feb|mar|...)-\\d{1,2}-\\d{4}"
    example: "feb-2-2026-planning.md"

  # Meetily format
  - pattern: "meeting_(\\d+)"
    example: "meeting_1706886000.md"  # Unix timestamp
```

### 3. Content Analysis

```yaml
content_patterns:
  # Meeting header
  - pattern: "Date:\\s*(.+)"
    example: "Date: February 2, 2026"

  # Otter format
  - pattern: "\\[Recording started (.+)\\]"
    example: "[Recording started at 9:00 AM]"

  # Fathom format
  - pattern: "Meeting recorded on (.+)"

  # Natural mention
  - pattern: "today's (\\w+) meeting"
    context: Use transcript file modified date
```

### 4. File System

```yaml
fallback:
  # Use file creation/modification time
  prefer: creation_time
  adjust: -30 minutes  # Transcript usually created after meeting
```

## Calendar Query Strategy

```yaml
query_strategy:
  # 1. Exact time match
  - Look for events starting within time_window_minutes of detected time

  # 2. Title matching (if multiple candidates)
  - Match transcript title/filename against event titles
  - Example: "standup" in filename → prefer "Team Standup" event

  # 3. Duration matching
  - Prefer events with duration close to transcript length
  - 30 min transcript → prefer 30 min meeting over all-day event

  # 4. Recurrence handling
  - Match against recurring meeting instances
  - Use exact date, not series
```

## Speaker Matching

When attendees are found, the skill helps match speakers:

```yaml
speaker_matching:
  # Prepare variations for each attendee
  variations:
    "Alice Smith":
      - "Alice Smith"      # Full name
      - "Alice"            # First name
      - "A. Smith"         # Initial + last
      - "Smith"            # Last name only
      - "alice@example.com"  # Email (sometimes in transcripts)

  # For transcript cleanup
  speaker_hints:
    - If transcript has "Alice:" → match to "Alice Smith"
    - If transcript has "Speaker 1" + context mentions "Alice" → suggest match

  # For entity extraction
  entity_context: |
    The following people were confirmed attendees of this meeting:
    - Alice Smith (alice@example.com) - Organizer
    - Bob Jones (bob@example.com)
    - Carol White (carol@example.com)

    When you see speaker labels or names mentioned, try to match them
    to these attendees. "Speaker 1" is likely the organizer (Alice Smith)
    unless context suggests otherwise.
```

## Integration with Pipeline

This skill is called during the PREPROCESS stage:

```
CLASSIFY → [MEETING_CONTEXT] → CLEANUP → EXTRACT → RECONCILE → STAGE
              ↓
         Query calendar
              ↓
         Inject attendees into:
         - cleanup-transcript (known_speakers)
         - extract-entities (source_metadata.attendees)
         - Store event_id for writeback
```

### Pipeline Modifications

```yaml
# In process pipeline
preprocess:
  transcript:
    steps:
      # NEW: Get calendar context first
      - skill: meeting-context
        if: google_calendar.enabled
        outputs:
          - attendees → known_speakers
          - event_id → metadata.calendar_event_id
          - event_title → metadata.calendar_event_title

      # Then cleanup with speaker info
      - skill: cleanup-transcript
        inputs:
          known_speakers: "{attendees}"

      # Then extract with full context
      - skill: extract-entities
        inputs:
          source_metadata:
            attendees: "{attendees}"
            calendar_event: "{event_id}"
```

## Google Calendar MCP Integration

This skill requires the Google Calendar MCP server:

```yaml
# config/integrations.yaml
google_calendar:
  enabled: true
  mcp_server: google-calendar

  # Or direct API configuration
  api:
    credentials_env: GOOGLE_CALENDAR_CREDENTIALS
    token_env: GOOGLE_CALENDAR_TOKEN

  # Calendar selection
  calendars:
    - primary
    - work@example.com
    # Search all calendars user has access to

  # Privacy settings
  privacy:
    # Only fetch attendee names, not emails
    include_emails: true
    # Don't fetch from personal calendars
    exclude_calendars: ["personal", "family"]
```

## MCP Tool Calls

The skill uses these MCP tools:

```yaml
mcp_tools:
  # Search for events at specific time
  - tool: calendar.events.list
    params:
      timeMin: "{detected_time - window}"
      timeMax: "{detected_time + window}"
      singleEvents: true
      maxResults: 10

  # Get event details including attendees
  - tool: calendar.events.get
    params:
      eventId: "{matched_event_id}"

  # Check write permissions for later writeback
  - tool: calendar.acl.list
    params:
      calendarId: "{calendar_id}"
```

## Error Handling

| Scenario | Action |
|----------|--------|
| No calendar configured | Skip skill, continue without attendees |
| Time not detected | Try file timestamp, then skip |
| No matching event | Log info, continue without attendees |
| Multiple matching events | Pick best match, log alternatives |
| MCP server unavailable | Log warning, continue without |
| Auth expired | Prompt user to re-auth, continue without |
| Private event (no attendee access) | Use event title only |

## Output to Downstream Skills

### To cleanup-transcript

```yaml
# Injected as known_speakers parameter
known_speakers:
  - name: "Alice Smith"
    role: "Organizer"
  - name: "Bob Jones"
  - name: "Carol White"
```

### To extract-entities

```yaml
# Injected into source_metadata
source_metadata:
  meeting_title: "Team Standup"
  meeting_date: "2026-02-02"
  meeting_duration: 30
  attendees:
    - canonical_name: "Alice Smith"
      type: person
      email: "alice@example.com"
      roles: ["organizer"]
    - canonical_name: "Bob Jones"
      type: person
      email: "bob@example.com"
  calendar_event_id: "abc123xyz"

  # Extraction prompt addition
  attendee_context: |
    CONFIRMED MEETING ATTENDEES:
    The following people were calendar invitees for this meeting.
    When extracting person entities, prefer matching to these names:
    - Alice Smith (organizer)
    - Bob Jones
    - Carol White
```

### To metadata storage

```yaml
# Stored with processed transcript for writeback
_processing_metadata:
  calendar:
    event_id: "abc123xyz"
    event_title: "Team Standup"
    calendar_id: "primary"
    can_edit: true
```

## Confidence Scoring

```yaml
confidence_factors:
  time_match:
    exact: 1.0          # Within 5 minutes
    close: 0.8          # Within 15 minutes
    approximate: 0.5    # Within 30 minutes
    weak: 0.3           # Within 60 minutes

  title_match:
    exact: 1.0          # "standup" file → "Standup" event
    partial: 0.7        # Words overlap
    none: 0.5           # No title info

  duration_match:
    close: 1.0          # Within 10% of transcript length
    different: 0.8      # Different but plausible
    mismatch: 0.5       # Very different durations

  combined:
    formula: "time_match * 0.6 + title_match * 0.25 + duration_match * 0.15"
    threshold: 0.6      # Minimum to use match
```

## Usage Example

```
/process transcripts/team-standup-2026-02-02.md

📚 Processing: team-standup-2026-02-02.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[CLASSIFY] Transcript (confidence: 0.95)

[MEETING_CONTEXT]
├── Detected time: 2026-02-02 09:00 AM
├── Calendar query: Found 1 matching event
├── Event: "Team Standup" (9:00 AM - 9:30 AM)
├── Attendees: Alice Smith, Bob Jones, Carol White
└── ✅ Calendar context enriched

[CLEANUP]
├── Using known speakers: Alice Smith, Bob Jones, Carol White
├── Matched "Speaker 1" → "Alice Smith" (organizer)
├── Matched "Speaker 2" → "Bob Jones"
└── ✅ Cleaned with speaker names

[EXTRACT]
├── Context: Meeting with 3 confirmed attendees
├── Found entities: 8
├── Person matches: Alice Smith ✓, Bob Jones ✓, Carol White ✓
└── ✅ Extracted with attendee context

... continue to RECONCILE, STAGE ...

📝 After review, meeting notes will be written back to calendar event.
```
