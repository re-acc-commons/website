# /coverage Command

Analyze knowledge commons coverage and identify gaps.

## Usage

```
/coverage [area] [options]
```

## Description

Assess how well the commons covers its taxonomy, identify underrepresented areas, and surface opportunities for contribution. Essential for strategic curation.

## Examples

```bash
# Full coverage report
/coverage

# Specific sector analysis
/coverage governance-and-political-systems

# Specific scale analysis
/coverage --scale municipal

# Gaps only
/coverage --gaps

# Quality metrics
/coverage --quality

# Contributor analysis
/coverage --contributors

# Export as JSON
/coverage --json

# Compare to previous snapshot
/coverage --compare 2026-01-01
```

## Options

| Option | Description |
|--------|-------------|
| `--sector <sector>` | Analyze specific sector |
| `--scale <scale>` | Analyze specific scale |
| `--type <type>` | Analyze specific resource type |
| `--gaps` | Show gaps only |
| `--quality` | Focus on quality metrics |
| `--contributors` | Contributor analysis |
| `--json` | Output as JSON |
| `--compare <date>` | Compare to historical snapshot |

## Output

### Summary Report

```markdown
# Coverage Analysis

**Overall**: 72% coverage
**Entities**: 156
**Generated**: 2026-02-02

## Critical Gaps

1. **Household scale** - 10% coverage
   Only 8 entities address household-level patterns

2. **Planetary scale** - 20% coverage
   Limited global/planetary governance content

3. **Economic sector** - 45% coverage
   Underrepresented compared to other sectors

## Recommendations

1. Add household-scale governance patterns
2. Recruit contributors with global governance expertise
3. Expand economic and resource sharing content
```

### By Sector

Shows coverage percentage for each of the 13 civic sectors with visual indicators.

### By Scale

Shows coverage percentage for each of the 7 civic scales.

### Relationship Health

- Orphan entities (no connections)
- Isolated clusters
- Bridge entities

### Quality Metrics

- Completeness (all fields filled)
- Freshness (recently updated)
- Required fields status

## Thresholds

| Status | Coverage |
|--------|----------|
| ✅ Excellent | 90%+ |
| ✅ Good | 70-89% |
| 🟡 Fair | 50-69% |
| 🔴 Gap | 30-49% |
| 🔴 Critical | <30% |

## Related Commands

- `/graph --stats` - Visual relationship analysis
- `/digest` - Include coverage in summaries
- `/status` - Current commons status

## Skill

Uses: `analyze-coverage`
