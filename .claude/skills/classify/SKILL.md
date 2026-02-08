# Classify Skill

Determines the type and initial categorization of incoming content.

## Purpose

When content enters the inbox, this skill analyzes it to determine:
1. **Content Type**: transcript, document, link, audio, image, etc.
2. **Resource Type**: What kind of knowledge resource this might become (based on loaded taxonomy)
3. **Initial Sectors**: Suggested classification dimensions
4. **Processing Route**: Which preprocessing skill to invoke next

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `content` | string | Yes | The raw content or file path to classify |
| `filename` | string | No | Original filename if available |
| `source` | string | No | Where this came from (otter, fathom, telegram, manual) |
| `taxonomy` | object | Yes | Loaded taxonomy definition |

## Outputs

```yaml
classification:
  content_type: transcript | document | link | audio | image | unknown
  resource_type_suggestion: pattern | protocol | playbook | artifact | ...
  confidence: 0.0-1.0
  sectors: [sector-id, sector-id]
  scales: [scale-id]
  next_skill: cleanup-transcript | convert-pdf | fetch-content | extract-entities
  metadata:
    word_count: 1234
    language: en
    has_speakers: true | false
    mentioned_entities: [entity hints from quick scan]
```

## Classification Logic

### Content Type Detection

```
1. Check file extension if filename provided:
   - .md, .txt → document
   - .pdf → pdf_document
   - .mp3, .wav, .m4a → audio
   - .png, .jpg → image
   - URL patterns → link

2. If no extension, analyze content:
   - Contains speaker labels (Name:, [Speaker]) → transcript
   - Contains markdown headers → document
   - Starts with http/https → link
   - Binary content → unknown

3. Check source hints:
   - otter, fathom, readai → transcript
   - telegram → link or clipping
```

### Resource Type Suggestion

Uses the loaded taxonomy to suggest what kind of resource this content might become:

```
1. Load taxonomy resource_types
2. For each type, check description and keywords against content
3. Look for structural signals:
   - Step-by-step instructions → protocol
   - Problem/solution structure → pattern
   - How-to narrative → playbook
   - External reference → artifact
   - Concept definition → primitive
4. Return highest confidence match
```

### Sector Classification

Quick keyword scan against taxonomy civic_sectors:

```
1. Extract keywords from content (first 500 words)
2. Match against sector keywords from taxonomy
3. Return top 3 matching sectors with confidence scores
```

## Example Usage

```yaml
# Input
content: |
  Meeting Transcript - Bioregional Food Council
  Date: 2026-01-15

  Sarah: Welcome everyone to our monthly food council meeting...

filename: food-council-jan-2026.md
source: otter
taxonomy: [loaded OPL taxonomy]

# Output
classification:
  content_type: transcript
  resource_type_suggestion: protocol
  confidence: 0.7
  sectors:
    - id: environmental-sustainability
      confidence: 0.8
    - id: economic-resource-sharing
      confidence: 0.6
  scales:
    - id: bioregional
      confidence: 0.9
  next_skill: cleanup-transcript
  metadata:
    word_count: 3421
    language: en
    has_speakers: true
    mentioned_entities:
      - "Sarah"
      - "Bioregional Food Council"
      - "food sovereignty"
```

## LLM Routing

This skill can run on Ollama for cost savings:

```yaml
llm_preference: ollama.llama3.2:7b
fallback: claude
```

The classification task is relatively simple and benefits more from speed than deep reasoning.

## Error Handling

| Error | Action |
|-------|--------|
| Empty content | Return `content_type: unknown`, flag for review |
| Binary/unreadable | Return `content_type: unknown`, suggest manual classification |
| No taxonomy loaded | Use generic classification without resource type suggestion |
| LLM timeout | Fallback to rule-based classification only |
