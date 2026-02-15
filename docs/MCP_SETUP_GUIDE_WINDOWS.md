# MCP Setup Guide for Claude Desktop (Windows)

[Slovenska verzia / Slovak version](MCP_SETUP_GUIDE_WINDOWS.sk.md)

**Integration: Azure DevOps (TFS) + Jira On-Premise + Jira Cloud + Enterprise Architect (EA)**
**Platform:** Windows

---

## Prerequisites

### 1. Install Node.js
Download and install Node.js v20 LTS or newer from:
https://nodejs.org/

After installation, verify in Command Prompt or PowerShell:
```bash
node --version
npm --version
```

### 2. Install Claude Desktop
Download Claude Desktop from:
https://claude.ai/download

### 3. Install custom MCP servers
Download all directories (`azure-devops-tfs`, `jira-onprem`, `jira-cloud`, `ea-mcp-server`) into a common directory (e.g. `C:\Tools\mcp`) on your computer.

Your directory structure should look like this:
```
C:\Tools\mcp\
├── azure-devops-tfs\
│   └── server.js
├── jira-onprem\
│   └── server.js
├── jira-cloud\
│   └── server.js
└── ea-mcp-server\
    ├── server.ts
    ├── package.json
    └── ...
```

#### Prepare EA MCP Server (One-time step)
The EA MCP server requires dependency installation before first use.
1. Open Command Prompt or PowerShell.
2. Navigate to the EA server directory:
   ```bash
   cd C:\Tools\mcp\ea-mcp-server
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Build the executable:
   ```bash
   npm run build
   ```
   *This creates `dist/server.js` which we will use.*

---

## Generating Tokens

### Azure DevOps / TFS Personal Access Token (PAT)
1. Open your TFS/Azure DevOps server in a browser.
2. Click on the profile icon (top right corner) -> **Security** or **Personal Access Tokens**.
3. Click **New Token** or **Add**.
4. Configure:
   - **Name**: Claude MCP Access
   - **Expiration**: 90 days or Custom (recommended: 1 year)
   - **Scopes**: Full access, or at minimum: Work Items (Read & Write), Code (Read), Build (Read)
5. Click **Create**.
6. **IMPORTANT**: Copy the token immediately!

### Jira On-Premise - Personal Access Token (PAT)
1. Log in to Jira Server/Data Center.
2. Click on your profile avatar -> **Profile**.
3. In the left menu, click **Personal Access Tokens**.
4. Click **Create token**.
5. Configure:
   - **Token name**: Claude MCP Access
   - **Expiry date**: Custom date (recommended: 1 year)
6. Click **Create**.
7. **IMPORTANT**: Copy the token immediately!

### Jira Cloud - API Token
1. Log in at https://id.atlassian.com/manage-profile/security/api-tokens
2. Click **Create API token**.
3. Configure:
   - **Label**: Claude MCP Access
4. Click **Create**.
5. **IMPORTANT**: Copy the token immediately!
6. *Note: For Jira Cloud you also need your login email - set it in `JIRA_USERNAME`.*

---

## Configure Claude Desktop

### Step 1: Open the configuration file
Open File Explorer and navigate to:
`%APPDATA%\Claude\claude_desktop_config.json`

(Press `Win + R`, paste the path and press Enter. If the file doesn't exist, create it in Notepad.)

### Step 2: Add MCP configuration
Copy and paste the following JSON, **replacing the values** with your actual credentials.

Choose only the servers you need (you don't have to use all of them):

```json
{
  "mcpServers": {
    "tfs": {
      "command": "node",
      "args": ["C:\\Tools\\mcp\\azure-devops-tfs\\server.js"],
      "env": {
        "TFS_URL": "http://tfs.example.local:8080/tfs/internal_projects",
        "TFS_PROJECT": "YourProject",
        "TFS_PAT": "YOUR_TFS_TOKEN",
        "TFS_API_VERSION": "6.0"
      }
    },
    "jira-onprem": {
      "command": "node",
      "args": ["C:\\Tools\\mcp\\jira-onprem\\server.js"],
      "env": {
        "JIRA_URL": "https://jira.example.com",
        "JIRA_API_TOKEN": "YOUR_JIRA_PAT_TOKEN"
      }
    },
    "jira-cloud": {
      "command": "node",
      "args": ["C:\\Tools\\mcp\\jira-cloud\\server.js"],
      "env": {
        "JIRA_URL": "https://yourcompany.atlassian.net",
        "JIRA_USERNAME": "your-email@company.com",
        "JIRA_API_TOKEN": "YOUR_ATLASSIAN_API_TOKEN"
      }
    },
    "ea-reader": {
      "command": "node",
      "args": ["C:\\Tools\\mcp\\ea-mcp-server\\dist\\server.js"],
      "env": {
        "DB_SERVER": "YOUR_DB_HOST",
        "DB_NAME": "YOUR_DB_NAME",
        "DB_USER": "YOUR_DB_USER",
        "DB_PASSWORD": "YOUR_DB_PASSWORD",
        "EA_PROJECT_NAME": "Optional: Root Package Name"
      }
    }
  }
}
```

**Notes:**
- `EA_PROJECT_NAME` is optional. If you specify a root package (project) name, searches will be restricted to that project only.
- Remember to use double backslashes `\\` in Windows paths.
- **Jira On-Prem** uses Bearer token (PAT) - just set `JIRA_API_TOKEN`.
- **Jira Cloud** uses Basic Auth - you need both `JIRA_USERNAME` (your email) and `JIRA_API_TOKEN`.
- You don't need to configure all servers. Add only the ones you need.

### Step 3: Restart Claude Desktop
1. Fully close Claude Desktop (system tray icon -> Quit).
2. Relaunch it.
3. In the chat, you should see the tools icon (plug/hammer) where all configured server tools will be available.

---

## Available Tools Overview

### Azure DevOps / TFS
| Tool | Description |
|------|-------------|
| `tfs_get_work_item` | Get work item with full details including comments |
| `tfs_get_comments` | Get comments/history for a work item |
| `tfs_search_work_items` | Search work items using WIQL queries |

### Jira (On-Premise & Cloud)
| Tool | Description |
|------|-------------|
| `jira_search` | Search issues using JQL |
| `jira_get_issue` | Get full issue details |
| `jira_create_issue` | Create a new issue |
| `jira_update_issue` | Update issue fields |
| `jira_add_comment` | Add a comment |
| `jira_get_transitions` | Get available workflow transitions |
| `jira_transition` | Transition an issue to a new status |
| `jira_link_issues` | Link two issues together |
| `jira_add_worklog` | Log time on an issue |
| `jira_get_attachments` | List attachments |

*Jira Cloud only:*
| Tool | Description |
|------|-------------|
| `jira_search_projects` | Search for projects |
| `jira_get_project_issue_types` | Get available issue types for a project |

### Enterprise Architect
| Tool | Description |
|------|-------------|
| `search_ea_elements` | Search Use Cases, Activities, Requirements by name |
| `get_element_details` | Full specification with scenario steps (XML) |
| `search_diagrams` | Search for diagrams by name |
| `get_diagram_as_mermaid` | Generate Mermaid.js diagram visualization |
| `get_element_relationships` | Traceability, hierarchy, and dependencies |

---

## Verify Setup

### Test Azure DevOps connection
Ask Claude:
> "Show my work items in TFS"

### Test Jira On-Premise connection
Ask Claude:
> "Show my assigned Jira tickets"

### Test Jira Cloud connection
Ask Claude:
> "Search for projects in Jira"

### Test EA (Enterprise Architect) connection
Ask Claude:
> "Find the login use case in EA"

---

## Troubleshooting

- **EA Server Error**: Make sure you ran `npm install` and `npm run build` in the `ea-mcp-server` directory.
- **Database**: Make sure you have network access to the database server IP (VPN/network).
- **JSON Syntax Error**: Check that the JSON file has no missing commas or quotes. Use a JSON validator (e.g. https://jsonlint.com).
- **Jira Cloud 401 Unauthorized**: Verify that both `JIRA_USERNAME` (email) and `JIRA_API_TOKEN` are set correctly.
- **Jira On-Prem 401 Unauthorized**: Verify the PAT token is valid and has sufficient permissions.
- **TFS Connection Failed**: Check that the TFS server is reachable from your network and the PAT token is valid.
- **Tools not showing**: Restart Claude Desktop completely (Quit, not just close the window).
