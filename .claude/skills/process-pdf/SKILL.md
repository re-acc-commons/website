# Process PDF Skill

Extract text, structure, and entities from PDF documents.

## Purpose

Convert PDF documents into structured markdown suitable for entity extraction. Handles academic papers, reports, forms, scanned documents (via OCR), and complex layouts.

## When to Use

- PDF dropped in `_inbox/documents/`
- `/ingest file document.pdf`
- Academic paper import
- Report processing

## PDF Types Handled

```yaml
pdf_types:
  text_based:
    description: "Native digital PDFs with selectable text"
    method: direct_extraction
    quality: high
    speed: fast

  scanned:
    description: "Image-based PDFs (scans, photos)"
    method: ocr
    quality: medium
    speed: slow

  mixed:
    description: "Combination of text and images"
    method: hybrid
    quality: varies
    speed: medium

  forms:
    description: "Fillable PDF forms"
    method: form_extraction
    quality: high
    speed: fast

  academic:
    description: "Papers with citations, figures, tables"
    method: academic_parser
    quality: high
    speed: medium
```

## Processing Pipeline

### 1. PDF Analysis

```yaml
analysis:
  steps:
    - detect_type:
        check: text_layer, images, forms
        classify: [text_based, scanned, mixed, form]

    - extract_metadata:
        fields:
          - title
          - author
          - creation_date
          - modification_date
          - page_count
          - producer  # PDF creation tool

    - analyze_structure:
        detect:
          - headers
          - paragraphs
          - lists
          - tables
          - figures
          - citations
          - footnotes

    - estimate_complexity:
        factors:
          - page_count
          - has_ocr_needed
          - table_count
          - figure_count
        output: simple | medium | complex
```

### 2. Text Extraction

```yaml
extraction:
  text_based:
    tool: pdfplumber  # or pymupdf, pdfminer
    options:
      preserve_layout: true
      extract_tables: true
      extract_images: false  # Separate step

  scanned:
    tool: tesseract  # via pytesseract
    options:
      language: eng  # or detected
      dpi: 300
      preprocessing:
        - deskew
        - denoise
        - contrast_enhance

  mixed:
    strategy:
      - try_text_extraction_first
      - ocr_image_regions
      - merge_results

  academic:
    tool: grobid  # Scientific document parser
    options:
      extract_citations: true
      extract_figures: true
      extract_tables: true
      consolidate_header: true
```

### 3. Structure Detection

```yaml
structure:
  headers:
    detection:
      - font_size_change
      - bold_text
      - numbering_patterns
      - whitespace_before
    hierarchy:
      - h1: largest, bold
      - h2: second largest
      - h3: third level

  paragraphs:
    detection:
      - indentation
      - line_spacing
      - sentence_boundaries

  lists:
    patterns:
      - numbered: "1.", "1)", "(1)"
      - bulleted: "•", "-", "*"
      - lettered: "a.", "a)"

  tables:
    detection:
      - grid_lines
      - column_alignment
      - header_row
    extraction:
      tool: camelot  # or tabula
      output: markdown_table

  figures:
    detection:
      - image_regions
      - caption_patterns
    extraction:
      - save_image: _assets/figures/
      - generate_description  # via Claude vision
      - link_in_markdown
```

### 4. Citation Handling (Academic)

```yaml
citations:
  detection:
    patterns:
      - "[1]", "[1,2]", "[1-5]"
      - "(Author, 2024)"
      - "(Author et al., 2024)"

  extraction:
    - parse_bibliography
    - match_inline_to_refs
    - generate_links

  output:
    inline: "[^1]"  # Markdown footnote
    bibliography: |
      ## References
      [^1]: Author, A. (2024). Title. *Journal*.
```

### 5. Output Generation

```yaml
output:
  format: markdown

  structure: |
    ---
    source_file: {filename}
    source_type: pdf
    extracted_at: {timestamp}
    page_count: {pages}
    extraction_method: {method}
    confidence: {confidence}
    ---

    # {detected_title}

    {structured_content}

    ## Figures

    {figure_descriptions}

    ## Tables

    {extracted_tables}

    ## References

    {bibliography}

  save_to: _inbox/documents/{filename}.md

  assets:
    figures: _assets/figures/{filename}/
    tables: _assets/tables/{filename}/
```

## Academic Paper Processing

Special handling for research papers:

```yaml
academic:
  tools:
    primary: grobid
    fallback: regex_patterns

  extraction:
    header:
      - title
      - authors
      - affiliations
      - abstract
      - keywords

    body:
      - sections_hierarchy
      - paragraphs
      - equations  # LaTeX format
      - algorithms

    back_matter:
      - references
      - appendices
      - acknowledgments

  output:
    frontmatter:
      title: "{extracted_title}"
      authors: ["{author1}", "{author2}"]
      year: {publication_year}
      doi: "{doi_if_found}"
      type: academic_paper

    content:
      - abstract_section
      - body_sections
      - figures_with_captions
      - tables_with_captions
      - references_as_footnotes
```

## Form Processing

Extract data from PDF forms:

```yaml
forms:
  detection:
    - fillable_fields
    - checkbox_fields
    - signature_fields

  extraction:
    - field_name: {value}
    - field_type: [text, checkbox, date, signature]

  output:
    format: yaml_frontmatter
    example: |
      ---
      form_data:
        name: "John Doe"
        date: "2026-02-01"
        agreed_to_terms: true
      ---
```

## OCR Configuration

```yaml
ocr:
  engine: tesseract

  settings:
    # Language packs
    languages:
      primary: eng
      secondary: [spa, fra, deu]  # Auto-detect

    # Quality settings
    dpi: 300  # Higher = better quality, slower
    psm: 3    # Page segmentation mode (3 = auto)
    oem: 3    # OCR engine mode (3 = LSTM + legacy)

  preprocessing:
    enabled: true
    steps:
      - convert_to_grayscale
      - deskew
      - remove_noise
      - enhance_contrast
      - binarize

  postprocessing:
    - spell_check
    - punctuation_fix
    - paragraph_merge
```

## Table Extraction

```yaml
tables:
  detection:
    method: hybrid  # lines + whitespace

  extraction:
    tool: camelot
    flavor: lattice  # or stream for borderless

  output:
    format: markdown

    example: |
      | Column A | Column B | Column C |
      |----------|----------|----------|
      | Value 1  | Value 2  | Value 3  |
      | Value 4  | Value 5  | Value 6  |

  complex_tables:
    # For merged cells, nested tables
    fallback: image_with_description
    describe_with: claude_vision
```

## Figure Handling

```yaml
figures:
  extraction:
    - detect_image_regions
    - extract_to_file:
        format: png
        path: _assets/figures/

  description:
    method: claude_vision
    prompt: |
      Describe this figure from an academic/technical document.
      Include:
      - What the figure shows
      - Key data points or trends
      - Relevance to document context

  output:
    markdown: |
      ![{caption}]({image_path})

      *Figure {n}: {caption}*

      {ai_description}
```

## Error Handling

```yaml
errors:
  corrupted_pdf:
    action: skip
    notify: true
    message: "PDF file appears corrupted"

  password_protected:
    action: prompt_for_password
    fallback: skip

  ocr_failed:
    action: retry_with_different_settings
    max_attempts: 3

  low_confidence:
    threshold: 0.7
    action: flag_for_review
    include_original: true

  complex_layout:
    action: extract_best_effort
    flag: "Manual review recommended"
```

## Configuration

### In `config/processing.yaml`

```yaml
pdf:
  # Extraction method preference
  method: auto  # auto, text, ocr, grobid

  # OCR settings
  ocr:
    enabled: true
    engine: tesseract
    languages: [eng]
    dpi: 300

  # Academic paper handling
  academic:
    enabled: true
    use_grobid: true
    grobid_url: http://localhost:8070

  # Table extraction
  tables:
    enabled: true
    tool: camelot

  # Figure extraction
  figures:
    enabled: true
    describe: true

  # Output
  output:
    preserve_structure: true
    include_metadata: true
```

## Integration

### With Classify Skill

After PDF extraction:
```yaml
post_extraction:
  - send_to_classify:
      content: <extracted_markdown>
      source_type: pdf
      metadata:
        original_file: {filename}
        page_count: {pages}
        extraction_confidence: {confidence}
```

### With Entity Extraction

PDF-specific entity hints:
```yaml
entity_hints:
  from_pdf_metadata:
    - title → potential Entity name
    - authors → potential Person entities
    - keywords → tags
    - references → relationship candidates
```

## Commands

```yaml
commands:
  "/ingest file <path.pdf>":
    action: queue_pdf_processing

  "/process pdf":
    description: "Process all PDFs in inbox"

  "/process pdf --ocr":
    description: "Force OCR on all PDFs"

  "/process pdf --academic":
    description: "Use academic parser"
```

## Dependencies

```yaml
dependencies:
  python:
    - pdfplumber
    - pymupdf
    - pytesseract
    - camelot-py
    - opencv-python  # For preprocessing

  system:
    - tesseract-ocr
    - tesseract-ocr-eng  # Language pack
    - poppler-utils

  optional:
    - grobid  # For academic papers
```
