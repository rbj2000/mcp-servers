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
async function searchWorkItems(query, top = 200, skip = 0) {
  return await makeRequest(
    `/${TFS_PROJECT}/_apis/wit/wiql?$top=${top}&$skip=${skip}&api-version=${TFS_API_VERSION}`,
    'POST',
    { query }
  );
}

/**
 * Search pull requests across repositories
 */
async function searchPullRequests(options = {}) {
  const { status, creatorId, reviewerId, sourceRefName, targetRefName, repositoryId, top = 50, skip = 0 } = options;

  let path;
  if (repositoryId) {
    path = `/${TFS_PROJECT}/_apis/git/repositories/${encodeURIComponent(repositoryId)}/pullrequests?api-version=${TFS_API_VERSION}`;
  } else {
    path = `/${TFS_PROJECT}/_apis/git/pullrequests?api-version=${TFS_API_VERSION}`;
  }

  if (status) path += `&searchCriteria.status=${encodeURIComponent(status)}`;
  if (creatorId) path += `&searchCriteria.creatorId=${encodeURIComponent(creatorId)}`;
  if (reviewerId) path += `&searchCriteria.reviewerId=${encodeURIComponent(reviewerId)}`;
  if (sourceRefName) path += `&searchCriteria.sourceRefName=${encodeURIComponent(sourceRefName)}`;
  if (targetRefName) path += `&searchCriteria.targetRefName=${encodeURIComponent(targetRefName)}`;
  path += `&$top=${top}&$skip=${skip}`;

  return await makeRequest(path);
}

/**
 * Get a single pull request by ID
 */
async function getPullRequest(pullRequestId) {
  return await makeRequest(
    `/${TFS_PROJECT}/_apis/git/pullrequests/${pullRequestId}?api-version=${TFS_API_VERSION}`
  );
}

/**
 * Get formatted detail of a pull request including reviewers and votes
 */
async function getPullRequestDetail(pullRequestId) {
  const pr = await makeRequest(
    `/${TFS_PROJECT}/_apis/git/pullrequests/${pullRequestId}?api-version=${TFS_API_VERSION}`
  );

  if (pr.error) return pr;

  const reviewers = (pr.reviewers || []).map(r => ({
    displayName: r.displayName || '',
    uniqueName: r.uniqueName || '',
    vote: voteLabel(r.vote),
    isRequired: r.isRequired || false,
    isFlagged: r.isFlagged || false
  }));

  return {
    pullRequestId: pr.pullRequestId,
    title: pr.title || '',
    description: pr.description || '',
    status: pr.status || '',
    isDraft: pr.isDraft || false,
    createdBy: pr.createdBy?.displayName || '',
    creationDate: pr.creationDate || '',
    closedDate: pr.closedDate || null,
    sourceRefName: pr.sourceRefName || '',
    targetRefName: pr.targetRefName || '',
    repository: pr.repository?.name || '',
    repositoryId: pr.repository?.id || '',
    mergeStatus: pr.mergeStatus || '',
    mergeId: pr.mergeId || '',
    autoCompleteSetBy: pr.autoCompleteSetBy?.displayName || null,
    completionOptions: pr.completionOptions || null,
    url: pr.url || '',
    webUrl: pr._links?.web?.href || '',
    reviewers,
    labels: (pr.labels || []).map(l => l.name),
    workItemRefs: pr.workItemRefs || []
  };
}

function voteLabel(vote) {
  const map = { 10: 'Approved', 5: 'Approved with suggestions', 0: 'No vote', '-5': 'Waiting for author', '-10': 'Rejected' };
  return map[vote] ?? `Vote ${vote}`;
}

/**
 * Get review threads (comments) for a pull request
 */
async function getPullRequestThreads(pullRequestId) {
  // Need repositoryId first
  const pr = await makeRequest(
    `/${TFS_PROJECT}/_apis/git/pullrequests/${pullRequestId}?api-version=${TFS_API_VERSION}`
  );
  if (pr.error) return pr;

  const repositoryId = pr.repository?.id;
  if (!repositoryId) return { error: 'Could not determine repository ID from pull request' };

  const data = await makeRequest(
    `/${TFS_PROJECT}/_apis/git/repositories/${repositoryId}/pullRequests/${pullRequestId}/threads?api-version=${TFS_API_VERSION}`
  );

  if (data.error) return data;

  const threads = (data.value || []).map(thread => ({
    id: thread.id,
    status: thread.status || '',
    isDeleted: thread.isDeleted || false,
    threadContext: thread.threadContext || null,
    comments: (thread.comments || [])
      .filter(c => !c.isDeleted)
      .map(c => ({
        id: c.id,
        author: c.author?.displayName || '',
        publishedDate: c.publishedDate || '',
        lastUpdatedDate: c.lastUpdatedDate || '',
        content: c.content || '',
        commentType: c.commentType || ''
      }))
  }));

  return {
    pullRequestId,
    repository: pr.repository?.name || '',
    totalThreads: threads.length,
    activeThreads: threads.filter(t => t.status === 'active').length,
    threads
  };
}

/**
 * Get commits included in a pull request
 */
async function getPullRequestCommits(pullRequestId) {
  const pr = await makeRequest(
    `/${TFS_PROJECT}/_apis/git/pullrequests/${pullRequestId}?api-version=${TFS_API_VERSION}`
  );
  if (pr.error) return pr;

  const repositoryId = pr.repository?.id;
  if (!repositoryId) return { error: 'Could not determine repository ID from pull request' };

  const data = await makeRequest(
    `/${TFS_PROJECT}/_apis/git/repositories/${repositoryId}/pullRequests/${pullRequestId}/commits?api-version=${TFS_API_VERSION}`
  );

  if (data.error) return data;

  const commits = (data.value || []).map(c => ({
    commitId: c.commitId || '',
    comment: c.comment || '',
    author: c.author?.name || '',
    authorDate: c.author?.date || '',
    committer: c.committer?.name || '',
    committerDate: c.committer?.date || '',
    url: c.url || '',
    remoteUrl: c.remoteUrl || ''
  }));

  return {
    pullRequestId,
    repository: pr.repository?.name || '',
    count: commits.length,
    commits
  };
}

/**
 * Get changed files (diff summary) for a pull request iteration
 */
async function getPullRequestDiff(pullRequestId, options = {}) {
  const { iterationId, top = 200, skip = 0 } = options;

  const pr = await makeRequest(
    `/${TFS_PROJECT}/_apis/git/pullrequests/${pullRequestId}?api-version=${TFS_API_VERSION}`
  );
  if (pr.error) return pr;

  const repositoryId = pr.repository?.id;
  if (!repositoryId) return { error: 'Could not determine repository ID from pull request' };

  const iterationsResponse = await makeRequest(
    `/${TFS_PROJECT}/_apis/git/repositories/${repositoryId}/pullRequests/${pullRequestId}/iterations?api-version=${TFS_API_VERSION}`
  );
  if (iterationsResponse.error) return iterationsResponse;

  const iterations = iterationsResponse.value || [];
  if (iterations.length === 0) {
    return { error: `No iterations found for pull request ${pullRequestId}` };
  }

  const selectedIterationId = iterationId
    ? parseInt(iterationId)
    : Math.max(...iterations.map(it => it.id || 0));

  const changesResponse = await makeRequest(
    `/${TFS_PROJECT}/_apis/git/repositories/${repositoryId}/pullRequests/${pullRequestId}/iterations/${selectedIterationId}/changes?$top=${top}&$skip=${skip}&api-version=${TFS_API_VERSION}`
  );
  if (changesResponse.error) return changesResponse;

  const changes = (changesResponse.changeEntries || changesResponse.value || []).map(change => ({
    changeTrackingId: change.changeTrackingId,
    changeId: change.changeId,
    changeType: change.changeType || '',
    item: {
      path: change.item?.path || '',
      gitObjectType: change.item?.gitObjectType || '',
      objectId: change.item?.objectId || '',
      url: change.item?.url || ''
    },
    originalPath: change.originalPath || null
  }));

  return {
    pullRequestId,
    repository: pr.repository?.name || '',
    repositoryId,
    iterationId: selectedIterationId,
    count: changes.length,
    totalCount: changesResponse.count ?? changes.length,
    skip,
    top,
    hasMore: typeof changesResponse.count === 'number'
      ? (skip + changes.length) < changesResponse.count
      : changes.length === top,
    sourceRefName: pr.sourceRefName || '',
    targetRefName: pr.targetRefName || '',
    iterations: iterations.map(it => ({
      id: it.id,
      description: it.description || '',
      createdDate: it.createdDate || '',
      updatedDate: it.updatedDate || '',
      author: it.author?.displayName || ''
    })),
    changes
  };
}

async function getGitItemContent(repositoryId, path, commitId) {
  const encodedPath = encodeURIComponent(path);
  const encodedCommitId = encodeURIComponent(commitId);
  const response = await makeRequest(
    `/${TFS_PROJECT}/_apis/git/repositories/${repositoryId}/items?path=${encodedPath}&versionDescriptor.versionType=commit&versionDescriptor.version=${encodedCommitId}&includeContent=true&api-version=${TFS_API_VERSION}`
  );

  if (response.error) {
    return null;
  }

  return typeof response.content === 'string' ? response.content : '';
}

function splitLines(text) {
  if (!text) return [];
  return text.replace(/\r\n/g, '\n').split('\n');
}

function buildLcsTable(a, b) {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const table = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      if (a[i] === b[j]) {
        table[i][j] = table[i + 1][j + 1] + 1;
      } else {
        table[i][j] = Math.max(table[i + 1][j], table[i][j + 1]);
      }
    }
  }

  return table;
}

function buildDiffOps(oldLines, newLines) {
  const table = buildLcsTable(oldLines, newLines);
  const ops = [];
  let i = 0;
  let j = 0;

  while (i < oldLines.length && j < newLines.length) {
    if (oldLines[i] === newLines[j]) {
      ops.push({ type: 'context', line: oldLines[i] });
      i++;
      j++;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      ops.push({ type: 'delete', line: oldLines[i] });
      i++;
    } else {
      ops.push({ type: 'add', line: newLines[j] });
      j++;
    }
  }

  while (i < oldLines.length) {
    ops.push({ type: 'delete', line: oldLines[i] });
    i++;
  }

  while (j < newLines.length) {
    ops.push({ type: 'add', line: newLines[j] });
    j++;
  }

  return ops;
}

function buildUnifiedPatch(oldPath, newPath, oldText, newText) {
  const oldLines = splitLines(oldText);
  const newLines = splitLines(newText);
  const ops = buildDiffOps(oldLines, newLines);

  const oldCount = oldLines.length;
  const newCount = newLines.length;

  const patchLines = [
    `--- a${oldPath}`,
    `+++ b${newPath}`,
    `@@ -1,${oldCount} +1,${newCount} @@`
  ];

  for (const op of ops) {
    if (op.type === 'context') patchLines.push(` ${op.line}`);
    if (op.type === 'delete') patchLines.push(`-${op.line}`);
    if (op.type === 'add') patchLines.push(`+${op.line}`);
  }

  return patchLines.join('\n');
}

/**
 * Get per-file unified patches for a pull request
 */
async function getPullRequestPatch(pullRequestId, options = {}) {
  const { iterationId, top = 50, skip = 0, maxFileLines = 400, maxFiles = 50 } = options;

  const pr = await makeRequest(
    `/${TFS_PROJECT}/_apis/git/pullrequests/${pullRequestId}?api-version=${TFS_API_VERSION}`
  );
  if (pr.error) return pr;

  const sourceCommitId = pr.lastMergeSourceCommit?.commitId || pr.lastMergeCommit?.commitId;
  const targetCommitId = pr.lastMergeTargetCommit?.commitId || pr.lastMergeBaseCommit?.commitId;
  if (!sourceCommitId || !targetCommitId) {
    return { error: 'Could not determine source/target commit IDs for pull request' };
  }

  const diffSummary = await getPullRequestDiff(pullRequestId, { iterationId, top, skip });
  if (diffSummary.error) return diffSummary;

  const fileChanges = (diffSummary.changes || []).slice(0, Math.max(1, Math.min(maxFiles, top)));
  const patches = [];

  for (const change of fileChanges) {
    const newPath = change.item?.path || '';
    const oldPath = change.originalPath || newPath;
    const changeType = (change.changeType || '').toLowerCase();

    let oldContent = '';
    let newContent = '';

    if (changeType.includes('add')) {
      newContent = await getGitItemContent(diffSummary.repositoryId, newPath, sourceCommitId) || '';
    } else if (changeType.includes('delete')) {
      oldContent = await getGitItemContent(diffSummary.repositoryId, oldPath, targetCommitId) || '';
    } else {
      oldContent = await getGitItemContent(diffSummary.repositoryId, oldPath, targetCommitId) || '';
      newContent = await getGitItemContent(diffSummary.repositoryId, newPath, sourceCommitId) || '';
    }

    const oldLineCount = splitLines(oldContent).length;
    const newLineCount = splitLines(newContent).length;

    if (oldLineCount > maxFileLines || newLineCount > maxFileLines) {
      patches.push({
        path: newPath,
        originalPath: change.originalPath || null,
        changeType: change.changeType || '',
        skipped: true,
        reason: `File exceeds maxFileLines limit (${maxFileLines})`,
        oldLineCount,
        newLineCount
      });
      continue;
    }

    patches.push({
      path: newPath,
      originalPath: change.originalPath || null,
      changeType: change.changeType || '',
      skipped: false,
      oldLineCount,
      newLineCount,
      patch: buildUnifiedPatch(oldPath, newPath, oldContent, newContent)
    });
  }

  return {
    pullRequestId,
    repository: diffSummary.repository,
    repositoryId: diffSummary.repositoryId,
    iterationId: diffSummary.iterationId,
    sourceCommitId,
    targetCommitId,
    skip,
    top,
    maxFiles: Math.max(1, Math.min(maxFiles, top)),
    maxFileLines,
    totalFilesInIteration: diffSummary.totalCount,
    returnedFiles: patches.length,
    hasMore: diffSummary.hasMore || (diffSummary.count > fileChanges.length),
    patches
  };
}

/**
 * Get pull requests linked to a work item
 */
async function getWorkItemPullRequests(workItemId, top = 50, skip = 0) {
  const workItem = await makeRequest(
    `/${TFS_PROJECT}/_apis/wit/workItems/${workItemId}?$expand=relations&api-version=${TFS_API_VERSION}`
  );

  if (workItem.error) {
    return workItem;
  }

  const relations = workItem.relations || [];
  const prLinks = relations.filter(r =>
    r.url && r.url.includes('vstfs:///Git/PullRequestId/') ||
    (r.attributes && r.attributes.name === 'Pull Request') ||
    (r.rel === 'ArtifactLink' && r.url && r.url.includes('/Git/PullRequestId/'))
  );

  const totalCount = prLinks.length;
  const paginatedLinks = prLinks.slice(skip, skip + top);

  // Extract PR IDs from artifact links like vstfs:///Git/PullRequestId/{project}%2F{repoId}%2F{prId}
  const pullRequests = [];
  for (const link of paginatedLinks) {
    const url = link.url || '';
    // The PR ID is the last segment after the last %2F or /
    const decoded = decodeURIComponent(url);
    const parts = decoded.split('/');
    const prId = parts[parts.length - 1];
    if (prId && !isNaN(parseInt(prId))) {
      const pr = await getPullRequest(parseInt(prId));
      if (!pr.error) {
        pullRequests.push(pr);
      }
    }
  }

  return { workItemId, totalCount, count: pullRequests.length, skip, top, pullRequests };
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
                  },
                  top: {
                    type: 'integer',
                    description: 'Max number of results to return (default 200). Use with skip for pagination.'
                  },
                  skip: {
                    type: 'integer',
                    description: 'Number of results to skip (default 0). Use with top for pagination.'
                  }
                },
                required: ['query']
              }
            },
            {
              name: 'tfs_search_pull_requests',
              description: 'Search pull requests across Azure DevOps repositories with filters',
              inputSchema: {
                type: 'object',
                properties: {
                  status: {
                    type: 'string',
                    description: 'PR status filter: active, completed, abandoned, all (default: all)',
                    enum: ['active', 'completed', 'abandoned', 'all']
                  },
                  creatorId: {
                    type: 'string',
                    description: 'Filter by creator display name or unique name'
                  },
                  reviewerId: {
                    type: 'string',
                    description: 'Filter by reviewer'
                  },
                  sourceRefName: {
                    type: 'string',
                    description: 'Source branch filter (e.g. refs/heads/feature/xyz)'
                  },
                  targetRefName: {
                    type: 'string',
                    description: 'Target branch filter (e.g. refs/heads/main)'
                  },
                  repositoryId: {
                    type: 'string',
                    description: 'Filter to a specific repository name or ID'
                  },
                  top: {
                    type: 'integer',
                    description: 'Max number of results to return (default 50). Use with skip for pagination.'
                  },
                  skip: {
                    type: 'integer',
                    description: 'Number of results to skip (default 0). Use with top for pagination.'
                  }
                }
              }
            },
            {
              name: 'tfs_get_pull_request',
              description: 'Get full details of a specific pull request by its ID',
              inputSchema: {
                type: 'object',
                properties: {
                  pullRequestId: {
                    type: 'integer',
                    description: 'Pull request ID'
                  }
                },
                required: ['pullRequestId']
              }
            },
            {
              name: 'tfs_get_pull_request_detail',
              description: 'Get formatted detail of a pull request including reviewers with vote status, labels, merge status and links',
              inputSchema: {
                type: 'object',
                properties: {
                  pullRequestId: {
                    type: 'integer',
                    description: 'Pull request ID'
                  }
                },
                required: ['pullRequestId']
              }
            },
            {
              name: 'tfs_get_pull_request_threads',
              description: 'Get review comment threads for a pull request, including inline code comments and general discussion',
              inputSchema: {
                type: 'object',
                properties: {
                  pullRequestId: {
                    type: 'integer',
                    description: 'Pull request ID'
                  }
                },
                required: ['pullRequestId']
              }
            },
            {
              name: 'tfs_get_pull_request_commits',
              description: 'Get list of commits included in a pull request',
              inputSchema: {
                type: 'object',
                properties: {
                  pullRequestId: {
                    type: 'integer',
                    description: 'Pull request ID'
                  }
                },
                required: ['pullRequestId']
              }
            },
            {
              name: 'tfs_get_pull_request_diff',
              description: 'Get changed files (diff summary) for a pull request iteration',
              inputSchema: {
                type: 'object',
                properties: {
                  pullRequestId: {
                    type: 'integer',
                    description: 'Pull request ID'
                  },
                  iterationId: {
                    type: 'integer',
                    description: 'Optional pull request iteration ID. If omitted, latest iteration is used.'
                  },
                  top: {
                    type: 'integer',
                    description: 'Max number of changed files to return (default 200). Use with skip for pagination.'
                  },
                  skip: {
                    type: 'integer',
                    description: 'Number of changed files to skip (default 0). Use with top for pagination.'
                  }
                },
                required: ['pullRequestId']
              }
            },
            {
              name: 'tfs_get_pull_request_patch',
              description: 'Get per-file unified patch text for a pull request (with limits for large files)',
              inputSchema: {
                type: 'object',
                properties: {
                  pullRequestId: {
                    type: 'integer',
                    description: 'Pull request ID'
                  },
                  iterationId: {
                    type: 'integer',
                    description: 'Optional pull request iteration ID. If omitted, latest iteration is used.'
                  },
                  top: {
                    type: 'integer',
                    description: 'Max number of changed files to inspect (default 50). Use with skip for pagination.'
                  },
                  skip: {
                    type: 'integer',
                    description: 'Number of changed files to skip (default 0). Use with top for pagination.'
                  },
                  maxFileLines: {
                    type: 'integer',
                    description: 'Skip patch generation for files above this line count (default 400).'
                  },
                  maxFiles: {
                    type: 'integer',
                    description: 'Hard cap for generated patches (default 50).'
                  }
                },
                required: ['pullRequestId']
              }
            },
            {
              name: 'tfs_get_work_item_pull_requests',
              description: 'Get pull requests linked to a specific work item (ticket)',
              inputSchema: {
                type: 'object',
                properties: {
                  id: {
                    type: 'integer',
                    description: 'Work item ID'
                  },
                  top: {
                    type: 'integer',
                    description: 'Max number of linked PRs to return (default 50). Use with skip for pagination.'
                  },
                  skip: {
                    type: 'integer',
                    description: 'Number of linked PRs to skip (default 0). Use with top for pagination.'
                  }
                },
                required: ['id']
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
            result = await searchWorkItems(toolArgs.query, toolArgs.top, toolArgs.skip);
          }
          break;

        case 'tfs_search_pull_requests':
          result = await searchPullRequests({
            status: toolArgs.status,
            creatorId: toolArgs.creatorId,
            reviewerId: toolArgs.reviewerId,
            sourceRefName: toolArgs.sourceRefName,
            targetRefName: toolArgs.targetRefName,
            repositoryId: toolArgs.repositoryId,
            top: toolArgs.top,
            skip: toolArgs.skip
          });
          break;

        case 'tfs_get_pull_request':
          if (!toolArgs.pullRequestId) {
            result = { error: 'Missing required parameter: pullRequestId' };
          } else {
            result = await getPullRequest(parseInt(toolArgs.pullRequestId));
          }
          break;

        case 'tfs_get_pull_request_detail':
          if (!toolArgs.pullRequestId) {
            result = { error: 'Missing required parameter: pullRequestId' };
          } else {
            result = await getPullRequestDetail(parseInt(toolArgs.pullRequestId));
          }
          break;

        case 'tfs_get_pull_request_threads':
          if (!toolArgs.pullRequestId) {
            result = { error: 'Missing required parameter: pullRequestId' };
          } else {
            result = await getPullRequestThreads(parseInt(toolArgs.pullRequestId));
          }
          break;

        case 'tfs_get_pull_request_commits':
          if (!toolArgs.pullRequestId) {
            result = { error: 'Missing required parameter: pullRequestId' };
          } else {
            result = await getPullRequestCommits(parseInt(toolArgs.pullRequestId));
          }
          break;

        case 'tfs_get_pull_request_diff':
          if (!toolArgs.pullRequestId) {
            result = { error: 'Missing required parameter: pullRequestId' };
          } else {
            result = await getPullRequestDiff(parseInt(toolArgs.pullRequestId), {
              iterationId: toolArgs.iterationId,
              top: toolArgs.top,
              skip: toolArgs.skip
            });
          }
          break;

        case 'tfs_get_pull_request_patch':
          if (!toolArgs.pullRequestId) {
            result = { error: 'Missing required parameter: pullRequestId' };
          } else {
            result = await getPullRequestPatch(parseInt(toolArgs.pullRequestId), {
              iterationId: toolArgs.iterationId,
              top: toolArgs.top,
              skip: toolArgs.skip,
              maxFileLines: toolArgs.maxFileLines,
              maxFiles: toolArgs.maxFiles
            });
          }
          break;

        case 'tfs_get_work_item_pull_requests':
          if (!toolArgs.id) {
            result = { error: 'Missing required parameter: id' };
          } else {
            result = await getWorkItemPullRequests(parseInt(toolArgs.id), toolArgs.top, toolArgs.skip);
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