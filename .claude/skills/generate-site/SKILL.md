# Generate Site Skill

Build beautiful static wiki sites from the knowledge commons using Quartz or Hugo.

## Purpose

Transform the markdown knowledge commons into a published, searchable, interconnected website. Supports Quartz (Obsidian-native) and Hugo (flexible, fast) as static site generators.

## Supported Generators

### Quartz (Recommended)

Best for knowledge commons because:
- Native wiki-style backlinks
- Built-in graph visualization
- Obsidian-compatible
- Beautiful default theme
- Full-text search included

### Hugo

Best when you need:
- Maximum customization
- Large site performance
- Existing Hugo themes
- Complex taxonomies

## When to Use

- `/publish site` - Manual full build
- `/publish preview` - Local preview server
- Post-merge hook - Auto-publish on GitHub merge
- Scheduled - Nightly rebuilds

## Site Structure

### From Commons to Site

```yaml
mapping:
  # Entity directories become site sections
  patterns/ → /patterns/
  protocols/ → /protocols/
  playbooks/ → /playbooks/
  people/ → /people/
  organizations/ → /organizations/

  # Special pages
  CLAUDE.md → /about/  (transformed)
  _index/entities.json → /api/entities.json

  # Excluded
  _inbox/ → (not published)
  _staging/ → (not published)
  config/ → (not published)
  .claude/ → (not published)
```

### Generated Pages

```yaml
auto_generated:
  # Index pages for each type
  - /patterns/index.html
  - /protocols/index.html

  # Taxonomy pages
  - /sectors/governance-and-political-systems/
  - /scales/municipal/

  # Graph visualization
  - /graph/

  # Search
  - /search/

  # Recent changes
  - /recent/

  # Contributors
  - /contributors/
```

## Quartz Configuration

### Setup

```yaml
quartz_setup:
  # Initialize if not present
  init:
    - check_quartz_installed
    - create_quartz_config
    - setup_content_symlink

  # quartz.config.ts generation
  config:
    pageTitle: "{commons_name}"
    enableSPA: true
    enablePopovers: true
    analytics: null  # Or plausible/google
    locale: "en-US"
    baseUrl: "{configured_domain}"

    theme:
      colors:
        light: default
        dark: default
      typography:
        header: "Inter"
        body: "Inter"
        code: "JetBrains Mono"

    plugins:
      transformers:
        - frontmatter
        - tableOfContents
        - links  # Wikilinks support
        - latex
        - description
        - dates

      filters:
        - drafts
        - explicit_publish  # Only publish: true

      emitters:
        - aliases
        - assets
        - contentPage
        - folderPage
        - tagPage
        - sitemap
        - rss
        - searchIndex
```

### Quartz Layout

```yaml
layout:
  # Left sidebar
  left:
    - explorer:
        title: "Commons"
        folderDefaultState: "collapsed"
    - recentNotes:
        title: "Recent Updates"
        limit: 5

  # Right sidebar
  right:
    - graph:
        localGraph:
          depth: 2
          linkDistance: 30
        globalGraph:
          depth: 3
    - tableOfContents
    - backlinks

  # Header
  header:
    - search
    - darkMode

  # Footer
  footer:
    - credits
```

## Hugo Configuration

### Setup

```yaml
hugo_setup:
  init:
    - check_hugo_installed
    - create_hugo_project
    - install_theme
    - setup_content_symlink

  # hugo.yaml generation
  config:
    baseURL: "{configured_domain}"
    title: "{commons_name}"
    theme: "book"  # or geekdoc, docsy, etc.

    params:
      description: "{commons_description}"
      author: "{organization}"
      search: true
      mermaid: true
      katex: true

    taxonomies:
      sector: sectors
      scale: scales
      tag: tags
      type: types

    menu:
      main:
        - name: Patterns
          url: /patterns/
          weight: 10
        - name: Protocols
          url: /protocols/
          weight: 20
        - name: Graph
          url: /graph/
          weight: 90
```

### Hugo Themes

Recommended themes for knowledge commons:

```yaml
themes:
  book:
    description: "Clean documentation style"
    features: [search, toc, multilingual]
    url: "github.com/alex-shpak/hugo-book"

  geekdoc:
    description: "Modern documentation"
    features: [search, mermaid, code_copy]
    url: "github.com/thegeeklab/hugo-geekdoc"

  docsy:
    description: "Full-featured, complex"
    features: [versioning, api_docs, i18n]
    url: "github.com/google/docsy"

  wiki:
    description: "Simple wiki style"
    features: [backlinks, graph]
    url: "github.com/..." # Custom for OPAL
```

## Build Process

### Full Build

```yaml
build:
  command: "/publish site"

  steps:
    1_prepare:
      - validate_config
      - check_generator_installed
      - clean_output_dir

    2_preprocess:
      - copy_content:
          from: <entity_directories>
          to: <generator_content_dir>
      - transform_frontmatter:
          add: [url, date, lastmod]
          convert: [sectors → taxonomies]
      - generate_indexes:
          per_type: true
          per_taxonomy: true
      - generate_graph_data:
          from: _index/relationships.json
          to: static/graph.json

    3_build:
      quartz:
        command: "npx quartz build"
        output: public/
      hugo:
        command: "hugo --minify"
        output: public/

    4_postprocess:
      - copy_api_files:
          entities.json → public/api/
      - generate_sitemap
      - generate_rss
      - optimize_images

    5_deploy:
      method: <configured>  # github-pages, netlify, vercel, custom
```

### Preview Build

```yaml
preview:
  command: "/publish preview"

  steps:
    - prepare_content (same as full)
    - start_dev_server:
        quartz: "npx quartz build --serve"
        hugo: "hugo server -D"
    - open_browser: "http://localhost:1313"
    - watch_for_changes: true
```

## Content Transformation

### Frontmatter Enhancement

Original entity:
```yaml
---
title: Consent-Based Decision Making
type: pattern
sectors:
  - governance-and-political-systems
scales:
  - neighborhood
  - municipal
---
```

Transformed for site:
```yaml
---
title: Consent-Based Decision Making
type: pattern
sectors:
  - governance-and-political-systems
scales:
  - neighborhood
  - municipal
url: /patterns/consent-based-decision-making/
date: 2026-01-15
lastmod: 2026-02-01
weight: 10
toc: true
draft: false
---
```

### Link Transformation

```yaml
links:
  # Wiki-style links
  "[[Protocol Name]]" → "[Protocol Name](/protocols/protocol-name/)"

  # Entity references
  "@protocol:sociocracy" → "[Sociocracy](/protocols/sociocracy/)"

  # Relationship links
  "implements: [[Consent Pattern]]" → preserved with backlink
```

### Graph Data Generation

```json
{
  "nodes": [
    {
      "id": "pattern-consent",
      "title": "Consent-Based Decision Making",
      "type": "pattern",
      "url": "/patterns/consent-based-decision-making/"
    }
  ],
  "edges": [
    {
      "source": "pattern-consent",
      "target": "protocol-sociocracy",
      "type": "implements"
    }
  ]
}
```

## Deployment Options

### GitHub Pages

```yaml
github_pages:
  trigger: on_merge_to_main
  workflow: .github/workflows/publish.yml

  workflow_content: |
    name: Publish Site
    on:
      push:
        branches: [main]
    jobs:
      build:
        runs-on: ubuntu-latest
        steps:
          - uses: actions/checkout@v4
          - uses: actions/setup-node@v4
          - run: npm install
          - run: npx quartz build
          - uses: peaceiris/actions-gh-pages@v3
            with:
              github_token: ${{ secrets.GITHUB_TOKEN }}
              publish_dir: ./public
```

### Netlify

```yaml
netlify:
  trigger: on_push
  config_file: netlify.toml

  config: |
    [build]
      command = "npx quartz build"
      publish = "public"

    [[redirects]]
      from = "/api/*"
      to = "/api/:splat"
      status = 200
```

### Vercel

```yaml
vercel:
  trigger: on_push
  config_file: vercel.json

  config: |
    {
      "buildCommand": "npx quartz build",
      "outputDirectory": "public",
      "framework": null
    }
```

### Custom Server

```yaml
custom:
  trigger: manual or webhook
  method: rsync or scp

  deploy:
    command: "rsync -avz public/ user@server:/var/www/commons/"
```

## Configuration

### In `config/publishing.yaml`

```yaml
publishing:
  # Which generator to use
  generator: quartz  # or hugo

  # Site metadata
  site:
    name: "Open Protocol Library"
    description: "A knowledge commons for civic innovation"
    domain: "commons.opencivics.co"
    language: en

  # Quartz-specific
  quartz:
    version: "4.x"
    theme: default
    graph:
      enabled: true
      depth: 2

  # Hugo-specific
  hugo:
    version: "0.120+"
    theme: book
    taxonomies:
      enabled: true

  # Deployment
  deploy:
    method: github-pages  # netlify, vercel, custom
    auto_deploy: true
    branch: gh-pages

  # Build options
  build:
    minify: true
    optimize_images: true
    generate_sitemap: true
    generate_rss: true

  # Content options
  content:
    include_drafts: false
    require_publish_flag: false  # or true for explicit opt-in
```

## Commands

```yaml
commands:
  "/publish site":
    description: "Build and deploy the site"
    options:
      --preview: "Build but don't deploy"
      --force: "Rebuild everything"

  "/publish preview":
    description: "Start local preview server"
    options:
      --port: "Server port (default 1313)"

  "/publish status":
    description: "Show publishing status"
    output:
      - last_build
      - deploy_url
      - pending_changes
```

## Integration

### Post-Merge Hook

```yaml
hook:
  trigger: post_merge
  conditions:
    - branch: main
    - files_changed: content/**

  action:
    - build_site
    - deploy
    - notify:
        message: "🌐 Site updated: {deploy_url}"
```

### With Activity Digest

Include site link in digests:
```yaml
digest:
  include:
    - site_url: "{deploy_url}"
    - changes_link: "{deploy_url}/recent/"
```
