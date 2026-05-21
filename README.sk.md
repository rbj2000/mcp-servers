# Kolekcia MCP Serverov

[English version](README.md)

Kolekcia vlastnych **Model Context Protocol (MCP)** serverov a klientskych skillov urcena na integraciu s Claude Desktop (a inymi MCP-kompatibilnymi klientmi). Tieto servery poskytuju AI asistentom priamy pristup k podnikovym nastrojom: Azure DevOps / TFS, Jira (On-Premise aj Cloud), Enterprise Architect a AWS (Bedrock + EC2).

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
├── aws/                 # MCP server pre AWS (Bedrock + EC2)
│   └── server.js
├── skills/              # Klientske skilly (AI instrukcie pre MCP servery)
│   ├── Azure-MCP-client-skill.md
│   ├── Jira-Mcp-client-skill.md
│   ├── EA-DB-based-client-skill.md
│   ├── AWS-MCP-client-skill.md
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

### 5. AWS Server (Bedrock + EC2)

Lahky Node.js MCP server pre AWS bez externych zavislosti. **AWS Signature V4** je implementovany lokalne pomocou vstavaneho modulu `crypto` — netreba AWS SDK. Podporuje docasne kredencie cez `AWS_SESSION_TOKEN`.

**Nastroje — Bedrock:**
| Nastroj | Popis |
|---------|-------|
| `bedrock_list_foundation_models` | Zoznam foundation modelov (filter podla providera, modality, typu inferencie) |
| `bedrock_get_foundation_model` | Detaily konkretneho modelu |
| `bedrock_list_inference_profiles` | Zoznam inference profilov (napr. cross-region routing) |
| `bedrock_invoke_model` | Volanie modelu s provider-specifickym JSON telom |
| `bedrock_converse` | Provider-agnosticky chat cez Converse API (odporucane) |

**Nastroje — EC2:**
| Nastroj | Popis |
|---------|-------|
| `ec2_describe_instances` | Zoznam EC2 instancii (filtre, strankovanie, region override per volanie) |
| `ec2_describe_regions` | Zoznam AWS regionov |
| `ec2_describe_security_groups` | Zoznam security groups |
| `ec2_describe_vpcs` | Zoznam VPC |
| `ec2_describe_images` | Zoznam AMI (vzdy pouzite `owners` pre zuzenie vysledku) |
| `ec2_start_instances` | Spustenie zastavenych instancii |
| `ec2_stop_instances` | Zastavenie instancii (podporuje `force`) |
| `ec2_reboot_instances` | Restart instancii |

**Premenne prostredia:**
- `AWS_ACCESS_KEY_ID` - Access key
- `AWS_SECRET_ACCESS_KEY` - Secret access key
- `AWS_SESSION_TOKEN` - (Volitelne) Docasny session token (SSO / STS)
- `AWS_REGION` - Predvoleny region (predvolene: `us-east-1`)

#### Autentifikacia cez AWS SSO (IAM Identity Center)

Pre organizacie pouzivajuce AWS IAM Identity Center (napr. Microsoft / Nexonera SSO) **nepouzivajte** dlhodobe access keys — vydavajte docasne kredencie pre kazdu seansu.

**1. Jednorazove nastavenie AWS CLI v2** ([instalacny navod](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)):

```bash
aws configure sso
```

Odpovedzte na vyzvy:

| Vyzva | Hodnota |
|-------|---------|
| SSO start URL | `https://nexonera.awsapps.com/start/#/` |
| SSO region | region kde bezi Identity Center (typicky `eu-central-1`) |
| CLI default client region | region s ktorym najcastejsie pracujete (napr. `eu-central-1`) |
| CLI default output format | `json` |
| Profile name | napr. `nexonera` |

Otvori sa prehliadac — prihlaste sa Microsoft / Nexonera uctom, schvalte zariadenie a vyberte AWS ucet + rolu.

**2. Denne prihlasenie** (obnovi SSO seansu, typicky 8–12 hodin):

```bash
aws sso login --profile nexonera
```

**3. Prepojenie SSO kredencii s MCP serverom.** Server cita premenne prostredia, nie `~/.aws/credentials`. Dve moznosti:

*Moznost A — wrapper exportujuci kredencie (odporucane, macOS / Linux):*

```json
{
  "mcpServers": {
    "aws": {
      "command": "sh",
      "args": [
        "-c",
        "eval \"$(aws configure export-credentials --profile nexonera --format env-no-export)\" && exec node /absolutna/cesta/k/aws/server.js"
      ],
      "env": {
        "AWS_REGION": "eu-central-1"
      }
    }
  }
}
```

Pri kazdom starte servera wrapper vytiahne cerstve `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` a `AWS_SESSION_TOKEN` z SSO cache a spusti `node`. Pokial je `aws sso login` stale platny, restart funguje automaticky.

*Moznost B — exportovat raz, vlozit do konfiguracie:*

```bash
aws configure export-credentials --profile nexonera --format env-no-export
```

Skopirujte tri vypisane hodnoty do `env` bloku. Treba zopakovat pri kazdom expirovani SSO seansy.

*Windows (PowerShell wrapper):* pouzite `aws configure export-credentials --profile nexonera --format powershell | Invoke-Expression` pred volanim `node`, alebo spustite server cez WSL s moznostou A.

---

## Klientske Skilly

Priecinok `skills/` obsahuje `.md` subory skillov, ktore je mozne pridat do Claude Desktop alebo Claude Code ako projektove instrukcie, ktore naucia AI efektivne vyuzivat tieto MCP servery:

- **skills/Azure-MCP-client-skill.md** - Navod pre pracu s Azure DevOps/TFS work itemami a WIQL dotazmi
- **skills/Jira-Mcp-client-skill.md** - Komplexny navod pre Jira integracne workflow (vyhladavanie, vytvavanie, prepajanie, testovacie scenare)
- **skills/EA-DB-based-client-skill.md** - Navod pre navigaciu EA modelom, extrahovanie specifikacii a vizualizaciu diagramov
- **skills/AWS-MCP-client-skill.md** - Navod pre Bedrock invokacie (Converse API) a inspekciu / lifecycle EC2 flotily
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
    },
    "aws": {
      "command": "node",
      "args": ["<cesta-k>/aws/server.js"],
      "env": {
        "AWS_ACCESS_KEY_ID": "VAS_ACCESS_KEY",
        "AWS_SECRET_ACCESS_KEY": "VAS_SECRET_KEY",
        "AWS_REGION": "eu-central-1"
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
- **AWS:** "Vypis moje EC2 instancie v eu-central-1" alebo "Zobraz Bedrock modely od Anthropicu"

## Licencia

ISC
