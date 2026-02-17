#!/usr/bin/env node
import * as readline from 'readline';
import sql from 'mssql';
import dotenv from 'dotenv';

// CRITICAL: Redirect console.log to console.error (stderr)
// because MCP communicates over stdout. Any extra text on stdout breaks the protocol.
const originalConsoleLog = console.log;
console.log = console.error;

dotenv.config();

// Konfigurácia DB
const sqlConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    server: process.env.DB_SERVER || 'localhost',
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
    options: {
        encrypt: false, // Odporucanie: Pre produkciu a non-local siete nastavte na true + platny certifikat
        trustServerCertificate: true
    }
};

// Helper for Mermaid sanitization
function sanitize(str: string): string {
    return str.replace(/["\n\r]/g, '').replace(/[\(\)\[\]\{\}]/g, '');
}

/**
 * Handle incoming JSON-RPC request
 */
async function handleRequest(request: any) {
    const method = request.method || '';
    const reqId = request.id;
    const params = request.params || {};

    try {
        // Basic validation to ensure config is present
        // We check this lazily on request or could check in main()
        if (!process.env.DB_PASSWORD && (method === 'tools/call')) {
            // throw new Error("DB_PASSWORD environment variable is missing");
            // Note: We might want to allow initialize even without DB config, but for tools we need it.
        }

        switch (method) {
            case 'initialize':
                return {
                    jsonrpc: '2.0',
                    id: reqId,
                    result: {
                        protocolVersion: '2025-06-18', // Compatible version
                        capabilities: {
                            tools: { listChanged: false }
                        },
                        serverInfo: {
                            name: 'ea-mcp-server',
                            version: '1.0.0',
                            description: 'MCP server for Enterprise Architect MS SQL'
                        }
                    }
                };

            case 'notifications/initialized':
                return null;

            case 'tools/list':
                return {
                    jsonrpc: '2.0',
                    id: reqId,
                    result: {
                        tools: [
                            {
                                name: "search_ea_elements",
                                description: "Hľadá Use Cases alebo Procesy v Enterprise Architect podľa názvu",
                                inputSchema: {
                                    type: "object",
                                    properties: {
                                        keyword: { type: "string", description: "Hľadaný výraz (napr. 'Prihlásenie')" },
                                        maxResults: { type: "integer", description: "Max results to return (default 20)" },
                                        offset: { type: "integer", description: "Number of results to skip (default 0). Use with maxResults for pagination." }
                                    },
                                    required: ["keyword"]
                                }
                            },
                            {
                                name: "list_root_packages",
                                description: "Vráti zoznam koreňových balíkov (projektov)",
                                inputSchema: {
                                    type: "object",
                                    properties: {},
                                    required: []
                                }
                            },
                            {
                                name: "get_element_details",
                                description: "Vráti detail špecifikácie a kroky scenárov pre dané ID",
                                inputSchema: {
                                    type: "object",
                                    properties: {
                                        object_id: { type: "number", description: "ID elementu z vyhľadávania" }
                                    },
                                    required: ["object_id"]
                                }
                            },
                            {
                                name: "search_diagrams",
                                description: "Hľadá diagramy v Enterprise Architect podľa názvu",
                                inputSchema: {
                                    type: "object",
                                    properties: {
                                        keyword: { type: "string", description: "Hľadaný výraz" },
                                        maxResults: { type: "integer", description: "Max results to return (default 20)" },
                                        offset: { type: "integer", description: "Number of results to skip (default 0). Use with maxResults for pagination." }
                                    },
                                    required: ["keyword"]
                                }
                            },
                            {
                                name: "get_diagram_as_mermaid",
                                description: "Vráti definíciu diagramu vo formáte Mermaid.js (pre vykreslenie grafu)",
                                inputSchema: {
                                    type: "object",
                                    properties: {
                                        diagram_id: { type: "number", description: "ID diagramu získané z search_diagrams" }
                                    },
                                    required: ["diagram_id"]
                                }
                            },
                            {
                                name: "get_element_relationships",
                                description: "Vráti vzťahy (traceability), hierarchiu a dependencie pre daný element",
                                inputSchema: {
                                    type: "object",
                                    properties: {
                                        object_id: { type: "number", description: "ID elementu" }
                                    },
                                    required: ["object_id"]
                                }
                            }
                        ]
                    }
                };

            case 'tools/call': {
                const toolName = params.name || '';
                const args = params.arguments || {};

                // Establish connection for tool calls
                try {
                    await sql.connect(sqlConfig as any);
                } catch (connErr: any) {
                    throw new Error(`Failed to connect to database: ${connErr.message || String(connErr)}`);
                }

                let result;

                // Helper: Get all Package IDs in the project tree
                const getProjectPackageIds = async () => {
                    const projectName = process.env.EA_PROJECT_NAME;
                    if (!projectName) return null;

                    const rootPkg = await sql.query`SELECT Package_ID FROM t_package WHERE Name = ${projectName} AND Parent_ID = 0`;
                    if (rootPkg.recordset.length === 0) {
                        console.error(`Warning: Project '${projectName}' not found via EA_PROJECT_NAME. Falling back to global search.`);
                        return null;
                    }
                    const rootId = rootPkg.recordset[0].Package_ID;

                    // Recursive CTE to get all IDs
                    const treeRequest = new sql.Request();
                    treeRequest.input('rootId', sql.Int, rootId);
                    const treeResult = await treeRequest.query(`
                        WITH PackageHierarchy AS (
                            SELECT Package_ID
                            FROM t_package
                            WHERE Package_ID = @rootId
                            UNION ALL
                            SELECT p.Package_ID
                            FROM t_package p
                            INNER JOIN PackageHierarchy ph ON p.Parent_ID = ph.Package_ID
                        )
                        SELECT Package_ID FROM PackageHierarchy
                    `);
                    return treeResult.recordset.map((r: any) => r.Package_ID);
                };

                const projectPackageIds = await getProjectPackageIds();
                // Helper to generate parameterized IN clause
                const allowedTables = ['t_object', 't_diagram'];
                const addPackageFilter = (sqlReq: sql.Request, tableNameStr: string): string => {
                    if (!projectPackageIds || projectPackageIds.length === 0) return "";
                    if (!allowedTables.includes(tableNameStr)) {
                        throw new Error(`Invalid table name for package filter: ${tableNameStr}`);
                    }
                    const placeholders = projectPackageIds.map((id: number, i: number) => {
                        const paramName = `pkgId${i}`;
                        sqlReq.input(paramName, sql.Int, id);
                        return `@${paramName}`;
                    });
                    return ` AND ${tableNameStr}.Package_ID IN (${placeholders.join(',')}) `;
                };


                if (toolName === "list_root_packages") {
                    const queryResult = await sql.query`SELECT Name, Package_ID FROM t_package WHERE Parent_ID = 0`;
                    result = queryResult.recordset;
                }
                else if (toolName === "search_ea_elements") {
                    const { keyword } = params.arguments as { keyword: string };
                    const maxResults = args.maxResults || 20;
                    const offset = args.offset || 0;

                    const whereBase = `WHERE Name LIKE @keyword
                AND Object_Type IN ('UseCase', 'Activity', 'Requirement', 'Feature', 'Component')`;

                    // Count query
                    const countReq = new sql.Request();
                    countReq.input('keyword', sql.NVarChar, `%${keyword}%`);
                    const countFilter = addPackageFilter(countReq, "t_object");
                    const countResult = await countReq.query(
                        `SELECT COUNT(*) as total FROM t_object ${whereBase} ${countFilter}`
                    );

                    // Data query with pagination
                    const dataReq = new sql.Request();
                    dataReq.input('keyword', sql.NVarChar, `%${keyword}%`);
                    dataReq.input('offset', sql.Int, offset);
                    dataReq.input('maxResults', sql.Int, maxResults);
                    const dataFilter = addPackageFilter(dataReq, "t_object");
                    const dataResult = await dataReq.query(`
                SELECT Object_ID, Name, Object_Type, Author, Note
                FROM t_object
                ${whereBase}
                ${dataFilter}
                ORDER BY Name
                OFFSET @offset ROWS FETCH NEXT @maxResults ROWS ONLY
            `);
                    result = {
                        total: countResult.recordset[0].total,
                        offset,
                        maxResults,
                        items: dataResult.recordset
                    };
                }

                else if (toolName === "get_element_details") {
                    const { object_id } = params.arguments as { object_id: number };

                    // 1. Získať Note
                    const objResult = await sql.query`SELECT Name, Note, Object_Type FROM t_object WHERE Object_ID = ${object_id}`;

                    // 2. Získať Scenáre (XML)
                    const scenResult = await sql.query`SELECT Scenario, Notes, XMLContent FROM t_objectscenarios WHERE Object_ID = ${object_id}`;

                    result = {
                        element: objResult.recordset[0] || null,
                        scenarios: scenResult.recordset
                    };
                }
                else if (toolName === "search_diagrams") {
                    const keyword = args.keyword;
                    const maxResults = args.maxResults || 20;
                    const offset = args.offset || 0;

                    const whereBase = `WHERE Name LIKE @keyword`;

                    // Count query
                    const countReq = new sql.Request();
                    countReq.input('keyword', sql.NVarChar, `%${keyword}%`);
                    const countFilter = addPackageFilter(countReq, "t_diagram");
                    const countResult = await countReq.query(
                        `SELECT COUNT(*) as total FROM t_diagram ${whereBase} ${countFilter}`
                    );

                    // Data query with pagination
                    const dataReq = new sql.Request();
                    dataReq.input('keyword', sql.NVarChar, `%${keyword}%`);
                    dataReq.input('offset', sql.Int, offset);
                    dataReq.input('maxResults', sql.Int, maxResults);
                    const dataFilter = addPackageFilter(dataReq, "t_diagram");
                    const dataResult = await dataReq.query(`
                        SELECT Diagram_ID, Name, Diagram_Type
                        FROM t_diagram
                        ${whereBase}
                        ${dataFilter}
                        ORDER BY Name
                        OFFSET @offset ROWS FETCH NEXT @maxResults ROWS ONLY
                    `);
                    result = {
                        total: countResult.recordset[0].total,
                        offset,
                        maxResults,
                        items: dataResult.recordset
                    };
                }
                else if (toolName === "get_diagram_as_mermaid") {
                    const diagram_id = args.diagram_id;

                    // 1. Get objects
                    const objectsQuery = await sql.query`
                        SELECT o.Object_ID, o.Name, o.Object_Type 
                        FROM t_diagramobjects do 
                        JOIN t_object o ON do.Object_ID = o.Object_ID 
                        WHERE do.Diagram_ID = ${diagram_id}
                    `;
                    const objects = objectsQuery.recordset;

                    if (objects.length === 0) {
                        result = "graph TD;\nError[Diagram is empty or not found]";
                    } else {
                        const objectIds = objects.map((o: any) => o.Object_ID);

                        // 2. Get connectors - PARAMETERIZED
                        const connReq = new sql.Request();
                        const startPlaceholders = objectIds.map((id: number, i: number) => {
                            connReq.input(`startId${i}`, sql.Int, id);
                            return `@startId${i}`;
                        });
                        const endPlaceholders = objectIds.map((id: number, i: number) => {
                            connReq.input(`endId${i}`, sql.Int, id);
                            return `@endId${i}`;
                        });
                        const connectorQuery = await connReq.query(`
                            SELECT Start_Object_ID, End_Object_ID, Connector_Type, Name
                            FROM t_connector
                            WHERE Start_Object_ID IN (${startPlaceholders.join(',')})
                            AND End_Object_ID IN (${endPlaceholders.join(',')})
                        `);
                        const connectors = connectorQuery.recordset;

                        // 3. Construct Mermaid
                        let mermaid = "graph TD;\n";
                        for (const obj of objects) {
                            const safeName = sanitize(obj.Name);
                            const id = `node${obj.Object_ID}`;
                            if (obj.Object_Type === 'UseCase') {
                                mermaid += `    ${id}(("${safeName}"));\n`;
                            } else if (obj.Object_Type === 'Activity' || obj.Object_Type === 'Action') {
                                mermaid += `    ${id}("${safeName}");\n`;
                            } else if (obj.Object_Type === 'Decision') {
                                mermaid += `    ${id}{"${safeName}"};\n`;
                            } else {
                                mermaid += `    ${id}["${safeName}"];\n`;
                            }
                        }
                        for (const conn of connectors) {
                            const src = `node${conn.Start_Object_ID}`;
                            const dst = `node${conn.End_Object_ID}`;
                            const label = conn.Name ? `|"${sanitize(conn.Name)}"` : "";
                            const arrow = "-->";
                            mermaid += `    ${src}${arrow}${label}|${dst};\n`;
                        }
                        result = mermaid;
                    }
                }
                else if (toolName === "get_element_relationships") {
                    const object_id = args.object_id;

                    const packageQuery = await sql.query`
                        SELECT p.Name as Package_Name, p.Package_ID 
                        FROM t_package p 
                        JOIN t_object o ON o.Package_ID = p.Package_ID 
                        WHERE o.Object_ID = ${object_id}
                    `;
                    const parentPackage = packageQuery.recordset[0] || null;

                    const connectorsQuery = await sql.query`
                        SELECT 
                            c.Connector_ID, 
                            c.Name as Connector_Name, 
                            c.Connector_Type, 
                            c.Direction, 
                            c.SourceRole, 
                            c.DestRole, 
                            CASE WHEN c.Start_Object_ID = ${object_id} THEN 'Outgoing' ELSE 'Incoming' END as Relation_Direction,
                            other_o.Object_ID as Related_Object_ID,
                            other_o.Name as Related_Object_Name,
                            other_o.Object_Type as Related_Object_Type
                        FROM t_connector c
                        JOIN t_object other_o ON (
                            (c.Start_Object_ID = ${object_id} AND c.End_Object_ID = other_o.Object_ID)
                            OR 
                            (c.End_Object_ID = ${object_id} AND c.Start_Object_ID = other_o.Object_ID)
                        )
                        WHERE c.Start_Object_ID = ${object_id} OR c.End_Object_ID = ${object_id}
                    `;

                    result = {
                        context: { parent_package: parentPackage },
                        relationships: connectorsQuery.recordset
                    };
                }
                else {
                    return {
                        jsonrpc: '2.0',
                        id: reqId,
                        error: {
                            code: -32601,
                            message: `Tool not found: ${toolName}`
                        }
                    };
                }

                // Generic result wrapper
                // For MCP, if result is a string, wrap it. If object, stringify it? 
                // The SDK usually expects: { content: [{ type: "text", text: ... }] }

                let textContent = "";
                if (typeof result === 'string') {
                    textContent = result;
                } else {
                    textContent = JSON.stringify(result, null, 2);
                }

                return {
                    jsonrpc: '2.0',
                    id: reqId,
                    result: {
                        content: [
                            {
                                type: 'text',
                                text: textContent
                            }
                        ]
                    }
                };
            }

            default:
                return {
                    jsonrpc: '2.0',
                    id: reqId,
                    error: {
                        code: -32601,
                        message: `Method not found: ${method}`
                    }
                };
        }
    } catch (err: any) {
        return {
            jsonrpc: '2.0',
            id: reqId,
            error: {
                code: -32000,
                message: err.message || 'Internal error'
            }
        };
    }
}

/**
 * Main Loop
 */
async function main() {
    console.error(`EA MCP Server started (v1.1 - with filtering)`);

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: false
    });

    rl.on('line', async (line) => {
        if (!line.trim()) return;
        try {
            const request = JSON.parse(line);
            const response = await handleRequest(request);
            if (response) {
                // Debug log
                // console.error("Sending response:", JSON.stringify(response)); 
                // MCP protocol requires sending JSON string followed by newline to stdout
                process.stdout.write(JSON.stringify(response) + "\n");
            }
        } catch (e: any) {
            console.error(`Error processing request: ${e.message}`);
        }
    });
}

main();
