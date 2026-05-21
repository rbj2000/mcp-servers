#!/usr/bin/env node
/**
 * AWS MCP Server - zero-dependency Node.js
 * Tools for Amazon Bedrock (Runtime + Control plane) and EC2.
 *
 * Auth: AWS SigV4 implemented locally with Node's built-in `crypto` module.
 * Credentials come from environment variables:
 *   AWS_ACCESS_KEY_ID
 *   AWS_SECRET_ACCESS_KEY
 *   AWS_SESSION_TOKEN     (optional, for temporary creds / SSO)
 *   AWS_REGION            (default: us-east-1)
 */

const https = require('https');
const crypto = require('crypto');
const readline = require('readline');

const AWS_REGION = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || '';
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || '';
const AWS_SESSION_TOKEN = process.env.AWS_SESSION_TOKEN || '';

// =====================================================================
// SigV4 signing (no dependencies)
// =====================================================================

function sha256hex(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function hmac(key, data) {
  return crypto.createHmac('sha256', key).update(data).digest();
}

// RFC 3986 URI encoding: unreserved = A-Z a-z 0-9 - _ . ~
function uriEncode(input, encodeSlash = true) {
  const s = String(input);
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if ((ch >= 'A' && ch <= 'Z') || (ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9') ||
        ch === '-' || ch === '_' || ch === '.' || ch === '~') {
      out += ch;
    } else if (ch === '/' && !encodeSlash) {
      out += ch;
    } else {
      const bytes = Buffer.from(ch, 'utf8');
      for (const b of bytes) {
        out += '%' + b.toString(16).toUpperCase().padStart(2, '0');
      }
    }
  }
  return out;
}

function canonicalPath(path) {
  if (!path || path === '/') return '/';
  return path.split('/').map(seg => seg === '' ? '' : uriEncode(seg)).join('/');
}

function canonicalQuery(query) {
  const keys = Object.keys(query).sort();
  return keys.map(k => `${uriEncode(k)}=${uriEncode(query[k])}`).join('&');
}

function sigv4Sign({ method, host, path, query, headers, body, service, region }) {
  if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
    throw new Error('AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables are required');
  }

  const now = new Date();
  const amzDate = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const dateStamp = amzDate.slice(0, 8);

  const allHeaders = { ...headers, host, 'x-amz-date': amzDate };
  if (AWS_SESSION_TOKEN) allHeaders['x-amz-security-token'] = AWS_SESSION_TOKEN;

  // Canonicalize headers (lowercase keys, trimmed/collapsed values)
  const lowered = {};
  for (const k of Object.keys(allHeaders)) {
    lowered[k.toLowerCase()] = String(allHeaders[k]).trim().replace(/\s+/g, ' ');
  }
  const sortedHeaderKeys = Object.keys(lowered).sort();
  const canonicalHeaders = sortedHeaderKeys.map(k => `${k}:${lowered[k]}\n`).join('');
  const signedHeaders = sortedHeaderKeys.join(';');

  const payloadHash = sha256hex(body || '');

  const canonicalRequest = [
    method,
    canonicalPath(path),
    canonicalQuery(query || {}),
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join('\n');

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256hex(canonicalRequest)
  ].join('\n');

  const kDate = hmac('AWS4' + AWS_SECRET_ACCESS_KEY, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  const kSigning = hmac(kService, 'aws4_request');
  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${AWS_ACCESS_KEY_ID}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return { ...allHeaders, Authorization: authorization };
}

// =====================================================================
// Minimal XML parser (just enough for EC2 Query responses)
// =====================================================================

function decodeXmlEntities(s) {
  return s
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&amp;/g, '&');
}

function parseXml(xml) {
  xml = xml.replace(/<\?[^?]*\?>/g, '').replace(/<!--[\s\S]*?-->/g, '');
  const stack = [];
  const root = { children: {}, text: '' };
  let cur = root;
  let i = 0;

  while (i < xml.length) {
    if (xml[i] !== '<') {
      let start = i;
      while (i < xml.length && xml[i] !== '<') i++;
      cur.text += xml.slice(start, i);
      continue;
    }
    if (xml[i + 1] === '/') {
      while (i < xml.length && xml[i] !== '>') i++;
      i++;
      cur = stack.pop() || root;
      continue;
    }
    i++; // skip '<'
    const tagStart = i;
    while (i < xml.length && !/[\s/>]/.test(xml[i])) i++;
    const tagName = xml.slice(tagStart, i);
    // skip attributes
    while (i < xml.length && xml[i] !== '>' && xml[i] !== '/') i++;
    const selfClosing = xml[i] === '/';
    if (selfClosing) i++;
    i++; // skip '>'

    const node = { children: {}, text: '' };
    const existing = cur.children[tagName];
    if (existing === undefined) {
      cur.children[tagName] = node;
    } else if (Array.isArray(existing)) {
      existing.push(node);
    } else {
      cur.children[tagName] = [existing, node];
    }
    if (!selfClosing) {
      stack.push(cur);
      cur = node;
    }
  }

  function clean(node) {
    if (Array.isArray(node)) return node.map(clean);
    const childKeys = Object.keys(node.children);
    if (childKeys.length === 0) {
      return decodeXmlEntities(node.text.trim());
    }
    const out = {};
    for (const k of childKeys) {
      const v = node.children[k];
      // Collapse <fooSet><item>...</item><item>...</item></fooSet> into arrays
      if (!Array.isArray(v) && Object.keys(v.children).length === 1 && 'item' in v.children) {
        const items = v.children.item;
        out[k] = Array.isArray(items) ? items.map(clean) : [clean(items)];
      } else {
        out[k] = clean(v);
      }
    }
    return out;
  }
  return clean(root);
}

// =====================================================================
// AWS HTTPS request helper
// =====================================================================

function awsRequest({ method, service, region = AWS_REGION, host, path = '/', query = {}, headers = {}, body = '' }) {
  return new Promise((resolve) => {
    const resolvedHost = host || `${service}.${region}.amazonaws.com`;
    const bodyStr = body == null ? '' : (typeof body === 'string' ? body : JSON.stringify(body));

    let signed;
    try {
      signed = sigv4Sign({
        method, host: resolvedHost, path, query, headers, body: bodyStr, service, region
      });
    } catch (e) {
      resolve({ error: e.message });
      return;
    }

    const qs = Object.keys(query).length ? '?' + canonicalQuery(query) : '';
    const options = {
      hostname: resolvedHost,
      port: 443,
      path: canonicalPath(path) + qs,
      method,
      headers: signed,
      timeout: 60000
    };

    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        const ct = (res.headers['content-type'] || '').toLowerCase();
        let parsed = raw;
        if (raw.trim()) {
          if (ct.includes('json')) {
            try { parsed = JSON.parse(raw); } catch (_) { /* keep raw */ }
          } else if (ct.includes('xml') || raw.trimStart().startsWith('<')) {
            try { parsed = parseXml(raw); } catch (_) { /* keep raw */ }
          }
        }
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(parsed);
        } else {
          resolve({ error: `HTTP ${res.statusCode} ${res.statusMessage || ''}`.trim(), details: parsed });
        }
      });
    });
    req.on('error', e => resolve({ error: `Connection failed: ${e.message}` }));
    req.on('timeout', () => { req.destroy(); resolve({ error: 'Request timeout' }); });
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// =====================================================================
// Bedrock tools (Runtime + Control plane, both JSON REST)
// =====================================================================

async function bedrockListFoundationModels(args = {}) {
  const q = {};
  if (args.byProvider) q.byProvider = args.byProvider;
  if (args.byOutputModality) q.byOutputModality = args.byOutputModality;
  if (args.byInferenceType) q.byInferenceType = args.byInferenceType;
  return awsRequest({
    method: 'GET',
    service: 'bedrock',
    host: `bedrock.${AWS_REGION}.amazonaws.com`,
    path: '/foundation-models',
    query: q
  });
}

async function bedrockGetFoundationModel(modelIdentifier) {
  return awsRequest({
    method: 'GET',
    service: 'bedrock',
    host: `bedrock.${AWS_REGION}.amazonaws.com`,
    path: `/foundation-models/${modelIdentifier}`
  });
}

async function bedrockListInferenceProfiles(args = {}) {
  const q = {};
  if (args.typeEquals) q.type = args.typeEquals;
  if (args.maxResults) q.maxResults = String(args.maxResults);
  if (args.nextToken) q.nextToken = args.nextToken;
  return awsRequest({
    method: 'GET',
    service: 'bedrock',
    host: `bedrock.${AWS_REGION}.amazonaws.com`,
    path: '/inference-profiles',
    query: q
  });
}

async function bedrockInvokeModel(modelId, body, accept = 'application/json', contentType = 'application/json') {
  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  return awsRequest({
    method: 'POST',
    service: 'bedrock',
    host: `bedrock-runtime.${AWS_REGION}.amazonaws.com`,
    path: `/model/${modelId}/invoke`,
    body: payload,
    headers: {
      'content-type': contentType,
      'accept': accept
    }
  });
}

async function bedrockConverse(modelId, messages, system, inferenceConfig, additionalModelRequestFields) {
  const body = { messages };
  if (system) body.system = Array.isArray(system) ? system : [{ text: String(system) }];
  if (inferenceConfig) body.inferenceConfig = inferenceConfig;
  if (additionalModelRequestFields) body.additionalModelRequestFields = additionalModelRequestFields;
  return awsRequest({
    method: 'POST',
    service: 'bedrock',
    host: `bedrock-runtime.${AWS_REGION}.amazonaws.com`,
    path: `/model/${modelId}/converse`,
    body: JSON.stringify(body),
    headers: {
      'content-type': 'application/json',
      'accept': 'application/json'
    }
  });
}

// =====================================================================
// EC2 tools (Query API, form-urlencoded body, XML response)
// =====================================================================

const EC2_API_VERSION = '2016-11-15';

function flattenEC2Params(params, prefix = '') {
  const out = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (Array.isArray(value)) {
      value.forEach((v, idx) => {
        const k = `${fullKey}.${idx + 1}`;
        if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
          Object.assign(out, flattenEC2Params(v, k));
        } else if (Array.isArray(v)) {
          Object.assign(out, flattenEC2Params({ [idx + 1]: v }, fullKey));
        } else {
          out[k] = String(v);
        }
      });
    } else if (typeof value === 'object') {
      Object.assign(out, flattenEC2Params(value, fullKey));
    } else {
      out[fullKey] = String(value);
    }
  }
  return out;
}

// Convert a user-friendly filters array into EC2 Query params:
//   [{ Name: 'tag:Env', Values: ['prod','staging'] }]
// becomes Filter.1.Name=tag:Env&Filter.1.Value.1=prod&Filter.1.Value.2=staging
function ec2FilterParams(filters) {
  if (!Array.isArray(filters) || filters.length === 0) return {};
  const out = {};
  filters.forEach((f, i) => {
    const idx = i + 1;
    out[`Filter.${idx}.Name`] = String(f.Name || f.name);
    const values = f.Values || f.values || [];
    (Array.isArray(values) ? values : [values]).forEach((v, j) => {
      out[`Filter.${idx}.Value.${j + 1}`] = String(v);
    });
  });
  return out;
}

async function ec2Action(action, params = {}, region = AWS_REGION) {
  const formParams = { Action: action, Version: EC2_API_VERSION, ...params };
  const bodyParts = [];
  for (const [k, v] of Object.entries(formParams)) {
    bodyParts.push(`${uriEncode(k)}=${uriEncode(v)}`);
  }
  const body = bodyParts.join('&');
  return awsRequest({
    method: 'POST',
    service: 'ec2',
    region,
    host: `ec2.${region}.amazonaws.com`,
    path: '/',
    body,
    headers: { 'content-type': 'application/x-www-form-urlencoded; charset=utf-8' }
  });
}

async function ec2DescribeInstances(args = {}) {
  const params = { ...ec2FilterParams(args.filters) };
  if (Array.isArray(args.instanceIds)) {
    args.instanceIds.forEach((id, i) => { params[`InstanceId.${i + 1}`] = id; });
  }
  if (args.maxResults) params.MaxResults = String(args.maxResults);
  if (args.nextToken) params.NextToken = args.nextToken;
  return ec2Action('DescribeInstances', params, args.region || AWS_REGION);
}

async function ec2DescribeRegions(args = {}) {
  const params = { ...ec2FilterParams(args.filters) };
  if (args.allRegions !== undefined) params.AllRegions = String(!!args.allRegions);
  if (Array.isArray(args.regionNames)) {
    args.regionNames.forEach((r, i) => { params[`RegionName.${i + 1}`] = r; });
  }
  return ec2Action('DescribeRegions', params, args.region || AWS_REGION);
}

async function ec2DescribeSecurityGroups(args = {}) {
  const params = { ...ec2FilterParams(args.filters) };
  if (Array.isArray(args.groupIds)) {
    args.groupIds.forEach((id, i) => { params[`GroupId.${i + 1}`] = id; });
  }
  if (args.maxResults) params.MaxResults = String(args.maxResults);
  if (args.nextToken) params.NextToken = args.nextToken;
  return ec2Action('DescribeSecurityGroups', params, args.region || AWS_REGION);
}

async function ec2DescribeVpcs(args = {}) {
  const params = { ...ec2FilterParams(args.filters) };
  if (Array.isArray(args.vpcIds)) {
    args.vpcIds.forEach((id, i) => { params[`VpcId.${i + 1}`] = id; });
  }
  if (args.maxResults) params.MaxResults = String(args.maxResults);
  if (args.nextToken) params.NextToken = args.nextToken;
  return ec2Action('DescribeVpcs', params, args.region || AWS_REGION);
}

async function ec2DescribeImages(args = {}) {
  const params = { ...ec2FilterParams(args.filters) };
  if (Array.isArray(args.imageIds)) {
    args.imageIds.forEach((id, i) => { params[`ImageId.${i + 1}`] = id; });
  }
  if (Array.isArray(args.owners)) {
    args.owners.forEach((o, i) => { params[`Owner.${i + 1}`] = o; });
  }
  if (args.maxResults) params.MaxResults = String(args.maxResults);
  if (args.nextToken) params.NextToken = args.nextToken;
  return ec2Action('DescribeImages', params, args.region || AWS_REGION);
}

async function ec2StartInstances(instanceIds, region) {
  const params = {};
  instanceIds.forEach((id, i) => { params[`InstanceId.${i + 1}`] = id; });
  return ec2Action('StartInstances', params, region || AWS_REGION);
}

async function ec2StopInstances(instanceIds, force = false, region) {
  const params = { Force: String(!!force) };
  instanceIds.forEach((id, i) => { params[`InstanceId.${i + 1}`] = id; });
  return ec2Action('StopInstances', params, region || AWS_REGION);
}

async function ec2RebootInstances(instanceIds, region) {
  const params = {};
  instanceIds.forEach((id, i) => { params[`InstanceId.${i + 1}`] = id; });
  return ec2Action('RebootInstances', params, region || AWS_REGION);
}

// =====================================================================
// MCP server protocol
// =====================================================================

const TOOLS = [
  // ----- Bedrock -----
  {
    name: 'bedrock_list_foundation_models',
    description: 'List Amazon Bedrock foundation models available in the configured AWS region.',
    inputSchema: {
      type: 'object',
      properties: {
        byProvider: { type: 'string', description: 'Filter by provider (e.g. "anthropic", "amazon", "meta").' },
        byOutputModality: { type: 'string', description: 'Filter by output modality (TEXT, IMAGE, EMBEDDING).' },
        byInferenceType: { type: 'string', description: 'Filter by inference type (ON_DEMAND, PROVISIONED).' }
      }
    }
  },
  {
    name: 'bedrock_get_foundation_model',
    description: 'Get full details for a single Bedrock foundation model.',
    inputSchema: {
      type: 'object',
      properties: {
        modelIdentifier: { type: 'string', description: 'Model ID or ARN (e.g. "anthropic.claude-3-5-sonnet-20240620-v1:0").' }
      },
      required: ['modelIdentifier']
    }
  },
  {
    name: 'bedrock_list_inference_profiles',
    description: 'List Bedrock inference profiles (e.g. cross-region routing profiles).',
    inputSchema: {
      type: 'object',
      properties: {
        typeEquals: { type: 'string', description: 'Filter: SYSTEM_DEFINED or APPLICATION.' },
        maxResults: { type: 'integer', description: 'Max results per page.' },
        nextToken: { type: 'string', description: 'Pagination token from a previous response.' }
      }
    }
  },
  {
    name: 'bedrock_invoke_model',
    description: 'Invoke a Bedrock model with a model-specific JSON body (synchronous, no streaming).',
    inputSchema: {
      type: 'object',
      properties: {
        modelId: { type: 'string', description: 'Model ID, ARN, or inference profile ID/ARN.' },
        body: { description: 'Model-specific request body (object or string). E.g. for Anthropic Claude: { anthropic_version, messages, max_tokens }.' },
        accept: { type: 'string', description: 'Response MIME type. Default application/json.' },
        contentType: { type: 'string', description: 'Request MIME type. Default application/json.' }
      },
      required: ['modelId', 'body']
    }
  },
  {
    name: 'bedrock_converse',
    description: 'Call the Bedrock Converse API (provider-agnostic chat). Recommended over invoke_model for most chat use cases.',
    inputSchema: {
      type: 'object',
      properties: {
        modelId: { type: 'string', description: 'Model ID, ARN, or inference profile ID/ARN.' },
        messages: {
          type: 'array',
          description: 'Conversation history. Each item: { role: "user"|"assistant", content: [{ text: "..." }] }.'
        },
        system: { description: 'System prompt as string, or array of [{ text: "..." }].' },
        inferenceConfig: {
          type: 'object',
          description: 'Optional: { maxTokens, temperature, topP, stopSequences }.'
        },
        additionalModelRequestFields: {
          type: 'object',
          description: 'Provider-specific extras passed through unchanged.'
        }
      },
      required: ['modelId', 'messages']
    }
  },

  // ----- EC2 -----
  {
    name: 'ec2_describe_instances',
    description: 'Describe EC2 instances. Returns reservations with their instances. Supports filters, pagination, and explicit instance IDs.',
    inputSchema: {
      type: 'object',
      properties: {
        instanceIds: { type: 'array', items: { type: 'string' }, description: 'Optional list of instance IDs to fetch.' },
        filters: {
          type: 'array',
          description: 'EC2 filters. Each: { Name: "tag:Env", Values: ["prod"] }.',
          items: { type: 'object' }
        },
        maxResults: { type: 'integer', description: 'Max results per page (5-1000).' },
        nextToken: { type: 'string', description: 'Pagination token.' },
        region: { type: 'string', description: 'Override region for this call.' }
      }
    }
  },
  {
    name: 'ec2_describe_regions',
    description: 'List AWS regions available to this account.',
    inputSchema: {
      type: 'object',
      properties: {
        regionNames: { type: 'array', items: { type: 'string' } },
        allRegions: { type: 'boolean', description: 'Include disabled regions.' },
        filters: { type: 'array', items: { type: 'object' } }
      }
    }
  },
  {
    name: 'ec2_describe_security_groups',
    description: 'Describe EC2 security groups.',
    inputSchema: {
      type: 'object',
      properties: {
        groupIds: { type: 'array', items: { type: 'string' } },
        filters: { type: 'array', items: { type: 'object' } },
        maxResults: { type: 'integer' },
        nextToken: { type: 'string' },
        region: { type: 'string' }
      }
    }
  },
  {
    name: 'ec2_describe_vpcs',
    description: 'Describe VPCs.',
    inputSchema: {
      type: 'object',
      properties: {
        vpcIds: { type: 'array', items: { type: 'string' } },
        filters: { type: 'array', items: { type: 'object' } },
        maxResults: { type: 'integer' },
        nextToken: { type: 'string' },
        region: { type: 'string' }
      }
    }
  },
  {
    name: 'ec2_describe_images',
    description: 'Describe AMIs (machine images). Filter by owner (e.g. "amazon", "self", account-id) to avoid huge results.',
    inputSchema: {
      type: 'object',
      properties: {
        imageIds: { type: 'array', items: { type: 'string' } },
        owners: { type: 'array', items: { type: 'string' }, description: 'e.g. ["self"], ["amazon"], or an account ID.' },
        filters: { type: 'array', items: { type: 'object' } },
        maxResults: { type: 'integer' },
        nextToken: { type: 'string' },
        region: { type: 'string' }
      }
    }
  },
  {
    name: 'ec2_start_instances',
    description: 'Start one or more stopped EC2 instances.',
    inputSchema: {
      type: 'object',
      properties: {
        instanceIds: { type: 'array', items: { type: 'string' } },
        region: { type: 'string' }
      },
      required: ['instanceIds']
    }
  },
  {
    name: 'ec2_stop_instances',
    description: 'Stop one or more EC2 instances. Set force=true to force-stop unresponsive instances.',
    inputSchema: {
      type: 'object',
      properties: {
        instanceIds: { type: 'array', items: { type: 'string' } },
        force: { type: 'boolean' },
        region: { type: 'string' }
      },
      required: ['instanceIds']
    }
  },
  {
    name: 'ec2_reboot_instances',
    description: 'Reboot one or more EC2 instances.',
    inputSchema: {
      type: 'object',
      properties: {
        instanceIds: { type: 'array', items: { type: 'string' } },
        region: { type: 'string' }
      },
      required: ['instanceIds']
    }
  }
];

async function dispatch(name, args) {
  switch (name) {
    case 'bedrock_list_foundation_models':  return bedrockListFoundationModels(args);
    case 'bedrock_get_foundation_model':    return bedrockGetFoundationModel(args.modelIdentifier);
    case 'bedrock_list_inference_profiles': return bedrockListInferenceProfiles(args);
    case 'bedrock_invoke_model':            return bedrockInvokeModel(args.modelId, args.body, args.accept, args.contentType);
    case 'bedrock_converse':                return bedrockConverse(args.modelId, args.messages, args.system, args.inferenceConfig, args.additionalModelRequestFields);

    case 'ec2_describe_instances':       return ec2DescribeInstances(args);
    case 'ec2_describe_regions':         return ec2DescribeRegions(args);
    case 'ec2_describe_security_groups': return ec2DescribeSecurityGroups(args);
    case 'ec2_describe_vpcs':            return ec2DescribeVpcs(args);
    case 'ec2_describe_images':          return ec2DescribeImages(args);
    case 'ec2_start_instances':          return ec2StartInstances(args.instanceIds, args.region);
    case 'ec2_stop_instances':           return ec2StopInstances(args.instanceIds, args.force, args.region);
    case 'ec2_reboot_instances':         return ec2RebootInstances(args.instanceIds, args.region);

    default: return { error: `Unknown tool: ${name}` };
  }
}

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
          capabilities: { tools: { listChanged: false } },
          serverInfo: {
            name: 'aws-mcp-server',
            version: '1.0.0',
            description: 'Zero-dependency AWS MCP server (Bedrock + EC2) using built-in SigV4.'
          }
        }
      };

    case 'notifications/initialized':
      return null;

    case 'tools/list':
      return { jsonrpc: '2.0', id: reqId, result: { tools: TOOLS } };

    case 'tools/call': {
      const toolName = params.name || '';
      const args = params.arguments || {};
      let result;
      try {
        result = await dispatch(toolName, args);
      } catch (e) {
        result = { error: e.message, stack: e.stack };
      }
      return {
        jsonrpc: '2.0',
        id: reqId,
        result: {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        }
      };
    }

    default:
      return {
        jsonrpc: '2.0',
        id: reqId,
        error: { code: -32601, message: `Method not found: ${method}` }
      };
  }
}

async function main() {
  console.error('AWS MCP Server started');
  if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
    console.error('WARNING: AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY not set');
  }
  console.error(`Default region: ${AWS_REGION}`);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });
  rl.on('line', async (line) => {
    if (!line.trim()) return;
    try {
      const req = JSON.parse(line);
      const resp = await handleRequest(req);
      if (resp) console.log(JSON.stringify(resp));
    } catch (e) {
      console.error(`Error processing request: ${e.message}`);
    }
  });
}

main();
