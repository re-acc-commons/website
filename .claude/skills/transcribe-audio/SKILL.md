# Transcribe Audio Skill

Autonomous background transcription using local Whisper models.

## Purpose

Convert audio and video files to text transcripts automatically, running in the background so users don't notice processing time. Supports voice memos, meeting recordings, podcasts, and any audio content.

## Design Philosophy

**Invisible Processing**: Transcription should happen autonomously. Drop files in, get transcripts out. No waiting, no manual triggering.

## When to Use

- Audio file dropped in `_inbox/audio/`
- Voice memo received via Telegram bot
- Video file with extractable audio
- Scheduled recording imports

## Supported Formats

```yaml
audio:
  - mp3
  - m4a
  - wav
  - ogg
  - flac
  - aac
  - wma

video:
  - mp4
  - mov
  - mkv
  - webm
  - avi

voice_memos:
  - iPhone voice memos (m4a)
  - Android recordings (various)
  - Telegram voice messages (ogg)
```

## Whisper Model Selection

### Recommended Models (via openai-whisper Python library)

```yaml
models:
  # Fastest, best quality-speed tradeoff
  turbo:
    size: 809MB
    languages: 99
    quality: excellent
    speed: fast
    use_when: "Default for most content, great balance"
    vram_required: 6GB

  # Best quality
  large-v3:
    size: 2.9GB
    languages: 99
    quality: best
    speed: slow
    use_when: "Final transcription, important content"
    vram_required: 10GB

  # Great balance of quality/speed
  medium:
    size: 1.5GB
    languages: 99
    quality: very_good
    speed: medium
    use_when: "Good quality when turbo unavailable"
    vram_required: 5GB

  # Fast, good for English
  small:
    size: 466MB
    languages: 99
    quality: good
    speed: fast
    use_when: "Quick transcription, shorter files"
    vram_required: 2GB

  # Fastest, acceptable quality
  base:
    size: 142MB
    languages: 99
    quality: acceptable
    speed: fastest
    use_when: "Draft transcription, low resources"
    vram_required: 1GB

  # Tiny, for testing
  tiny:
    size: 39MB
    languages: 99
    quality: basic
    speed: fastest
    use_when: "Testing, very limited resources"
    vram_required: 1GB

default: turbo
```

### Installation

```bash
# Install openai-whisper
pip install openai-whisper

# Install ffmpeg for audio preprocessing
# macOS: brew install ffmpeg
# Ubuntu: apt install ffmpeg
# Windows: choco install ffmpeg

# Optional: Install for GPU acceleration
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
```

## Background Processing Architecture

### Watch Folder

```yaml
watcher:
  directories:
    - _inbox/audio/
    - _inbox/video/
    - _inbox/voice-memos/

  polling_interval: 30s  # Check for new files

  on_new_file:
    - validate_format
    - add_to_queue
    - start_background_job

  file_patterns:
    include: ["*.mp3", "*.m4a", "*.wav", "*.mp4", "*.mov", "*.ogg"]
    exclude: ["*.tmp", "*.partial", ".*"]
```

### Job Queue

```yaml
queue:
  storage: _index/transcription-jobs.json

  job_states:
    - pending: Waiting to process
    - processing: Currently transcribing
    - completed: Done, ready for pipeline
    - failed: Error occurred
    - cancelled: User cancelled

  priorities:
    voice_memo: 1      # Fastest turnaround
    short_audio: 2     # < 10 minutes
    medium_audio: 3    # 10-60 minutes
    long_audio: 4      # > 60 minutes
    video: 5           # Needs audio extraction first

  concurrency:
    max_parallel: 1    # Whisper is resource-intensive
    cpu_threshold: 80  # Pause if CPU > 80%
```

### Processing Pipeline

```yaml
pipeline:
  1_validate:
    - check_file_exists
    - verify_audio_stream
    - estimate_duration
    - select_model_based_on_length

  2_prepare:
    - extract_audio_if_video:
        tool: ffmpeg
        output_format: wav
        sample_rate: 16000  # Whisper optimal
    - split_if_long:
        threshold: 30min
        chunk_size: 25min
        overlap: 30s

  3_transcribe:
    - run_whisper:
        model: <selected>
        language: auto  # Or specified
        task: transcribe
        output: json  # Includes timestamps

  4_postprocess:
    - merge_chunks_if_split
    - format_transcript:
        include_timestamps: true
        speaker_labels: attempt  # Diarization if available
    - save_to_inbox:
        path: _inbox/transcripts/
        format: markdown

  5_cleanup:
    - update_job_status: completed
    - move_original:
        to: _processed/audio/
        keep_days: 30
    - notify_if_enabled
```

## Transcription Output

### Markdown Format

```markdown
---
source_file: meeting-2026-02-01.m4a
duration: 00:45:23
transcribed_at: 2026-02-01T14:30:00Z
model: whisper-medium
language: en
confidence: 0.94
---

# Transcript: meeting-2026-02-01

## [00:00:00] Introduction

Welcome everyone to today's meeting. We're going to discuss the new
community governance proposal.

## [00:02:15] Agenda Review

Let me walk through today's agenda. First, we'll review the proposal
draft. Then we'll discuss implementation timeline...

## [00:05:30] Proposal Discussion

**Speaker 1**: I think the consent-based approach makes sense for our
community size.

**Speaker 2**: Agreed, but we need to consider how to handle urgent
decisions...

[...]
```

### JSON Metadata

```json
{
  "source": {
    "file": "meeting-2026-02-01.m4a",
    "duration_seconds": 2723,
    "size_bytes": 45678901
  },
  "transcription": {
    "model": "whisper-medium",
    "language": "en",
    "confidence": 0.94,
    "started_at": "2026-02-01T14:25:00Z",
    "completed_at": "2026-02-01T14:30:00Z",
    "processing_time_seconds": 300
  },
  "segments": [
    {
      "start": 0.0,
      "end": 5.2,
      "text": "Welcome everyone to today's meeting.",
      "confidence": 0.97
    }
  ]
}
```

## Speaker Diarization

Attempt to identify different speakers:

```yaml
diarization:
  enabled: true
  method: pyannote  # or whisperx

  # If diarization available
  output:
    speakers:
      - id: SPEAKER_00
        label: "Speaker 1"  # Can be renamed later
        speaking_time: 1200s
      - id: SPEAKER_01
        label: "Speaker 2"
        speaking_time: 800s

  # Map to Person entities if possible
  speaker_mapping:
    enabled: true
    match_by: voice_signature  # Future: voice embeddings
    fallback: manual_assignment
```

## Configuration

### In `config/transcription.yaml`

```yaml
# Transcription Configuration
transcription:
  # Whisper backend (openai-whisper Python library)
  backend: openai-whisper

  # OpenAI Whisper settings
  openai_whisper:
    default_model: turbo
    device: auto           # cpu, cuda, or auto
    model_dir: ~/.cache/whisper/
    language: null         # null for auto-detect
    task: transcribe       # transcribe or translate

  # Processing settings
  processing:
    # Auto-select model based on duration
    auto_model_selection:
      enabled: true
      rules:
        - duration_max: 300    # 5 min
          model: small
        - duration_max: 1800   # 30 min
          model: medium
        - duration_max: 7200   # 2 hours
          model: turbo
        - duration_min: 7200
          model: turbo

    # Resource management
    resources:
      max_cpu_percent: 70
      pause_on_battery: true
      quiet_hours:
        enabled: false
        start: "23:00"
        end: "07:00"

  # Output settings
  output:
    format: markdown
    include_timestamps: true
    timestamp_interval: paragraph  # or sentence, word
    include_confidence: false
    speaker_labels: false  # requires pyannote

  # Cleanup
  cleanup:
    archive_originals: true
    archive_path: _processed/audio/
    retention_days: 30
```

## Integration with Pipeline

### Automatic Flow

```yaml
flow:
  1. File arrives in _inbox/audio/
  2. Background watcher detects file
  3. Job added to queue
  4. Whisper processes (user doesn't wait)
  5. Transcript saved to _inbox/transcripts/
  6. Transcript enters normal pipeline:
     - CLASSIFY → PREPROCESS → EXTRACT → ...
  7. User notified only when entities are staged
```

### Manual Trigger

```bash
# Force immediate transcription
/ingest audio /path/to/recording.m4a --priority high

# Check transcription status
/status transcription

# List pending jobs
/status transcription --pending
```

## Telegram Integration

For voice memo capture:

```yaml
telegram_bot:
  on_voice_message:
    - download_to: _inbox/voice-memos/
    - filename: "voice-{user}-{timestamp}.ogg"
    - add_to_queue:
        priority: 1  # Voice memos are urgent
    - reply: "🎙️ Got it! I'll transcribe this in the background."

  on_transcription_complete:
    - reply: |
        ✅ Transcription complete!
        Found {entity_count} potential entities.
        Use /review to see staged items.
```

## Error Handling

```yaml
errors:
  audio_corrupt:
    action: skip
    notify: true
    message: "Could not read audio file: {filename}"

  whisper_failed:
    action: retry
    max_attempts: 3
    backoff: exponential
    fallback: smaller_model

  out_of_memory:
    action: retry_with_smaller_model
    models: [medium, small, base]

  gpu_unavailable:
    action: use_cpu
    warn: "Transcription will be slower without GPU"
```

## Performance Optimization

```yaml
optimization:
  # Use GPU when available
  gpu:
    prefer: true
    fallback_to_cpu: true

  # Process in chunks for long audio
  chunking:
    enabled: true
    chunk_duration: 1500  # 25 minutes
    overlap: 30  # seconds

  # Cache model in memory
  model_caching:
    keep_loaded: true
    unload_after: 300  # seconds of inactivity

  # Parallel processing (for multiple files)
  parallelism:
    max_concurrent: 1  # Memory-limited
    queue_strategy: priority
```

## Status Reporting

```yaml
status:
  command: "/status transcription"

  output: |
    ## Transcription Status

    **Queue**: {pending_count} pending, {processing_count} processing
    **Completed today**: {completed_count}

    ### Currently Processing
    - {current_file} ({progress}%, ETA: {eta})

    ### Recent Completions
    - {file1} → {transcript1} ({duration1})
    - {file2} → {transcript2} ({duration2})

    ### Pending
    1. {pending1} (priority: {priority1})
    2. {pending2} (priority: {priority2})
```

## Resource Usage

Typical processing times (medium model, CPU):

| Duration | Processing Time | RAM Usage |
|----------|-----------------|-----------|
| 5 min    | ~1 min          | 3 GB      |
| 30 min   | ~6 min          | 3 GB      |
| 1 hour   | ~12 min         | 3 GB      |
| 2 hours  | ~25 min         | 3 GB      |

With GPU (RTX 3080 or better):

| Duration | Processing Time | VRAM Usage |
|----------|-----------------|------------|
| 5 min    | ~10 sec         | 5 GB       |
| 30 min   | ~1 min          | 5 GB       |
| 1 hour   | ~2 min          | 5 GB       |
| 2 hours  | ~4 min          | 5 GB       |
