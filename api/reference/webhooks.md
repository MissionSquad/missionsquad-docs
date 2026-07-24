---
title: Webhooks
---

# Webhooks

Webhooks let an external system trigger work in your account (run an agent, workflow, or factory, or
call an MCP tool), or act as an OAuth 2.0 callback endpoint when connecting OAuth-protected external
MCP servers.

There are three webhook types:

- **`generic_trigger`** — a public URL that, when called with the correct secret (or a valid GitHub-style
  HMAC signature), runs an agent, workflow, or factory, or calls an MCP tool with the incoming payload.
- **`oauth_callback`** — a redirect/callback endpoint used during an OAuth 2.0 authorization-code flow.
  These are created automatically when you connect an OAuth-protected
  [external MCP server](/api/reference/mcp-servers); you rarely create them by hand.
- **`outbound`** — configuration for posting results to an external URL (cannot be triggered
  externally).

Management endpoints (`/v1/webhooks*`) require `x-api-key`. The trigger and OAuth callback endpoints
are public and protected by a secret/state instead.

## Config & response types

```ts
type WebhookType = "oauth_callback" | "generic_trigger" | "outbound"
type WebhookAction = "run_agent" | "run_workflow" | "run_factory" | "call_mcp_tool" | "custom"
type WebhookVerificationMode = "header_secret" | "hmac_sha256"

interface TriggerConfig {
  action: WebhookAction
  actionParams: {
    agentName?: string        // for "run_agent"
    promptTemplate?: string   // supports {{placeholder}} substitution from the payload (incl. dot paths)
    workflowId?: string       // for "run_workflow"
    dataPayload?: string      // for "run_workflow": optional static JSON string
    factoryConfigId?: string  // for "run_factory"
    initialCarryPayload?: string // for "run_factory": optional static JSON string
    mcpServerName?: string    // for "call_mcp_tool"
    mcpToolName?: string
    mcpToolParams?: Record<string, any>
    customHandler?: string    // for "custom" — reserved: currently acknowledges without side effects
  }
  conditions?: WebhookConditionGroup              // optional gate; absent = always run
  payloadTransform?: Record<string, unknown>      // optional whitelist mapping; absent = payload unchanged
  executionMode?: "sync" | "async"                // default "sync"; forced "async" in hmac_sha256 mode
  sendResultInResponse?: boolean   // return the action result in the trigger response
  resultWebhookUrl?: string        // also POST the result to this URL
}

// Conditions evaluate against { body, headers } (see the platform guide for
// operator semantics, wildcards, and limits):
interface WebhookConditionLeaf {
  path: string                     // e.g. "body.action", "headers.x-github-event"
  op: "eq" | "neq" | "in" | "nin" | "exists" | "not_exists" | "contains" | "startsWith" | "gt" | "lt"
  value?: string | number | boolean | null | Array<string | number | boolean | null>
}
interface WebhookConditionGroup {
  all?: Array<WebhookConditionLeaf | WebhookConditionGroup>
  any?: Array<WebhookConditionLeaf | WebhookConditionGroup>
}

interface OutboundConfig {
  targetUrl: string
  method?: "POST" | "PUT" | "PATCH"
  headers?: Record<string, string>
  eventTypes: string[]
  retry?: { maxAttempts: number; delayMs: number }
}

interface OAuthConfig {
  provider: string
  state: string                  // CSRF state; must match on callback
  codeVerifier?: string          // PKCE
  redirectUri: string
  frontendOrigin?: string
  scopes?: string[]
  mcpServerName?: string
  authorizationServer?: string
  tokenEndpoint?: string
  clientId?: string
  clientSecret?: string
  resource?: string              // RFC 8707 resource indicator
  tokenEndpointAuthMethod?: "none" | "client_secret_post" | "client_secret_basic"
  registrationMode?: "cimd" | "dcr" | "manual"
}

// Returned by create/get/list. The raw secret is returned exactly once, as a
// top-level field of the creation response — never inside WebhookResponse:
interface WebhookResponse {
  webhookId: string
  name: string
  description?: string
  type: WebhookType
  enabled: boolean
  verificationMode?: WebhookVerificationMode // present when set; default behavior is "header_secret"
  triggerUrl?: string    // generic_trigger only: `${baseUrl}/webhooks/trigger/${webhookId}`
  callbackUrl?: string   // oauth_callback only: `${baseUrl}/webhooks/oauth/callback/${webhookId}`
  createdAt: string      // Date
  updatedAt: string
  lastTriggeredAt?: string
  triggerCount: number
  expiresAt?: string
  tags?: string[]
}
```

---

## Management endpoints

### POST `/v1/webhooks`

Create a webhook.

Body (`CreateWebhookRequest`):

```ts
{
  webhookId?: string
  name: string                 // required
  description?: string
  type: WebhookType            // required
  oauthConfig?: OAuthConfig    // required when type === "oauth_callback" (needs state + redirectUri)
  triggerConfig?: TriggerConfig// required when type === "generic_trigger" (needs action)
  outboundConfig?: OutboundConfig // required when type === "outbound" (needs targetUrl)
  expiresAt?: string
  tags?: string[]
  secret?: string              // optional bring-your-own secret: 16-128 printable ASCII chars, no whitespace
  verificationMode?: WebhookVerificationMode // "hmac_sha256" only valid for generic_trigger
}
```

A secret is generated when you don't supply one, and only its SHA-256 hash is stored. For
`generic_trigger` webhooks the **raw secret is returned once** as a top-level `secret` field of the
`201` response — capture it there; it cannot be retrieved again. In `hmac_sha256` mode an encrypted
copy is also stored, since HMAC verification needs the raw value as a key. (For `oauth_callback`
webhooks, you may instead pass an `x-api-key` header at create time, whose hash becomes the secret.)

Example (generic trigger that runs an agent):

```ts
await fetch("https://agents.missionsquad.ai/v1/webhooks", {
  method: "POST",
  headers: { "x-api-key": process.env.MSQ_API_KEY!, "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "Lead intake",
    type: "generic_trigger",
    triggerConfig: {
      action: "run_agent",
      actionParams: {
        agentName: "lead-qualifier",
        promptTemplate: "Qualify this lead: name={{name}}, company={{company}}, note={{note}}"
      },
      sendResultInResponse: true
    }
  })
});
```

Response (HTTP **201**): `{ success: true, webhook: WebhookResponse }` — plus, for `generic_trigger`
webhooks, top-level `secret` (the raw secret, shown only this once) and `secretNotice`.

Status codes: `400` for missing `name`/`type`, a missing type-specific config, or any invalid
configuration (bad `secret` format, `hmac_sha256` on a non-generic webhook, invalid
conditions/transform, `executionMode: "sync"` combined with `hmac_sha256`, missing
`workflowId`/`factoryConfigId` for the run actions); `401` unauthenticated; `500` on error.

### GET `/v1/webhooks`

List your webhooks. Query: `type` (filter), `enabled` (`"true"`/`"false"`), `limit` (default `50`),
`skip` (default `0`). Response `{ success: true, webhooks: WebhookResponse[], count: number }`.

### GET `/v1/webhooks/:webhookId`

Fetch one webhook. Response `{ success: true, webhook: WebhookResponse }`; `404` when not found.

### PUT `/v1/webhooks/:webhookId`

Update a webhook. Body (`UpdateWebhookRequest`):

```ts
{
  name?: string
  description?: string
  enabled?: boolean
  triggerConfig?: TriggerConfig
  outboundConfig?: OutboundConfig
  tags?: string[]
}
```

(`type`, `oauthConfig`, the secret, and `verificationMode` are not updatable — recreate the webhook to
change how it authenticates. An updated `triggerConfig` is validated like at creation time; invalid
configs return `400`.) Response `{ success: true, message: "Webhook updated successfully" }`; `404`
when not found.

### DELETE `/v1/webhooks/:webhookId`

Delete a webhook and its execution history and OAuth tokens. Response
`{ success: true, message: "Webhook deleted successfully" }`; `404` when not found.

### GET `/v1/webhooks/:webhookId/executions`

List execution history (audit trail). Query: `limit` (default `50`), `skip` (default `0`).

Response `{ success: true, executions: WebhookExecution[], count: number }` where:

```ts
interface WebhookExecution {
  executionId: string
  webhookId: string
  username: string
  triggeredAt: string
  success: boolean
  payload: any            // the original inbound payload (never the transformed one)
  response?: any
  error?: string
  duration: number
  statusCode?: number
  sourceIp?: string
  userAgent?: string
  status?: "running" | "success" | "failed" | "skipped"
  skippedReason?: string  // "conditions_not_met" | "ping"
  deliveryId?: string     // sender's idempotency key, e.g. GitHub's X-GitHub-Delivery
}
```

### GET `/v1/webhooks/:webhookId/token`

For `oauth_callback` webhooks, return stored OAuth token **metadata** (never the tokens themselves).

Response:

```ts
{
  success: true,
  token: {
    provider: string
    tokenType: string
    scopes?: string[]
    expiresAt?: string
    createdAt: string
    updatedAt: string
  }
}
```

`400` when the webhook is not an `oauth_callback`; `404` when the webhook or token is not found.

---

## Public endpoints

### POST `/webhooks/trigger/:webhookId`

Trigger a `generic_trigger` webhook. **Public**, authenticated per the webhook's verification mode:

- `header_secret` (default): `X-Webhook-Secret: <secret>` header, verified against the stored hash
  (missing → `401`).
- `hmac_sha256`: `X-Hub-Signature-256: sha256=<hex>` — the HMAC-SHA256 of the **raw request body**
  using the shared secret, GitHub-style, compared in constant time (missing/invalid → `401`).
- Request body: a JSON object (`Content-Type: application/json` required — other content types → `415`;
  invalid JSON or a non-object payload → `400`).

Pipeline before the action runs:

- **Duplicate deliveries**: when an `X-GitHub-Delivery` header is present and was already processed for
  this webhook, the request answers `200` with
  `{ success: true, skipped: true, reason: "duplicate_delivery" }` and runs nothing.
- **Ping** (`hmac_sha256` mode only): an `X-GitHub-Event: ping` delivery answers
  `{ success: true, message: "pong" }` without dispatching.
- **Conditions**: when configured and not met, the request answers `200` with
  `{ success: true, skipped: true, reason: "conditions_not_met" }`, records a `skipped` execution, and
  does not count a trigger.
- **Transform**: when configured, the payload is reshaped before the action (see the platform guide).

How the payload is used:

- `action: "run_agent"` — <code v-pre>{{placeholder}}</code> tokens in `promptTemplate` are replaced
  with payload values (dot paths reach nested values; objects render as JSON; unknown placeholders stay
  literal); the result is sent as a user message to `agentName` under your account.
- `action: "run_workflow"` — starts a workflow run; the payload (transformed, or the static
  `dataPayload`, or the body) becomes the run's data payload. The run executes in the background and
  the response carries `runId`.
- `action: "run_factory"` — starts a factory run (`trigger: "webhook"`) the same way via
  `initialCarryPayload`; subject to the concurrent factory run limit.
- `action: "call_mcp_tool"` — the tool is called with `{ ...mcpToolParams, ...payload }` (payload keys
  override configured params).

Response (sync mode, the default): the action result is returned with the action's status code. When
`sendResultInResponse` is false, you get `{ success: true, message: "Webhook triggered successfully" }`.

Response (async mode — opt-in via `executionMode: "async"`, always on in `hmac_sha256` mode): HTTP
**202** `{ success: true, accepted: true, executionId, runId? }` immediately; the action completes in
the background and its outcome lands in the execution record.

Status codes: `401` (missing/invalid secret or signature), `404` (webhook not found), `403` (disabled),
`415` (wrong content type), `400` (invalid JSON / non-object payload / cannot trigger an `outbound`
webhook externally / unknown type), `202` (async accepted), `200`/`500` from the action.

```bash
curl -X POST "https://agents.missionsquad.ai/webhooks/trigger/$WEBHOOK_ID" \
  -H "X-Webhook-Secret: $WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"name":"Ada","company":"Analytical Engines","note":"wants a demo"}'
```

### GET|POST `/webhooks/oauth/callback` and `/webhooks/oauth/callback/:webhookId`

The OAuth 2.0 authorization-code redirect target. **Public** — the webhook is resolved by `:webhookId`
or by the OAuth `state` parameter, and the inbound `state` must match the stored value. On success the
server exchanges the `code` for tokens at the provider's token endpoint, stores them encrypted, and
(for an external MCP server) pushes them into the running server.

For GET requests the OAuth params arrive as query params (`code`, `state`, `error`,
`error_description`); for POST, as the body. By default the endpoint returns an HTML page that posts a
completion message to the opener window and closes the popup; send `Accept: application/json` to get a
JSON result instead. This flow is set up for you by
[MCP Servers (Connect & OAuth)](/api/reference/mcp-servers) — you do not call it directly.

## See also

- [MCP Servers (Connect & OAuth)](/api/reference/mcp-servers)
- [Agents](/api/reference/agents)
- [Webhooks (platform guide)](/platform/webhooks)
- [Endpoint Index](/api/reference/endpoint-index)
