---
name: Azure DevOps / TFS MCP Server
description: Azure DevOps Server / TFS integration for work item documentation and test scenario analysis
---

# Azure DevOps / TFS MCP Server Skill

## Overview

This skill provides access to Azure DevOps Server and Team Foundation Server (TFS) on-premises installations through a Model Context Protocol (MCP) server. It enables you to retrieve work items, search using WIQL (Work Item Query Language), and access work item comments/history for documentation analysis and test scenario preparation.

## Configuration

The TFS/Azure DevOps MCP server requires the following environment variables:
- `TFS_URL`: Your TFS/Azure DevOps Server URL (e.g., `http://tfs.example.local:8080/tfs/your_collection`)
- `TFS_PROJECT`: Project name (e.g., `YourProject`)
- `TFS_PAT`: Personal Access Token for authentication
- `TFS_API_VERSION`: API version (default: `6.0`)

## Available Tools

### 1. tfs_get_work_item
**Purpose**: Retrieve complete work item details including all fields, comments, and history

**Key Use Cases for Testing & Documentation**:
- Get full specification of requirements for test scenario creation
- Review acceptance criteria and reproduction steps
- Analyze work item history and changes
- Extract detailed descriptions for documentation
- Retrieve assigned work items for test execution planning

**Input Parameters**:
- `id` (required): Work item ID (integer)

**Returned Data Fields**:
- `id`: Work item ID
- `title`: Work item title (System.Title)
- `state`: Current state (System.State)
- `type`: Work item type (Bug, User Story, Task, Test Case, etc.)
- `assignedTo`: Currently assigned person
- `createdBy`: Original creator
- `createdDate`: Creation timestamp
- `changedDate`: Last modification timestamp
- `description`: Main description (System.Description)
- `reproSteps`: Reproduction steps (for bugs)
- `acceptanceCriteria`: Acceptance criteria (for stories/features)
- `priority`: Priority level
- `severity`: Severity level (for bugs)
- `areaPath`: Area classification
- `iterationPath`: Iteration/sprint assignment
- `tags`: Associated tags
- `comments`: Full list of comments with author and timestamp
- `webUrl`: Direct link to work item in browser

**Example Usage**:
```
Get full details of work item 12345 to analyze requirements and prepare test scenarios
```

**Best Practices**:
- Use this for detailed analysis of individual work items
- Review acceptance criteria to create comprehensive test scenarios
- Check reproduction steps for bug verification
- Examine comments for additional context and discussion
- Review tags to categorize test areas

### 2. tfs_get_comments
**Purpose**: Retrieve only the comments/history for a specific work item

**Key Use Cases**:
- Extract discussion history for documentation
- Review testing feedback and results
- Analyze change requests and clarifications
- Understand requirements evolution through comments
- Track testing progress notes

**Input Parameters**:
- `id` (required): Work item ID (integer)

**Returned Data**:
- List of comments with:
  - `id`: Comment/revision ID
  - `revisedBy`: Person who made the comment
  - `revisedDate`: When the comment was added
  - `text`: Comment content

**Example Usage**:
```
Get all comments for work item 12345 to review testing discussions and feedback
```

**Best Practices**:
- Use to understand requirements clarifications
- Extract testing notes and results
- Review historical context for test scenarios
- Identify requirement changes over time

### 3. tfs_search_work_items
**Purpose**: Search and filter work items using WIQL (Work Item Query Language)

**Key Use Cases for Documentation & Testing**:
- Find all test cases in a specific area
- Retrieve user stories ready for testing
- Get all bugs in a particular state
- Find work items by iteration/sprint
- Search by tags or classification
- Generate test scenario lists

**Input Parameters**:
- `query` (required): WIQL query string

**Returned Data**:
- List of work item references (ID, URL)
- Use `tfs_get_work_item` to get full details for each result

**Example WIQL Queries**:

#### Basic Queries
```sql
-- Get all active user stories
SELECT [System.Id] FROM WorkItems 
WHERE [System.WorkItemType] = 'User Story' 
AND [System.State] = 'Active'

-- Get all test cases in specific area
SELECT [System.Id] FROM WorkItems 
WHERE [System.WorkItemType] = 'Test Case' 
AND [System.AreaPath] = 'ZVJS\\Authentication'

-- Get all bugs with high priority
SELECT [System.Id] FROM WorkItems 
WHERE [System.WorkItemType] = 'Bug' 
AND [System.State] IN ('New', 'Active') 
AND [Microsoft.VSTS.Common.Priority] <= 2
```

#### Advanced Queries for Testing
```sql
-- Find work items ready for testing in current iteration
SELECT [System.Id], [System.Title], [System.State] 
FROM WorkItems 
WHERE [System.TeamProject] = 'ZVJS' 
AND [System.State] = 'Ready for Testing' 
AND [System.IterationPath] = @currentIteration

-- Get all user stories with acceptance criteria
SELECT [System.Id] 
FROM WorkItems 
WHERE [System.WorkItemType] = 'User Story' 
AND [Microsoft.VSTS.Common.AcceptanceCriteria] <> ''

-- Find all bugs found in specific iteration
SELECT [System.Id], [System.Title], [Microsoft.VSTS.Common.Priority] 
FROM WorkItems 
WHERE [System.WorkItemType] = 'Bug' 
AND [System.IterationPath] = 'ZVJS\\Sprint 23' 
ORDER BY [Microsoft.VSTS.Common.Priority]

-- Get test cases not yet executed
SELECT [System.Id], [System.Title] 
FROM WorkItems 
WHERE [System.WorkItemType] = 'Test Case' 
AND [Microsoft.VSTS.TCM.AutomationStatus] = 'Not Automated' 
AND [System.State] <> 'Closed'
```

#### Documentation Analysis Queries
```sql
-- Find all requirements without linked test cases
SELECT [System.Id], [System.Title] 
FROM WorkItems 
WHERE [System.WorkItemType] IN ('User Story', 'Requirement') 
AND [System.State] <> 'Removed' 
AND NOT [System.Id] IN (
    SELECT [System.Links.LinkType] = 'Tested By' 
    FROM WorkItemLinks
)

-- Get all work items modified in last 7 days
SELECT [System.Id], [System.Title], [System.ChangedDate] 
FROM WorkItems 
WHERE [System.TeamProject] = 'ZVJS' 
AND [System.ChangedDate] >= @today - 7

-- Find work items by tag
SELECT [System.Id], [System.Title] 
FROM WorkItems 
WHERE [System.Tags] CONTAINS 'Documentation' 
OR [System.Tags] CONTAINS 'Testing'
```

**Example Usage**:
```
Search for all user stories in Ready for Testing state:
query: "SELECT [System.Id] FROM WorkItems WHERE [System.State] = 'Ready for Testing' AND [System.WorkItemType] = 'User Story'"
```

## Best Practices for Documentation Analysis

### 1. Requirements Traceability
```
Workflow:
1. Use tfs_search_work_items to find all User Stories in an area
2. Use tfs_get_work_item for each to extract acceptance criteria
3. Review comments with tfs_get_comments to understand clarifications
4. Create test scenario mapping based on acceptance criteria
```

### 2. Test Scenario Preparation
```
Step-by-step approach:
1. Search for work items ready for testing:
   WIQL: "SELECT [System.Id] FROM WorkItems WHERE [System.State] = 'Ready for Testing'"
   
2. For each result, get full details:
   Use tfs_get_work_item to extract:
   - Acceptance criteria
   - Description
   - Reproduction steps (if bug)
   
3. Review historical context:
   Use tfs_get_comments to check discussions and clarifications
   
4. Prepare test scenarios based on extracted data
```

### 3. Bug Analysis for Testing
```
1. Find all active bugs in area:
   WIQL: "SELECT [System.Id] FROM WorkItems WHERE [System.WorkItemType] = 'Bug' AND [System.State] = 'Active' AND [System.AreaPath] UNDER 'ZVJS\\MyArea'"
   
2. Get reproduction steps:
   Use tfs_get_work_item to extract Microsoft.VSTS.TCM.ReproSteps
   
3. Verify testing notes:
   Use tfs_get_comments to review testing feedback
```

### 4. Sprint/Iteration Planning
```
1. Get all work items in current sprint:
   WIQL: "SELECT [System.Id], [System.Title], [System.State] FROM WorkItems WHERE [System.IterationPath] = 'ZVJS\\Sprint X' ORDER BY [Microsoft.VSTS.Common.Priority]"
   
2. Categorize by type and state
3. Extract requirements for test planning
4. Review progress through comments
```

## WIQL Reference for Testing

### Common Fields
- `[System.Id]` - Work item ID
- `[System.Title]` - Title
- `[System.WorkItemType]` - Type (Bug, User Story, Task, Test Case)
- `[System.State]` - Current state
- `[System.AssignedTo]` - Assigned person
- `[System.AreaPath]` - Area classification
- `[System.IterationPath]` - Sprint/iteration
- `[System.Tags]` - Tags
- `[System.CreatedDate]` - Creation date
- `[System.ChangedDate]` - Last modified date
- `[Microsoft.VSTS.Common.Priority]` - Priority (1-4)
- `[Microsoft.VSTS.Common.Severity]` - Severity (1-4)
- `[Microsoft.VSTS.Common.AcceptanceCriteria]` - Acceptance criteria
- `[Microsoft.VSTS.TCM.ReproSteps]` - Reproduction steps

### Common Operators
- `=`, `<>` - Equals, not equals
- `>`, `<`, `>=`, `<=` - Comparison
- `IN`, `NOT IN` - List membership
- `CONTAINS` - String contains
- `UNDER` - Area/iteration hierarchy
- `@currentIteration`, `@today` - Macros

## Integration with Testing Workflows

### Pattern 1: Complete Test Coverage Analysis
```
1. tfs_search_work_items - Find all User Stories in area
2. For each story:
   a. tfs_get_work_item - Get acceptance criteria
   b. tfs_search_work_items - Find linked Test Cases
   c. Identify gaps in test coverage
3. Document missing test scenarios
```

### Pattern 2: Regression Test Identification
```
1. tfs_search_work_items - Find all recently modified bugs
   WIQL: "WHERE [System.WorkItemType] = 'Bug' AND [System.State] = 'Resolved' AND [System.ChangedDate] >= @today - 30"
2. tfs_get_work_item - Get reproduction steps for each
3. Create regression test scenarios
```

### Pattern 3: Iteration Test Planning
```
1. tfs_search_work_items - Get all work items in sprint
2. Group by Area Path for test area categorization
3. Extract acceptance criteria from each
4. Plan test execution order by priority
5. Review comments for special testing considerations
```

## Tips for Effective Use

1. **Start with WIQL Search**: Use `tfs_search_work_items` to narrow down relevant work items
2. **Batch Analysis**: Get IDs from search, then fetch details only for relevant items
3. **Use Comments for Context**: Always check comments to understand full requirements history
4. **Filter by Area Path**: Organize test scenarios by system areas
5. **Check Acceptance Criteria**: Primary source for test scenario creation
6. **Review Reproduction Steps**: Essential for bug verification tests
7. **Monitor State Changes**: Track testing progress through work item states

## Common Patterns

### Getting Started
```
1. Use tfs_search_work_items to find work items of interest
2. Use tfs_get_work_item to get detailed information
3. Use tfs_get_comments to understand historical context
```

### Full Documentation Analysis
```
1. Search all User Stories: 
   "SELECT [System.Id] FROM WorkItems WHERE [System.WorkItemType] = 'User Story'"
2. Extract details for documentation
3. Map to test scenarios based on acceptance criteria
```
