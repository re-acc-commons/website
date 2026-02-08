# Generate Wiki Skill

Creates structured wiki pages for entities using templates and extracted context.

## Purpose

After reconciliation identifies new entities that need pages, this skill:
1. Selects the appropriate template based on entity type
2. Populates the template with extracted information
3. Generates meaningful content and cross-references
4. Creates the markdown file in the staging area

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `entity` | object | Yes | Entity to generate page for |
| `extraction_context` | object | Yes | Full extraction with context |
| `taxonomy` | object | Yes | Loaded taxonomy |
| `template_path` | string | No | Override template selection |
| `related_entities` | array | No | Entities to cross-reference |

## Outputs

```yaml
generated_page:
  file_path: _staging/new/patterns/food-sovereignty.md
  content: |
    ---
    type: pattern
    name: Food Sovereignty
    aliases: [food autonomy, community food control]
    ...
    ---
    # Food Sovereignty
    ...

  metadata:
    template_used: _templates/pattern.md
    word_count: 450
    cross_references: 5
    auto_generated_sections: [description, related-patterns]
    needs_review_sections: [implementation-examples]

  quality:
    completeness: 0.7  # How much of template is filled
    confidence: 0.8    # Confidence in generated content
    sources_cited: 2
```

## Template System

### Template Structure

Each template in `_templates/` follows this structure:

```markdown
---
type: {{type}}
name: {{name}}
aliases: {{aliases}}
short_description: {{short_description}}
civic_sectors: {{sectors}}
civic_scales: {{scales}}
related_patterns: {{related_patterns}}
related_protocols: {{related_protocols}}
created: {{created}}
updated: {{updated}}
status: draft
moderated: false
---

# {{name}}

{{short_description}}

## Description

{{description}}

## Key Principles

{{principles}}

## Related Patterns

{{related_patterns_list}}

## Implementation Examples

{{examples}}

## Sources

{{sources}}
```

### Template Variables

| Variable | Source | Fallback |
|----------|--------|----------|
| `{{name}}` | entity.canonical_name | Required |
| `{{aliases}}` | entity.aliases | [] |
| `{{short_description}}` | LLM-generated from context | "[Description needed]" |
| `{{description}}` | LLM-generated from context | "[Expand description]" |
| `{{sectors}}` | extraction.sectors | [] |
| `{{scales}}` | extraction.scales | [] |
| `{{related_*}}` | reconciliation.relationships | [] |
| `{{examples}}` | LLM-generated if evidence exists | "[Add examples]" |
| `{{sources}}` | extraction.source_metadata | [] |

## Content Generation

### Short Description

Prompt:
```
Based on the following context about "{entity.name}", write a 1-2 sentence
description (max 200 characters) that captures the essence of this concept:

Context:
{mentions and surrounding text from extraction}

Write in active voice, present tense. Focus on what this IS and what it DOES.
```

### Full Description

Prompt:
```
Based on the following context, write a 2-3 paragraph description of
"{entity.name}" for a knowledge commons wiki:

Context:
{all mentions and context from extraction}

Related concepts already in the knowledge base:
{related entities with their descriptions}

Guidelines:
- Write for practitioners who want to understand and apply this concept
- Reference related concepts using [[wiki links]]
- Be precise and actionable
- Cite sources where information comes from
```

### Cross-References

Automatically generate wiki links:

```python
for related_entity in related_entities:
    # Find mentions in generated content
    content = content.replace(
        related_entity.canonical_name,
        f"[[{related_entity.file_path}|{related_entity.canonical_name}]]"
    )

    # Also check aliases
    for alias in related_entity.aliases:
        if alias in content:
            content = content.replace(
                alias,
                f"[[{related_entity.file_path}|{alias}]]"
            )
```

## File Naming

Generate slug from canonical name:

```python
def generate_slug(name):
    slug = name.lower()
    slug = re.sub(r'[^a-z0-9]+', '-', slug)  # Replace non-alphanumeric
    slug = slug.strip('-')  # Remove leading/trailing dashes
    return slug

# "Participatory Budgeting" → "participatory-budgeting"
# "Community Resource Allocation (CRA)" → "community-resource-allocation-cra"
```

## Quality Assessment

The skill evaluates generated content:

```yaml
quality_checks:
  - name: completeness
    check: Count filled vs total template sections
    threshold: 0.5  # At least half should be filled

  - name: description_length
    check: Description > 100 characters
    threshold: true

  - name: cross_references
    check: At least one [[wiki link]] present
    threshold: 1

  - name: sources_cited
    check: Sources section populated
    threshold: 1

  - name: no_placeholders
    check: No "[Description needed]" style text remains
    threshold: true
```

Pages failing quality checks are flagged for human review.

## LLM Routing

```yaml
llm_preference: claude  # Best quality for content generation
fallback: ollama.llama3.2:70b
```

## Output Location

Generated pages go to staging:

```
_staging/
├── new/
│   ├── patterns/
│   │   └── food-sovereignty.md
│   ├── protocols/
│   │   └── food-council-decision-protocol.md
│   └── people/
│       └── sarah-chen.md
```

After review and approval, they're moved to the main knowledge directories.

## Incremental Generation

For updates to existing entities:

```yaml
update_mode:
  # Don't overwrite existing content
  preserve:
    - description (if already written)
    - examples (user-added content)
    - custom sections

  # Always update
  refresh:
    - aliases (merge with existing)
    - related entities (add new ones)
    - sources (add new mentions)
    - updated timestamp

  # Generate only if missing
  fill_gaps:
    - short_description
    - sectors
    - scales
```

## Error Handling

| Error | Action |
|-------|--------|
| Template not found | Use generic template |
| LLM generation fails | Create stub page with metadata only |
| Slug collision | Append numeric suffix (entity-name-2) |
| Cross-reference to missing entity | Create as plain text, log for later |
