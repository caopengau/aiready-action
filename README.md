# AIReady GitHub Action

Analyze your codebase for AI readability - Block PRs that break your AI context budget.

## Usage

```yaml
name: AIReady Check

on:
  pull_request:
    branches: [main]

jobs:
  aiready:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: AIReady Check
        uses: caopengau/aiready-action@v1
        with:
          fail-on-issues: true
          min-score: 70
          max-issues: 10
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `token` | GitHub token for API access | No | `${{ github.token }}` |
| `paths` | Paths to analyze (comma-separated) | No | `.` |
| `exclude` | Patterns to exclude (comma-separated) | No | `''` |
| `fail-on-issues` | Fail the workflow if issues are found | No | `false` |
| `max-issues` | Maximum number of issues allowed before failing | No | `10` |
| `min-score` | Minimum AI readiness score required (0-100) | No | `70` |
| `output-format` | Output format (summary, json, or both) | No | `summary` |

## Outputs

| Output | Description |
|--------|-------------|
| `passed` | Whether the AI readiness check passed |
| `score` | AI readiness score (0-100) |
| `issues` | Number of issues found |
| `warnings` | Number of warnings found |
| `report` | Detailed report in JSON format |

## Example Workflow

```yaml
name: AIReady Check

on:
  pull_request:
    branches: [main]

jobs:
  aiready:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: AIReady Check
        id: aiready
        uses: caopengau/aiready-action@v1
        with:
          fail-on-issues: true
          min-score: 80
          max-issues: 5
          
      - name: Comment PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## AIReady Results\n\n**Score:** ${{ steps.aiready.outputs.score }}/100\n**Issues:** ${{ steps.aiready.outputs.issues }}\n**Warnings:** ${{ steps.aiready.outputs.warnings }}\n\n${{ steps.aiready.outputs.passed == 'true' ? '✅ Passed' : '❌ Failed' }}`
            })
```

## What AIReady Checks

- **Semantic Duplicates**: Detects code that looks different but does the same thing
- **Context Fragmentation**: Identifies import chains that waste context windows
- **Naming Consistency**: Checks for inconsistent naming patterns
- **Documentation Gaps**: Finds missing or outdated documentation

## License

MIT