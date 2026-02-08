# Skill: Validate Schema

Validate content against constitutional schemas before indexing or publishing.

---

## Trigger

```yaml
trigger:
  type: github_pr_created | github_pr_updated
  conditions:
    - repository in KNOWLEDGE_COMMONS_REPOS
    - files_changed contains: ["*.md"]
    - target_branch == "main"
```

---

## Required Permissions

- Read GitHub PRs and files
- Comment on PRs
- Add labels

---

## Process

### Step 1: Identify Changed Files

```python
async def identify_files_to_validate(
    pr: PullRequest
) -> List[FileToValidate]:
    """Get list of changed files needing validation."""

    changed_files = await get_pr_changed_files(pr.repo, pr.number)

    files_to_validate = []

    for file in changed_files:
        if not file.path.endswith(".md"):
            continue

        # Determine expected schema from path
        schema_type = detect_schema_type(file.path)

        if schema_type:
            files_to_validate.append(FileToValidate(
                path=file.path,
                schema_type=schema_type,
                status=file.status,  # added, modified, removed
                content=await get_file_content_from_pr(pr, file.path)
            ))

    return files_to_validate


def detect_schema_type(path: str) -> Optional[str]:
    """Determine which schema applies to a file path."""

    schema_mappings = {
        r"^\d+\. Structure/Roles/": "role",
        r"^\d+\. Structure/Groups/": "group",
        r"^\d+\. Structure/Assets/": "asset",
        r"^\d+\. Protocols/": "protocol",
        r"^\d+\. Agreements/": "agreement",
        r"^\d+\. Identity/": "identity",
        r"Records/Consent/": "consent_record",
        r"Records/Treasury/": "treasury_record",
        r"Records/Accountability/": "accountability_record"
    }

    for pattern, schema_type in schema_mappings.items():
        if re.match(pattern, path):
            return schema_type

    return None
```

### Step 2: Load Schema Definitions

```python
# Schema definitions based on constitution templates

SCHEMAS = {
    "role": {
        "required_frontmatter": [
            "type", "discord_role"
        ],
        "optional_frontmatter": [
            "nft_token", "multisig_access", "github_team"
        ],
        "required_sections": [
            "Purpose", "Requirements", "Responsibilities", "Privileges"
        ],
        "required_links": [
            # Must link to at least one protocol or agreement
        ],
        "frontmatter_types": {
            "type": {"type": "string", "enum": ["role"]},
            "discord_role": {"type": "string"},
            "nft_token": {"type": "string", "optional": True},
            "multisig_access": {"type": "string", "enum": ["none", "viewer", "signer"], "optional": True}
        }
    },

    "group": {
        "required_frontmatter": ["type"],
        "required_sections": [
            "Purpose", "Composition", "Governance", "Responsibilities"
        ]
    },

    "asset": {
        "required_frontmatter": ["type", "steward"],
        "required_sections": [
            "Purpose", "Stewardship", "Access"
        ]
    },

    "protocol": {
        "required_frontmatter": ["type", "applies_to"],
        "required_sections": [
            "Purpose", "Process"
        ],
        "optional_sections": [
            "Triggers", "Outputs", "Autonomous Execution"
        ]
    },

    "agreement": {
        "required_frontmatter": ["type", "role"],
        "required_sections": [
            "Summary", "Commitments", "Rights", "Duration"
        ]
    },

    "consent_record": {
        "required_frontmatter": [
            "id", "type", "outcome", "timestamp", "proposal_type"
        ],
        "frontmatter_types": {
            "outcome": {"type": "string", "enum": ["approved", "rejected", "blocked"]}
        }
    },

    "treasury_record": {
        "required_frontmatter": [
            "id", "type", "status", "consent_id"
        ],
        "frontmatter_types": {
            "status": {"type": "string", "enum": ["pending_signatures", "ready_for_execution", "executed"]}
        }
    }
}
```

### Step 3: Validate Content

```python
async def validate_content(
    file: FileToValidate
) -> ValidationResult:
    """Validate a file against its schema."""

    schema = SCHEMAS.get(file.schema_type)
    if not schema:
        return ValidationResult(
            valid=True,
            warnings=["No schema defined for this type"]
        )

    errors = []
    warnings = []

    content = file.content
    frontmatter = parse_frontmatter(content)
    sections = extract_sections(content)
    links = extract_wiki_links(content)

    # Validate required frontmatter
    for field in schema.get("required_frontmatter", []):
        if field not in frontmatter:
            errors.append(f"Missing required frontmatter: `{field}`")

    # Validate frontmatter types
    for field, type_spec in schema.get("frontmatter_types", {}).items():
        if field in frontmatter:
            type_error = validate_type(frontmatter[field], type_spec)
            if type_error:
                errors.append(f"Frontmatter `{field}`: {type_error}")

    # Validate required sections
    for section in schema.get("required_sections", []):
        if section not in sections:
            errors.append(f"Missing required section: `## {section}`")

    # Validate wiki-link consistency
    for link in links:
        if not await link_target_exists(link, file.path):
            warnings.append(f"Wiki-link target not found: `[[{link}]]`")

    # Schema-specific validations
    if file.schema_type == "role":
        errors.extend(validate_role_specific(content, frontmatter))
    elif file.schema_type == "protocol":
        errors.extend(validate_protocol_specific(content, frontmatter))

    return ValidationResult(
        path=file.path,
        schema_type=file.schema_type,
        valid=len(errors) == 0,
        errors=errors,
        warnings=warnings
    )


def validate_role_specific(content: str, frontmatter: dict) -> List[str]:
    """Role-specific validation rules."""
    errors = []

    # Discord role must follow naming convention
    discord_role = frontmatter.get("discord_role", "")
    if discord_role and not discord_role.startswith("@"):
        errors.append("discord_role should start with @")

    # If NFT token defined, must have mint conditions
    if frontmatter.get("nft_token"):
        if "Mint Conditions" not in content and "minting" not in content.lower():
            errors.append("Role with NFT token should specify mint conditions")

    return errors


def validate_protocol_specific(content: str, frontmatter: dict) -> List[str]:
    """Protocol-specific validation rules."""
    errors = []

    # applies_to must be a valid reference
    applies_to = frontmatter.get("applies_to", [])
    if isinstance(applies_to, str):
        applies_to = [applies_to]

    for ref in applies_to:
        if not is_valid_component_reference(ref):
            errors.append(f"Invalid applies_to reference: {ref}")

    return errors
```

### Step 4: Report Results

```python
async def report_validation_results(
    pr: PullRequest,
    results: List[ValidationResult]
):
    """Post validation results to PR."""

    all_valid = all(r.valid for r in results)
    has_warnings = any(r.warnings for r in results)

    # Build comment
    if all_valid and not has_warnings:
        comment = "✅ **Schema Validation Passed**\n\nAll files conform to their respective schemas."
        label = "schema-valid"
    elif all_valid:
        comment = "✅ **Schema Validation Passed** (with warnings)\n\n"
        for result in results:
            if result.warnings:
                comment += f"### `{result.path}`\n"
                comment += "**Warnings:**\n"
                for warning in result.warnings:
                    comment += f"- ⚠️ {warning}\n"
                comment += "\n"
        label = "schema-valid"
    else:
        comment = "❌ **Schema Validation Failed**\n\n"
        for result in results:
            if not result.valid or result.warnings:
                comment += f"### `{result.path}`\n"
                comment += f"Schema: `{result.schema_type}`\n\n"
                if result.errors:
                    comment += "**Errors:**\n"
                    for error in result.errors:
                        comment += f"- ❌ {error}\n"
                if result.warnings:
                    comment += "**Warnings:**\n"
                    for warning in result.warnings:
                        comment += f"- ⚠️ {warning}\n"
                comment += "\n"
        label = "schema-invalid"

    # Post comment
    await add_pr_comment(
        repo=pr.repo,
        pr_number=pr.number,
        body=comment
    )

    # Update label
    await remove_labels(pr.repo, pr.number, ["schema-valid", "schema-invalid"])
    await add_label(pr.repo, pr.number, label)

    return all_valid
```

---

## Outputs

```yaml
outputs:
  on_valid:
    - comment: validation passed
    - label: schema-valid
    - log: schema_validation_passed

  on_invalid:
    - comment: errors listed
    - label: schema-invalid
    - log: schema_validation_failed
```

---

## Autonomous Execution

Fully autonomous — no human approval needed.

**Agent actions:**
- Runs schema validation on every PR automatically
- Posts results as PR comments
- Applies labels (schema-valid, schema-invalid)
- Blocks merge for invalid schemas (via GitHub branch protection)

**Notes:**
- Warnings don't block — participants decide whether to address them
- Valid PRs can merge immediately after consent (if amendment) or directly (if routine)

---

## Related Skills

- `index-content.md` — Post-merge indexing
- `../governance/process-amendment.md` — Constitution amendments
