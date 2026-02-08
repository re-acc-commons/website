# Skill: Index Content

Index new content contributions to the Knowledge Commons for discoverability and graph traversal.

---

## Trigger

```yaml
trigger:
  type: github_push | github_pr_merged
  conditions:
    - repository in KNOWLEDGE_COMMONS_REPOS
    - files_changed contains: ["*.md", "*.txt", "*.json", "*.yaml"]
    - branch == "main"
```

---

## Required Permissions

- Read GitHub repositories
- Write to index files
- Update metadata
- Post to Discord (optional announcements)

---

## Knowledge Commons Repositories

```yaml
repositories:
  - reacc-commons-constitution    # Governance docs
  - reacc-essays                  # Canonical essays, manifestos
  - reacc-research                # Research notes, analysis
  - reacc-protocols               # Technical protocols
  - reacc-media                   # Media assets metadata
```

---

## Process

### Step 1: Detect Content Changes

```python
async def detect_content_changes(event: GitHubPushEvent) -> List[ContentChange]:
    """Parse push event for content changes."""

    changes = []

    for commit in event.commits:
        for file_path in commit.added + commit.modified:
            if is_indexable_content(file_path):
                changes.append(ContentChange(
                    path=file_path,
                    action="added" if file_path in commit.added else "modified",
                    commit_sha=commit.sha,
                    author=commit.author,
                    message=commit.message,
                    timestamp=commit.timestamp,
                    repository=event.repository
                ))

        for file_path in commit.removed:
            if is_indexable_content(file_path):
                changes.append(ContentChange(
                    path=file_path,
                    action="removed",
                    commit_sha=commit.sha,
                    author=commit.author,
                    timestamp=commit.timestamp,
                    repository=event.repository
                ))

    return changes


def is_indexable_content(path: str) -> bool:
    """Check if file should be indexed."""

    # Include markdown, text, structured data
    indexable_extensions = [".md", ".txt", ".json", ".yaml", ".yml"]

    # Exclude system files
    excluded_paths = [
        ".github/",
        ".agents/",
        "node_modules/",
        ".claude/"
    ]

    return (
        any(path.endswith(ext) for ext in indexable_extensions) and
        not any(path.startswith(excl) for excl in excluded_paths)
    )
```

### Step 2: Extract Metadata

```python
async def extract_content_metadata(
    change: ContentChange
) -> ContentMetadata:
    """Extract metadata from content file."""

    content = await read_file(
        repo=change.repository,
        path=change.path
    )

    # Parse frontmatter if present
    frontmatter = parse_frontmatter(content)

    # Extract wiki-links
    wiki_links = extract_wiki_links(content)

    # Extract transclusions
    transclusions = extract_transclusions(content)

    # Detect content type from path and frontmatter
    content_type = detect_content_type(
        path=change.path,
        frontmatter=frontmatter
    )

    # Extract summary (first paragraph or description)
    summary = extract_summary(content, frontmatter)

    # Detect author (from frontmatter or commit)
    author = frontmatter.get("author") or change.author

    return ContentMetadata(
        path=change.path,
        repository=change.repository,
        title=frontmatter.get("title") or extract_title_from_content(content),
        type=content_type,
        author=author,
        created=frontmatter.get("created") or change.timestamp,
        modified=change.timestamp,
        tags=frontmatter.get("tags", []),
        links_to=wiki_links,
        transcludes=transclusions,
        summary=summary,
        frontmatter=frontmatter,
        word_count=count_words(content),
        commit_sha=change.commit_sha
    )


def extract_wiki_links(content: str) -> List[str]:
    """Extract all [[wiki-style]] links."""

    # Match [[Link]] and [[Link|Display]]
    pattern = r"\[\[([^\]|]+)(?:\|[^\]]+)?\]\]"
    matches = re.findall(pattern, content)

    # Normalize and dedupe
    return list(set(
        normalize_link(m) for m in matches
    ))


def extract_transclusions(content: str) -> List[str]:
    """Extract all ![[transclusion]] links."""

    pattern = r"!\[\[([^\]]+)\]\]"
    matches = re.findall(pattern, content)

    return list(set(matches))


def detect_content_type(path: str, frontmatter: dict) -> str:
    """Determine content type from path and metadata."""

    # Explicit type in frontmatter
    if "type" in frontmatter:
        return frontmatter["type"]

    # Infer from path
    type_patterns = {
        "role": r"Roles?/",
        "protocol": r"Protocols?/",
        "agreement": r"Agreements?/",
        "asset": r"Assets?/",
        "group": r"Groups?/",
        "essay": r"Essays?/",
        "record": r"Records?/",
        "research": r"Research/",
        "proposal": r"Proposals?/"
    }

    for content_type, pattern in type_patterns.items():
        if re.search(pattern, path, re.IGNORECASE):
            return content_type

    return "document"
```

### Step 3: Update Index

```python
async def update_content_index(
    metadata: ContentMetadata,
    action: str
):
    """Update the central content index."""

    index_path = "Knowledge-Commons/index.json"

    # Load current index
    try:
        index = json.loads(await read_file(
            repo="reacc-commons-constitution",
            path=index_path
        ))
    except FileNotFoundError:
        index = {"documents": {}, "graph": {"nodes": [], "edges": []}}

    if action == "removed":
        # Remove from index
        doc_id = generate_doc_id(metadata.repository, metadata.path)
        if doc_id in index["documents"]:
            del index["documents"][doc_id]
            index["graph"] = rebuild_graph(index["documents"])
    else:
        # Add or update
        doc_id = generate_doc_id(metadata.repository, metadata.path)
        index["documents"][doc_id] = {
            "id": doc_id,
            "path": metadata.path,
            "repository": metadata.repository,
            "title": metadata.title,
            "type": metadata.type,
            "author": metadata.author,
            "created": metadata.created.isoformat() if metadata.created else None,
            "modified": metadata.modified.isoformat(),
            "tags": metadata.tags,
            "summary": metadata.summary,
            "word_count": metadata.word_count,
            "links": metadata.links_to,
            "transcludes": metadata.transcludes
        }

        # Update graph
        index["graph"] = rebuild_graph(index["documents"])

    await write_file(
        repo="reacc-commons-constitution",
        path=index_path,
        content=json.dumps(index, indent=2),
        message=f"Index: {action} {metadata.path}"
    )

    return index


def rebuild_graph(documents: dict) -> dict:
    """Rebuild link graph from documents."""

    nodes = []
    edges = []

    # Create nodes
    for doc_id, doc in documents.items():
        nodes.append({
            "id": doc_id,
            "label": doc["title"],
            "type": doc["type"],
            "repository": doc["repository"]
        })

    # Create edges from links
    for doc_id, doc in documents.items():
        for link in doc.get("links", []):
            target_id = find_document_by_title(documents, link)
            if target_id:
                edges.append({
                    "source": doc_id,
                    "target": target_id,
                    "type": "links_to"
                })

        for transclude in doc.get("transcludes", []):
            target_id = find_document_by_title(documents, transclude)
            if target_id:
                edges.append({
                    "source": doc_id,
                    "target": target_id,
                    "type": "transcludes"
                })

    return {"nodes": nodes, "edges": edges}
```

### Step 4: Generate Type-Specific Indexes

```python
async def update_type_indexes(metadata: ContentMetadata):
    """Update type-specific index files."""

    type_index_path = f"Knowledge-Commons/by-type/{metadata.type}.md"

    try:
        current = await read_file(
            repo="reacc-commons-constitution",
            path=type_index_path
        )
    except FileNotFoundError:
        current = f"""---
type: index
content_type: {metadata.type}
---

# {metadata.type.title()} Index

Documents of type: **{metadata.type}**

---

## Documents

"""

    # Check if entry exists
    entry_pattern = rf"\[\[{re.escape(metadata.title)}\]\]"
    if not re.search(entry_pattern, current):
        # Add entry
        entry = f"\n- [[{metadata.title}]] — {metadata.summary[:100]}..."
        current = current.rstrip() + entry + "\n"

        await write_file(
            repo="reacc-commons-constitution",
            path=type_index_path,
            content=current,
            message=f"Index {metadata.type}: add {metadata.title}"
        )
```

### Step 5: Announce Significant Additions

```python
async def announce_if_significant(
    metadata: ContentMetadata,
    action: str
):
    """Announce significant content additions."""

    # Only announce new substantial content
    if action != "added":
        return

    if metadata.word_count < 500:
        return

    # Only certain types
    significant_types = ["essay", "protocol", "research", "proposal"]
    if metadata.type not in significant_types:
        return

    await post_to_channel(
        KNOWLEDGE_COMMONS_CHANNEL_ID,
        f"📚 **New {metadata.type.title()} Added**\n\n"
        f"**{metadata.title}**\n\n"
        f"{metadata.summary[:200]}...\n\n"
        f"Author: {metadata.author}\n"
        f"Repository: `{metadata.repository}`\n"
        f"Path: `{metadata.path}`"
    )
```

---

## Outputs

```yaml
outputs:
  on_content_added:
    - index: updated with new document
    - graph: edges added for links
    - type_index: updated
    - announcement: posted if significant
    - log: content_indexed

  on_content_modified:
    - index: metadata updated
    - graph: edges refreshed
    - log: content_reindexed

  on_content_removed:
    - index: document removed
    - graph: edges cleaned
    - log: content_deindexed
```

---

## Related Skills

- `validate-schema.md` — Pre-indexing validation
- `federation-sync.md` — Cross-network content sync
- `../governance/process-amendment.md` — Constitution changes
