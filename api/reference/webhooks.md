---
title: Webhooks
---

# Webhooks

Webhooks let an external system trigger work in your account (run an agent or call an MCP tool), or act
as an OAuth 2.0 callback endpoint when connecting OAuth-protected external MCP servers.

There are three webhook types:

- **`generic_trigger`** — a public URL that, when called with the correct secret, runs an agent or
  calls an MCP tool with the incoming payload.
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
type WebhookAction = "run_agent" | "call_mcp_tool" | "custom"

interface TriggerConfig {
  action: WebhookAction
  actionParams: {
    agentName?: string        // for "run_agent"
    promptTemplate?: string   // supports {{placeholder}} substitution from the payload
    mcpServerName?: string    // for "call_mcp_tool"
    mcpToolName?: string
    mcpToolParams?: Record<string, any>
    customHandler?: string    // for "custom"
  }
  sendResultInResponse?: boolean   // return the action result in the trigger response
  resultWebhookUrl?: string        // also POST the result to this URL
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

// Returned by create/get/list (the secret is NEVER returned):
interface WebhookResponse {
  webhookId: string
  name: string
  description?: string
  type: WebhookType
  enabled: boolean
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
}
```

A random secret is generated and its SHA-256 hash stored; the raw secret is never returned, so capture
it from your own side when you need it (for `oauth_callback` webhooks, you may instead pass an
`x-api-key` header at create time, whose hash becomes the secret).

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

Response (HTTP **201**): `{ success: true, webhook: WebhookResponse }`.

Status codes: `400` for missing `name`/`type` or a missing type-specific config; `401` unauthenticated;
`500` on error.

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

(`type`, `oauthConfig`, and the secret are not updatable here.) Response
`{ success: true, message: "Webhook updated successfully" }`; `404` when not found.

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
  payload: any
  response?: any
  error?: string
  duration: number
  statusCode?: number
  sourceIp?: string
  userAgent?: string
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

Trigger a `generic_trigger` webhook. **Public**, but the `X-Webhook-Secret` header is required and is
verified against the stored secret hash.

- Request header: `X-Webhook-Secret: <secret>` (required; missing → `401`).
- Request body: arbitrary JSON — your payload.

How the payload is used:

- `action: "run_agent"` — <code v-pre>{{placeholder}}</code> tokens in `promptTemplate` are replaced
  with top-level payload values; the result is sent as a user message to `agentName` under your account.
- `action: "call_mcp_tool"` — the tool is called with `{ ...mcpToolParams, ...payload }` (payload keys
  override configured params).

Response: the action result is returned with the action's status code. When
`sendResultInResponse` is false, you get `{ success: true, message: "Webhook triggered successfully" }`.

Status codes: `401` (missing/invalid secret), `404` (webhook not found), `403` (disabled), `400`
(cannot trigger an `outbound` webhook externally / unknown type), `200`/`500` from the action.

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
