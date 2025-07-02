# Automated Issue Carrier

[![Main](https://img.shields.io/github/actions/workflow/status/oobook/automated-issue-carrier/main.yml?label=build&logo=github-actions)](https://github.com/oobook/automated-issue-carrier/actions?workflow=main)
[![GitHub release (latest SemVer)](https://img.shields.io/github/v/release/oobook/automated-issue-carrier?label=release&logo=GitHub)](https://github.com/oobook/automated-issue-carrier/releases)
[![GitHub release (latest SemVer)](https://img.shields.io/github/release-date/oobook/automated-issue-carrier?label=release%20date&logo=GitHub)](https://github.com/oobook/automated-issue-carrier/releases)
![GitHub License](https://img.shields.io/github/license/oobook/automated-issue-carrier)

A GitHub action that automatically adds issues to GitHub Projects V2 based on labels and updates project item fields with custom values.

## What's it do?

This action listens for GitHub issue events (opened, labeled) and automatically:
- Adds issues to specified GitHub Projects V2 
- Updates project item fields with custom values (dates, text, numbers, single select options, iterations)
- Filters issues based on label conditions
- Supports multiple projects and complex label logic
- Prevents duplicate additions unless force update is enabled

## Inputs

| Name | Description | Required | Default |
| --- | --- | --- | --- |
| `gh_token` | GitHub token with repo access and project permissions | **Yes** | |
| `labels` | Labels to handle (supports AND/OR logic with space and comma separation) | No |  |
| `projects` | Project to handle (use `*` for all projects or project name/pattern) | No | `"*"` |
| `item_fields` | Item fields to handle (format: `field1:value1,field2:value2`) | No | |
| `force_update` | Force update the item fields even if issue already exists in project | No | `false` |
| `test` | Run mode of the action (enables test mode without making actual changes) | No | `false` |

## Outputs

| Name | Description |
| --- | --- |
| `response` | The response message indicating what was processed |
| `project_item_ids` | Array of project item IDs that were created or updated |

## Label Logic

The `labels` input supports complex label matching:
- **Comma-separated (OR logic)**: `"bug,enhancement"` - matches issues with bug AND enhancement label
- **Space-separated (AND logic)**: `"bug critical"` - matches issues with BOTH bug OR critical labels  
- **Combined**: `"bug,critical enhancement,accepted"` - matches issues with (bug AND critical) OR (enhancement AND accepted)

## Field Types Support

The action supports updating various GitHub Projects V2 field types:
- **TEXT**: Plain text fields
- **NUMBER**: Numeric fields
- **DATE**: Date fields (supports DD.MM.YYYY, MM/DD/YYYY, and ISO formats)
- **SINGLE_SELECT**: Dropdown fields (must match existing option names)
- **ITERATION**: Sprint/iteration fields (must match existing iteration titles)

## Usage Examples

### Basic Usage - Add All Issues to All Projects

```yaml
name: Issue to Project

on:
  issues:
    types: [opened, labeled]

permissions:
  issues: read
  repository-projects: write

jobs:
  add-to-project:
    runs-on: ubuntu-latest
    steps:
      - uses: oobook/automated-issue-carrier@v1
        with:
          gh_token: ${{ secrets.GITHUB_TOKEN }}
```

### Filter by Single Label

```yaml
name: Bug Issues to Project

on:
  issues:
    types: [opened, labeled]

permissions:
  issues: read
  repository-projects: write

jobs:
  add-bugs-to-project:
    runs-on: ubuntu-latest
    steps:
      - uses: oobook/automated-issue-carrier@v1
        with:
          gh_token: ${{ secrets.GITHUB_TOKEN }}
          labels: "bug"
```

### Multiple Labels (OR Logic)

```yaml
name: Bug or Enhancement Issues

on:
  issues:
    types: [opened, labeled]

permissions:
  issues: read
  repository-projects: write

jobs:
  add-to-project:
    runs-on: ubuntu-latest
    steps:
      - uses: oobook/automated-issue-carrier@v1
        with:
          gh_token: ${{ secrets.GITHUB_TOKEN }}
          labels: "bug enhancement feature"
```

### Multiple Labels (AND Logic)

```yaml
name: Critical Bug Issues

on:
  issues:
    types: [opened, labeled]

permissions:
  issues: read
  repository-projects: write

jobs:
  add-critical-bugs:
    runs-on: ubuntu-latest
    steps:
      - uses: oobook/automated-issue-carrier@v1
        with:
          gh_token: ${{ secrets.GITHUB_TOKEN }}
          labels: "bug,critical"
```

### Complex Label Logic (AND + OR)

```yaml
name: Complex Label Matching

on:
  issues:
    types: [opened, labeled]

permissions:
  issues: read
  repository-projects: write

jobs:
  add-to-project:
    runs-on: ubuntu-latest
    steps:
      - uses: oobook/automated-issue-carrier@v1
        with:
          gh_token: ${{ secrets.GITHUB_TOKEN }}
          # Matches: (bug AND critical) OR (enhancement AND accepted)
          labels: "bug,critical enhancement,accepted"
```

### Specific Project Only

```yaml
name: Add to Specific Project

on:
  issues:
    types: [opened, labeled]

permissions:
  issues: read
  repository-projects: write

jobs:
  add-to-specific-project:
    runs-on: ubuntu-latest
    steps:
      - uses: oobook/automated-issue-carrier@v1
        with:
          gh_token: ${{ secrets.GITHUB_TOKEN }}
          projects: "Sprint Planning"
          labels: "bug"
```

### Update Project Fields

```yaml
name: Add Issues with Custom Fields

on:
  issues:
    types: [opened, labeled]

permissions:
  issues: read
  repository-projects: write

jobs:
  add-with-fields:
    runs-on: ubuntu-latest
    steps:
      - uses: oobook/automated-issue-carrier@v1
        with:
          gh_token: ${{ secrets.GITHUB_TOKEN }}
          labels: "bug"
          item_fields: "Priority:High,Status:To Do,Assignee:john-doe"
```

### Advanced Field Types Example

```yaml
name: Advanced Field Updates

on:
  issues:
    types: [opened, labeled]

permissions:
  issues: read
  repository-projects: write

jobs:
  add-with-advanced-fields:
    runs-on: ubuntu-latest
    steps:
      - uses: oobook/automated-issue-carrier@v1
        with:
          gh_token: ${{ secrets.GITHUB_TOKEN }}
          labels: "enhancement"
          item_fields: "Due Date:31.12.2024,Story Points:5,Sprint:Sprint 1,Priority:Medium"
```

### Force Update Existing Items

```yaml
name: Force Update Project Items

on:
  issues:
    types: [labeled]

permissions:
  issues: read
  repository-projects: write

jobs:
  force-update:
    runs-on: ubuntu-latest
    steps:
      - uses: oobook/automated-issue-carrier@v1
        with:
          gh_token: ${{ secrets.GITHUB_TOKEN }}
          labels: "priority-changed"
          item_fields: "Priority:Critical,Updated:01.01.2024"
          force_update: true
```

### Test Mode

```yaml
name: Test Configuration

on:
  issues:
    types: [opened, labeled]

permissions:
  issues: read
  repository-projects: write

jobs:
  test-config:
    runs-on: ubuntu-latest
    steps:
      - uses: oobook/automated-issue-carrier@v1
        with:
          gh_token: ${{ secrets.GITHUB_TOKEN }}
          test: true
          labels: "bug"
          item_fields: "Priority:High,Status:In Progress"
```

### Using Outputs

```yaml
name: Process Issues and Use Outputs

on:
  issues:
    types: [opened, labeled]

permissions:
  issues: read
  repository-projects: write

jobs:
  process-issues:
    runs-on: ubuntu-latest
    steps:
      - uses: oobook/automated-issue-carrier@v1
        id: issue-processor
        with:
          gh_token: ${{ secrets.GITHUB_TOKEN }}
          labels: "bug,enhancement"
          item_fields: "Priority:Medium"
      
      - name: Use outputs
        run: |
          echo "Response: ${{ steps.issue-processor.outputs.response }}"
          echo "Project Item IDs: ${{ steps.issue-processor.outputs.project_item_ids }}"
```

## Permissions Required

The action requires the following permissions:
- `issues: read` - To read issue data
- `repository-projects: write` - To add items to projects and update fields

For organization-level projects, you may need additional permissions or a token with broader scope.

## Field Value Formats

### Date Fields
- European format: `DD.MM.YYYY` (e.g., `31.12.2024`)
- US format: `MM/DD/YYYY` (e.g., `12/31/2024`)
- ISO format: `YYYY-MM-DD` (e.g., `2024-12-31`)

### Single Select Fields
- Must match existing option names exactly
- Case-sensitive

### Iteration Fields  
- Must match existing iteration titles exactly
- Case-sensitive

### Number Fields
- Integer or decimal values
- Will be parsed as float

## Error Handling

The action will:
- Skip invalid field values with warnings
- Continue processing other fields if one fails
- Fail the workflow if required inputs are missing
- Log detailed information about each step

## Troubleshooting

### Common Issues

1. **"Field not found"** - Ensure field names match exactly with your project fields
2. **"Invalid option"** - For single select fields, ensure the option exists in the project
3. **"Permission denied"** - Check that the token has repository-projects write permissions
4. **"Date parsing failed"** - Use supported date formats (DD.MM.YYYY, MM/DD/YYYY, or ISO)

### Debug Mode

Use `test: true` to run in test mode without making actual changes:

```yaml
- uses: oobook/automated-issue-carrier@v1
  with:
    gh_token: ${{ secrets.GITHUB_TOKEN }}
    test: true
    labels: "bug"
    item_fields: "Priority:High"
```
