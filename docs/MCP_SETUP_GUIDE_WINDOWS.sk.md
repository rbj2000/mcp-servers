# Navod na nastavenie MCP pre Claude Desktop (Windows)

[English version](MCP_SETUP_GUIDE_WINDOWS.md)

**Integracia: Azure DevOps (TFS) + Jira On-Premise + Jira Cloud + Enterprise Architect (EA)**
**Platforma:** Windows

---

## Predpoklady

### 1. Instalacia Node.js
Stiahnite a naintalujte Node.js v20 LTS alebo novsi z:
https://nodejs.org/

Po instalacii overte v Command Prompt alebo PowerShell:
```bash
node --version
npm --version
```

### 2. Instalacia Claude Desktop
Stiahnite Claude Desktop z:
https://claude.ai/download

### 3. Instalacia custom MCP serverov
Stiahnite vsetky adresare (`azure-devops-tfs`, `jira-onprem`, `jira-cloud`, `ea-mcp-server`) do spolocneho adresara (napr. `C:\Tools\mcp`) na svojom pocitaci.

Vasa adresarova struktura by mala vyzerat takto:
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

#### Priprava EA MCP Servera (Jednorazovy krok)
EA MCP server vyzaduje instalaciu zavislosti pred prvym spustenim.
1. Otvorte Command Prompt alebo PowerShell.
2. Prejdite do adresara EA servera:
   ```bash
   cd C:\Tools\mcp\ea-mcp-server
   ```
3. Naintalujte zavislosti:
   ```bash
   npm install
   ```
4. Vytvorte spustitelny subor (build):
   ```bash
   npm run build
   ```
   *Toto vytvori subor `dist/server.js`, ktory budeme pouzivat.*

---

## Generovanie tokenov

### Azure DevOps / TFS Personal Access Token (PAT)
1. Otvorte vas TFS/Azure DevOps server v prehliadaci.
2. Kliknite na ikonu profilu (pravy horny roh) -> **Security** alebo **Personal Access Tokens**.
3. Kliknite na **New Token** alebo **Add**.
4. Nakonfigurujte:
   - **Name**: Claude MCP Access
   - **Expiration**: 90 dni alebo Vlastne (odporucane: 1 rok)
   - **Scopes**: Full access alebo aspon: Work Items (Read & Write), Code (Read), Build (Read)
5. Kliknite **Create**.
6. **DOLEZITE**: Okamzite skopirujte token!

### Jira On-Premise - Personal Access Token (PAT)
1. Prihlaste sa do Jira Server/Data Center.
2. Kliknite na avatar profilu -> **Profile**.
3. V lavom menu kliknite na **Personal Access Tokens**.
4. Kliknite na **Create token**.
5. Nakonfigurujte:
   - **Token name**: Claude MCP Access
   - **Expiry date**: Vlastny datum (odporucane: 1 rok)
6. Kliknite **Create**.
7. **DOLEZITE**: Okamzite skopirujte token!

### Jira Cloud - API Token
1. Prihlaste sa na https://id.atlassian.com/manage-profile/security/api-tokens
2. Kliknite na **Create API token**.
3. Nakonfigurujte:
   - **Label**: Claude MCP Access
4. Kliknite **Create**.
5. **DOLEZITE**: Okamzite skopirujte token!
6. *Poznamka: Pre Jira Cloud potrebujete aj vase prihlasovacie meno (email) - nastavte ho v `JIRA_USERNAME`.*

---

## Konfiguracia Claude Desktop

### Krok 1: Otvorte konfiguracny subor
Otvorte Prieskumnik a prejdite na:
`%APPDATA%\Claude\claude_desktop_config.json`

(Stlacte `Win + R`, vlozite cestu a stlacte Enter. Ak subor neexistuje, vytvorte ho v Poznamkovom bloku.)

### Krok 2: Pridajte MCP konfiguraciu
Skopirujte a vlozite nasledujuce JSON, pricom **nahradte hodnoty** vasimi skutocnymi udajmi.

Vyberte si servery podla vasich potrieb (nemusite pouzit vsetky):

```json
{
  "mcpServers": {
    "tfs": {
      "command": "node",
      "args": ["C:\\Tools\\mcp\\azure-devops-tfs\\server.js"],
      "env": {
        "TFS_URL": "http://tfs.example.local:8080/tfs/internal_projects",
        "TFS_PROJECT": "ZVJS",
        "TFS_PAT": "VAS_TOKEN_Z_TFS",
        "TFS_API_VERSION": "6.0"
      }
    },
    "jira-onprem": {
      "command": "node",
      "args": ["C:\\Tools\\mcp\\jira-onprem\\server.js"],
      "env": {
        "JIRA_URL": "https://jira.example.com",
        "JIRA_API_TOKEN": "VAS_TOKEN_Z_JIRA"
      }
    },
    "jira-cloud": {
      "command": "node",
      "args": ["C:\\Tools\\mcp\\jira-cloud\\server.js"],
      "env": {
        "JIRA_URL": "https://vasafirma.atlassian.net",
        "JIRA_USERNAME": "vas-email@firma.com",
        "JIRA_API_TOKEN": "VAS_ATLASSIAN_API_TOKEN"
      }
    },
    "ea-reader": {
      "command": "node",
      "args": ["C:\\Tools\\mcp\\ea-mcp-server\\dist\\server.js"],
      "env": {
        "DB_SERVER": "YOUR_DB_HOST",
        "DB_NAME": "YOUR_DB_NAME",
        "DB_USER": "YOUR_DB_USER",
        "DB_PASSWORD": "VASE_DB_HESLO",
        "EA_PROJECT_NAME": "Volitelne: Nazov Root Balika"
      }
    }
  }
}
```

**Poznamky:**
- `EA_PROJECT_NAME` je volitelne. Ak zadate nazov root balika (projektu), vyhladavanie sa obmedzi iba na tento projekt.
- Nezabudnite pouzit dvojite spatne lomitka `\\` v cestach vo Windows.
- **Jira On-Prem** pouziva Bearer token (PAT) - staci nastavit `JIRA_API_TOKEN`.
- **Jira Cloud** pouziva Basic Auth - potrebujete aj `JIRA_USERNAME` (vas email) aj `JIRA_API_TOKEN`.
- Nemusite konfigurovat vsetky servery. Pridajte len tie, ktore potrebujete.

### Krok 3: Restartujte Claude Desktop
1. Uplne zatvorte Claude Desktop (ikona v systemovej liste -> Quit).
2. Znova ho spustite.
3. V chate by ste mali vidiet ikonu nastrojov (zasuvka/kladivo), kde budu dostupne nastroje pre vsetky nakonfigurovane servery.

---

## Prehlad dostupnych nastrojov

### Azure DevOps / TFS
| Nastroj | Popis |
|---------|-------|
| `tfs_get_work_item` | Ziskanie work itemu s detailmi a komentarmi |
| `tfs_get_comments` | Ziskanie komentarov/historie work itemu |
| `tfs_search_work_items` | Vyhladavanie work itemov pomocou WIQL |

### Jira (On-Premise aj Cloud)
| Nastroj | Popis |
|---------|-------|
| `jira_search` | Vyhladavanie issues pomocou JQL |
| `jira_get_issue` | Ziskanie plnych detailov issue |
| `jira_create_issue` | Vytvorenie noveho issue |
| `jira_update_issue` | Aktualizacia poli issue |
| `jira_add_comment` | Pridanie komentara |
| `jira_get_transitions` | Ziskanie dostupnych workflow prechodov |
| `jira_transition` | Prechod issue do noveho stavu |
| `jira_link_issues` | Prepojenie dvoch issues |
| `jira_add_worklog` | Zalogovanie casu |
| `jira_get_attachments` | Zoznam priloh |

*Len Jira Cloud:*
| Nastroj | Popis |
|---------|-------|
| `jira_search_projects` | Vyhladavanie projektov |
| `jira_get_project_issue_types` | Ziskanie typov issues pre projekt |

### Enterprise Architect
| Nastroj | Popis |
|---------|-------|
| `search_ea_elements` | Vyhladavanie Use Case-ov, Aktivit, Poziadaviek |
| `get_element_details` | Plna specifikacia s krokmi scenara (XML) |
| `search_diagrams` | Vyhladavanie diagramov |
| `get_diagram_as_mermaid` | Generovanie Mermaid.js vizualizacie |
| `get_element_relationships` | Sledovatelnost, hierarchia, zavislosti |

---

## Overenie funkcnosti

### Test pripojenia Azure DevOps
Opytajte sa Claude:
> "Zobraz moje work items v TFS"

### Test pripojenia Jira (On-Premise)
Opytajte sa Claude:
> "Zobraz moje priradene Jira tickety"

### Test pripojenia Jira (Cloud)
Opytajte sa Claude:
> "Vyhladaj projekty v Jira"

### Test pripojenia EA (Enterprise Architect)
Opytajte sa Claude:
> "Najdi v EA use case pre Prihlasenie"

---

## Riesenie problemov

- **EA Server Error**: Uistite sa, ze ste spustili `npm install` a `npm run build` v adresari `ea-mcp-server`.
- **Databaza**: Uistite sa, ze mate pristup na IP databazoveho servera (VPN/siet).
- **Syntax Error v JSON**: Skontrolujte ci v JSON subore nechybaju ciarky alebo uvodzovky. Pouzite JSON validator (napr. https://jsonlint.com).
- **Jira Cloud 401 Unauthorized**: Skontrolujte ci ste spravne nastavili `JIRA_USERNAME` (email) aj `JIRA_API_TOKEN`.
- **Jira On-Prem 401 Unauthorized**: Skontrolujte ci je PAT token platny a ci ma dostatocne opravnenia.
- **TFS Connection Failed**: Overte ci je TFS server dostupny z vasej siete a ci je PAT token platny.
- **Nastroje sa nezobrazuju**: Restartujte Claude Desktop uplne (Quit, nie len zavriet okno).
