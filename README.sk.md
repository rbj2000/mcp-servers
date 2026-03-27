# Kolekcia MCP Serverov

[English version](README.md)

Kolekcia vlastnych **Model Context Protocol (MCP)** serverov a klientskych skillov urcena na integraciu s Claude Desktop (a inymi MCP-kompatibilnymi klientmi). Tieto servery poskytuju AI asistentom priamy pristup k podnikovym nastrojom: Azure DevOps / TFS, Jira (On-Premise aj Cloud) a Enterprise Architect.

## Struktura repozitara

```
mcp-servers/
├── azure-devops-tfs/    # MCP server pre Azure DevOps / TFS on-premises
│   └── server.js
├── jira-onprem/         # MCP server pre Jira Server / Data Center (API v2)
│   └── server.js
├── jira-cloud/          # MCP server pre Jira Cloud (API v3)
│   └── server.js
├── ea-mcp-server/       # MCP server pre Enterprise Architect (MS SQL)
│   ├── server.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
├── skills/              # Klientske skilly (AI instrukcie pre MCP servery)
│   ├── Azure-MCP-client-skill.md
│   ├── Jira-Mcp-client-skill.md
│   ├── EA-DB-based-client-skill.md
│   └── Documentation-Reader-skill.md
└── docs/                    # Navody a poziadavky
    ├── MCP_SETUP_GUIDE_WINDOWS.md      # Navod na nastavenie pre Windows (EN)
    ├── MCP_SETUP_GUIDE_WINDOWS.sk.md   # Navod na nastavenie pre Windows (SK)
    └── mcp-ea-requirements.txt          # Poziadavky na EA server (SK)
```

## MCP Servery

### 1. Azure DevOps / TFS Server

Lahky Node.js MCP server pre Azure DevOps Server (TFS) on-premises. Ziadne externe zavislosti.

**Nastroje:**
| Nastroj | Popis |
|---------|-------|
| `tfs_get_work_item` | Ziskanie work itemu s plnymi detailmi vratane komentarov |
| `tfs_get_comments` | Ziskanie komentarov/historie work itemu |
| `tfs_search_work_items` | Vyhladavanie work itemov pomocou WIQL dotazov (podpora `top`/`skip` strankovania) |

**Premenne prostredia:**
- `TFS_URL` - URL TFS kolekcie (napr. `http://tfs.example.local:8080/tfs/your_collection`)
- `TFS_PROJECT` - Nazov projektu
- `TFS_PAT` - Personal Access Token
- `TFS_API_VERSION` - Verzia API (predvolene: `6.0`)

---

### 2. Jira On-Premise Server

MCP server pre Jira Server / Data Center vyuzivajuci REST API v2. Ziadne externe zavislosti.

**Nastroje:**
| Nastroj | Popis |
|---------|-------|
| `jira_search` | Vyhladavanie issues pomocou JQL (podpora `startAt`/`maxResults` strankovania) |
| `jira_get_issue` | Ziskanie plnych detailov issue |
| `jira_create_issue` | Vytvorenie noveho issue |
| `jira_update_issue` | Aktualizacia poli issue |
| `jira_add_comment` | Pridanie komentara |
| `jira_get_transitions` | Ziskanie dostupnych workflow prechodov |
| `jira_transition` | Prechod issue do noveho stavu |
| `jira_link_issues` | Prepojenie dvoch issues |
| `jira_add_worklog` | Zalogovanie casu na issue |
| `jira_get_attachments` | Zoznam priloh |

**Premenne prostredia:**
- `JIRA_URL` - URL Jira instancie
- `JIRA_API_TOKEN` (alebo `JIRA_PAT`) - Personal Access Token
- `JIRA_USERNAME` - (Volitelne) pre Basic Auth

---

### 3. Jira Cloud Server

MCP server pre Jira Cloud vyuzivajuci REST API v3 s podporou Atlassian Document Format (ADF).

Rovnake nastroje ako Jira On-Premise, plus:
| Nastroj | Popis |
|---------|-------|
| `jira_search_projects` | Vyhladavanie projektov |
| `jira_get_project_issue_types` | Ziskanie dostupnych typov issues pre projekt |

**Premenne prostredia:** Rovnake ako Jira On-Premise.

---

### 4. Enterprise Architect Server

TypeScript MCP server, ktory cita UML modely priamo z MS SQL databazy Enterprise Architecta. Idealny na extrahovanie specifikacii, scenari use case-ov a vizualizaciu diagramov.

**Nastroje:**
| Nastroj | Popis |
|---------|-------|
| `search_ea_elements` | Vyhladavanie Use Case-ov, Aktivit, Poziadaviek podla nazvu (podpora `maxResults`/`offset` strankovania) |
| `get_element_details` | Ziskanie plnej specifikacie s krokmi scenara (XML) |
| `search_diagrams` | Vyhladavanie diagramov podla nazvu (podpora `maxResults`/`offset` strankovania) |
| `get_diagram_as_mermaid` | Generovanie Mermaid.js vizualizacie diagramu |
| `get_element_relationships` | Ziskanie sledovatelnosti, hierarchie a zavislosti |

**Premenne prostredia:**
- `DB_SERVER` - Hostname/IP MS SQL Servera
- `DB_NAME` - Nazov databazy
- `DB_USER` - Pouzivatelske meno
- `DB_PASSWORD` - Heslo
- `EA_PROJECT_NAME` - (Volitelne) Obmedzenie vyhladavania na konkretny EA projekt

**Instalacia:**
```bash
cd ea-mcp-server
npm install
npm run build
```

---

## Klientske Skilly

Priecinok `skills/` obsahuje `.md` subory skillov, ktore je mozne pridat do Claude Desktop alebo Claude Code ako projektove instrukcie, ktore naucia AI efektivne vyuzivat tieto MCP servery:

- **skills/Azure-MCP-client-skill.md** - Navod pre pracu s Azure DevOps/TFS work itemami a WIQL dotazmi
- **skills/Jira-Mcp-client-skill.md** - Komplexny navod pre Jira integracne workflow (vyhladavanie, vytvavanie, prepajanie, testovacie scenare)
- **skills/EA-DB-based-client-skill.md** - Navod pre navigaciu EA modelom, extrahovanie specifikacii a vizualizaciu diagramov
- **skills/Documentation-Reader-skill.md** - Metodologia pre analyzu pouzivatelskych navodov a prepisov nahravok na extrahovanie strukturovanych testovacich scenarov

## Rychly start

### Predpoklady

- [Node.js](https://nodejs.org/) v18+ (odporucane v20 LTS)
- [Claude Desktop](https://claude.ai/download) alebo lubovolny MCP-kompatibilny klient

### Konfiguracia (Claude Desktop)

Upravte konfiguracny subor Claude Desktop:

- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

Priklad konfiguracie so vsetkymi servermi:

```json
{
  "mcpServers": {
    "tfs": {
      "command": "node",
      "args": ["<cesta-k>/azure-devops-tfs/server.js"],
      "env": {
        "TFS_URL": "http://vas-tfs-server:8080/tfs/kolekcia",
        "TFS_PROJECT": "VasProjekt",
        "TFS_PAT": "VAS_PAT_TOKEN"
      }
    },
    "jira": {
      "command": "node",
      "args": ["<cesta-k>/jira-onprem/server.js"],
      "env": {
        "JIRA_URL": "https://jira.example.com",
        "JIRA_API_TOKEN": "VAS_JIRA_TOKEN"
      }
    },
    "ea-reader": {
      "command": "node",
      "args": ["<cesta-k>/ea-mcp-server/dist/server.js"],
      "env": {
        "DB_SERVER": "vas-sql-server",
        "DB_NAME": "vasa-databaza",
        "DB_USER": "vas-pouzivatel",
        "DB_PASSWORD": "VASE_HESLO"
      }
    }
  }
}
```

### Overenie

Po restartovani Claude Desktop otestujte kazdy server:

- **TFS:** "Zobraz moje work items v TFS"
- **Jira:** "Zobraz moje priradene Jira tickety"
- **EA:** "Najdi v EA use case pre prihlasenie"

## Licencia

ISC
