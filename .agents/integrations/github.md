# GitHub Integration Specification

Technical specification for agent operations on the Re/acc Commons GitHub organization.

---

## Connection

```yaml
platform: github
api_version: v4 (GraphQL) + REST
base_url: https://api.github.com
auth_type: github_app or personal_access_token
required_scopes:
  - repo
  - read:org
  - write:org
```

---

## Repository Structure

```yaml
organization: ${REACC_GITHUB_ORG}

repositories:
  constitution:
    name: "reacc-commons-constitution"
    purpose: "Constitutional record and governance documents"
    path_structure:
      - "Re-acc Commons Constitution/"  # Main constitution
      - "Records/"                       # Amendment, accountability, treasury records
      - "logs/agents/"                   # Agent action logs

  knowledge_commons:
    name: "reacc-knowledge-commons"
    purpose: "Patterns, protocols, and shared documentation"
    path_structure:
      - "patterns/"
      - "protocols/"
      - "schemas/"
      - "learnings/"

  agent_infrastructure:
    name: "reacc-agent-infra"
    purpose: "Agent code, configurations, and coordination"

  federation:
    name: "reacc-federation"
    purpose: "Federation agreements and schema bridges"
```

---

## Operations

### Read Repository Content

```python
async def read_file(repo: str, path: str, ref: str = "main") -> FileContent:
    """Read a file from repository."""
    response = await github.repos.get_content(
        owner=ORG_NAME,
        repo=repo,
        path=path,
        ref=ref
    )

    content = base64.b64decode(response.content).decode('utf-8')

    return FileContent(
        path=path,
        content=content,
        sha=response.sha,
        frontmatter=parse_yaml_frontmatter(content)
    )
```

### Create/Update File

```python
async def write_file(
    repo: str,
    path: str,
    content: str,
    message: str,
    branch: str = "main",
    sha: Optional[str] = None  # Required for updates
) -> CommitResult:
    """Create or update a file."""

    # Get current SHA if updating
    if sha is None:
        try:
            existing = await read_file(repo, path)
            sha = existing.sha
        except NotFoundError:
            pass  # New file

    response = await github.repos.create_or_update_file(
        owner=ORG_NAME,
        repo=repo,
        path=path,
        message=f"🤖 Agent: {message}",
        content=base64.b64encode(content.encode()).decode(),
        sha=sha,
        branch=branch
    )

    await log_action("file_written", repo, path, response.commit.sha)
    return CommitResult(sha=response.commit.sha, path=path)
```

### Create Pull Request

```python
async def create_pull_request(
    repo: str,
    title: str,
    body: str,
    head: str,  # Source branch
    base: str = "main",
    labels: list[str] = None
) -> PullRequest:
    """Create a pull request for governance changes."""

    pr = await github.pulls.create(
        owner=ORG_NAME,
        repo=repo,
        title=f"🤖 {title}",
        body=body,
        head=head,
        base=base
    )

    if labels:
        await github.issues.add_labels(
            owner=ORG_NAME,
            repo=repo,
            issue_number=pr.number,
            labels=labels
        )

    await log_action("pr_created", repo, pr.number, pr.html_url)
    return pr
```

### Merge Pull Request

```python
async def merge_pull_request(
    repo: str,
    pr_number: int,
    consent_record: ConsentRecord,
    merge_method: str = "squash"
) -> MergeResult:
    """
    Merge a PR after consent is documented.
    Agent has merge rights - executes autonomously after consent complete.
    """

    # Verify consent is documented in PR
    if not await verify_consent_documented(repo, pr_number, consent_record):
        raise ConsentNotDocumentedError(pr_number)

    # Add consent record as comment
    await github.issues.create_comment(
        owner=ORG_NAME,
        repo=repo,
        issue_number=pr_number,
        body=format_consent_comment(consent_record)
    )

    # Merge
    result = await github.pulls.merge(
        owner=ORG_NAME,
        repo=repo,
        pull_number=pr_number,
        merge_method=merge_method,
        commit_message=f"Merged with consent: {consent_record.summary}"
    )

    await log_action("pr_merged", repo, pr_number, consent_record.id)
    return result
```

### Create Branch

```python
async def create_branch(repo: str, branch_name: str, from_ref: str = "main") -> Branch:
    """Create a branch for amendment or governance changes."""

    # Get SHA of source ref
    ref = await github.git.get_ref(
        owner=ORG_NAME,
        repo=repo,
        ref=f"heads/{from_ref}"
    )

    # Create new branch
    new_ref = await github.git.create_ref(
        owner=ORG_NAME,
        repo=repo,
        ref=f"refs/heads/{branch_name}",
        sha=ref.object.sha
    )

    return Branch(name=branch_name, sha=new_ref.object.sha)
```

---

## Constitutional Amendment Workflow

```python
async def process_amendment_pr(pr: PullRequest) -> AmendmentStatus:
    """
    Process a constitutional amendment PR through consent workflow.
    """

    # 1. Validate PR format
    validation = await validate_amendment_pr(pr)
    if not validation.valid:
        await add_pr_comment(pr, format_validation_errors(validation))
        await add_label(pr, "needs-revision")
        return AmendmentStatus.NEEDS_REVISION

    # 2. Determine amendment type and required consent
    amendment_type = determine_amendment_type(pr)
    consent_requirements = CONSENT_REQUIREMENTS[amendment_type]

    # 3. Post to Discord #proposals
    discord_msg = await post_to_proposals(
        title=pr.title,
        body=pr.body,
        pr_url=pr.html_url,
        consent_window=consent_requirements.window_hours
    )

    # 4. Add label and link
    await add_label(pr, f"consent-required-{consent_requirements.window_hours}h")
    await add_pr_comment(pr, f"Posted to Discord for consent: {discord_msg.jump_url}")

    # 5. Monitor consent (handled by governance skills)
    return AmendmentStatus.CONSENT_PENDING

CONSENT_REQUIREMENTS = {
    "clarification": ConsentReq(quorum=3, window_hours=48, full_commons=False),
    "minor": ConsentReq(quorum=3, window_hours=48, full_commons=False),
    "substantial": ConsentReq(quorum="all", window_hours=72, full_commons=True),
    "foundational": ConsentReq(quorum="all", window_hours=72, full_commons=True),
}
```

---

## Log Writing

```python
async def write_agent_log(action: AgentAction) -> str:
    """Write agent action to log file in repository."""

    log_date = action.timestamp.strftime("%Y-%m-%d")
    log_path = f"logs/agents/{log_date}.jsonl"

    # Read existing log
    try:
        existing = await read_file("reacc-commons-constitution", log_path)
        content = existing.content + "\n" + json.dumps(action.to_dict())
        sha = existing.sha
    except NotFoundError:
        content = json.dumps(action.to_dict())
        sha = None

    await write_file(
        repo="reacc-commons-constitution",
        path=log_path,
        content=content,
        message=f"Log: {action.action_type}",
        sha=sha
    )

    return log_path
```

---

## Records Management

### Amendment Record

```python
async def create_amendment_record(
    amendment: Amendment,
    consent_record: ConsentRecord,
    pr: PullRequest
) -> str:
    """Create amendment record in Records/Amendments/"""

    record_path = f"Records/Amendments/{amendment.id}.md"

    content = f"""---
id: {amendment.id}
type: amendment
amendment_type: {amendment.type}
date: {amendment.date.isoformat()}
proposer: {amendment.proposer}
pr_number: {pr.number}
---

# Amendment: {amendment.title}

## Summary
{amendment.summary}

## Rationale
{amendment.rationale}

## Changes
{format_changes(amendment.changes)}

## Consent Record

| Aspect | Value |
|--------|-------|
| Consents | {consent_record.consent_count} |
| Window | {consent_record.window_hours}h |
| Objections | {len(consent_record.objections)} resolved |

### Consenting Members
{format_consent_list(consent_record.consents)}

### Objection Resolution
{format_objection_resolution(consent_record.objections)}

## Reference
- Pull Request: {pr.html_url}
- Merged: {pr.merged_at.isoformat()}
"""

    await write_file(
        repo="reacc-commons-constitution",
        path=record_path,
        content=content,
        message=f"Record amendment: {amendment.title}"
    )

    return record_path
```

---

## Error Handling

```python
async def handle_github_error(error: GitHubError, context: ActionContext):
    if error.status == 404:
        await log_warning(f"Resource not found: {context.resource}")
    elif error.status == 403:
        await notify_stewardship(
            f"Rate limit or permission issue: {context.action}\n"
            f"Reset at: {error.headers.get('X-RateLimit-Reset')}"
        )
    elif error.status == 422:
        await log_error(f"Validation error: {error.message}", context)
    else:
        await log_error(error, context)
        raise
```

---

## Webhooks

Configure webhooks for real-time triggers:

```yaml
webhooks:
  - event: pull_request
    actions: [opened, synchronize, closed]
    target: process_amendment_pr

  - event: push
    branches: [main]
    target: index_content_changes

  - event: issue_comment
    target: process_pr_comment
```
