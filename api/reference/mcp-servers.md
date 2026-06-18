---
title: MCP Servers (Connect & OAuth)
---

# MCP Servers (Connect & OAuth)

These account-scoped endpoints let you connect and use **external** MCP servers — remote, Streamable
HTTP servers hosted elsewhere — including ones protected by OAuth 2.0. MissionSquad performs the full
OAuth 2.0 authorization-code + PKCE flow on your behalf, with three client-registration strategies:

- **CIMD** (Client ID Metadata Document) — MissionSquad's served metadata URL is used directly as the
  `client_id`. No registration call is needed.
- **DCR** (Dynamic Client Registration) — MissionSquad dynamically registers a client with the
  provider to obtain a `client_id`/`client_secret`.
- **manual** — you supply a `client_id`/`client_secret` issued out of band.

All endpoints here require `x-api-key`, except the public client-metadata document. This is distinct
from the admin-only [MCP API sidecar](/api/mcp-api/); the routes below are served by the main
MissionSquad API and are scoped to your account.

> The actual `.well-known` discovery fetches, dynamic client registration, server-record persistence,
> and runtime token application are delegated to the MCP service. The endpoints below are the surface
> you call.

## Connect flow at a glance

1. `POST /v1/mcp/external-servers/discover` — probe the remote URL for its OAuth metadata.
2. `POST /v1/mcp/external-servers` — register the server (transport is forced to `streamable_http`).
3. `POST /v1/mcp/servers/:name/install` — enable it for your account.
4. `POST /v1/mcp/servers/:name/oauth/start` — get an `authorizationUrl`; open it so the user can
   approve. The provider redirects to `/webhooks/oauth/callback`, MissionSquad exchanges the code for
   tokens, stores them encrypted, and pushes them into the server.
5. `POST /v1/mcp/tool/call` — call the server's tools.

For servers that need API keys instead of OAuth, use `POST /v1/mcp/servers/:name/secrets`.

## Key types

```ts
type MCPTransportType = "stdio" | "streamable_http"
type McpServerAuthMode = "none" | "oauth2"

interface CreateExternalMcpServerRequest {
  name: string
  displayName: string
  description: string
  url: string                              // remote Streamable HTTP URL
  authMode: McpServerAuthMode              // "none" or "oauth2"
  oauthTemplate?: McpExternalOAuthTemplate
  secretFields: McpExternalSecretField[]
  homepageUrl?: string
  repositoryUrl?: string
  licenseName?: string
  catalogProvider?: "glama" | "manual"
  catalogId?: string
  oauthClientConfig?: { clientId?: string; clientSecret?: string; scopes?: string[] }
  enabled: true
}

interface McpExternalOAuthTemplate {
  authorizationServerIssuer: string
  authorizationServerMetadataUrl: string
  resourceMetadataUrl?: string
  resourceUri: string
  authorizationEndpoint: string
  tokenEndpoint: string
  scopesSupported?: string[]
  challengedScopes?: string[]
  codeChallengeMethodsSupported: string[]
  pkceRequired: boolean
  discoveryMode: "auto" | "manual"
  discoverySource?: "prm" | "issuer_override"
  registrationMode: "cimd" | "dcr" | "manual"
  manualClientCredentialsAllowed?: boolean
  clientIdMetadataDocumentSupported?: boolean
  registrationEndpoint?: string
  tokenEndpointAuthMethodsSupported?: Array<"none" | "client_secret_post" | "client_secret_basic">
  authorizationRequestParams?: Array<{ name: string; value: string }>
}

interface McpExternalSecretField {
  name: string
  label: string
  description: string
  required: boolean
  inputType: "password"
}

// Server objects returned by the list/get endpoints (credential fields are stripped):
interface UserVisibleMcpServer {
  name: string
  displayName: string
  description: string
  source: "platform" | "external"
  transportType: MCPTransportType
  status: "connected" | "connecting" | "disconnected" | "error"
  enabled: boolean
  installed: boolean
  authRequired: boolean
  authMode?: McpServerAuthMode
  authState?: "not_required" | "not_connected" | "connected" | "reauth_required" | "error"
  canInstall: boolean
  canUninstall: boolean
  canConfigure: boolean
  secretFields: McpExternalSecretField[]
  configuredSecretNames?: string[]
  oauthTemplate?: McpExternalOAuthTemplate
  oauthClientConfig?: { clientId?: string; scopes?: string[] }
  toolsList?: unknown
  statusMessage?: string
}
```

---

## Endpoints

### POST `/v1/mcp/external-servers/discover`

Probe a remote MCP server URL for its OAuth Protected Resource Metadata and authorization-server
metadata.

Body:

```ts
{ url: string; authorizationServerIssuerOverride?: string }
```

Response:

```ts
{
  success: true
  serverUrl: string
  resourceMetadataUrl?: string
  resourceUri: string
  discoverySource: "prm" | "issuer_override"
  challengedScopes?: string[]
  authorizationServers: Array<{
    issuer: string
    authorizationServerMetadataUrl: string
    authorizationEndpoint: string
    tokenEndpoint: string
    scopesSupported?: string[]
    codeChallengeMethodsSupported: string[]
    clientIdMetadataDocumentSupported?: boolean
    registrationEndpoint?: string
    tokenEndpointAuthMethodsSupported?: Array<"none" | "client_secret_post" | "client_secret_basic">
  }>
  recommendedRegistrationMode: "cimd" | "dcr" | "manual"
}
```

`400` when the body is not an object; `401` unauthenticated; upstream/discovery errors are forwarded.

### POST `/v1/mcp/external-servers`

Register an external server. `source` and `transportType` are forced server-side to `"external"` and
`"streamable_http"`. Use the `oauthTemplate` returned/derived from discovery (or `authMode: "none"`
with `secretFields` for API-key servers).

Response: `{ success: true, server: UserVisibleMcpServer }`. `400` when the body is not an object.

### POST `/v1/mcp/servers/:name/install` and PUT `/v1/mcp/servers/:name/install`

Install (enable) the server for your account, optionally with manual OAuth client credentials.

Body:

```ts
{ enabled: boolean; oauthClientConfig?: { clientId?: string; clientSecret?: string; scopes?: string[] } }
```

Response: `{ success: true, server: UserVisibleMcpServer }`. `400` when `:name` is missing.

### DELETE `/v1/mcp/servers/:name/install`

Uninstall the server for your account. Response `{ success: true }`.

### POST `/v1/mcp/servers/:name/secrets`

Save per-server secrets (for API-key servers whose `secretFields` declare them).

Body:

```ts
{ secrets: Array<{ name: string; value: string }> }
```

Response `{ success: true }`. `400` when `secrets` is empty or a value is invalid; `404` when the
server is not found.

### POST `/v1/mcp/servers/:name/oauth/start`

Begin the OAuth authorization-code flow. Resolves the client (CIMD/DCR/manual), generates `state` +
PKCE, creates an `oauth_callback` webhook, and returns the authorization URL to open.

Body:

```ts
{ clientId?: string; clientSecret?: string; scopes?: string[] }
```

Response:

```ts
{
  success: true
  authorizationUrl: string   // open this so the user can approve
  callbackUrl: string        // `${publicApiOrigin}/webhooks/oauth/callback`
  webhookId: string
}
```

`400` for OAuth misconfiguration (e.g. server not configured for OAuth, missing URL, manual creds sent
for a cimd/dcr server, missing `clientId`).

After the user approves, the provider redirects to the callback (handled automatically — see
[Webhooks](/api/reference/webhooks)). MissionSquad exchanges the authorization `code` for tokens
(`grant_type=authorization_code`, with PKCE `code_verifier` and the appropriate client-auth method),
stores them encrypted, and pushes them into the running server. If a tool call later needs
re-authorization, `POST /v1/mcp/tool/call` returns `401`; start the flow again.

### POST `/v1/mcp/servers/:name/refresh`

Refresh the live server connection for your account. Response
`{ success: true, server: UserVisibleMcpServer }`.

### GET `/v1/mcp/servers`, `/v1/mcp/servers/:name`, `/v1/mcp/servers/:name/tools`

List your servers, fetch one, or list a server's tools. Server objects are `UserVisibleMcpServer`
(credential fields stripped). `/tools` returns the server's advertised tool list.

### GET `/v1/mcp/catalog/servers`

List catalog entries you can install.

### POST `/v1/mcp/tool/call`

Call a tool on a connected server.

Body:

```ts
{ serverName: string; method: string; args: Record<string, any> }
```

Response `{ success: true, data: <tool result> }`. Status codes: `400` (missing/oversized
`serverName`/`method`, non-object `args`), `404` (server or method not found), `409` (server
disabled), `401` (OAuth re-authorization required — re-run `oauth/start`), `500` (other failure).

### GET `/.well-known/oauth/client-metadata.json`

**Public.** MissionSquad's OAuth Client ID Metadata Document. In CIMD mode this served URL *is* the
`client_id` presented to the provider.

```json
{
  "client_id": "https://agents.missionsquad.ai/.well-known/oauth/client-metadata.json",
  "client_name": "MissionSquad",
  "redirect_uris": ["https://agents.missionsquad.ai/webhooks/oauth/callback"],
  "grant_types": ["authorization_code"],
  "response_types": ["code"],
  "token_endpoint_auth_method": "none"
}
```

---

## Notes

- Admin-only routes also exist on this service for operators (server enable/disable/delete, package
  install/upgrade, server-install requests). Those require an admin account and are out of scope for
  account-level integration; see the [MCP API (Admin)](/api/mcp-api/) docs for the operator surface.
- For the platform-hosted MCP server that exposes the *whole* MissionSquad API to AI agents (a
  different thing from connecting third-party MCP servers here), see the
  [Mission Squad MCP Server](/mcp-server/).

## See also

- [Webhooks](/api/reference/webhooks)
- [MCP (Tools) platform guide](/platform/mcp)
- [MCP API (Admin)](/api/mcp-api/)
- [Endpoint Index](/api/reference/endpoint-index)
