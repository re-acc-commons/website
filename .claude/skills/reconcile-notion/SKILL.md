# Reconcile Notion Skill

Reconciles GitHub and Notion after PR merges to ensure consistency.

## Purpose

After a PR is merged in commons mode:
1. Detect what changed in the merge
2. Push those specific changes to Notion
3. Verify Notion reflects GitHub state
4. Report any discrepancies

## When Triggered

- Post-merge hook in GitHub workflow
- Manual via `/github sync` command
- Scheduled reconciliation (optional)

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `merge_commit` | string | Yes | The merge commit hash |
| `pr_number` | number | Yes | The merged PR number |
| `changed_files` | array | Yes | Files changed in the PR |

## Outputs

```yaml
reconciliation:
  status: success
  changes_synced: 5
  discrepancies: 0

  synced:
    - file: patterns/food-sovereignty.md
      notion_action: created
      notion_id: abc123

    - file: _index/entities.json
      notion_action: skipped  # Index files not synced

  verified:
    - entity: food-sovereignty
      github_updated: 2026-02-01T12:00:00Z
      notion_updated: 2026-02-01T12:00:05Z
      match: true
```

## Reconciliation Process

```
1. Get diff from merge commit
2. Filter to content files (not index, config, etc.)
3. For each changed file:
   a. Determine change type (add, modify, delete)
   b. Map to Notion database
   c. Perform corresponding Notion operation
4. Verify Notion state matches GitHub
5. Report discrepancies
```

## Discrepancy Handling

When Notion doesn't match GitHub:

```yaml
discrepancy:
  file: patterns/participatory-budgeting.md
  issue: content_mismatch
  github_hash: abc123
  notion_hash: def456
  resolution: force_push  # or flag_for_review
```

Options:
- **Force push**: Overwrite Notion with GitHub (default)
- **Flag for review**: Create issue/notification
- **Manual resolve**: Require human intervention

## Integration with Notion MCP

Uses Notion MCP server when available:

```python
# Pseudo-code
if mcp_available("notion"):
    result = mcp_call("notion", "update_page", {...})
else:
    result = notion_api.update_page(...)
```

## Error Handling

| Error | Action |
|-------|--------|
| Notion page deleted | Recreate from GitHub |
| Database missing | Log error, skip sync |
| Rate limit | Retry with backoff |
| Partial sync failure | Complete what's possible, report failures |
