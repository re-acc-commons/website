# /review Command

Review and approve staged changes before committing to the knowledge base.

## Usage

```
/review                    # Interactive review session
/review --list             # List staged items without reviewing
/review --item <path>      # Review specific item
/review --accept-all       # Accept all (REQUIRES CONFIRMATION)
/review --type new         # Review only new entities
/review --type merge       # Review only merges
```

---

## EXECUTION INSTRUCTIONS

**⚠️ CRITICAL: This command MUST use AskUserQuestion for EACH item and WAIT for the user's response before proceeding. DO NOT batch approve. DO NOT skip the user interaction. This is the human-in-the-loop quality gate.**

### Step 1: Load Staging State

**Action:** Use Glob and Read tools to find all staged items.

1. Use Glob to find files:
   ```
   Glob pattern: "_staging/new/**/*.md"    → new entities
   Glob pattern: "_staging/updates/*.yaml" → updates
   Glob pattern: "_staging/merges/*.yaml"  → merges
   ```

2. Read `_index/pipeline-state.json` to check for resume state

3. Build ordered list of items to review

4. If `--list` flag: Display list and STOP (don't continue to review loop)

5. If `--type` flag: Filter list to only that type

**Output:**
```
📝 Review Session
━━━━━━━━━━━━━━━━━

{N} items staged for review:
├── {n} new entities
├── {n} updates
└── {n} potential merges
```

**If no items:**
```
📝 No items staged for review.
Run /process first to stage items.
```
STOP here.

---

### Step 2: Review Loop (BLOCKING)

**For EACH item, execute Steps 2a-2c. DO NOT SKIP ANY ITEM.**

Set `current_index = 0`

**WHILE** `current_index < total_items`:

#### Step 2a: Display Current Item

Read the file at `items[current_index].path` and display:

**For NEW entity:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[{current_index + 1}/{total}] NEW {TYPE}: {filename}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Source: {source from frontmatter}
Confidence: {extraction_confidence}

Preview:
┌─────────────────────────────────────────────────
│ {Show frontmatter}
│ {Show first ~15 lines of content}
│ ...
└─────────────────────────────────────────────────

Related entities: {list from frontmatter}
```

**For UPDATE:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[{current_index + 1}/{total}] UPDATE: {entity_id}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Target file: {file_path}
Source: {source}

Proposed changes:
{format each change from YAML}
```

**For MERGE:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[{current_index + 1}/{total}] MERGE: "{source}" → "{target}"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Confidence: {confidence}
Rationale: {rationale}

If merged:
• "{source}" becomes alias of "{target}"
• Mentions linked to target
```

#### Step 2b: ASK USER FOR DECISION

**⚠️ THIS STEP IS MANDATORY. USE AskUserQuestion AND WAIT.**

```
Use AskUserQuestion tool with:
  questions: [{
    question: "What would you like to do with this item?",
    header: "Action",
    options: [
      {label: "Accept", description: "Add to knowledge base"},
      {label: "Reject", description: "Discard with reason"},
      {label: "Edit", description: "Modify before accepting"},
      {label: "Skip", description: "Review later"}
    ],
    multiSelect: false
  }]
```

**WAIT FOR THE USER TO RESPOND. DO NOT PROCEED UNTIL RESPONSE RECEIVED.**

#### Step 2c: Process Response

Based on user's answer:

**If "Accept":**
1. Determine destination directory from entity type
2. Copy/move file from staging to knowledge base:
   - For new: `_staging/new/{type}/{file}` → `{type}/{file}`
   - For update: Apply changes to existing file using Edit tool
   - For merge: Update target entity, add alias
3. Output: `✅ Accepted: {filename}`
4. Record in accepted list

**If "Reject":**
1. Ask for reason using AskUserQuestion:
   ```
   questions: [{
     question: "Why are you rejecting this?",
     header: "Reason",
     options: [
       {label: "Duplicate", description: "Already exists"},
       {label: "Incorrect", description: "Extraction error"},
       {label: "Not relevant", description: "Doesn't belong"},
       {label: "Needs work", description: "Good idea, needs manual creation"}
     ],
     multiSelect: false
   }]
   ```
2. Move to `_staging/rejected/`
3. Output: `❌ Rejected: {filename} - {reason}`
4. Record in rejected list

**If "Edit":**
1. Show full content of file
2. Ask what to change using AskUserQuestion:
   ```
   questions: [{
     question: "What would you like to edit?",
     header: "Edit",
     options: [
       {label: "Name/Title", description: "Change entity name"},
       {label: "Type", description: "Change entity type"},
       {label: "Content", description: "Edit description/body"},
       {label: "Done", description: "Finish editing, accept"}
     ],
     multiSelect: false
   }]
   ```
3. If Name: Ask for new name, update frontmatter
4. If Type: Show types, ask for selection, update
5. If Content: Ask what to change, apply edit
6. If Done: Proceed to Accept flow
7. Loop back to edit options until Done

**If "Skip":**
1. Leave file in staging
2. Output: `⏭️ Skipped: {filename}`
3. Record in skipped list

**After processing response:**
- Increment `current_index`
- Continue loop (go back to Step 2a for next item)

**END WHILE**

---

### Step 3: Update Entity Index

After ALL items reviewed, for each accepted item:

1. Read `_index/entities.json`
2. For each new entity:
   - Generate ID: slugify(canonical_name)
   - Add entry with all metadata
3. For each update:
   - Update existing entry
4. Update statistics
5. Write back using Write tool

---

### Step 4: Cleanup and Summary

1. Update `_index/pipeline-state.json`:
   - Clear processed items from staging lists
   - Record review results
   - Set timestamp

2. Display summary:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Review Session Complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Results:
├── ✅ Accepted: {n}
├── ❌ Rejected: {n}
└── ⏭️ Skipped: {n}

{if rejected > 0}
Rejected items: _staging/rejected/
{endif}

{if skipped > 0}
Skipped items remain in staging.
Run /review again to continue.
{endif}

{if accepted > 0}
Next: /commit to save changes
{endif}
```

---

## --accept-all Mode

If `--accept-all` specified:

1. **MUST** confirm with AskUserQuestion:
   ```
   questions: [{
     question: "Accept ALL {N} staged items without individual review?",
     header: "Confirm",
     options: [
       {label: "Yes, accept all", description: "Skip individual review"},
       {label: "No, review each", description: "Go through items one by one"}
     ],
     multiSelect: false
   }]
   ```

2. If "No": Fall through to normal interactive review
3. If "Yes": Process all as Accept, but still show progress

---

## --list Mode

If `--list` specified:

Execute only Step 1, display list, then STOP:

```
📝 Staged Items
━━━━━━━━━━━━━━━

New entities ({n}):
├── {path}
└── ...

Updates ({n}):
├── {path}
└── ...

Merges ({n}):
└── {path}

Run /review to start interactive review.
```

---

## Error Handling

If any operation fails:
1. Report error clearly
2. Ask user: "Skip this item?" / "Retry" / "Abort review"
3. Handle according to response

---

## Example Flow

```
📝 Review Session
━━━━━━━━━━━━━━━━━

5 items staged for review:
├── 3 new entities
├── 1 update
└── 1 merge

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[1/5] NEW PATTERN: nested-consent-circles.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Source: governance-call-2026-02-01.md
Confidence: 0.85

Preview:
┌─────────────────────────────────────────────────
│ name: "Nested Consent Circles"
│ type: pattern
│ ...
└─────────────────────────────────────────────────

[AskUserQuestion: Accept/Reject/Edit/Skip]

User selects: "Accept"

✅ Accepted: nested-consent-circles.md

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[2/5] NEW PERSON: sarah-chen.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[... continues for each item ...]
```
