# EA MCP Server

An MCP server for Enterprise Architect that queries an MS SQL database directly.

## Sharing with Others

To share this server, send the following files (zip them up):

- `package.json`
- `tsconfig.json`
- `server.ts`
- `README.md`

> **IMPORTANT:** Do NOT share the `node_modules` folder (it's huge and platform-specific) or the `.env` file (it contains your passwords).

## Installation for New Users

1. **Prerequisites**: Ensure you have [Node.js](https://nodejs.org/) installed (v18 or higher recommended).
2. **Unzip/Copy**: Place the files in a folder, e.g., `~/mcp/ea-mcp-server`.
3. **Install Dependencies**: Open a terminal in that folder and run:
   ```bash
   npm install
   ```
4. **Build (Optional)**: If you prefer running compiled JavaScript:
   ```bash
   npm run build
   ```

## Configuration (Claude Desktop)

### Windows
1.  Open the config file at `%APPDATA%\Claude\claude_desktop_config.json`.
2.  Add the following (replace path with your actual path, using double backslashes):
    ```json
    {
      "mcpServers": {
        "ea-reader": {
          "command": "node",
          "args": [
            "C:\\Users\\YourName\\mcp\\ea-mcp-server\\dist\\server.js"
          ],
          "env": {
            "DB_SERVER": "YOUR_DB_HOST",
            "DB_NAME": "YOUR_DB_NAME",
            "DB_USER": "YOUR_DB_USER",
            "DB_PASSWORD": "YOUR_PASSWORD_HERE"
          }
        }
      }
    }
    ```

### macOS / Linux
1.  Open the config file at `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `~/.config/Claude/claude_desktop_config.json` (Linux).
2.  Add the following:
    ```json
    {
      "mcpServers": {
        "ea-reader": {
          "command": "node",
          "args": [
            "/Users/username/mcp/ea-mcp-server/dist/server.js"
          ],
          "env": {
            "DB_SERVER": "YOUR_DB_HOST",
            "DB_NAME": "YOUR_DB_NAME",
            "DB_USER": "YOUR_DB_USER",
            "DB_PASSWORD": "YOUR_PASSWORD_HERE"
          }
        }
      }
    }
    ```

*Note: If you didn't run `npm run build`, you can use `ts-node` directly, but the pre-built `dist/server.js` approach is more reliable.*

## Development

- Run in dev mode: `npm run dev`
