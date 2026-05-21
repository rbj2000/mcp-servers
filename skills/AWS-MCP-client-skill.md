---
name: AWS MCP Server
description: Amazon Bedrock invocation and EC2 fleet inspection / lifecycle operations via a zero-dependency Node.js MCP server using AWS SigV4.
---

# AWS MCP Server Skill

## Overview

This skill provides access to two Amazon Web Services products through a single zero-dependency Model Context Protocol (MCP) server:

- **Amazon Bedrock** — list/get foundation models and inference profiles, invoke models (raw or via the provider-agnostic Converse API).
- **Amazon EC2** — describe instances / regions / security groups / VPCs / AMIs, and start/stop/reboot instances.

Authentication uses AWS Signature V4 implemented locally with Node's `crypto` module (no AWS SDK).

## Configuration

The server reads credentials and region from environment variables:

| Variable | Required | Purpose |
|----------|----------|---------|
| `AWS_ACCESS_KEY_ID` | yes | Access key ID |
| `AWS_SECRET_ACCESS_KEY` | yes | Secret access key |
| `AWS_SESSION_TOKEN` | no | Temporary session token (SSO / STS / role assumption) |
| `AWS_REGION` | no | Default region; defaults to `us-east-1` |

**Recommendation:** prefer temporary credentials (`AWS_SESSION_TOKEN`) over long-lived access keys. IAM principal should have only the actions you need — for read-only inspection start with `ec2:Describe*` and `bedrock:List*` / `bedrock:GetFoundationModel`.

## Region Handling

- The configured `AWS_REGION` is used by default for every call.
- EC2 describe/lifecycle tools accept an optional `region` argument to target a different region for a single call without changing configuration. Bedrock control-plane and runtime always use the configured `AWS_REGION` (a few models are only available in specific regions, e.g. `us-east-1`, `us-west-2`, `eu-central-1`).

---

## Bedrock Tools

### bedrock_list_foundation_models
**Purpose:** Discover what foundation models exist in the configured region.

**Input:**
- `byProvider` (optional): e.g. `"anthropic"`, `"amazon"`, `"meta"`, `"cohere"`, `"mistral"`.
- `byOutputModality` (optional): `TEXT`, `IMAGE`, `EMBEDDING`.
- `byInferenceType` (optional): `ON_DEMAND`, `PROVISIONED`.

**Use when:** the user asks "which Claude models are available", "which Bedrock models support image output", or before invoking a model when the exact `modelId` is unknown.

### bedrock_get_foundation_model
**Purpose:** Inspect a single model — supported modalities, customizations allowed, streaming support.

**Input:**
- `modelIdentifier` (required): model ID or ARN, e.g. `anthropic.claude-3-5-sonnet-20240620-v1:0`.

### bedrock_list_inference_profiles
**Purpose:** List cross-region inference profiles. Useful when on-demand throughput in a single region is constrained, or when you want a routing profile that spans `us-east-1` / `us-west-2` / `us-east-2`.

**Input:**
- `typeEquals` (optional): `SYSTEM_DEFINED` or `APPLICATION`.
- `maxResults` (optional), `nextToken` (optional) for pagination.

### bedrock_converse  *(preferred for chat)*
**Purpose:** Provider-agnostic chat. Same request shape works for Claude, Llama, Mistral, etc. — Bedrock translates internally.

**Input:**
- `modelId` (required): model ID, ARN, or inference-profile ID (e.g. `us.anthropic.claude-3-5-sonnet-20241022-v2:0` for the US cross-region profile).
- `messages` (required): `[{ role: "user"|"assistant", content: [{ text: "..." }] }, ...]`.
- `system` (optional): string (auto-wrapped) or `[{ text: "..." }]`.
- `inferenceConfig` (optional): `{ maxTokens, temperature, topP, stopSequences }`.
- `additionalModelRequestFields` (optional): provider-specific extras passed through unchanged.

**Example:**
```json
{
  "modelId": "anthropic.claude-3-5-sonnet-20240620-v1:0",
  "system": "You are a terse devops assistant.",
  "messages": [
    { "role": "user", "content": [{ "text": "Summarize what an Auto Scaling Group does in one sentence." }] }
  ],
  "inferenceConfig": { "maxTokens": 200, "temperature": 0.2 }
}
```

The response contains `output.message.content[].text` and a `usage` block (`inputTokens`, `outputTokens`, `totalTokens`) — use it to estimate cost.

### bedrock_invoke_model  *(low-level)*
**Purpose:** Direct invoke when you need a provider-specific request body (e.g. Stable Diffusion image generation, Titan embeddings, classic Anthropic Messages format).

**Input:**
- `modelId` (required).
- `body` (required): object or JSON string in the model's native schema.
- `accept` (optional, default `application/json`).
- `contentType` (optional, default `application/json`).

**Prefer `bedrock_converse` for plain chat.** Use `invoke_model` only when you need a feature Converse does not expose (embeddings, image generation, fine-tuned model schemas).

---

## EC2 Tools

EC2 responses are XML on the wire; the server parses them and collapses `<fooSet><item>...</item></fooSet>` patterns into JSON arrays — you will see fields like `reservationSet: [...]`, `instancesSet: [...]`, `tagSet: [...]`.

### Filters

All `describe_*` tools accept `filters` as an array of `{ Name, Values }`:

```json
[
  { "Name": "instance-state-name", "Values": ["running"] },
  { "Name": "tag:Environment", "Values": ["prod", "staging"] }
]
```

Use filters aggressively — describe calls without filters can return huge result sets.

### ec2_describe_instances
**Purpose:** List EC2 instances, scoped by filters and/or explicit `instanceIds`.

**Common filter recipes:**
- Only running instances: `{ Name: "instance-state-name", Values: ["running"] }`
- By tag: `{ Name: "tag:Owner", Values: ["team-payments"] }`
- In a specific VPC: `{ Name: "vpc-id", Values: ["vpc-0abc..."] }`

**Pagination:** pass `maxResults` (5–1000) and reuse the returned `nextToken` for subsequent pages.

### ec2_describe_regions
**Purpose:** Enumerate AWS regions enabled in the account. Pass `allRegions: true` to also see disabled / opt-in regions.

### ec2_describe_security_groups
**Purpose:** Inspect security groups. Filter by `vpc-id` or `group-name` to narrow.

### ec2_describe_vpcs
**Purpose:** List VPCs and their CIDR blocks.

### ec2_describe_images
**Purpose:** List AMIs. **Always pass `owners`** (e.g. `["self"]`, `["amazon"]`, or an account ID) — without it, the AWS public AMI catalog returns hundreds of thousands of entries.

### ec2_start_instances / ec2_stop_instances / ec2_reboot_instances
**Purpose:** Lifecycle operations.

**Inputs:**
- `instanceIds` (required): array of instance IDs.
- `force` (stop only, optional): force-stop unresponsive instances.
- `region` (optional): per-call region override.

**Safety:** these change real infrastructure state. Before calling, briefly confirm the target instance IDs back to the user — especially `stop_instances` with `force: true`. Do not call `terminate` (intentionally not exposed).

---

## Common Workflows

### "What's running in our prod account?"
1. `ec2_describe_instances` with filter `[{ Name: "instance-state-name", Values: ["running"] }, { Name: "tag:Environment", Values: ["prod"] }]`.
2. Summarize by instance type, AZ, and tag-derived owner.

### "Use Claude on Bedrock to summarize this log file"
1. `bedrock_list_foundation_models` with `byProvider: "anthropic"` to find a currently available model ID.
2. `bedrock_converse` with that `modelId`, the log content in the user message, and a small `inferenceConfig.maxTokens` budget.
3. Report `usage` tokens back to the user so they can track cost.

### "Stop the dev fleet for the weekend"
1. `ec2_describe_instances` with `[{ Name: "tag:Environment", Values: ["dev"] }, { Name: "instance-state-name", Values: ["running"] }]`.
2. Read back the resulting instance IDs to the user for confirmation.
3. `ec2_stop_instances` with the confirmed IDs.

### "Cross-region: list models in us-west-2 but instances in eu-central-1"
- The configured `AWS_REGION` controls Bedrock — restart the MCP server with `AWS_REGION=us-west-2` if it is set elsewhere, or set up a second server instance.
- For EC2, just pass `region: "eu-central-1"` on the describe call.

---

## Error Handling

The server returns `{ error, details }` objects instead of throwing. Common shapes:

- `HTTP 403 ... InvalidClientTokenId` / `SignatureDoesNotMatch` — bad credentials, clock skew, or `AWS_SESSION_TOKEN` expired. Refresh creds.
- `HTTP 400 ... UnauthorizedOperation` — IAM principal lacks the action. Surface the action name back to the user so they can fix the policy.
- `HTTP 400 ... ValidationException` (Bedrock) — typically wrong message shape or unsupported `modelId` in the current region. Run `bedrock_list_foundation_models` first.
- `HTTP 404 ... InvalidInstanceID.NotFound` — instance ID typo or wrong `region`.

If a response includes `details` as a structured object, surface its `Errors` / `message` field rather than the raw HTTP code.
