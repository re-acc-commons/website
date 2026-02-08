# /process Command

Process items in the inbox through the knowledge pipeline.

## Usage

```
/process                    # Process all inbox items
/process --dry-run          # Preview what would happen
/process --item <path>      # Process specific item
/process --type transcript  # Process only transcripts
/process --limit 5          # Process up to 5 items
```

---

## EXECUTION INSTRUCTIONS

When this command is invoked, execute these steps IN ORDER using the specified tools.

### Step 1: Load Prerequisites

**Action:** Use Read tool to load required configuration files.

1. Read `_index/entities.json`
   - If file doesn't exist or is empty, create initial structure:
     ```json
     {"version": "1.0", "last_updated": null, "entities": {}, "statistics": {"total_entities": 0, "by_type": {}}}
     ```

2. Read `_index/pipeline-state.json`
   - If file doesn't exist, create initial structure (see EXECUTION.md)

3. Find and read schema:
   - Use Glob to search: `config/settings.yaml`, `.opal/schema.yaml`, `.claude/templates/*/manifest.yaml`
   - Read the first match to get `schema.resource_types` and `schema.dimensions`
   - If no schema found, report error and ask user to run `/setup`

**Output to user:**
```
📚 Loading configuration...
   ✓ Entity index: {N} entities
   ✓ Schema: {schema_name}
```

### Step 2: Scan Inbox

**Action:** Use Glob tool to find all items in `_inbox/`.

1. Use Glob with pattern `_inbox/**/*.md` to find markdown files
2. Use Glob with pattern `_inbox/**/*.pdf` to find PDFs
3. Use Glob with pattern `_inbox/**/*.txt` to find text files
4. Combine results, excluding `.gitkeep` and hidden files
5. Parse any `--type` or `--limit` arguments to filter

**Output to user:**
```
📥 Scanning inbox...
   Found {N} items to process:
   ├── transcripts/: {n} files
   ├── links/: {n} files
   └── documents/: {n} files
```

**If no items found:**
```
📥 Inbox is empty. Add content to _inbox/ or run /sync to pull from sources.
```
Then STOP execution.

### Step 3: Process Each Item

For each item in the inbox, execute steps 3a-3e:

**Output header:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[{index}/{total}] {filename}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### Step 3a: Read and Classify

**Action:** Use Read tool to load the file content.

1. Read the file content
2. Analyze content to determine type:
   - If path contains `transcripts/` OR content has speaker labels (e.g., "**Name:**" or "Speaker 1:") → type: `transcript`
   - If path contains `links/` OR content has `URL:` field → type: `link`
   - If file extension is `.pdf` → type: `document`
   - If content has YAML frontmatter with `type:` field → use that type
   - Otherwise → type: `document`

**Output:**
```
├── Classified: {type} (confidence: {0.8-1.0})
```

#### Step 3b: Preprocess (if needed)

**Action:** Clean up content based on type.

For `transcript` type:
- Remove filler words if excessive ("um", "uh", "like")
- Normalize speaker labels
- If calendar integration is enabled and file has meeting datetime, query calendar context (see meeting-context skill)

For `link` type:
- Extract URL from content
- Note: URL fetching would happen here (currently log for future fetch)

**Output:**
```
├── Preprocessed: {description of changes}
```

#### Step 3c: Extract Entities

**Action:** Analyze content to extract entities using the loaded schema.

This is the core extraction step. Analyze the content and identify:

1. **People**: Names mentioned, speakers in transcripts
2. **Organizations**: Companies, groups, institutions
3. **Patterns**: Reusable solutions, approaches, methods (match against schema.resource_types)
4. **Protocols**: Step-by-step processes
5. **Concepts**: Domain-specific terms from the taxonomy
6. **Relationships**: How entities connect to each other

For each entity, determine:
- `canonical_name`: The proper name
- `type`: From schema.resource_types (pattern, protocol, person, organization, etc.)
- `aliases`: Other names used in the text
- `confidence`: 0.0-1.0 how certain you are
- `context`: Quote from source showing the mention
- `attributes`: Type-specific fields (sectors, scales, roles, etc.)

**Output:**
```
├── Extracted: {N} entities, {M} relationships
```

#### Step 3d: Reconcile Against Index

**Action:** Compare extracted entities to existing index.

For each extracted entity:

1. **Exact match check**: Does canonical_name or any alias match an existing entity?
   - If yes → mark as `update` (add new mention, merge attributes)

2. **Fuzzy match check**: Is any name within Levenshtein distance 3 of existing entity (for names > 8 chars)?
   - If yes → mark as `potential_match` with confidence based on distance

3. **Semantic check**: Does the description/context suggest this is the same as an existing entity?
   - Compare against top 10 closest existing entities by keyword overlap
   - If confidence > 0.8 → mark as `merge`
   - If confidence 0.6-0.8 → mark as `review_needed`

4. **No match**: Mark as `new`

**Output:**
```
├── Reconciled: {N} existing, {M} new, {K} potential merges
```

#### Step 3e: Stage Results

**Action:** Use Write tool to create staging files.

1. Create directory structure if needed:
   - `_staging/new/{type}/` for new entities
   - `_staging/updates/` for updates to existing
   - `_staging/merges/` for merge suggestions

2. For each `new` entity:
   - Generate filename: `{slugified-name}.md`
   - Create markdown file with YAML frontmatter + content
   - Use the template from schema if available
   - Write to `_staging/new/{type}/{filename}.md`

3. For each `update`:
   - Create YAML file describing the changes
   - Write to `_staging/updates/{entity-id}.yaml`

4. For each `merge`:
   - Create YAML file with merge recommendation
   - Write to `_staging/merges/{slugified-name}.yaml`

5. Update `_index/pipeline-state.json`:
   - Add item to `processing.completed`
   - Update `staging.new`, `staging.updates`, `staging.merges` arrays

**Output:**
```
└── ✅ Staged {N} items for review
```

### Step 4: Summary

**Action:** Report processing results.

After all items are processed:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Processed: {N} items
• New entities: {N}
  ├── Patterns: {n}
  ├── People: {n}
  ├── Organizations: {n}
  └── Other: {n}
• Updates to existing: {N}
• Potential merges: {N}

Next: Run /review to review staged changes
```

---

## Dry Run Mode

If `--dry-run` is specified:
- Execute Steps 1-3c (load, scan, classify, extract)
- Do NOT execute Steps 3d-3e (reconcile, stage)
- Report what WOULD be staged without writing files

---

## Error Handling

If any step fails:

1. Report the error clearly:
   ```
   ⚠️ Error processing {filename}
      {error description}
   ```

2. Use AskUserQuestion:
   - Options: "Skip this item and continue", "Retry", "Abort processing"

3. If "Skip": Move file to `_inbox/failed/` with error log, continue to next item
4. If "Retry": Repeat the failed step
5. If "Abort": Stop processing, report partial results

---

## Example Output

```
📚 Processing Inbox
━━━━━━━━━━━━━━━━━━

Loading configuration...
   ✓ Entity index: 7 entities
   ✓ Schema: Open Protocol Library

📥 Scanning inbox...
   Found 3 items to process

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[1/3] transcripts/governance-call-2026-02-01.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
├── Classified: transcript (confidence: 0.95)
├── Preprocessed: normalized speaker labels
├── Extracted: 12 entities, 5 relationships
├── Reconciled: 8 existing, 4 new, 0 merges
└── ✅ Staged 4 items for review

[... more items ...]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Processed: 3 items
• New entities: 9
• Updates to existing: 5
• Potential merges: 1

Next: Run /review to review staged changes
```
