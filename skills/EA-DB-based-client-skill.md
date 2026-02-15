---
name: Enterprise Architect MCP Server
description: Enterprise Architect database integration for UML specification analysis and test scenario preparation
---

# Enterprise Architect MCP Server Skill

## Overview

This skill provides direct access to Enterprise Architect (EA) model databases stored in MS SQL Server through a Model Context Protocol (MCP) server. It enables you to search for use cases, activities, requirements, and diagrams, extract detailed specifications, scenarios, and visualize UML diagrams. This is particularly valuable for documentation analysis and preparing test scenarios from EA specifications.

## Configuration

The EA MCP server requires the following environment variables:
- `DB_SERVER`: MS SQL Server hostname/IP (e.g., `YOUR_DB_HOST`)
- `DB_NAME`: Database name (e.g., `YOUR_DB_NAME`)
- `DB_USER`: Database username (e.g., `YOUR_DB_USER`)
- `DB_PASSWORD`: Database password
- `EA_PROJECT_NAME`: (Optional) Root package name to restrict searches to a specific EA project

## Available Tools

### 1. list_root_packages
**Purpose**: List all root-level packages (projects) in the Enterprise Architect database.

**Key Use Cases**:
- Discover available EA projects before searching
- Identify the correct project name for `EA_PROJECT_NAME` configuration
- Explore an unfamiliar EA database structure
- Verify which models are available

**Input Parameters**: None

**Returned Data**:
- `Name`: Package/project name
- `Package_ID`: Unique identifier for the root package

**Example Usage**:
```
List all root packages to discover available EA projects
```

**Best Practices**:
- Run this first when connecting to a new EA database to understand its structure
- Use the returned package names to set `EA_PROJECT_NAME` for focused searches

### 2. search_ea_elements
**Purpose**: Search for Use Cases, Activities, Requirements, Features, and Components in Enterprise Architect by name.

**Key Use Cases for Testing & Documentation**:
- Find use cases to create test scenarios
- Locate activity diagrams for process testing
- Search requirements for test coverage analysis
- Find specific features for test planning
- Discover components for integration testing

**Input Parameters**:
- `keyword` (required): Search term (partial name match).

**Supported Element Types**:
- `UseCase`: Use case specifications
- `Activity`: Activity/process diagrams and elements
- `Requirement`: Requirement specifications
- `Feature`: Feature definitions
- `Component`: Component/system elements

**Returned Data**:
- `Object_ID`: Unique identifier for the element (use this for `get_element_details`)
- `Name`: Element name
- `Object_Type`: Type of element
- `Author`: Creator of the element
- `Note`: Description/notes field

**Notes**:
- Returns up to 20 results per query.
- Filters specifically for the element types listed above.

**Example Usage**:
```
keyword: "Prihlásenie"
```

### 3. get_element_details
**Purpose**: Retrieve complete specification details and scenarios for a specific EA element.

**Key Use Cases for Testing & Documentation**:
- Extract full use case specifications for test scenario creation
- Get scenario steps (main flow, alternative flows, exception flows)
- Review requirements specifications
- Analyze activity descriptions
- Extract acceptance criteria from Use Cases

**Input Parameters**:
- `object_id` (required): Object ID obtained from `search_ea_elements`.

**Returned Data Structure**:
- `element`: Basic element info (Name, Note, Type)
- `scenarios`: List of scenarios, each containing:
  - `Scenario`: Name (e.g., "Main Flow")
  - `Notes`: Description
  - `XMLContent`: Structured XML with steps

**Example Usage**:
```
object_id: 12345
```

### 4. search_diagrams
**Purpose**: Search for diagrams in Enterprise Architect by name.

**Key Use Cases for Documentation**:
- Find use case diagrams for overview documentation
- Locate activity diagrams for process flow testing
- Search sequence diagrams for interaction testing

**Input Parameters**:
- `keyword` (required): Search term (partial diagram name match).

**Returned Data**:
- `Diagram_ID`: Unique identifier for the diagram (use this for `get_diagram_as_mermaid`)
- `Name`: Diagram name
- `Diagram_Type`: Type of diagram (UseCase, Activity, Sequence, etc.)

**Notes**:
- Returns up to 20 results per query.

**Example Usage**:
```
keyword: "Authentication"
```

### 5. get_diagram_as_mermaid
**Purpose**: Generate Mermaid.js visualization of an EA diagram for documentation and analysis.

**Key Use Cases**:
- Visualize process flows for test scenario understanding
- Document use case relationships
- Create flowcharts for test documentation
- Analyze state transitions for state-based testing

**Input Parameters**:
- `diagram_id` (required): Diagram ID obtained from `search_diagrams`.

**Returned Data**:
- Content containing the Mermaid.js graph definition (typically `graph TD; ...`).

**Example Usage**:
```
diagram_id: 456
```

### 6. get_element_relationships
**Purpose**: Retrieve relationships (traceability), hierarchy (parent package), and dependencies for a specific EA element.

**Key Use Cases**:
- Trace requirements to features and use cases
- Analyze dependencies between components
- Find upstream and downstream related elements
- Verify link direction and types

**Input Parameters**:
- `object_id` (required): Object ID obtained from `search_ea_elements`.

**Returned Data**:
- `context`: Parent package information
- `relationships`: List of connections, including:
  - `Connector_Name`: Name of the relationship
  - `Connector_Type`: Type (Association, Dependency, Generalization, etc.)
  - `Relation_Direction`: "Incoming" or "Outgoing"
  - `Related_Object_Name`: Name of the connected element
  - `Related_Object_Type`: Type of the connected element

**Example Usage**:
```
object_id: 12345
```

## Complete Workflows

### Workflow 0: Database Discovery
```
1. List available projects:
   Tool: list_root_packages

2. Note the project names and IDs

3. If needed, configure EA_PROJECT_NAME to focus searches
```

### Workflow 1: Use Case to Test Scenarios
```
1. Search for Use Cases:
   Tool: search_ea_elements { keyword: "Login" }

2. Get detailed specifications:
   Tool: get_element_details { object_id: <ID> }

3. Discover dependencies:
   Tool: get_element_relationships { object_id: <ID> }

4. Visualize context:
   Tool: search_diagrams { keyword: "Login" }
   Tool: get_diagram_as_mermaid { diagram_id: <ID> }

5. Create test documentation:
   Combine use case notes, scenario steps, relationships, and diagram.
```

### Workflow 2: Process Analysis
```
1. Find process diagrams:
   Tool: search_diagrams { keyword: "Order Processing" }

2. Visualize process flow:
   Tool: get_diagram_as_mermaid { diagram_id: <ID> }

3. Get details for specific activities:
   Tool: search_ea_elements { keyword: "Order" }
   Tool: get_element_details { object_id: <ID> }

4. Analyze dependencies:
   Tool: get_element_relationships { object_id: <ID> }
```

### Workflow 3: Full Traceability Analysis
```
1. List available projects:
   Tool: list_root_packages

2. Search for a requirement:
   Tool: search_ea_elements { keyword: "Authentication" }

3. Get requirement details:
   Tool: get_element_details { object_id: <ID> }

4. Discover related elements (Use Cases, Features, Components):
   Tool: get_element_relationships { object_id: <ID> }

5. For each related element, repeat steps 3-4 to build full traceability chain
```

## Best Practices

- **Start with Discovery**: Use `list_root_packages` first when exploring a new database to understand project structure.
- **Object IDs**: Always use the numeric `Object_ID` or `Diagram_ID` returned from search tools when calling detail tools.
- **Project Scoping**: Set `EA_PROJECT_NAME` to restrict searches to a specific project when the database contains multiple models.
- **Scenario Parsing**: The `XMLContent` in scenarios provides the most structured step-by-step data for test cases.
- **Diagrams**: Use Mermaid visualizations to verify flow logic against the text specifications.
- **Relationships**: Always check `get_element_relationships` to discover hidden dependencies and traceability links.
