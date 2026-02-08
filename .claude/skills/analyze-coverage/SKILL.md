# Analyze Coverage Skill

Identify gaps and opportunities in the knowledge commons.

## Purpose

Assess how well the commons covers its taxonomy, identify underrepresented areas, and surface opportunities for growth. Essential for strategic curation and contribution prioritization.

## Analysis Types

### Taxonomy Coverage

How well does content cover the defined taxonomy?

```
Governance Sector Coverage:
████████████████░░░░ 80% (24/30 expected patterns)

Civic Scales:
  Individual    ████████░░░░░░░░░░░░ 40%
  Household     ██░░░░░░░░░░░░░░░░░░ 10%  ← GAP
  Neighborhood  ████████████████░░░░ 80%
  Municipal     ████████████████████ 100%
  Bioregional   ████████░░░░░░░░░░░░ 40%
  National      ██████████░░░░░░░░░░ 50%
  Planetary     ████░░░░░░░░░░░░░░░░ 20%  ← GAP
```

### Relationship Density

Are entities well-connected?

```
Relationship Analysis:
  Orphan entities (0 connections): 12 ← CONCERN
  Weakly connected (1-2): 34
  Well connected (3-5): 56
  Highly connected (6+): 24

  Bridge entities (connect clusters): 8
  Isolated clusters: 2 ← CONCERN
```

### Content Quality

Are entities complete and fresh?

```
Quality Metrics:
  Complete (all fields): 67%
  Partial (missing optional): 28%
  Incomplete (missing required): 5% ← ACTION NEEDED

  Fresh (updated <30 days): 45%
  Stale (30-90 days): 35%
  Very stale (>90 days): 20% ← REVIEW NEEDED
```

### Contribution Patterns

Who's contributing what?

```
Contributor Analysis:
  Active contributors: 8
  Recent (30 days): 5
  Top contributor: @contributor1 (34 entities)

  Sector specialists:
    Governance: @contributor1, @contributor2
    Education: @contributor3
    Economic: (none identified) ← RECRUIT
```

## When to Use

- `/coverage` - Full coverage report
- `/coverage <sector>` - Sector-specific analysis
- `/coverage --gaps` - Focus on gaps only
- Strategic planning sessions
- Contributor recruitment
- Content prioritization

## Analysis Pipeline

### 1. Load Data

```yaml
load:
  entities:
    source: _index/entities.json
    fields: [id, type, sectors, scales, created_at, updated_at]

  taxonomy:
    source: taxonomy/opl.yaml
    fields: [sectors, scales, resource_types]

  relationships:
    source: _index/relationships.json

  git_history:
    source: git log
    for: contributor analysis
```

### 2. Compute Metrics

```yaml
metrics:
  # Taxonomy coverage
  taxonomy_coverage:
    for_each: [sector, scale, type]
    compute:
      - entity_count
      - expected_count (from taxonomy)
      - coverage_percent
      - gap_size

  # Relationship analysis
  relationship_metrics:
    compute:
      - orphan_count
      - avg_connections
      - max_connections
      - cluster_count
      - bridge_entities

  # Quality metrics
  quality_metrics:
    compute:
      - completeness_score
      - freshness_distribution
      - required_fields_missing

  # Contributor metrics
  contributor_metrics:
    compute:
      - contributor_count
      - entities_per_contributor
      - sector_specialization
      - recent_activity
```

### 3. Identify Gaps

```yaml
gap_detection:
  taxonomy_gaps:
    threshold: 50%  # Below this = gap
    identify:
      - sparse_sectors
      - sparse_scales
      - missing_type_sector_combinations

  relationship_gaps:
    identify:
      - orphan_entities
      - isolated_clusters
      - sparse_connections

  quality_gaps:
    identify:
      - incomplete_entities
      - stale_entities
      - missing_required_fields

  contributor_gaps:
    identify:
      - uncovered_sectors
      - single_point_of_failure (one contributor)
```

### 4. Generate Recommendations

```yaml
recommendations:
  priority_scoring:
    factors:
      - gap_severity (weight: 0.4)
      - strategic_importance (weight: 0.3)
      - ease_of_filling (weight: 0.2)
      - community_interest (weight: 0.1)

  output:
    - high_priority_gaps: [...]
    - recommended_actions: [...]
    - suggested_contributors: [...]
```

## Output Formats

### Summary Report

```markdown
# Coverage Analysis Report

**Generated**: 2026-02-02
**Commons**: Open Protocol Library
**Entities**: 156

## Executive Summary

Overall coverage is **72%** with notable gaps in:
- Household scale (10% coverage)
- Planetary scale (20% coverage)
- Economic sector (45% coverage)

## Taxonomy Coverage

### By Sector

| Sector | Entities | Coverage | Status |
|--------|----------|----------|--------|
| Governance | 34 | 85% | ✅ Good |
| Civic Engagement | 28 | 70% | ✅ Good |
| Education | 22 | 55% | 🟡 Fair |
| Economic | 18 | 45% | 🔴 Gap |
| ... | ... | ... | ... |

### By Scale

| Scale | Entities | Coverage | Status |
|-------|----------|----------|--------|
| Municipal | 42 | 95% | ✅ Excellent |
| Neighborhood | 38 | 80% | ✅ Good |
| Individual | 24 | 55% | 🟡 Fair |
| Household | 8 | 10% | 🔴 Critical Gap |
| Planetary | 12 | 20% | 🔴 Gap |

### By Resource Type

| Type | Count | % of Total |
|------|-------|------------|
| Patterns | 45 | 29% |
| Protocols | 32 | 21% |
| Playbooks | 18 | 12% |
| ... | ... | ... |

## Relationship Health

- **Orphan entities**: 12 (7.7%)
- **Average connections**: 3.2
- **Isolated clusters**: 2
- **Bridge entities**: 8

### Orphan Entities (No Connections)

1. [Entity A](/path/a/) - Pattern
2. [Entity B](/path/b/) - Protocol
...

## Quality Assessment

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Completeness | 72% | 90% | 🟡 |
| Freshness (<30d) | 45% | 60% | 🟡 |
| Required fields | 95% | 100% | ✅ |

### Stale Content (>90 days)

1. [Old Entity](/path/) - Last updated 120 days ago
2. ...

## Recommendations

### High Priority

1. **Add household-scale patterns**
   Gap: 90% missing
   Suggested: Home governance, family decision-making

2. **Connect orphan entities**
   12 entities have no relationships
   Action: Review and link to related content

3. **Refresh stale content**
   31 entities not updated in 90+ days

### Medium Priority

1. **Expand planetary scale**
2. **Recruit economic sector contributor**
3. **Add more playbooks**

## Contributor Health

- **Active (30d)**: 5 contributors
- **Sector coverage**: 10/13 sectors have specialists
- **Risk**: Governance depends on 1 contributor
```

### JSON Output

```json
{
  "generated_at": "2026-02-02T10:00:00Z",
  "summary": {
    "total_entities": 156,
    "overall_coverage": 0.72,
    "gap_count": 5
  },
  "taxonomy": {
    "sectors": {
      "governance-and-political-systems": {
        "count": 34,
        "coverage": 0.85,
        "status": "good"
      }
    },
    "scales": {...},
    "types": {...}
  },
  "gaps": [
    {
      "type": "scale",
      "name": "household",
      "coverage": 0.10,
      "severity": "critical",
      "recommendation": "Add household-scale patterns"
    }
  ],
  "relationships": {
    "orphan_count": 12,
    "avg_connections": 3.2,
    "isolated_clusters": 2
  },
  "quality": {
    "completeness": 0.72,
    "freshness_30d": 0.45,
    "required_fields": 0.95
  },
  "recommendations": [...]
}
```

## Visualization

### Coverage Heatmap

```
              Individual  Household  Neighborhood  Municipal  Bioregional  National  Planetary
Governance        ███        █           ████         █████       ███        ████        ██
Civic Eng         ████       ██          █████        █████       ████       ███         █
Education         ███        █           ████         ████        ██         ███         █
Economic          ██         █           ███          ███         █          ██          █
Health            ███        ██          ████         ████        ██         ███         █
...

Legend: █ = entities, █████ = high coverage, █ = low coverage, (empty) = gap
```

### Gap Radar

```
                    Governance
                        ●
                   ╱    │    ╲
              ╱         │         ╲
         Civic ●────────┼────────● Education
              ╲         │         ╱
                   ╲    │    ╱
                        ●
                    Economic

Legend: Distance from center = coverage (further = better)
```

## Configuration

### In `config/coverage.yaml`

```yaml
coverage:
  # Thresholds
  thresholds:
    excellent: 0.90
    good: 0.70
    fair: 0.50
    gap: 0.30
    critical: 0.10

  # Expected minimums per category
  expected:
    per_sector: 20
    per_scale: 15
    per_type:
      pattern: 30
      protocol: 20
      playbook: 15

  # Quality
  quality:
    freshness_threshold_days: 30
    stale_threshold_days: 90
    required_fields:
      - title
      - summary
      - sectors
      - scales

  # Reports
  reports:
    output_dir: _reports/
    formats: [markdown, json]
    archive: true

  # Scheduling
  schedule:
    enabled: true
    frequency: weekly
    day: sunday
    notify: true
```

## Commands

```yaml
commands:
  "/coverage":
    description: "Full coverage report"

  "/coverage <sector>":
    description: "Sector-specific analysis"

  "/coverage --gaps":
    description: "Show gaps only"

  "/coverage --quality":
    description: "Focus on quality metrics"

  "/coverage --contributors":
    description: "Contributor analysis"

  "/coverage --json":
    description: "Output as JSON"

  "/coverage --compare <date>":
    description: "Compare to historical snapshot"
```

## Integration

### With Digest

Include coverage summary in digests:

```yaml
digest:
  monthly:
    include:
      - coverage_summary
      - top_gaps
      - progress_vs_last_month
```

### With Graph

Use graph for relationship analysis:

```yaml
graph:
  - identify orphans
  - find isolated clusters
  - compute centrality
```

### With Q&A

Answer coverage questions:

```yaml
qa:
  - "What are our biggest gaps?"
  - "Which sectors need work?"
  - "How complete is governance?"
```

## Tracking Over Time

```yaml
historical:
  snapshots:
    - save weekly snapshot
    - store in _reports/coverage/

  trends:
    - coverage over time
    - gap closure rate
    - contributor growth

  alerts:
    - coverage dropped >5%
    - new critical gap
    - contributor churn
```
