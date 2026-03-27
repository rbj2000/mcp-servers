---
name: Azure DevOps / TFS MCP Server
description: Azure DevOps Server / TFS integration for work items, pull requests, documentation and test scenario analysis
---

# Azure DevOps / TFS MCP Server Skill

## Overview

This skill provides access to Azure DevOps Server and Team Foundation Server (TFS) on-premises installations through a Model Context Protocol (MCP) server. It enables you to retrieve work items, search using WIQL (Work Item Query Language), access work item comments/history, and search/retrieve pull requests for documentation analysis and test scenario preparation.

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

### 4. tfs_search_pull_requests
**Purpose**: Search pull requests across Azure DevOps repositories with various filters

**Key Use Cases**:
- Find all active pull requests in a project
- Search PRs by creator, reviewer, or branch
- Filter PRs by status (active, completed, abandoned)
- Find PRs targeting a specific branch
- Paginate through large result sets

**Input Parameters**:
- `status` (optional): PR status filter — `active`, `completed`, `abandoned`, `all` (default: `all`)
- `creatorId` (optional): Filter by creator display name or unique name
- `reviewerId` (optional): Filter by reviewer
- `sourceRefName` (optional): Source branch filter (e.g. `refs/heads/feature/xyz`)
- `targetRefName` (optional): Target branch filter (e.g. `refs/heads/main`)
- `repositoryId` (optional): Filter to a specific repository name or ID
- `top` (optional): Max results to return (default 50). Use with `skip` for pagination.
- `skip` (optional): Number of results to skip (default 0). Use with `top` for pagination.

**Returned Data**:
- List of pull requests with id, title, status, creator, reviewers, source/target branches, creation date, repository info

**Example Usage**:
```
Find all active pull requests targeting the main branch:
  status: "active", targetRefName: "refs/heads/main"

Find completed PRs from a specific repository:
  status: "completed", repositoryId: "my-repo", top: 20
```

### 5. tfs_get_pull_request
**Purpose**: Get full details of a specific pull request by its ID

**Key Use Cases**:
- Retrieve complete PR information including description, reviewers, and merge status
- Review PR details for documentation or code review analysis
- Check merge status and linked work items

**Input Parameters**:
- `pullRequestId` (required): Pull request ID (integer)

**Returned Data**:
- Full PR details including title, description, status, creator, reviewers, merge status, dates, linked work items, source/target branches, repository info

**Example Usage**:
```
Get full details of pull request 4567
```

### 6. tfs_get_work_item_pull_requests
**Purpose**: Get pull requests linked to a specific work item — the key tool for tracing tickets to code changes

**Key Use Cases**:
- Find all PRs associated with a ticket/work item
- Trace code changes back to requirements
- Review what code was changed to implement a user story or fix a bug
- Verify that a work item has associated code changes

**Input Parameters**:
- `id` (required): Work item ID (integer)
- `top` (optional): Max number of linked PRs to return (default 50). Use with `skip` for pagination.
- `skip` (optional): Number of linked PRs to skip (default 0). Use with `top` for pagination.

**Returned Data**:
- `workItemId`: The queried work item ID
- `totalCount`: Total number of linked PRs found
- `count`: Number of PRs returned in this page
- `skip`, `top`: Pagination parameters used
- `pullRequests`: Array of full PR details for each linked pull request

**Example Usage**:
```
Get all pull requests linked to work item 12345:
  id: 12345

Get the first 10 linked PRs:
  id: 12345, top: 10, skip: 0
```

**Best Practices**:
- Use this to understand what code changes were made for a requirement
- Combine with `tfs_get_work_item` to get both the requirement details and the implementing PRs
- Review PR descriptions for implementation context when preparing test scenarios

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

### Tracing Work Items to Code Changes
```
1. Use tfs_get_work_item to get the requirement/bug details
2. Use tfs_get_work_item_pull_requests to find all linked PRs
3. Use tfs_get_pull_request for detailed PR info if needed
4. Review PR descriptions to understand implementation approach
```

### Pull Request Review Workflow
```
1. Use tfs_search_pull_requests to find active PRs (status: "active")
2. Use tfs_get_pull_request to review individual PR details
3. Use tfs_get_work_item on linked work items to understand requirements
4. Verify PRs cover acceptance criteria from the linked work items
```

### Code Change Impact Analysis
```
1. tfs_search_work_items - Find work items in a sprint/iteration
2. For each work item:
   a. tfs_get_work_item_pull_requests - Find linked PRs
   b. Review PR details for scope of changes
3. Identify areas affected by code changes for targeted testing
```
