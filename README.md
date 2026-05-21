# MCP Servers Collection

[Slovensky / Slovak version](README.sk.md)

A collection of custom **Model Context Protocol (MCP)** servers and client skills designed for integration with Claude Desktop (and other MCP-compatible clients). These servers provide AI assistants with direct access to enterprise tools: Azure DevOps / TFS, Jira (On-Premise & Cloud), Enterprise Architect, and AWS (Bedrock + EC2).

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
├── aws/                 # MCP server for AWS (Bedrock + EC2)
│   └── server.js
├── skills/              # Client skills (AI instructions for MCP servers)
│   ├── Azure-MCP-client-skill.md
│   ├── Jira-Mcp-client-skill.md
│   ├── EA-DB-based-client-skill.md
│   ├── AWS-MCP-client-skill.md
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

### 5. AWS Server (Bedrock + EC2)

Zero-dependency Node.js MCP server for AWS. Implements **AWS Signature V4** locally using the built-in `crypto` module — no AWS SDK required. Supports temporary credentials via `AWS_SESSION_TOKEN`.

**Tools — Bedrock:**
| Tool | Description |
|------|-------------|
| `bedrock_list_foundation_models` | List foundation models (filter by provider, modality, inference type) |
| `bedrock_get_foundation_model` | Get details for a single model |
| `bedrock_list_inference_profiles` | List inference profiles (e.g. cross-region routing) |
| `bedrock_invoke_model` | Invoke a model with a provider-specific JSON body |
| `bedrock_converse` | Provider-agnostic chat via the Converse API (recommended) |

**Tools — EC2:**
| Tool | Description |
|------|-------------|
| `ec2_describe_instances` | List EC2 instances (filters, pagination, per-call region override) |
| `ec2_describe_regions` | List AWS regions |
| `ec2_describe_security_groups` | List security groups |
| `ec2_describe_vpcs` | List VPCs |
| `ec2_describe_images` | List AMIs (always pass `owners` to scope the result) |
| `ec2_start_instances` | Start one or more stopped instances |
| `ec2_stop_instances` | Stop one or more instances (supports `force`) |
| `ec2_reboot_instances` | Reboot one or more instances |

**Environment variables:**
- `AWS_ACCESS_KEY_ID` - Access key
- `AWS_SECRET_ACCESS_KEY` - Secret access key
- `AWS_SESSION_TOKEN` - (Optional) Temporary session token (SSO / STS)
- `AWS_REGION` - Default region (default: `us-east-1`)

#### Authentication via AWS SSO (IAM Identity Center)

For organizations using AWS IAM Identity Center federated with Microsoft Entra ID (Azure AD), do **not** use long-lived access keys — issue temporary credentials per session instead. The same flow works for any Identity Center setup; only the start URL and IdP differ.

**1. One-time AWS CLI v2 setup** ([install guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)):

```bash
aws configure sso
```

Answer the prompts:

| Prompt | Value |
|--------|-------|
| SSO start URL | `https://<your-org>.awsapps.com/start/#/` (your Identity Center portal URL) |
| SSO region | region hosting Identity Center (e.g. `eu-central-1`) |
| CLI default client region | the region you mostly work in |
| CLI default output format | `json` |
| Profile name | any name you like, e.g. `my-sso` |

A browser opens — sign in with your Microsoft Entra ID / Azure AD account, approve the device, then pick the AWS account + role.

**2. Daily login** (refresh the SSO session, typically 8–12 hours):

```bash
aws sso login --profile my-sso
```

**3. Wire SSO credentials into the MCP server.** The server reads env vars, not `~/.aws/credentials`. Two options:

*Option A — credential-exporting wrapper (recommended, macOS / Linux):*

```json
{
  "mcpServers": {
    "aws": {
      "command": "sh",
      "args": [
        "-c",
        "eval \"$(aws configure export-credentials --profile my-sso --format env-no-export)\" && exec node /absolute/path/to/aws/server.js"
      ],
      "env": {
        "AWS_REGION": "eu-central-1"
      }
    }
  }
}
```

Each time Claude Desktop launches the server, the wrapper pulls fresh `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_SESSION_TOKEN` from the SSO cache, then exec's `node`. As long as `aws sso login` is still valid, restarts just work.

*Option B — export once, paste into config:*

```bash
aws configure export-credentials --profile my-sso --format env-no-export
```

Copy the three printed values into the `env` block. Repeat whenever the SSO session expires.

*Windows (PowerShell wrapper):* use `aws configure export-credentials --profile my-sso --format powershell | Invoke-Expression` ahead of the `node` call, or run the server from WSL with Option A.

---

## Client Skills

The `skills/` folder contains `.md` skill files that can be added to Claude Desktop or Claude Code as project instructions to teach the AI how to effectively use these MCP servers:

- **skills/Azure-MCP-client-skill.md** - Guide for Azure DevOps/TFS work item management and WIQL queries
- **skills/Jira-Mcp-client-skill.md** - Comprehensive guide for Jira integration workflows (search, create, link, test scenarios)
- **skills/EA-DB-based-client-skill.md** - Guide for EA model navigation, specification extraction, and diagram visualization
- **skills/AWS-MCP-client-skill.md** - Guide for Bedrock invocation (Converse API) and EC2 fleet inspection / lifecycle operations
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
    },
    "aws": {
      "command": "node",
      "args": ["<path-to>/aws/server.js"],
      "env": {
        "AWS_ACCESS_KEY_ID": "YOUR_ACCESS_KEY",
        "AWS_SECRET_ACCESS_KEY": "YOUR_SECRET_KEY",
        "AWS_REGION": "eu-central-1"
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
- **AWS:** "List my EC2 instances in eu-central-1" or "List Bedrock foundation models from Anthropic"

## Security Notes

These MCP servers are designed to run locally (STDIO). However, they connect to internal services and databases. Please follow these security best practices:

1.  **Token Scope**: Generate Personal Access Tokens (PATs) with the *minimum required privileges*.
    -   **Azure DevOps**: `Work Items (Read & Write)`, `Code (Read)`, `Build (Read)`.
    -   **Jira**: Use `Read` permissions unless you need to create/update issues.
    -   **AWS**: Create an IAM user/role with only the actions you need (e.g. `ec2:Describe*`, `bedrock:InvokeModel`, `bedrock:ListFoundationModels`). Avoid wildcards. Prefer temporary credentials via `AWS_SESSION_TOKEN` (SSO/STS) over long-lived access keys.
2.  **HTTPS**: Always use HTTPS for TFS and Jira connections (`https://tfs.example.com`). Avoid HTTP (`http://`) to prevent credential leakage.
3.  **Database Security**:
    -   Use a read-only database user for the EA MCP server if possible (`db_datareader`).
    -   Enable SSL/TLS encryption (`encrypt: true`) in your DB configuration if your SQL Server supports it.
    -   For internal self-signed certificates, ensure the CA is trusted or understand risks before using `trustServerCertificate: true`.
4.  **Logging**: The servers log errors to `stderr`. Ensure your MCP client logs are stored securely if they contain sensitive query data.

## License

ISC
