# Webhooks

Webhooks let external systems communicate with the MissionSquad API in real time. Use them to trigger agents, workflows, and factories from other services, to call MCP tools, and to handle OAuth 2.0 authentication for MCP servers.

MissionSquad supports three webhook types:

1.  **Generic Trigger**: run an agent, workflow, or factory — or call an MCP tool — via an HTTP POST request.
2.  **OAuth Callback**: handle OAuth 2.0 redirects to authenticate MCP servers or other integrations.
3.  **Outbound**: send events from MissionSquad to an external URL (triggered by internal events, not external calls). See the [API reference](/api/reference/webhooks) for the `outboundConfig` schema.

## Quick Start: A Basic Webhook

Create a webhook that runs an agent, save the secret, and trigger it. That's the whole flow — everything else on this page is optional.

**1. Create the webhook** (`POST /v1/webhooks`, authenticated):

```json
{
  "name": "Run Support Agent",
  "type": "generic_trigger",
  "triggerConfig": {
    "action": "run_agent",
    "actionParams": {
      "agentName": "support-agent",
      "promptTemplate": "Handle support ticket: {{ticketId}}. Description: {{description}}"
    }
  }
}
```

**2. Save the secret from the creation response.** The `201` response contains the webhook's raw secret as a top-level field — this is the **only time it is ever returned**; it cannot be retrieved later (see [Security](#security) for how it is stored):

```json
{
  "success": true,
  "webhook": { "webhookId": "...", "triggerUrl": "https://.../webhooks/trigger/..." },
  "secret": "a1b2c3...",
  "secretNotice": "Store this secret now. It cannot be retrieved again."
}
```

You may also supply your own secret at creation time with a top-level `"secret"` field (16–128 printable ASCII characters, no whitespace).

**3. Trigger it** with the secret in the `X-Webhook-Secret` header:

```bash
curl -X POST https://agents.missionsquad.ai/webhooks/trigger/YOUR_WEBHOOK_ID \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: YOUR_WEBHOOK_SECRET" \
  -d '{"ticketId": "12345", "description": "User cannot log in"}'
```

The JSON body is the payload. Placeholders in `promptTemplate` are filled from it, so the agent receives: `Handle support ticket: 12345. Description: User cannot log in`.

For advanced features — triggering workflows/factories, gating on payload values, reshaping payloads, and GitHub integration — read on. All of them are opt-in; a basic webhook never needs them.

## Actions Reference

`triggerConfig.action` selects what a generic trigger does.

### run_agent

Runs an agent with a rendered prompt.

| `actionParams` field | Description |
| --- | --- |
| `agentName` | Name of the agent to run (required). |
| `promptTemplate` | Prompt with handlebars-style placeholders rendered from the payload. |

Placeholders support **dot paths** into nested payloads and format objects as JSON:

```text
New PR "{{pull_request.title}}" by {{pull_request.user.login}}
```

Unknown placeholders are left literally in place. In sync mode (the default) the action's result is included in the response when `sendResultInResponse` is `true`; in async mode the trigger returns `202` immediately and the result lands in the execution history instead.

### run_workflow

Starts a workflow run and responds immediately — the run itself always executes in the background (the response contains the `runId`, never the run's final output).

| `actionParams` field | Description |
| --- | --- |
| `workflowId` | Workflow config id to run (required). |
| `dataPayload` | Optional static JSON string used as the workflow data payload. |

The workflow's data payload is chosen with this precedence:

1. The transformed payload, when `payloadTransform` is configured (see below).
2. `actionParams.dataPayload`, when set.
3. The inbound request body, when it is a non-empty JSON object.
4. Otherwise the workflow's own configured payload.

Check progress in the dashboard or via `GET /v1/core/workflow-runs/:runId`.

### run_factory

Starts a factory run; identical response semantics to `run_workflow` (immediate `runId`, background execution). The factory run records `trigger: "webhook"`.

| `actionParams` field | Description |
| --- | --- |
| `factoryConfigId` | Factory config id to run (required). |
| `initialCarryPayload` | Optional static JSON string used as the initial carry payload. |

The initial carry payload is chosen with this precedence:

1. The transformed payload, when `payloadTransform` is configured (see below).
2. `actionParams.initialCarryPayload`, when set.
3. The inbound request body, when it is a non-empty JSON object.
4. Otherwise the run starts with an empty carry payload.

Factory runs count against your concurrent factory run limit; at the limit the trigger fails with `FACTORY_CONCURRENT_LIMIT_REACHED`.

Check progress via `GET /v1/core/factory-runs/:runId`.

### call_mcp_tool

Calls an MCP tool with the payload merged over `mcpToolParams`.

| `actionParams` field | Description |
| --- | --- |
| `mcpServerName` | MCP server name (required). |
| `mcpToolName` | Tool to call (required). |
| `mcpToolParams` | Base parameters; payload fields override them key-by-key. |

## Conditions (Optional)

`triggerConfig.conditions` gates the action on values in the request. When the gate fails, the webhook responds `200` with a skip marker, records a `skipped` execution, and does **not** run the action or count a trigger:

```json
{ "success": true, "skipped": true, "reason": "conditions_not_met" }
```

Conditions evaluate against the object `{ body, headers }`, so paths look like `body.action` or `headers.x-github-event` (header names are lowercased). A `conditions` fragment inside `triggerConfig` looks like this:

```json
{
  "conditions": {
    "all": [
      { "path": "headers.x-github-event", "op": "eq", "value": "pull_request" },
      { "path": "body.action", "op": "in", "value": ["opened", "synchronize", "reopened", "ready_for_review"] },
      { "path": "body.pull_request.draft", "op": "eq", "value": false }
    ]
  }
}
```

A condition group has `all` (every node must pass), `any` (at least one must pass), or both (both results are ANDed). Groups nest up to 4 levels; up to 32 condition leaves total.

### Operators

| Op | Meaning | Path missing |
| --- | --- | --- |
| `eq` | Strict equality (no type coercion) | `false` |
| `neq` | Strict inequality | `false` |
| `in` | Value is in the given array | `false` |
| `nin` | Value is not in the given array | `false` |
| `exists` | Path resolves | `false` |
| `not_exists` | Path does not resolve | `true` |
| `contains` | Substring (strings) or element equality (arrays) | `false` |
| `startsWith` | String prefix | `false` |
| `gt` / `lt` | Numeric comparison (numbers only) | `false` |

**A missing path is always false** (except `not_exists`) — including for `neq` and `nin`. This is deliberate: a typo'd path can never silently pass a gate. Everything is case-sensitive, and there is no regex operator.

### Wildcards

A `*` path segment maps over an array and matches if **any** element passes (for `nin`: only if **no** element matches):

```json
{ "path": "body.pull_request.labels.*.name", "op": "in", "value": ["deploy", "release"] }
```

## Payload Transforms (Optional)

`triggerConfig.payloadTransform` reshapes the inbound request into a new payload before the action runs. It is a **whitelist**: the output contains only the keys you map, which is also how you drop fields. Like conditions, it evaluates against `{ body, headers }`.

```json
{
  "payloadTransform": {
    "title": { "$path": "body.pull_request.title" },
    "summary": { "$template": "PR #{{body.number}} by {{body.pull_request.user.login}}" },
    "labels": { "$join": { "path": "body.pull_request.labels.*.name", "separator": ", " } },
    "milestone": { "$path": "body.pull_request.milestone.title", "$default": "none" },
    "source": "github"
  }
}
```

### Directives

| Directive | Result |
| --- | --- |
| `$path` | The resolved value verbatim (any JSON type). Missing: `$default` if set, else `null`. Wildcard paths produce a flattened array. |
| `$template` | A rendered string; unresolvable placeholders render as empty strings. |
| `$join` | A string: the resolved array's elements joined with `separator` (default `,`). Missing: `$default` if set, else an empty string. |

`$default` sits alongside `$path` or `$join` in the same directive object — see the `"milestone"` key in the example above. It is used only when the path does not resolve; for `$path` it may be any scalar, for `$join` it must be a string. (`$template` does not take a `$default` — misses simply render as empty strings.)

Plain strings, numbers, booleans, and `null` are literals; nested objects and arrays are evaluated recursively. Limits: 64 output keys, 4 nesting levels, 2000 characters per template; output keys must match `[A-Za-z0-9_-]` (1–64 chars).

### Where the transformed payload goes

| Action | Effect of a transform |
| --- | --- |
| `run_agent` | `promptTemplate` renders against the transformed object instead of the raw body. To reference headers in a prompt, map them into the transform first. |
| `run_workflow` | The transform (JSON-stringified) becomes the workflow `dataPayload`. |
| `run_factory` | The transform becomes the `initialCarryPayload`. |
| `call_mcp_tool` | The transform is merged over `mcpToolParams` instead of the raw body. |

Execution history always stores the **original** inbound payload.

## GitHub Integration

GitHub webhooks can call MissionSquad directly. GitHub never sends a secret header — it signs the raw request body with HMAC-SHA256 — so create the webhook in `hmac_sha256` verification mode:

```json
{
  "name": "GitHub PR Review",
  "type": "generic_trigger",
  "secret": "use-a-long-random-string-here",
  "verificationMode": "hmac_sha256",
  "triggerConfig": {
    "action": "run_workflow",
    "actionParams": { "workflowId": "pr-review-workflow" },
    "conditions": {
      "all": [
        { "path": "headers.x-github-event", "op": "eq", "value": "pull_request" },
        { "path": "body.action", "op": "in", "value": ["opened", "synchronize", "reopened", "ready_for_review"] }
      ]
    }
  }
}
```

Then in your GitHub repository: **Settings → Webhooks → Add webhook**

1. **Payload URL**: the `triggerUrl` from the creation response.
2. **Content type**: `application/json` (required — form encoding is rejected).
3. **Secret**: the same secret you supplied (or the generated one from the creation response).
4. Select the events you want, then save. GitHub sends a `ping` — MissionSquad answers it with a `pong` and a green checkmark appears next to the hook.

### How hmac_sha256 mode behaves

*   Requests are verified against the `X-Hub-Signature-256` header (constant-time comparison of the HMAC-SHA256 of the raw body). `X-Webhook-Secret` is not used.
*   Execution is **always asynchronous**: the endpoint responds `202` immediately (within GitHub's 10-second delivery timeout) and the action runs in the background:

    ```json
    { "success": true, "accepted": true, "executionId": "...", "runId": "..." }
    ```

    `runId` is present for `run_workflow` / `run_factory`. Observe outcomes via the execution history endpoint or the run APIs.
*   **Duplicate deliveries are idempotent**: GitHub occasionally redelivers events; a delivery id (`X-GitHub-Delivery`) that was already processed responds `200` with `{ "success": true, "skipped": true, "reason": "duplicate_delivery" }` and runs nothing.
*   `ping` events are answered without dispatching the action or counting a trigger.

Note for container images: multi-arch packages can emit one `registry_package` event per manifest — use conditions (or dedup on your side) if you only want one action per publish. For CI-coupled flows (e.g. "review after checks pass"), a GitHub Actions job that calls the MissionSquad API remains a good alternative to direct webhooks.

`executionMode: "async"` is also available to ordinary header-secret webhooks that want the 202-and-run-in-background behavior; `hmac_sha256` mode simply forces it.

## Security

*   **The secret is shown once**, in the creation response. Only a SHA-256 hash is stored for header verification. In `hmac_sha256` mode an encrypted copy is also stored, since HMAC verification needs the raw value as a key.
*   **Two verification modes**: `header_secret` (default — raw secret in `X-Webhook-Secret`) and `hmac_sha256` (GitHub-style signature over the raw body). The mode and secret are fixed at creation; to change them, recreate the webhook.
*   **Headers visible to conditions/transforms** are lowercased and sanitized: `x-webhook-secret`, `x-hub-signature-256`, `x-hub-signature`, `authorization`, and `cookie` are always stripped.
*   Trigger payloads must be JSON objects; arrays and bare scalars are rejected with `400`.

## Execution History

`GET /v1/webhooks/:webhookId/executions` returns past executions, newest first. Relevant fields:

| Field | Meaning |
| --- | --- |
| `status` | `success`, `failed`, `skipped`, or `running` (an async execution still in flight). |
| `skippedReason` | Why a skipped execution was skipped: `conditions_not_met` or `ping`. |
| `deliveryId` | The sender's delivery id (e.g. GitHub's `X-GitHub-Delivery`), used for duplicate detection. |
| `payload` | The original inbound payload. |
| `response` / `error` | The action result or failure message. |

`triggerCount` and `lastTriggeredAt` on the webhook only advance when an action is actually dispatched — skipped, ping, and duplicate deliveries don't count.

## OAuth Callbacks

OAuth callback webhooks handle the redirect flow from OAuth providers.

```json
{
  "name": "GitHub Auth Callback",
  "type": "oauth_callback",
  "oauthConfig": {
    "provider": "github",
    "state": "random_secure_string",
    "redirectUri": "https://agents.missionsquad.ai/webhooks/oauth/callback/{webhookId}",
    "mcpServerName": "github-mcp"
  }
}
```

1.  **Configure Provider**: Register your application with the OAuth provider and set the callback URL to `https://agents.missionsquad.ai/webhooks/oauth/callback/YOUR_WEBHOOK_ID`.
2.  **Initiate Flow**: Direct the user to the provider's authorization URL.
3.  **Handle Redirect**: The provider redirects back to the webhook URL with a `code` and `state`.
4.  **Token Exchange**: MissionSquad validates the `state`, exchanges the `code` for an access token, and stores it encrypted.
5.  **MCP Integration**: If `mcpServerName` is configured, the token is automatically associated with that MCP server.

## API Reference

### Manage Webhooks

*   **List Webhooks**: `GET /v1/webhooks`
*   **Create Webhook**: `POST /v1/webhooks` — accepts optional top-level `secret` and `verificationMode`; the `201` response includes the raw `secret` for generic triggers (once, never again).
*   **Get Webhook**: `GET /v1/webhooks/:webhookId`
*   **Update Webhook**: `PUT /v1/webhooks/:webhookId` — updatable fields: `name`, `description`, `enabled`, `triggerConfig`, `outboundConfig`, `tags`. The secret and verification mode are not updatable.
*   **Delete Webhook**: `DELETE /v1/webhooks/:webhookId`

### Trigger

*   **Trigger Webhook**: `POST /webhooks/trigger/:webhookId` — `Content-Type: application/json` with either `X-Webhook-Secret` (header mode) or `X-Hub-Signature-256` (hmac mode).

### Utilities

*   **Execution History**: `GET /v1/webhooks/:webhookId/executions`
*   **Get OAuth Token**: `GET /v1/webhooks/:webhookId/token` — token metadata for OAuth webhooks (the tokens themselves are not returned).
