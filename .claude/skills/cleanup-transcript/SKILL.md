# Cleanup Transcript Skill

Preprocesses raw transcripts to fix speech-to-text errors before entity extraction.

## Purpose

Raw transcripts from Otter, Fathom, Read.ai, and other tools contain:
- Misspellings and word substitutions
- Missing punctuation
- Speaker label inconsistencies
- Garbled proper nouns
- Filler words and false starts

This skill cleans the transcript while preserving meaning, attribution, and structure.

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `content` | string | Yes | Raw transcript content |
| `source` | string | No | Transcript source (otter, fathom, readai, meetily) |
| `known_speakers` | array | No | List of expected speaker names |
| `known_terms` | array | No | Domain terms to preserve/correct |
| `entity_hints` | array | No | Entity names from extraction hints |

## Outputs

```yaml
cleaned_transcript:
  content: |
    # Meeting Transcript
    Date: 2026-01-15
    Source: Otter.ai

    ## Speakers
    - Sarah Chen (Facilitator)
    - Marcus Johnson
    - Elena Rodriguez

    ---

    **Sarah Chen:** Welcome everyone to our monthly food council meeting.
    I want to start by discussing our participatory budgeting process...

  metadata:
    original_word_count: 3500
    cleaned_word_count: 3200
    corrections_made: 47
    speakers_identified: 3
    confidence: 0.9

  corrections_log:
    - original: "particapatory"
      corrected: "participatory"
      position: 234
      type: spelling

    - original: "Sarah: ... um, so, like, we need to..."
      corrected: "Sarah: We need to..."
      position: 567
      type: filler_removal

    - original: "the bio regional approach"
      corrected: "the bioregional approach"
      position: 890
      type: term_correction
```

## Cleanup Operations

### 1. Speaker Normalization

```yaml
speaker_rules:
  # Standardize speaker labels
  patterns:
    - match: "Speaker 1:"
      replace: "{identified_speaker}:"

    - match: "\\[([^\\]]+)\\]:"
      replace: "**$1:**"

  # Merge split utterances
  merge:
    - If same speaker, consecutive, no topic change → merge

  # Identify speakers from content
  identification:
    - Look for self-introductions
    - Match against known_speakers list
    - Use context clues (role mentions, etc.)
```

### 2. Text Corrections

```yaml
correction_types:

  spelling:
    # Common speech-to-text errors
    - "particapatory" → "participatory"
    - "govenance" → "governance"
    - "commoning" → "commoning"  # Preserve valid neologisms

  word_substitution:
    # Homophones and mishearings
    - "their's" → "there's" or "theirs" (context-dependent)
    - "bare with me" → "bear with me"

  domain_terms:
    # From known_terms and entity_hints
    - "buy a regional" → "bioregional"
    - "common stack" → "Commons Stack"
    - "d a o" → "DAO"

  punctuation:
    # Add missing punctuation
    - Sentence boundaries
    - Question marks for questions
    - Comma for natural pauses
```

### 3. Filler Removal

```yaml
filler_words:
  always_remove:
    - "um"
    - "uh"
    - "er"
    - "like" (when filler, not comparison)
    - "you know"
    - "I mean"

  conditional_remove:
    - "so" (at sentence start, when not logical connector)
    - "basically" (when not adding meaning)
    - "actually" (when not contrasting)

  preserve:
    - Meaningful hedging ("I think", "perhaps")
    - Quoted speech
    - When removal changes meaning
```

### 4. Structure Enhancement

```yaml
structure:
  # Add markdown headers
  headers:
    - Meeting metadata at top
    - Speaker list
    - Thematic sections (if detectable)

  # Format for readability
  formatting:
    - Speaker labels in bold
    - Paragraphs at natural breaks
    - Timestamps preserved if present

  # Preserve context
  annotations:
    - "[inaudible]" markers kept
    - "[laughter]" and similar kept
    - "[crosstalk]" preserved
```

## LLM Prompt

For intelligent cleanup:

```
You are cleaning a speech-to-text transcript for a knowledge commons.

Original Transcript:
{content}

Known Speakers (if available):
{known_speakers}

Domain Terms to Preserve/Correct:
{known_terms}

Tasks:
1. Fix obvious speech-to-text errors (spelling, word substitutions)
2. Remove filler words (um, uh, like, you know) where they don't add meaning
3. Add punctuation where missing
4. Normalize speaker labels to consistent format
5. Correct domain-specific terms based on context
6. Preserve meaning, attribution, and natural speech patterns

Do NOT:
- Change the meaning of what was said
- Remove meaningful hedging or uncertainty
- Over-formalize casual speech
- Combine separate thoughts inappropriately

Output the cleaned transcript with a log of significant corrections.
```

## LLM Routing

This skill can run on Ollama:

```yaml
llm_preference: ollama.mistral:7b  # Fast, good for cleanup
fallback: claude
```

Transcript cleanup is a simpler task that benefits from speed over deep reasoning.

## Quality Preservation

```yaml
quality_rules:
  # Never change
  preserve_always:
    - Speaker attribution
    - Timestamps
    - Quoted material
    - Proper nouns (after correction)
    - Technical terminology

  # Change with caution
  preserve_unless_clear:
    - Unusual phrasing (may be intentional)
    - Repeated phrases (may be emphasis)
    - Incomplete sentences (may be interruption)

  # Validate changes
  validation:
    - Word count shouldn't decrease by >20%
    - Speaker turns preserved
    - No new information added
```

## Source-Specific Handling

```yaml
source_formats:

  otter:
    speaker_pattern: "[Speaker Name]"
    timestamp_pattern: "\\d{2}:\\d{2}"
    special: Handles automatic speaker identification

  fathom:
    speaker_pattern: "Speaker Name:"
    timestamp_pattern: "\\[\\d{2}:\\d{2}:\\d{2}\\]"
    special: Preserves action items and notes

  readai:
    speaker_pattern: "**Speaker Name**"
    timestamp_pattern: "\\d{1,2}:\\d{2}"
    special: Includes sentiment markers

  meetily:
    speaker_pattern: "Name:"
    timestamp_pattern: None
    special: Local recording, may have audio quality issues
```

## Error Handling

| Error | Action |
|-------|--------|
| Unreadable content | Flag section as [inaudible], continue |
| Speaker not identified | Use "Unknown Speaker" label |
| Conflicting corrections | Preserve original, flag for review |
| Content too garbled | Return original with warning |
