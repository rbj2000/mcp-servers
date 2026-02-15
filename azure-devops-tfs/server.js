#!/usr/bin/env node
/**
 * TFS MCP Server - Work Items with Comments
 * For Azure DevOps Server / TFS on-premises
 */

const http = require('http');
const https = require('https');
const readline = require('readline');

// Configuration from environment
const TFS_URL = process.env.TFS_URL || 'http://tfs.example.local:8080/tfs/your_collection';
const TFS_PROJECT = process.env.TFS_PROJECT || 'YourProject';
const TFS_PAT = process.env.TFS_PAT || '';
const TFS_API_VERSION = process.env.TFS_API_VERSION || '6.0';

// Parse base URL
const parsedUrl = new URL(TFS_URL);
const isHttps = parsedUrl.protocol === 'https:';
const httpModule = isHttps ? https : http;

/**
 * Make authenticated request to TFS API
 */
function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`:${TFS_PAT}`).toString('base64');
    
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: `${parsedUrl.pathname}${path}`,
      method: method,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 30000
    };

    const req = httpModule.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(JSON.parse(data));
          } else {
            resolve({ error: `HTTP ${res.statusCode}: ${res.statusMessage}`, details: data });
          }
        } catch (e) {
          resolve({ error: 'JSON parse error', details: data });
        }
      });
    });

    req.on('error', (e) => {
      resolve({ error: `Connection failed: ${e.message}` });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ error: 'Request timeout' });
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

/**
 * Get work item with all fields
 */
async function getWorkItem(workItemId) {
  return await makeRequest(
    `/${TFS_PROJECT}/_apis/wit/workItems/${workItemId}?$expand=all&api-version=${TFS_API_VERSION}`
  );
}

/**
 * Get comments for a work item
 */
async function getWorkItemComments(workItemId) {
  // Try newer comments API first
  let result = await makeRequest(
    `/${TFS_PROJECT}/_apis/wit/workItems/${workItemId}/comments?api-version=${TFS_API_VERSION}-preview.3`
  );
  
  // If comments API not available, try history/updates
  if (result.error) {
    result = await makeRequest(
      `/${TFS_PROJECT}/_apis/wit/workItems/${workItemId}/updates?api-version=${TFS_API_VERSION}`
    );
    
    if (result.value) {
      // Filter only updates with comments (System.History field)
      const comments = result.value
        .filter(update => update.fields && update.fields['System.History'])
        .map(update => ({
          id: update.id,
          revisedBy: update.revisedBy?.displayName || 'Unknown',
          revisedDate: update.revisedDate,
          text: update.fields['System.History'].newValue || ''
        }));
      
      return { comments, count: comments.length };
    }
  }
  
  return result;
}

/**
 * Get work item with comments - combined response
 */
async function getWorkItemFull(workItemId) {
  const workItem = await getWorkItem(workItemId);
  
  if (workItem.error) {
    return workItem;
  }
  
  const commentsData = await getWorkItemComments(workItemId);
  const fields = workItem.fields || {};
  
  return {
    id: workItem.id,
    url: workItem.url,
    webUrl: workItem._links?.html?.href || '',
    title: fields['System.Title'] || '',
    state: fields['System.State'] || '',
    type: fields['System.WorkItemType'] || '',
    assignedTo: fields['System.AssignedTo']?.displayName || 'Unassigned',
    createdBy: fields['System.CreatedBy']?.displayName || '',
    createdDate: fields['System.CreatedDate'] || '',
    changedDate: fields['System.ChangedDate'] || '',
    description: fields['System.Description'] || '',
    reproSteps: fields['Microsoft.VSTS.TCM.ReproSteps'] || '',
    acceptanceCriteria: fields['Microsoft.VSTS.Common.AcceptanceCriteria'] || '',
    priority: fields['Microsoft.VSTS.Common.Priority'] || '',
    severity: fields['Microsoft.VSTS.Common.Severity'] || '',
    areaPath: fields['System.AreaPath'] || '',
    iterationPath: fields['System.IterationPath'] || '',
    tags: fields['System.Tags'] || '',
    comments: commentsData.comments || commentsData.value || [],
    commentCount: commentsData.count || (commentsData.value?.length || 0)
  };
}

/**
 * Search work items by WIQL query
 */
async function searchWorkItems(query) {
  return await makeRequest(
    `/${TFS_PROJECT}/_apis/wit/wiql?api-version=${TFS_API_VERSION}`,
    'POST',
    { query }
  );
}

/**
 * Handle incoming JSON-RPC request
 */
async function handleRequest(request) {
  const method = request.method || '';
  const reqId = request.id;
  const params = request.params || {};

  switch (method) {
    case 'initialize':
      return {
        jsonrpc: '2.0',
        id: reqId,
        result: {
          protocolVersion: '2025-06-18',
          capabilities: {
            tools: { listChanged: false }
          },
          serverInfo: {
            name: 'tfs-mcp-server',
            version: '1.0.0',
            description: 'TFS/Azure DevOps Server MCP with comments support'
          }
        }
      };

    case 'notifications/initialized':
      return null; // No response needed

    case 'tools/list':
      return {
        jsonrpc: '2.0',
        id: reqId,
        result: {
          tools: [
            {
              name: 'tfs_get_work_item',
              description: 'Get TFS/Azure DevOps work item with full details including comments',
              inputSchema: {
                type: 'object',
                properties: {
                  id: {
                    type: 'integer',
                    description: 'Work item ID'
                  }
                },
                required: ['id']
              }
            },
            {
              name: 'tfs_get_comments',
              description: 'Get comments/history for a TFS work item',
              inputSchema: {
                type: 'object',
                properties: {
                  id: {
                    type: 'integer',
                    description: 'Work item ID'
                  }
                },
                required: ['id']
              }
            },
            {
              name: 'tfs_search_work_items',
              description: 'Search work items by WIQL query',
              inputSchema: {
                type: 'object',
                properties: {
                  query: {
                    type: 'string',
                    description: 'WIQL query (e.g., "SELECT [System.Id] FROM WorkItems WHERE [System.State] = \'Active\'")'
                  }
                },
                required: ['query']
              }
            }
          ]
        }
      };

    case 'tools/call': {
      const toolName = params.name || '';
      const toolArgs = params.arguments || {};
      let result;

      switch (toolName) {
        case 'tfs_get_work_item':
          if (!toolArgs.id) {
            result = { error: 'Missing required parameter: id' };
          } else {
            result = await getWorkItemFull(parseInt(toolArgs.id));
          }
          break;

        case 'tfs_get_comments':
          if (!toolArgs.id) {
            result = { error: 'Missing required parameter: id' };
          } else {
            result = await getWorkItemComments(parseInt(toolArgs.id));
          }
          break;

        case 'tfs_search_work_items':
          if (!toolArgs.query) {
            result = { error: 'Missing required parameter: query' };
          } else {
            result = await searchWorkItems(toolArgs.query);
          }
          break;

        default:
          result = { error: `Unknown tool: ${toolName}` };
      }

      return {
        jsonrpc: '2.0',
        id: reqId,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
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
}

/**
 * Send JSON-RPC response
 */
function sendResponse(response) {
  console.log(JSON.stringify(response));
}

/**
 * Main entry point
 */
async function main() {
  console.error(`TFS MCP Server started`);
  console.error(`TFS URL: ${TFS_URL}`);
  console.error(`Project: ${TFS_PROJECT}`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });

  rl.on('line', async (line) => {
    if (!line.trim()) return;

    try {
      const request = JSON.parse(line);
      console.error(`Received: ${request.method || 'unknown'}`);
      
      const response = await handleRequest(request);
      if (response) {
        sendResponse(response);
      }
    } catch (e) {
      console.error(`Error: ${e.message}`);
    }
  });

  rl.on('close', () => {
    console.error('TFS MCP Server shutting down');
    process.exit(0);
  });
}

main();