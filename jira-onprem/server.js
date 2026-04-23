#!/usr/bin/env node
/**
 * Jira MCP Server
 * Comprehensive suite of tools for Jira interaction
 * - Search, Get, Create, Update Issues
 * - Comments, Transitions, Worklogs, Linking, Attachments
 */

const https = require('https');
const readline = require('readline');

// Configuration from environment
const JIRA_URL = process.env.JIRA_URL || '';
const JIRA_USERNAME = process.env.JIRA_USERNAME || '';
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN || process.env.JIRA_PAT || '';

// Parse base URL
let parsedUrl;
try {
  parsedUrl = new URL(JIRA_URL);
} catch (e) {
  // If JIRA_URL is not set yet, we might fail here, but we'll check it before making requests
  parsedUrl = null;
}

/**
 * Make authenticated request to Jira API
 */
function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    if (!parsedUrl) {
      resolve({ error: 'JIRA_URL environment variable is not set or invalid' });
      return;
    }

    if (!JIRA_API_TOKEN) {
      resolve({ error: 'JIRA_API_TOKEN (or JIRA_PAT) environment variable is not set' });
      return;
    }

    // Determine auth header
    let authHeader;
    if (JIRA_USERNAME) {
      // Basic Auth (Cloud or Server with username/password)
      const auth = Buffer.from(`${JIRA_USERNAME}:${JIRA_API_TOKEN}`).toString('base64');
      authHeader = `Basic ${auth}`;
    } else {
      // Bearer Token (PAT for Server/Data Center)
      authHeader = `Bearer ${JIRA_API_TOKEN}`;
    }

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: `${parsedUrl.pathname.replace(/\/$/, '')}${path}`,
      method: method,
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 30000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            // For 204 No Content
            if (res.statusCode === 204) {
              resolve({ success: true, status: 204 });
            } else {
               // Handle empty response body gracefully
               if (data.trim() === '') {
                 resolve({ success: true, status: res.statusCode });
               } else {
                 resolve(JSON.parse(data));
               }
            }
          } else {
            // Try to parse error message if possible
            let errorDetails = data;
            try {
                const jsonError = JSON.parse(data);
                errorDetails = JSON.stringify(jsonError, null, 2);
            } catch (e) { /* ignore */ }
            
            resolve({ error: `HTTP ${res.statusCode}: ${res.statusMessage}`, details: errorDetails });
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

// --- JIRA Tools Implementation ---

async function jiraSearch(jql, maxResults = 50, startAt = 0) {
  // Use POST for search to handle long JQL queries
  return await makeRequest('/rest/api/2/search', 'POST', {
    jql,
    maxResults,
    startAt,
    fields: ['summary', 'status', 'assignee', 'priority', 'issuetype', 'created', 'updated', 'project']
  });
}

async function jiraGetIssue(issueIdOrKey) {
  return await makeRequest(`/rest/api/2/issue/${issueIdOrKey}`);
}

async function jiraCreateIssue(projectKey, summary, description, issueType, extraFields = {}) {
  const body = {
    fields: {
      project: { key: projectKey },
      summary: summary,
      description: description,
      issuetype: { name: issueType },
      ...extraFields
    }
  };
  return await makeRequest('/rest/api/2/issue', 'POST', body);
}

async function jiraUpdateIssue(issueIdOrKey, fields) {
  const body = { fields };
  return await makeRequest(`/rest/api/2/issue/${issueIdOrKey}`, 'PUT', body);
}

async function jiraAddComment(issueIdOrKey, body) {
  return await makeRequest(`/rest/api/2/issue/${issueIdOrKey}/comment`, 'POST', { body });
}

async function jiraGetTransitions(issueIdOrKey) {
  return await makeRequest(`/rest/api/2/issue/${issueIdOrKey}/transitions`);
}

async function jiraTransition(issueIdOrKey, transitionId) {
  return await makeRequest(`/rest/api/2/issue/${issueIdOrKey}/transitions`, 'POST', {
    transition: { id: transitionId }
  });
}

async function jiraLinkIssues(inwardIssueKey, outwardIssueKey, linkType) {
  return await makeRequest('/rest/api/2/issueLink', 'POST', {
    type: { name: linkType },
    inwardIssue: { key: inwardIssueKey },
    outwardIssue: { key: outwardIssueKey }
  });
}

async function jiraAddRemoteLink(issueIdOrKey, url, title, summary = null, relationship = null, globalId = null, icon = null) {
  const object = { url, title };
  if (summary) object.summary = summary;
  if (icon) object.icon = icon;

  const body = { object };
  if (relationship) body.relationship = relationship;
  if (globalId) body.globalId = globalId;

  return await makeRequest(`/rest/api/2/issue/${issueIdOrKey}/remotelink`, 'POST', body);
}

async function jiraAddWorklog(issueIdOrKey, timeSpent, comment = '', started = null) {
  const body = {
    timeSpent,
    comment
  };
  if (started) {
    body.started = started; // Format: "2021-02-23T06:16:32.483+0000"
  }
  return await makeRequest(`/rest/api/2/issue/${issueIdOrKey}/worklog`, 'POST', body);
}

// Note: Attachments are usually retrieved via getIssue (fields.attachment).
// This tool is a helper to just list them cleaner.
async function jiraGetAttachments(issueIdOrKey) {
  const issue = await jiraGetIssue(issueIdOrKey);
  if (issue.error) return issue;
  
  if (issue.fields && issue.fields.attachment) {
    return {
      issueKey: issue.key,
      attachments: issue.fields.attachment.map(att => ({
        id: att.id,
        filename: att.filename,
        author: att.author.displayName,
        created: att.created,
        size: att.size,
        mimeType: att.mimeType,
        content: att.content
      }))
    };
  }
  return { issueKey: issueIdOrKey, attachments: [] };
}


// --- MCP Server Logic ---

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
            name: 'jira-mcp-server',
            version: '1.0.0',
            description: 'Jira MCP with comprehensive toolset'
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
              name: 'jira_search',
              description: 'Search Jira issues using JQL',
              inputSchema: {
                type: 'object',
                properties: {
                  jql: { type: 'string', description: 'JQL query string' },
                  maxResults: { type: 'integer', description: 'Max results to return (default 50)' },
                  startAt: { type: 'integer', description: 'Index of the first result to return (0-based, default 0). Use with maxResults for pagination.' }
                },
                required: ['jql']
              }
            },
            {
              name: 'jira_get_issue',
              description: 'Get details of a Jira issue',
              inputSchema: {
                type: 'object',
                properties: {
                  issueIdOrKey: { type: 'string', description: 'Issue Key (e.g. PROJ-123) or ID' }
                },
                required: ['issueIdOrKey']
              }
            },
            {
              name: 'jira_create_issue',
              description: 'Create a new Jira issue',
              inputSchema: {
                type: 'object',
                properties: {
                  projectKey: { type: 'string', description: 'Project Key (e.g. PROJ)' },
                  summary: { type: 'string', description: 'Issue Summary' },
                  description: { type: 'string', description: 'Issue Description' },
                  issueType: { type: 'string', description: 'Issue Type (e.g. Bug, Story)' },
                  extraFields: { type: 'object', description: 'Additional fields as key-value pairs' }
                },
                required: ['projectKey', 'summary', 'issueType']
              }
            },
            {
              name: 'jira_update_issue',
              description: 'Update fields of a Jira issue',
              inputSchema: {
                type: 'object',
                properties: {
                  issueIdOrKey: { type: 'string', description: 'Issue Key or ID' },
                  fields: { type: 'object', description: 'Fields to update (e.g. { "summary": "New Title" })' }
                },
                required: ['issueIdOrKey', 'fields']
              }
            },
            {
              name: 'jira_add_comment',
              description: 'Add a comment to an issue',
              inputSchema: {
                type: 'object',
                properties: {
                  issueIdOrKey: { type: 'string', description: 'Issue Key or ID' },
                  body: { type: 'string', description: 'Comment text' }
                },
                required: ['issueIdOrKey', 'body']
              }
            },
            {
              name: 'jira_get_transitions',
              description: 'Get available transitions for an issue',
              inputSchema: {
                type: 'object',
                properties: {
                  issueIdOrKey: { type: 'string', description: 'Issue Key or ID' }
                },
                required: ['issueIdOrKey']
              }
            },
            {
              name: 'jira_transition',
              description: 'Transition an issue to a new status',
              inputSchema: {
                type: 'object',
                properties: {
                  issueIdOrKey: { type: 'string', description: 'Issue Key or ID' },
                  transitionId: { type: 'string', description: 'ID of the transition to perform' }
                },
                required: ['issueIdOrKey', 'transitionId']
              }
            },
            {
              name: 'jira_link_issues',
              description: 'Link two issues together',
              inputSchema: {
                type: 'object',
                properties: {
                  inwardIssueKey: { type: 'string', description: 'Key of the issue to link FROM' },
                  outwardIssueKey: { type: 'string', description: 'Key of the issue to link TO' },
                  linkType: { type: 'string', description: 'Name of link type (e.g. "Blocks", "Relates", "Duplicate")' }
                },
                required: ['inwardIssueKey', 'outwardIssueKey', 'linkType']
              }
            },
            {
              name: 'jira_add_remote_link',
              description: 'Add a remote (web) link to a Jira issue (e.g. link to external URL, Confluence page, another system)',
              inputSchema: {
                type: 'object',
                properties: {
                  issueIdOrKey: { type: 'string', description: 'Issue Key or ID' },
                  url: { type: 'string', description: 'Target URL of the remote link' },
                  title: { type: 'string', description: 'Title of the link displayed in Jira' },
                  summary: { type: 'string', description: 'Optional summary/description shown under the title' },
                  relationship: { type: 'string', description: 'Optional relationship text (e.g. "causes", "relates to")' },
                  globalId: { type: 'string', description: 'Optional unique global ID for idempotent updates' },
                  icon: { type: 'object', description: 'Optional icon object { url16x16, title }' }
                },
                required: ['issueIdOrKey', 'url', 'title']
              }
            },
            {
              name: 'jira_add_worklog',
              description: 'Log time on an issue',
              inputSchema: {
                type: 'object',
                properties: {
                  issueIdOrKey: { type: 'string', description: 'Issue Key or ID' },
                  timeSpent: { type: 'string', description: 'Time spent (e.g. "1h 30m", "2d")' },
                  comment: { type: 'string', description: 'Worklog comment' },
                  started: { type: 'string', description: 'Start time (ISO 8601), defaults to now' }
                },
                required: ['issueIdOrKey', 'timeSpent']
              }
            },
            {
              name: 'jira_get_attachments',
              description: 'Get list of attachments for an issue',
              inputSchema: {
                type: 'object',
                properties: {
                  issueIdOrKey: { type: 'string', description: 'Issue Key or ID' }
                },
                required: ['issueIdOrKey']
              }
            }
          ]
        }
      };

    case 'tools/call': {
      const toolName = params.name || '';
      const args = params.arguments || {};
      let result;

      switch (toolName) {
        case 'jira_search':
          result = await jiraSearch(args.jql, args.maxResults, args.startAt);
          break;
        case 'jira_get_issue':
          result = await jiraGetIssue(args.issueIdOrKey);
          break;
        case 'jira_create_issue':
          result = await jiraCreateIssue(args.projectKey, args.summary, args.description, args.issueType, args.extraFields);
          break;
        case 'jira_update_issue':
          result = await jiraUpdateIssue(args.issueIdOrKey, args.fields);
          break;
        case 'jira_add_comment':
          result = await jiraAddComment(args.issueIdOrKey, args.body);
          break;
        case 'jira_get_transitions':
          result = await jiraGetTransitions(args.issueIdOrKey);
          break;
        case 'jira_transition':
          result = await jiraTransition(args.issueIdOrKey, args.transitionId);
          break;
        case 'jira_link_issues':
          result = await jiraLinkIssues(args.inwardIssueKey, args.outwardIssueKey, args.linkType);
          break;
        case 'jira_add_remote_link':
          result = await jiraAddRemoteLink(args.issueIdOrKey, args.url, args.title, args.summary, args.relationship, args.globalId, args.icon);
          break;
        case 'jira_add_worklog':
          result = await jiraAddWorklog(args.issueIdOrKey, args.timeSpent, args.comment, args.started);
          break;
        case 'jira_get_attachments':
          result = await jiraGetAttachments(args.issueIdOrKey);
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
 * Main Loop
 */
async function main() {
  console.error(`Jira MCP Server started`);
  
  if (!process.env.JIRA_URL) console.error('WARNING: JIRA_URL env var not set');
  if (!process.env.JIRA_API_TOKEN && !process.env.JIRA_PAT) console.error('WARNING: JIRA_API_TOKEN or JIRA_PAT env var not set');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });

  rl.on('line', async (line) => {
    if (!line.trim()) return;
    try {
      const request = JSON.parse(line);
      // console.error(`Received: ${request.method}`);
      const response = await handleRequest(request);
      if (response) {
        console.log(JSON.stringify(response));
      }
    } catch (e) {
      console.error(`Error processing request: ${e.message}`);
    }
  });
}

main();
