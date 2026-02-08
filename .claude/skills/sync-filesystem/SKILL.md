# Filesystem Source Processor

Watch directories for new files and copy them to the OPAL inbox.

## Overview

This skill monitors configured local directories for new files (PDFs, markdown, text, etc.) and copies them to the OPAL inbox with proper frontmatter for processing.

## Invocation

This skill is automatically invoked by `/sync` when `filesystem` is configured as a source.

Direct invocation:
```
/sync filesystem              # Check all watched paths
/sync filesystem --force      # Recopy all files (ignore cache)
/sync filesystem --path ~/Documents  # Sync specific path
```

---

## EXECUTION INSTRUCTIONS

When syncing from filesystem, execute these steps IN ORDER.

### Step 1: Load Watch Configuration

**Action:** Read `.opal/sources.yaml` to get watch paths.

```yaml
filesystem:
  enabled: true
  watch:
    - path: ~/Downloads/*.pdf
      name: Downloads PDFs
      tags: [imported]
    - path: ~/Documents/OPAL/
      name: OPAL Documents
      recursive: true
```

**For each watch entry:**
- `path`: Path with optional glob pattern (required)
- `name`: Display name (optional)
- `recursive`: Watch subdirectories (default: false)
- `tags`: Auto-applied tags (optional)
- `extensions`: File extensions to include (optional)

### Step 2: Load Sync State

**Action:** Read `_index/sync-state.json`.

Get `sources.filesystem.seen_files` - a dict of file paths to last-seen modification times.

```json
{
  "sources": {
    "filesystem": {
      "seen_files": {
        "/Users/me/Downloads/paper.pdf": "2026-01-28T12:00:00Z",
        "/Users/me/Documents/OPAL/notes.md": "2026-01-27T15:30:00Z"
      }
    }
  }
}
```

### Step 3: Scan Each Watch Path

**FOR EACH watch path:**

#### Step 3.1: Expand Path and Find Files

**Action:** Use Glob tool to find matching files.

```
Glob:
  pattern: {watch_path_expanded}
  path: {base_directory}
```

If `recursive: true`, adjust pattern to include subdirectories:
- `~/Documents/OPAL/` → `~/Documents/OPAL/**/*`

**Filter by extension if specified:**
- `extensions: [pdf, md, txt]` → Only include files with those extensions

#### Step 3.2: Check for New/Modified Files

**For each found file:**

1. Get file modification time using Bash:
   ```bash
   stat -f "%m" "{file_path}"  # macOS
   stat -c "%Y" "{file_path}"  # Linux
   ```

2. Compare to `seen_files`:
   - If path not in seen_files → New file
   - If mtime > seen_files[path] → Modified file
   - If mtime <= seen_files[path] → Skip (unchanged)

3. If `--force`: Include all files regardless of seen state

#### Step 3.3: Report Scan Results

```
[{watch_index}/{total_watches}] {watch_name}
      ├── Path: {path}
      ├── Found: {total} files
      ├── New: {new_count}
      └── Modified: {modified_count}
```

### Step 4: Process Each File

**FOR EACH new or modified file:**

#### Step 4.1: Determine File Type

Based on extension:

| Extension | Type | Processing |
|-----------|------|------------|
| `.pdf` | PDF document | Use process-pdf skill |
| `.md` | Markdown | Copy with frontmatter |
| `.txt` | Plain text | Convert to markdown |
| `.docx` | Word doc | Convert to markdown (if possible) |
| `.html` | Web page | Extract content |
| `.json` | Data | Parse and format |

#### Step 4.2: Generate Filename

**Format:** `file-{date}-{slug}.md`

1. Use file modification date
2. Generate slug from original filename:
   - Remove extension
   - Lowercase
   - Replace spaces with hyphens
   - Remove special characters
   - Truncate to 50 chars

**Example:** `file-2026-01-29-research-paper.md`

#### Step 4.3: Process by Type

**For PDFs:**
1. Check if process-pdf skill is available
2. Use Bash with `pdftotext` or similar:
   ```bash
   pdftotext "{file_path}" -
   ```
3. If extraction fails, note in frontmatter and include file reference

**For Markdown (.md):**
1. Read file content using Read tool
2. Preserve existing frontmatter if present
3. Add OPAL source frontmatter

**For Plain Text (.txt):**
1. Read file content using Read tool
2. Wrap in markdown format
3. Add frontmatter

**For DOCX:**
1. Check for `pandoc` availability
2. Convert: `pandoc "{file_path}" -t markdown`
3. If not available, note limitation

#### Step 4.4: Generate Markdown Content

**Action:** Use Write tool to create file.

**Template:**
```markdown
---
source: filesystem
source_id: "{file_hash}"
source_path: "{original_path}"
original_filename: "{filename}"
file_type: "{extension}"
file_size: {size_bytes}
modified_at: {file_mtime}
synced_at: {current_timestamp}
type: document
tags: {configured_tags}
---

# {filename_without_extension}

**Original file:** {original_path}
**Type:** {file_type}
**Size:** {formatted_size}
**Modified:** {formatted_date}

---

{extracted_content}

---

*Imported from local filesystem*
```

**Write to:** `_inbox/documents/{filename}`

#### Step 4.5: Handle Binary Files

For files that can't be converted to text:

```markdown
---
source: filesystem
source_id: "{file_hash}"
source_path: "{original_path}"
type: attachment
---

# {filename}

This file was imported but could not be converted to text.

**Original file:** {original_path}
**Type:** {file_type}
**Size:** {formatted_size}

To process this file:
- Open the original: `open "{original_path}"`
- Or move to a processing tool

*Note: Binary files are tracked but content is not extracted.*
```

#### Step 4.6: Report Progress

```
      ├── [{index}/{total}] ✅ {filename}
      │         Type: {file_type}
      │         → _inbox/documents/{output_filename}
```

### Step 5: Update Sync State

**Action:** Update `_index/sync-state.json`.

```json
{
  "sources": {
    "filesystem": {
      "enabled": true,
      "last_sync": "{current_timestamp}",
      "seen_files": {
        "{file_path}": "{mtime}"
      },
      "items_synced": {previous + new_count},
      "errors": {error_count}
    }
  }
}
```

### Step 6: Summary

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Filesystem Sync Complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Paths checked: {path_count}
Files synced: {total_files}
Output: _inbox/documents/

By type:
  ├── PDF: {pdf_count}
  ├── Markdown: {md_count}
  ├── Text: {txt_count}
  └── Other: {other_count}

New files:
{for each file:}
  ├── {filename}

Next: Run /process to extract entities
```

---

## Configuration Reference

Full configuration in `.opal/sources.yaml`:

```yaml
filesystem:
  enabled: true
  type: files

  # Output location
  output: _inbox/documents/

  # Watch paths (can have multiple)
  watch:
    - path: ~/Downloads/*.pdf
      name: Downloads PDFs
      tags: [imported, downloaded]
      extensions: [pdf]

    - path: ~/Documents/Research/
      name: Research Documents
      recursive: true
      extensions: [pdf, md, txt, docx]
      tags: [research]

    - path: ~/Desktop/OPAL Drop/
      name: Quick Drop
      recursive: false
      # No extension filter = all files

  # Processing options
  processing:
    extract_pdf_text: true
    convert_docx: true          # Requires pandoc
    convert_html: true
    max_file_size_mb: 50        # Skip very large files
    skip_hidden: true           # Skip .dotfiles

  # Deduplication
  dedup:
    by_content_hash: true       # Skip if same content already imported
    by_filename: false          # Allow same filename from different paths

  # Sync behavior
  sync:
    schedule: manual            # or cron expression
    delete_after_import: false  # DANGEROUS: Remove source files
    move_after_import: null     # Move to directory after import
```

---

## PDF Processing

For PDF files, the skill attempts multiple extraction methods:

### 1. Native Text Extraction (Preferred)
```bash
pdftotext "{file_path}" -  # Extract to stdout
```

### 2. OCR Fallback (if text extraction fails)
```bash
# Check if tesseract is available
which tesseract
# If available, use OCR
pdftoppm "{file_path}" -png | tesseract stdin stdout
```

### 3. Metadata Only (if extraction fails)
```bash
pdfinfo "{file_path}"
```

Reports:
```
      ├── PDF extraction: {method used}
      │   └── Pages: {page_count}, Words: ~{word_count}
```

---

## Error Handling

### File Not Readable
```
⚠️ Cannot read file: {path}
    Reason: Permission denied
    Action: Check file permissions
```

### Extraction Failed
```
⚠️ Could not extract text from: {filename}
    Type: {file_type}
    Reason: {error}
    Action: File tracked but content not extracted
```

### Path Not Found
```
⚠️ Watch path not found: {path}
    The directory may have been moved or deleted.
    Use /sources configure filesystem to update.
```

### File Too Large
```
⚠️ Skipping large file: {filename}
    Size: {size_mb} MB (limit: {max_size_mb} MB)
    Increase limit in sources.yaml if needed.
```

---

## Tool Requirements

### For PDFs
- `pdftotext` (from poppler-utils)
  - macOS: `brew install poppler`
  - Ubuntu: `apt install poppler-utils`

### For DOCX
- `pandoc`
  - macOS: `brew install pandoc`
  - Ubuntu: `apt install pandoc`

### For OCR (optional)
- `tesseract`
  - macOS: `brew install tesseract`
  - Ubuntu: `apt install tesseract-ocr`

If tools are missing, the skill will:
1. Note the limitation
2. Import file reference without content
3. Suggest installation command

---

## Integration with /process

After syncing, files are in `_inbox/documents/` ready for processing:

```
/process

[1/3] file-2026-01-29-research-paper.md
      ├── Type: document (confidence: 0.92)
      ├── Detected: research paper
      ├── Extracted: 12 entities
      │   ├── Authors: Smith, Jones, Lee
      │   ├── Concepts: machine learning, neural networks
      │   └── Citations: 15 references
      └── ✅ Staged for review
```
