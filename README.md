# MCP Servers Collection

[Slovensky / Slovak version](README.sk.md)

A collection of custom **Model Context Protocol (MCP)** servers and client skills designed for integration with Claude Desktop (and other MCP-compatible clients). These servers provide AI assistants with direct access to enterprise tools: Azure DevOps / TFS, Jira (On-Premise & Cloud), and Enterprise Architect.

## Repository Structure

```
mcp-servers/
├── azure-devops-tfs/    # MCP server for Azure DevOps / TFS on-premises
│   └── server.js
├── jira-onprem/         # MCP server for Jira Server / Data Center (API v2)
│   └── server.js
├── jira-cloud/          # MCP server for Jira Cloud (API v3)
│   └── server.js
├── ea-mcp-server/       # MCP server for Enterprise Architect (MS SQL)
│   ├── server.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
├── skills/              # Client skills (AI instructions for MCP servers)
│   ├── Azure-MCP-client-skill.md
│   ├── Jira-Mcp-client-skill.md
│   ├── EA-DB-based-client-skill.md
│   └── Documentation-Reader-skill.md
└── docs/                    # Guides and requirements
    ├── MCP_SETUP_GUIDE_WINDOWS.md      # Windows setup guide (EN)
    ├── MCP_SETUP_GUIDE_WINDOWS.sk.md   # Windows setup guide (SK)
    └── mcp-ea-requirements.txt          # EA server requirements (SK)
```

## MCP Servers

### 1. Azure DevOps / TFS Server

Lightweight Node.js MCP server for Azure DevOps Server (TFS) on-premises. Zero dependencies.

**Tools:**
| Tool | Description |
|------|-------------|
| `tfs_get_work_item` | Get work item with full details including comments |
| `tfs_get_comments` | Get comments/history for a work item |
| `tfs_search_work_items` | Search work items using WIQL queries (supports `top`/`skip` pagination) |

**Environment variables:**
- `TFS_URL` - TFS collection URL (e.g. `http://tfs.example.local:8080/tfs/your_collection`)
- `TFS_PROJECT` - Project name
- `TFS_PAT` - Personal Access Token
- `TFS_API_VERSION` - API version (default: `6.0`)

---

### 2. Jira On-Premise Server

MCP server for Jira Server / Data Center using REST API v2. Zero dependencies.

**Tools:**
| Tool | Description |
|------|-------------|
| `jira_search` | Search issues using JQL (supports `startAt`/`maxResults` pagination) |
| `jira_get_issue` | Get full issue details |
| `jira_create_issue` | Create a new issue |
| `jira_update_issue` | Update issue fields |
| `jira_add_comment` | Add a comment |
| `jira_get_transitions` | Get available workflow transitions |
| `jira_transition` | Transition an issue to a new status |
| `jira_link_issues` | Link two issues together |
| `jira_add_worklog` | Log time on an issue |
| `jira_get_attachments` | List attachments |

**Environment variables:**
- `JIRA_URL` - Jira instance URL
- `JIRA_API_TOKEN` (or `JIRA_PAT`) - Personal Access Token
- `JIRA_USERNAME` - (Optional) for Basic Auth

---

### 3. Jira Cloud Server

MCP server for Jira Cloud using REST API v3 with Atlassian Document Format (ADF) support.

Same tools as Jira On-Premise, plus:
| Tool | Description |
|------|-------------|
| `jira_search_projects` | Search for projects |
| `jira_get_project_issue_types` | Get available issue types for a project |

**Environment variables:** Same as Jira On-Premise.

---

### 4. Enterprise Architect Server

TypeScript MCP server that reads UML models directly from Enterprise Architect's MS SQL database. Ideal for extracting specifications, use case scenarios, and diagram visualizations.

**Tools:**
| Tool | Description |
|------|-------------|
| `search_ea_elements` | Search Use Cases, Activities, Requirements by name (supports `maxResults`/`offset` pagination) |
| `get_element_details` | Get full specification with scenario steps (XML) |
| `search_diagrams` | Search for diagrams by name (supports `maxResults`/`offset` pagination) |
| `get_diagram_as_mermaid` | Generate Mermaid.js visualization of a diagram |
| `get_element_relationships` | Get traceability, hierarchy, and dependencies |

**Environment variables:**
- `DB_SERVER` - MS SQL Server hostname/IP
- `DB_NAME` - Database name
- `DB_USER` - Database username
- `DB_PASSWORD` - Database password
- `EA_PROJECT_NAME` - (Optional) Restrict search to a specific EA project

**Setup:**
```bash
cd ea-mcp-server
npm install
npm run build
```

---

## Client Skills

The `skills/` folder contains `.md` skill files that can be added to Claude Desktop or Claude Code as project instructions to teach the AI how to effectively use these MCP servers:

- **skills/Azure-MCP-client-skill.md** - Guide for Azure DevOps/TFS work item management and WIQL queries
- **skills/Jira-Mcp-client-skill.md** - Comprehensive guide for Jira integration workflows (search, create, link, test scenarios)
- **skills/EA-DB-based-client-skill.md** - Guide for EA model navigation, specification extraction, and diagram visualization
- **skills/Documentation-Reader-skill.md** - Methodology for analyzing user guides and transcribed recordings to extract structured test scenarios

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) v18+ (v20 LTS recommended)
- [Claude Desktop](https://claude.ai/download) or any MCP-compatible client

### Configuration (Claude Desktop)

Edit your Claude Desktop config file:

- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

Example configuration with all servers:

```json
{
  "mcpServers": {
    "tfs": {
      "command": "node",
      "args": ["<path-to>/azure-devops-tfs/server.js"],
      "env": {
        "TFS_URL": "http://your-tfs-server:8080/tfs/collection",
        "TFS_PROJECT": "YourProject",
        "TFS_PAT": "YOUR_PAT_TOKEN"
      }
    },
    "jira": {
      "command": "node",
      "args": ["<path-to>/jira-onprem/server.js"],
      "env": {
        "JIRA_URL": "https://jira.example.com",
        "JIRA_API_TOKEN": "YOUR_JIRA_TOKEN"
      }
    },
    "ea-reader": {
      "command": "node",
      "args": ["<path-to>/ea-mcp-server/dist/server.js"],
      "env": {
        "DB_SERVER": "your-sql-server",
        "DB_NAME": "your-database",
        "DB_USER": "your-user",
        "DB_PASSWORD": "YOUR_PASSWORD"
      }
    }
  }
}
```

### Verify

After restarting Claude Desktop, test each server:

- **TFS:** "Show my work items in TFS"
- **Jira:** "Show my assigned Jira tickets"
- **EA:** "Search for login use case in EA"

## Security Notes

These MCP servers are designed to run locally (STDIO). However, they connect to internal services and databases. Please follow these security best practices:

1.  **Token Scope**: Generate Personal Access Tokens (PATs) with the *minimum required privileges*.
    -   **Azure DevOps**: `Work Items (Read & Write)`, `Code (Read)`, `Build (Read)`.
    -   **Jira**: Use `Read` permissions unless you need to create/update issues.
2.  **HTTPS**: Always use HTTPS for TFS and Jira connections (`https://tfs.example.com`). Avoid HTTP (`http://`) to prevent credential leakage.
3.  **Database Security**:
    -   Use a read-only database user for the EA MCP server if possible (`db_datareader`).
    -   Enable SSL/TLS encryption (`encrypt: true`) in your DB configuration if your SQL Server supports it.
    -   For internal self-signed certificates, ensure the CA is trusted or understand risks before using `trustServerCertificate: true`.
4.  **Logging**: The servers log errors to `stderr`. Ensure your MCP client logs are stored securely if they contain sensitive query data.

## License

ISC
