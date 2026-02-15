---
name: User Guide and Documentation Reader
description: Expert skill for analyzing user guides and transcribed recordings to extract structured functionality details and test scenarios
---

# User Guide and Documentation Reader Skill

## Overview

This skill provides a systematic approach to reading, analyzing, and extracting structured information from user guides, documentation, and transcribed recordings in markdown format. It enables you to quickly scan multiple sources, identify relevant content, and organize detailed steps for any mentioned functionality.

## Purpose

**Primary Use Cases**:
- Extract step-by-step procedures from user guides
- Analyze transcribed user sessions for actual usage patterns
- Consolidate information about specific features from multiple sources
- Prepare comprehensive test scenarios based on documented functionality
- Create structured documentation from unstructured sources
- Identify gaps or inconsistencies across documentation sources

## Core Principles

### 1. Multi-Source Intelligence
Combine information from various document types:
- **User Guides**: Official step-by-step instructions
- **Transcribed Recordings**: Real user interactions and workflows
- **API Documentation**: Technical specifications
- **Release Notes**: Feature descriptions and changes
- **Support Documents**: Troubleshooting and edge cases
- **Training Materials**: Educational content and examples

### 2. Smart Scanning Strategy
Efficient document analysis approach:
- **Quick Scan**: Read headers, titles, and structure first
- **Relevance Filter**: Identify sections related to target functionality
- **Deep Dive**: Extract detailed information from relevant sections only
- **Cross-Reference**: Link related information across documents

### 3. Structured Extraction
Organize extracted information systematically:
- **Feature/Functionality Name**: Clear identifier
- **Prerequisites**: Required setup or permissions
- **Step-by-Step Procedure**: Numbered, actionable steps
- **Expected Results**: What should happen at each step
- **Variations**: Alternative paths or options
- **Edge Cases**: Special situations or constraints
- **Common Issues**: Known problems and solutions

## Methodology

### Phase 1: Document Discovery and Indexing

**Objective**: Identify all relevant documentation sources

**Steps**:
1. **List all available documents**
   - User guides (primary documentation)
   - Transcribed recordings (actual usage)
   - Technical specifications
   - Release notes
   - Training materials

2. **Create document index**
   - File name/path
   - Document type
   - Main topics covered
   - Last updated date
   - Quality/completeness assessment

3. **Prioritize sources**
   - Primary: Official user guides
   - Secondary: Transcribed real usage
   - Tertiary: Support docs, FAQs
   - Reference: Technical specs, API docs

**Example Document Index**:
```markdown
## Document Inventory

### User Guides
- `user-guide-authentication.md` - Login, SSO, password reset (Updated: 2024-01)
- `user-guide-admin.md` - Admin panel, user management (Updated: 2024-02)

### Transcribed Recordings
- `session-transcript-2024-01-15.md` - User onboarding walkthrough
- `session-transcript-2024-01-20.md` - Admin configuration demo

### Technical Documentation
- `api-documentation.md` - REST API endpoints
- `database-schema.md` - Data model

### Support Materials
- `faq.md` - Common questions
- `troubleshooting.md` - Error resolution
```

### Phase 2: Quick Scan and Relevance Assessment

**Objective**: Rapidly identify which documents contain information about target functionality

**Technique: Header-Based Scanning**
1. Extract all markdown headers (H1-H4) from each document
2. Search for keywords related to target functionality
3. Mark relevant sections for detailed reading
4. Estimate information density per document

**Scanning Pattern**:
```markdown
For functionality: "User Password Reset"

Scan results:
✓ user-guide-authentication.md
  - ## Password Management (H2 - Line 145)
  - ### Resetting Your Password (H3 - Line 167)
  - ### Password Requirements (H3 - Line 189)

✓ session-transcript-2024-01-15.md
  - [00:12:30] User asks: "How do I reset my password?" (Line 234)
  - [00:13:15] Demonstrator shows password reset flow (Line 267)

✗ user-guide-admin.md
  - No relevant content found

✓ troubleshooting.md
  - ### Password Reset Email Not Received (H3 - Line 56)
```

**Smart Filtering Rules**:
- **Exact match**: Functionality name in header → High priority
- **Keyword match**: Related terms in header → Medium priority
- **Context match**: Mentioned in section content → Low priority
- **No match**: Skip document for this functionality

### Phase 3: Detailed Information Extraction

**Objective**: Extract comprehensive, structured details from relevant sections

**Extraction Template**:

```markdown
# Functionality: [Name]

## Source Documents
- [Document Name] - [Sections Used]
- [Document Name] - [Sections Used]

## Overview
[Brief description of what this functionality does]

## Prerequisites
- [System state or permissions required]
- [Data or configuration needed]
- [User role or access level]

## Step-by-Step Procedure

### Main Flow (Happy Path)
1. [Action] - [Expected Result]
   - Source: [Document Name, Line/Section]
   - User Context: [When/why user does this]
   
2. [Action] - [Expected Result]
   - Source: [Document Name, Line/Section]
   - User Context: [When/why user does this]

### Alternative Flows
#### Alternative A: [Scenario Name]
1. [Step]
2. [Step]

#### Alternative B: [Scenario Name]
1. [Step]
2. [Step]

## Expected Results
- [Final state or outcome]
- [Data changes or confirmations]
- [User feedback or notifications]

## Variations and Options
- **Option 1**: [Description] - [Use case]
- **Option 2**: [Description] - [Use case]

## Edge Cases and Constraints
- [Special condition] → [Behavior]
- [Limitation] → [Workaround or note]

## Common Issues and Troubleshooting
| Issue | Cause | Resolution |
|-------|-------|------------|
| [Problem] | [Root cause] | [Solution] |

## Related Functionality
- [Related feature 1] - [Relationship]
- [Related feature 2] - [Relationship]

## Test Scenarios Derived
1. **TC-001: Happy Path** - [Description]
2. **TC-002: Alternative Flow A** - [Description]
3. **TC-003: Edge Case** - [Description]

## Notes and Observations
- [Additional insights from transcripts]
- [Clarifications needed]
- [Inconsistencies found]
```

### Phase 4: Cross-Source Validation and Enrichment

**Objective**: Ensure completeness and resolve conflicts between sources

**Validation Checklist**:
- [ ] All steps from user guide documented
- [ ] Real usage patterns from transcripts incorporated
- [ ] Edge cases from support docs included
- [ ] Technical details from API docs added
- [ ] Conflicts between sources resolved
- [ ] Missing information identified

**Conflict Resolution Strategy**:
```markdown
When sources disagree:
1. User Guide (official) > Transcript (actual usage)
2. Newer documentation > Older documentation
3. Detailed source > Summary source
4. Document conflict in notes for clarification

Example:
User Guide says: "Click Save button"
Transcript shows: "User presses Ctrl+S"
Resolution: Document both methods, mark keyboard shortcut as alternative
```

**Enrichment from Transcripts**:
Transcripts reveal real user behavior:
- **User hesitations**: May indicate UI/UX issues
- **Common mistakes**: Inform test scenarios for error handling
- **Unexpected paths**: Alternative flows not in official docs
- **User questions**: Clarification opportunities for documentation

## Advanced Techniques

### 1. Semantic Chunking

Break documents into logical chunks for targeted analysis:

```markdown
Chunk Strategy:
- By functionality (e.g., all "login" related sections)
- By user role (e.g., admin vs. regular user features)
- By workflow (e.g., onboarding workflow)
- By complexity (e.g., basic vs. advanced features)
```

### 2. Pattern Recognition in Transcripts

Identify recurring patterns in transcribed sessions:

**Time-Based Analysis**:
```
Session Transcript Pattern:
[00:05:00] - User navigates to settings
[00:05:15] - User clicks profile
[00:05:30] - User selects "Change Password"
[00:06:00] - User fills password form
[00:06:15] - User clicks submit
[00:06:20] - Success message appears

Extracted Flow:
Settings → Profile → Change Password → Fill Form → Submit → Success
```

**Dialogue Analysis**:
```
Transcript: "Let me show you two ways to access this..."
→ Indicates multiple paths to same functionality

Transcript: "Sometimes users get confused here..."
→ Identifies potential usability issue

Transcript: "This only works if you have admin rights..."
→ Identifies prerequisite/constraint
```

### 3. Coverage Matrix

Track which sources contribute to each functionality aspect:

| Aspect | User Guide | Transcripts | API Docs | Support |
|--------|-----------|------------|----------|---------|
| Steps | ✓✓✓ | ✓✓ | - | ✓ |
| Prerequisites | ✓✓ | ✓ | ✓✓ | - |
| Edge Cases | ✓ | ✓✓ | - | ✓✓✓ |
| Technical Details | ✓ | - | ✓✓✓ | ✓ |
| UI Elements | ✓✓✓ | ✓✓ | - | ✓ |

Legend: ✓✓✓ Primary source, ✓✓ Good detail, ✓ Some info, - No info

### 4. Automated Keyword Extraction

Use markdown structure to extract functionality keywords:

```markdown
Keywords to scan for functionality identification:
- Action verbs: "create", "delete", "update", "configure", "reset", "export", "import"
- UI elements: "button", "menu", "dialog", "field", "dropdown", "checkbox"
- User goals: "to [verb]", "in order to", "allows you to", "enables"
- Outcomes: "result", "success", "confirmation", "error", "warning"
```

## Practical Workflows

### Workflow 1: Single Functionality Deep Dive

**Use Case**: Extract all details about "User Registration" feature

```markdown
Step 1: Quick scan all documents for "registration", "sign up", "create account"

Step 2: Collect relevant sections:
- user-guide.md, Section 2.1 "Creating an Account"
- onboarding-transcript.md, [00:03:00] - [00:08:30]
- api-docs.md, POST /api/users/register
- troubleshooting.md, "Registration email not received"

Step 3: Extract structured information:
- Main flow from user guide
- Actual user behavior from transcript
- Technical requirements from API docs
- Common issues from troubleshooting

Step 4: Consolidate into single comprehensive document

Step 5: Generate test scenarios covering all paths
```

### Workflow 2: Complete Module Documentation

**Use Case**: Document entire "User Management" module

```markdown
Step 1: Identify all functionalities in the module:
- User registration
- User login
- Password reset
- Profile management
- User roles assignment

Step 2: For each functionality, apply Workflow 1

Step 3: Create module-level documentation:
- Module overview
- Functionality hierarchy
- User workflows across functionalities
- Common prerequisites for the module
- Module-level test suite

Step 4: Create traceability matrix:
Functionality → Sources → Test Cases
```

### Workflow 3: Transcript-to-Test-Scenarios

**Use Case**: Convert user session transcript to test scenarios

```markdown
Step 1: Segment transcript by functionality
[00:00:00] - Introduction (skip)
[00:02:00] - Login demonstration
[00:05:30] - Dashboard navigation
[00:08:00] - Report generation
...

Step 2: For each segment:
- Extract user actions
- Note system responses
- Identify decision points
- Record any issues or questions

Step 3: Map to test scenarios:
- Happy path from successful flows
- Negative tests from errors shown
- Boundary tests from edge cases discussed
- Usability tests from user confusion points

Step 4: Enrich with official documentation:
- Add technical details
- Verify steps accuracy
- Include prerequisites
- Add expected results
```

### Workflow 4: Gap Analysis

**Use Case**: Find undocumented or poorly documented features

```markdown
Step 1: List all features mentioned in ANY source

Step 2: Create completeness matrix:
Feature | User Guide | Transcript | API Doc | Support | Status
-------|-----------|-----------|---------|---------|--------
Login  | Complete  | Complete  | Complete| Partial | ✓ Good
Export | Missing   | Complete  | Partial | None    | ⚠ Undocumented

Step 3: Priority undocumented features:
- High usage (frequent in transcripts)
- Complex (many steps)
- Error-prone (mentioned in support docs)

Step 4: Extract available information from any source

Step 5: Flag for documentation improvement
```

### Workflow 5: EA Connection Discovery & Validation

**Use Case**: Identify hidden system dependencies and ensure documentation completeness

```markdown
Step 1: Identify Key Feature
- Locate feature primarily in User Guide (e.g., "Monthly Report Generation")

Step 2: Discover EA Structure
- Use `list_root_packages` to identify available projects
- Use `search_ea_elements` to find the corresponding Use Case or Activity
- Result: "Generate Monthly Report" (Object_ID: 98765)

Step 3: Discover Connections
- Use `get_element_relationships` with Object_ID: 98765
- Analyze output for:
  - **Incoming**: What triggers this? (e.g., "Timer Event", "Manager Approval")
  - **Outgoing**: What does it touch? (e.g., "Database Service", "Email System")
  - **Dependencies**: Required components (e.g., "Report Template")

Step 4: Cross-Reference with Documentation
- **Check 1**: Is the "Manager Approval" trigger mentioned in the user guide?
- **Check 2**: Is the "Email System" dependency noted in troubleshooting? (e.g., "What if email fails?")
- **Check 3**: Are "Report Templates" documented as prerequisites?

Step 5: Documentation & Test Update
- Update prerequisites with missing dependencies
- Add test cases for discovered edge cases (e.g., "Test report generation when email server is down")
- Flag undocumented triggers for user guide updates
```

## Best Practices

### 1. Document Reading Strategy

**Efficient Reading Order**:
1. **Skim**: Headers and structure (2 minutes per doc)
2. **Filter**: Identify relevant sections (5 minutes)
3. **Extract**: Read and capture details (10-20 minutes per section)
4. **Validate**: Cross-check with other sources (5 minutes)

**Avoid**:
- ❌ Reading entire documents sequentially
- ❌ Extracting before filtering
- ❌ Single-source documentation
- ❌ Ignoring source quality

**Do**:
- ✅ Use markdown search (Ctrl+F) for keywords
- ✅ Follow links between related sections
- ✅ Note source and line numbers
- ✅ Track document versions

### 2. Information Quality Assessment

**Rate source quality for each aspect**:

```markdown
Source Quality Matrix:
Aspect: User Login Flow
- user-guide.md [★★★★☆] - Complete but outdated (2023)
- transcript-jan2024.md [★★★★★] - Recent, shows actual UI
- api-docs.md [★★★☆☆] - Technical only, no user perspective

Decision: Use transcript as primary, verify with user guide, supplement with API docs
```

### 3. Timestamp Utilization in Transcripts

**Extract temporal information**:
```markdown
[00:05:30] User clicks "Forgot Password"
[00:05:35] Password reset form appears [5 seconds - fast response]
[00:05:50] User fills email field [15 seconds - simple form]
[00:06:10] User clicks "Send Reset Link" [20 seconds - user reading instructions]
[00:06:12] Success message displayed [2 seconds - immediate feedback]

Insights:
- Total flow: ~40 seconds
- Critical step: Reading instructions (20s) - may need clarity improvement
- System performance: All responses < 5s
```

### 4. Handling Inconsistencies

**Common inconsistency types**:

| Type | Example | Resolution |
|------|---------|-----------|
| Outdated info | Guide shows old UI, transcript shows new | Use transcript, flag guide for update |
| Missing steps | Guide omits step shown in transcript | Include both, note guide gap |
| Different terminology | Guide says "Remove", transcript says "Delete" | Document both terms, flag for standardization |
| Technical vs. User view | API doc shows POST /users, guide shows "Add User" button | Link both perspectives |

## Output Formats

### Format 1: Test Scenario Document

```markdown
# Test Scenarios: [Functionality Name]

## TS-001: Happy Path - [Functionality]
**Source**: [User Guide Section X], [Transcript 00:05:00-00:07:30]
**Preconditions**: [Prerequisites]
**Test Steps**:
1. [Action] → [Expected Result]
2. [Action] → [Expected Result]
**Expected Outcome**: [Final state]

## TS-002: Alternative Flow - [Variant]
...
```

### Format 2: User Story with Acceptance Criteria

```markdown
# User Story: [Feature]

**As a** [user role]
**I want to** [functionality]
**So that** [benefit]

**Acceptance Criteria**:
1. Given [context], when [action], then [result]
2. Given [context], when [action], then [result]

**Source Documentation**:
- [Document 1] - [Sections]
- [Document 2] - [Sections]

**Additional Notes from Transcripts**:
- Users typically access this via [path]
- Common confusion point: [issue]
```

### Format 3: Comprehensive Feature Documentation

```markdown
# Feature: [Name]

## Overview
[Description synthesized from all sources]

## How to Use (from User Guide)
[Step-by-step from official documentation]

## Real Usage Patterns (from Transcripts)
[How users actually use it in practice]

## Technical Details (from API/Technical Docs)
[Backend/API information]

## Troubleshooting (from Support Docs)
[Common issues and solutions]

## Test Coverage
[Derived test scenarios]
```

## Checklist for Complete Functionality Documentation

- [ ] **Functionality identified** in at least 2 sources
- [ ] **All available sources scanned** for relevant content
- [ ] **Main flow documented** with clear steps
- [ ] **Alternative flows identified** and documented
- [ ] **Prerequisites and constraints** listed
- [ ] **Expected results** defined for each step
- [ ] **Edge cases and errors** covered
- [ ] **Real usage patterns** from transcripts incorporated
- [ ] **Technical details** from specs included
- [ ] **Common issues** from support docs added
- [ ] **Test scenarios derived** from documentation
- [ ] **Inconsistencies resolved** or flagged
- [ ] **Gaps identified** and noted
- [ ] **Sources cited** for traceability

## Integration with Other Skills

### With Jira MCP Server (On-Premise & Cloud)
```markdown
1. Extract functionality from user guides (this skill)
2. Discover projects with jira_search_projects (Cloud only)
3. Check available issue types with jira_get_project_issue_types (Cloud only)
4. Create Jira issues with jira_create_issue
5. Add extracted steps as acceptance criteria with jira_update_issue
6. Link related issues with jira_link_issues
7. Add documentation notes with jira_add_comment
8. Log analysis time with jira_add_worklog
9. Track documentation coverage via jira_search with JQL
```

### With TFS/Azure DevOps MCP Server
```markdown
1. Extract test scenarios from documentation (this skill)
2. Search for related work items with tfs_search_work_items
3. Get full details with tfs_get_work_item
4. Review historical context with tfs_get_comments
5. Update requirements with detailed acceptance criteria
6. Generate traceability matrix
```

### With Enterprise Architect MCP Server
```markdown
1. Discover available projects with list_root_packages
2. Search for relevant elements with search_ea_elements
3. Get use case specifications with get_element_details
4. Analyze traceability and hierarchy with get_element_relationships
5. Search for related diagrams with search_diagrams
6. Visualize process flows using get_diagram_as_mermaid
7. Enrich with user guide details (this skill)
8. Add real usage patterns from transcripts
9. Create comprehensive test scenarios
```

## Tips for Excellence

1. **Be systematic**: Follow the methodology phases consistently
2. **Stay organized**: Use clear folder structure and naming conventions
3. **Cite sources**: Always reference where information came from
4. **Note quality**: Track reliability and recency of sources
5. **Flag gaps**: Document what's missing or unclear
6. **Think like a tester**: Look for edge cases and error conditions
7. **Think like a user**: Consider real usage patterns, not just ideal paths
8. **Consolidate wisely**: Merge similar information, preserve unique details
9. **Maintain traceability**: Link extracted details to original sources
10. **Update regularly**: Re-scan when documentation changes

## Common Pitfalls to Avoid

1. ❌ **Reading everything**: Scan first, read selectively
2. ❌ **Single source bias**: Always cross-reference multiple sources
3. ❌ **Ignoring timestamps**: In transcripts, timing reveals complexity
4. ❌ **Dropping conflicts**: Document inconsistencies, don't hide them
5. ❌ **Losing context**: Note prerequisites and user roles
6. ❌ **Missing edge cases**: Look beyond happy path
7. ❌ **Over-summarizing**: Keep sufficient detail for test creation
8. ❌ **Forgetting attribution**: Always cite sources
