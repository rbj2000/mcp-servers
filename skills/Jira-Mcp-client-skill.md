---
name: Jira MCP Server
description: Comprehensive Jira integration for documentation analysis and test scenario preparation
---

# Jira MCP Server Skill

## Overview

This skill provides comprehensive access to Jira through a Model Context Protocol (MCP) server. Two server variants are available:

- **Jira On-Premise** (`jira-onprem/server.js`) - For Jira Server / Data Center, using REST API v2
- **Jira Cloud** (`jira-cloud/server.js`) - For Jira Cloud, using REST API v3 with Atlassian Document Format (ADF)

Both variants share the same core tools. Jira Cloud includes additional tools for project discovery.

## Configuration

The Jira MCP server requires the following environment variables:
- `JIRA_URL`: Your Jira instance URL (e.g., `https://jira.example.com` or `https://company.atlassian.net`)
- `JIRA_API_TOKEN`: API token or Personal Access Token (PAT) for authentication
- `JIRA_USERNAME`: (Optional for On-Prem, **required for Cloud**) Username/email for Basic Auth

**Authentication differences:**
- **On-Premise**: Uses Bearer token (PAT). Set only `JIRA_API_TOKEN`.
- **Cloud**: Uses Basic Auth. Set both `JIRA_USERNAME` (your email) and `JIRA_API_TOKEN`.

## Available Tools

### Cloud-Only Tools

#### jira_search_projects
**Purpose**: Search for Jira projects by name or key

**Key Use Cases**:
- Discover available projects before searching issues
- Find project keys for JQL queries
- Explore project structure in unfamiliar Jira instances

**Input Parameters**:
- `query` (required): Query string to match project name or key
- `maxResults` (optional): Maximum results to return (default: 50)

**Example Usage**:
```
Find all projects related to authentication:
query: "auth"
```

#### jira_get_project_issue_types
**Purpose**: Get available issue types (work types) for a specific project

**Key Use Cases**:
- Discover valid issue types before creating issues with `jira_create_issue`
- Understand project configuration for test planning
- Verify which types are available (Bug, Story, Task, Sub-task, etc.)

**Input Parameters**:
- `projectIdOrKey` (required): Project ID or key (e.g., "PROJ")

**Example Usage**:
```
Get issue types for project ZVJS:
projectIdOrKey: "ZVJS"
```

### Common Tools (On-Premise & Cloud)

### 1. jira_search
**Purpose**: Search for Jira issues using JQL (Jira Query Language)

**Key Use Cases for Testing & Documentation**:
- Find all test-related issues: `project = PROJ AND issuetype = "Test"`
- Retrieve issues by status: `status = "In Progress" AND assignee = currentUser()`
- Get recent bugs: `issuetype = Bug AND created >= -7d ORDER BY created DESC`
- Find issues by component: `project = PROJ AND component = "Authentication"`
- Search by labels: `labels = "testing" OR labels = "documentation"`

**Input Parameters**:
- `jql` (required): JQL query string
- `maxResults` (optional): Maximum results to return (default: 50)

**Example Usage**:
```
Use jira_search to find all User Stories in project ZVJS that are in "Ready for Testing" status:
jql: "project = ZVJS AND issuetype = Story AND status = 'Ready for Testing'"
```

### 2. jira_get_issue
**Purpose**: Get complete details of a specific Jira issue

**Key Use Cases**:
- Retrieve full issue specification for documentation
- Get acceptance criteria for test scenario preparation
- Review issue history and current state
- Extract detailed requirements from issues

**Input Parameters**:
- `issueIdOrKey` (required): Issue key (e.g., "PROJ-123") or ID

**Example Usage**:
```
Get full details of issue ZVJS-456 to analyze requirements
```

### 3. jira_create_issue
**Purpose**: Create new Jira issues programmatically

**Key Use Cases for Testing**:
- Create test execution issues
- Generate bug reports from test results
- Create documentation tasks
- Set up test scenarios in Jira

**Input Parameters**:
- `projectKey` (required): Project key (e.g., "PROJ")
- `summary` (required): Issue title
- `description` (optional): Issue description
- `issueType` (required): Type (e.g., "Bug", "Story", "Task", "Test")
- `extraFields` (optional): Additional fields (priority, assignee, etc.)

**Example Usage**:
```
Create a test bug:
projectKey: "ZVJS"
summary: "Login fails with special characters in password"
description: "When using password with @ symbol, authentication fails"
issueType: "Bug"
extraFields: {"priority": {"name": "High"}}

Create a subtask for an existing story:
projectKey: "ZVJS"
summary: "Implement frontend validation"
description: "Validation logic for the login form"
issueType: "Sub-task"
extraFields: {"parent": {"key": "ZVJS-123"}}
```

### 4. jira_update_issue
**Purpose**: Update fields of an existing issue

**Key Use Cases**:
- Update test execution status
- Add documentation references
- Modify acceptance criteria
- Update assignees or priorities

**Input Parameters**:
- `issueIdOrKey` (required): Issue key or ID
- `fields` (required): Object with fields to update

**Example Usage**:
```
Update issue status and add tester:
issueIdOrKey: "ZVJS-123"
fields: {"assignee": {"name": "tester1"}, "customfield_10001": "Test completed"}
```

### 5. jira_add_comment
**Purpose**: Add comments to issues

**Key Use Cases for Documentation & Testing**:
- Document test execution results
- Add testing notes to requirements
- Provide feedback on specifications
- Link related documentation

**Input Parameters**:
- `issueIdOrKey` (required): Issue key or ID
- `body` (required): Comment text

**Example Usage**:
```
Add test result comment:
issueIdOrKey: "ZVJS-789"
body: "Test executed successfully. All acceptance criteria met. Screenshots attached."
```

### 6. jira_get_transitions
**Purpose**: Get available workflow transitions for an issue

**Key Use Cases**:
- Understand workflow states for test scenarios
- Verify available transitions in documentation
- Prepare automated test workflows

**Input Parameters**:
- `issueIdOrKey` (required): Issue key or ID

**Example Usage**:
```
Get available transitions for ZVJS-123 to document workflow states
```

### 7. jira_transition
**Purpose**: Move an issue through workflow states

**Key Use Cases**:
- Mark issues as "In Testing"
- Close verified bugs
- Progress test execution issues
- Automate workflow in test scenarios

**Input Parameters**:
- `issueIdOrKey` (required): Issue key or ID
- `transitionId` (required): ID of the transition to perform

**Example Usage**:
```
Move issue to testing:
1. First use jira_get_transitions to find the ID for "Start Testing"
2. Then use jira_transition with that ID
```

### 8. jira_link_issues
**Purpose**: Create relationships between issues

**Key Use Cases for Documentation**:
- Link tests to requirements
- Connect bugs to user stories
- Create traceability matrices
- Link documentation tasks to features

**Input Parameters**:
- `inwardIssueKey` (required): Source issue key
- `outwardIssueKey` (required): Target issue key
- `linkType` (required): Type of link (e.g., "Blocks", "Relates", "Tests", "Duplicate")

**Common Link Types**:
- `"Blocks"` - Issue blocks another
- `"Relates"` - General relationship
- `"Tests"` - Test issue tests a requirement
- `"Duplicate"` - Marks duplicates
- `"Causes"` - Issue causes another

**Example Usage**:
```
Link test case to user story:
inwardIssueKey: "ZVJS-TEST-45"
outwardIssueKey: "ZVJS-123"
linkType: "Tests"
```

### 9. jira_add_worklog
**Purpose**: Log time spent on issues

**Key Use Cases**:
- Track testing time
- Document analysis effort
- Record time spent on test scenario creation

**Input Parameters**:
- `issueIdOrKey` (required): Issue key or ID
- `timeSpent` (required): Time in Jira format (e.g., "1h 30m", "2d 4h")
- `comment` (optional): Worklog description
- `started` (optional): ISO 8601 timestamp

**Example Usage**:
```
Log testing time:
issueIdOrKey: "ZVJS-123"
timeSpent: "3h"
comment: "Executed regression tests for authentication module"
```

### 10. jira_get_attachments
**Purpose**: List attachments on an issue

**Key Use Cases**:
- Retrieve test evidence (screenshots, logs)
- Access specification documents
- Get test data files
- Review documentation attachments

**Input Parameters**:
- `issueIdOrKey` (required): Issue key or ID

**Example Usage**:
```
Get all attachments from ZVJS-123 to review test screenshots
```

## On-Premise vs Cloud Differences

| Aspect | On-Premise (API v2) | Cloud (API v3) |
|--------|-------------------|----------------|
| Auth | Bearer PAT | Basic Auth (email + API token) |
| Description format | Plain text | Atlassian Document Format (ADF) |
| Comment format | Plain text body | ADF body |
| Extra tools | - | `jira_search_projects`, `jira_get_project_issue_types` |
| Search endpoint | `POST /rest/api/2/search` | `POST /rest/api/3/search/jql` |

**Practical note**: When using the Cloud variant, you can pass plain text for descriptions and comments - the server automatically converts them to ADF format.

## Best Practices for Documentation Analysis

1. **Requirements Traceability**:
   - Use `jira_search` to find all requirements in a specific area
   - Use `jira_get_issue` to extract detailed acceptance criteria
   - Use `jira_link_issues` to create traceability between tests and requirements

2. **Test Scenario Preparation**:
   - Search for user stories with JQL: `issuetype = Story AND status = "Ready for Testing"`
   - Extract acceptance criteria from issue details
   - Create test execution issues with `jira_create_issue`
   - Link test cases to requirements with `jira_link_issues`

3. **Documentation Workflow**:
   - Use `jira_get_transitions` to understand workflow states
   - Document test results with `jira_add_comment`
   - Update issue status with `jira_transition`
   - Track time with `jira_add_worklog`

4. **Efficient JQL Queries**:
   ```
   # All test-related items in current sprint
   project = ZVJS AND sprint in openSprints() AND (issuetype = Test OR labels = testing)
   
   # Requirements without test coverage
   project = ZVJS AND issuetype = Story AND issueFunction in linkedIssuesOf("type = Tests") = 0
   
   # Recently updated documentation
   project = ZVJS AND labels = documentation AND updated >= -14d
   
   # Bugs found in testing
   project = ZVJS AND issuetype = Bug AND status in ("Open", "In Progress") AND labels = "found-in-testing"
   ```

## Integration with Testing Workflows

1. **Test Case Discovery**: Use `jira_search` to find requirements
2. **Scenario Extraction**: Use `jira_get_issue` to get acceptance criteria
3. **Test Execution Tracking**: Create test issues with `jira_create_issue`
4. **Result Documentation**: Add comments with `jira_add_comment`
5. **Traceability**: Link tests to requirements with `jira_link_issues`
6. **Workflow Management**: Transition issues through states

## Tips for Effective Use

- **Start with Search**: Always begin with `jira_search` to find relevant issues
- **Use Specific JQL**: Narrow down results with precise JQL queries
- **Link Liberally**: Create comprehensive traceability with issue links
- **Document Everything**: Use comments to capture test results and observations
- **Leverage Transitions**: Use workflow transitions to track progress accurately
- **Time Tracking**: Log work to understand effort spent on testing activities

## Common Patterns

### Pattern 1: Complete Test Scenario Preparation
```
1. jira_search with JQL to find user stories
2. jira_get_issue to extract acceptance criteria
3. jira_create_issue to create test execution issues
4. jira_link_issues to link tests to stories
5. jira_add_comment to document test approach
```

### Pattern 2: Bug Reporting and Tracking
```
1. jira_create_issue to create bug report
2. jira_link_issues to link bug to failed requirement
3. jira_add_comment to add reproduction steps
4. jira_add_worklog to track investigation time
```

### Pattern 3: Documentation Analysis
```
1. jira_search to find all issues in documentation label
2. jira_get_issue for each to review content
3. jira_get_attachments to retrieve documents
4. jira_add_comment to note findings
```

### Pattern 4: Project Discovery (Cloud Only)
```
1. jira_search_projects to discover available projects
2. jira_get_project_issue_types to understand valid issue types
3. jira_search with JQL to find relevant issues
4. jira_create_issue with correct issue type from step 2
```
