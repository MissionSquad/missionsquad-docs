---
title: Servers & Tools
---

# Servers & Tools

Endpoints for managing MCP server registrations, listing available tools, executing tool calls, and configuring OAuth authentication.

> **Note**: The `username` parameter is optional in all tool-related endpoints. If omitted, `"default"` is used. This allows single-user setups to use the API without specifying a username while still benefiting from encrypted secret storage.

## Tool Operations

### GET `/mcp/tools`

List all available tools across all registered MCP servers.

```bash
curl http://mcp:8082/mcp/tools
```

Response:

```json
{
  "success": true,
  "tools": [
    {
      "github": [
        {
          "name": "create_issue",
          "description": "Creates a new issue in a GitHub repository",
          "inputSchema": {
            "type": "object",
            "properties": {
              "owner": { "type": "string", "description": "Repository owner" },
              "repo": { "type": "string", "description": "Repository name" },
              "title": { "type": "string", "description": "Issue title" }
            },
            "required": ["owner", "repo", "title"]
          }
        }
      ]
    }
  ]
}
```

Each entry in `tools` is keyed by server name and contains an array of tool definitions with `name`, `description`, and `inputSchema` (JSON Schema).

---

### POST `/mcp/tool/call`

Execute a tool on a specified MCP server.

```bash
curl -X POST http://mcp:8082/mcp/tool/call \
  -H "Content-Type: application/json" \
  -d '{
    "username": "user123",
    "serverName": "github",
    "methodName": "create_issue",
    "args": {
      "owner": "my-org",
      "repo": "my-repo",
      "title": "Bug report",
      "body": "Description of the issue"
    }
  }'
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `username` | string | No | Username for secret retrieval. Defaults to `"default"` |
| `serverName` | string | Yes | Name of the MCP server that provides the tool |
| `methodName` | string | Yes | Name of the tool to call |
| `args` | object | Yes | Arguments to pass to the tool |

Response:

```json
{
  "success": true,
  "data": {
    "content": "Tool execution result",
    "contentType": "text/plain"
  }
}
```

#### Automatic Secret Injection

When a tool call is made, the system automatically:

1. Retrieves any stored secrets for the specified username and server
2. Merges secrets with the provided arguments before the tool is called
3. Clients never need to include sensitive credentials in the request payload

For example, if a GitHub token is stored via [`POST /secrets/set`](/api/mcp-api/secrets#post-secretsset), it is automatically injected when calling any tool on the `github` server for that user.

---

## Server Management

### GET `/mcp/servers`

List all registered MCP servers with their configuration, status, and available tools.

```bash
curl http://mcp:8082/mcp/servers
```

Response:

```json
{
  "success": true,
  "servers": [
    {
      "name": "github",
      "transportType": "stdio",
      "command": "./node_modules/@missionsquad/mcp-github/build/index.js",
      "args": [],
      "env": { "NODE_ENV": "production" },
      "status": "connected",
      "enabled": true,
      "toolsList": [ ],
      "logs": []
    }
  ]
}
```

Server fields:

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Unique server identifier |
| `transportType` | string | `"stdio"` or `"streamable_http"` |
| `command` | string | Startup command (stdio only) |
| `args` | string[] | Command-line arguments (stdio only) |
| `env` | object | Environment variables, excluding secrets (stdio only) |
| `url` | string | MCP HTTP endpoint (streamable_http only) |
| `headers` | object | Static HTTP headers (streamable_http only) |
| `sessionId` | string | Persisted MCP session ID (streamable_http only) |
| `reconnectionOptions` | object | SSE reconnection settings (streamable_http only) |
| `status` | string | `"connected"`, `"connecting"`, `"disconnected"`, or `"error"` |
| `enabled` | boolean | Whether the server is enabled |
| `toolsList` | array | Tools provided by this server |
| `logs` | array | Captured log messages |

---

### GET `/mcp/servers/:name`

Get detailed information about a specific MCP server.

```bash
curl http://mcp:8082/mcp/servers/github
```

Returns the same server object structure as the list endpoint, scoped to the named server.

---

### POST `/mcp/servers`

Register a new MCP server.

**Stdio server:**

```bash
curl -X POST http://mcp:8082/mcp/servers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "helper-tools",
    "transportType": "stdio",
    "command": "./node_modules/@missionsquad/mcp-helper-tools/build/index.js",
    "args": [],
    "env": { "NODE_ENV": "production" },
    "enabled": true
  }'
```

**Streamable HTTP server:**

```bash
curl -X POST http://mcp:8082/mcp/servers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "remote-server",
    "transportType": "streamable_http",
    "url": "https://example.com/mcp",
    "headers": { "X-Custom-Header": "value" },
    "enabled": true
  }'
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Unique server name |
| `transportType` | string | No | `"stdio"` (default) or `"streamable_http"` |
| `command` | string | Yes (stdio) | Command to start the server |
| `args` | string[] | No | Command-line arguments |
| `env` | object | No | Environment variables |
| `url` | string | Yes (streamable_http) | MCP HTTP endpoint |
| `headers` | object | No | Static request headers (streamable_http) |
| `sessionId` | string | No | Session ID to resume (streamable_http) |
| `reconnectionOptions` | object | No | SSE reconnection settings (streamable_http) |
| `secretNames` | string[] | No | Secret names this server expects (e.g. `["API_KEY", "API_SECRET"]`). Only these secrets are injected during tool calls |
| `secretName` | string | No | Legacy single secret name. Migrated to `secretNames` on load |
| `startupTimeout` | number | No | Custom timeout in ms for tool discovery. Default 180,000ms (3 min). Max 300,000ms (5 min) |
| `enabled` | boolean | No | Start the server immediately (default `true`) |

> **Security**: Do not include sensitive information in `env`. Use the [secret management endpoints](/api/mcp-api/secrets) instead. For Streamable HTTP OAuth, use the OAuth update endpoint rather than storing bearer tokens in `headers`.

---

### PUT `/mcp/servers/:name`

Update an existing MCP server's configuration. All fields in the request body are optional; only provided fields are updated.

```bash
curl -X PUT http://mcp:8082/mcp/servers/helper-tools \
  -H "Content-Type: application/json" \
  -d '{
    "command": "./updated/path/to/server.js",
    "args": ["--new-option"],
    "secretNames": ["API_KEY"],
    "startupTimeout": 60000,
    "enabled": false
  }'
```

**Streamable HTTP update:**

```bash
curl -X PUT http://mcp:8082/mcp/servers/remote-server \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/mcp",
    "headers": { "X-Custom-Header": "value" },
    "reconnectionOptions": {
      "maxReconnectionDelay": 30000,
      "initialReconnectionDelay": 1000,
      "reconnectionDelayGrowFactor": 1.5,
      "maxRetries": 2
    }
  }'
```

When updated, the system stops the server (if running), updates the database, and restarts with the new configuration (unless `enabled` is `false`).

---

### POST `/mcp/servers/:name/oauth`

Store OAuth tokens and client metadata for a Streamable HTTP server. Tokens are encrypted and used by the SDK for automatic refresh.

```bash
curl -X POST http://mcp:8082/mcp/servers/remote-server/oauth \
  -H "Content-Type: application/json" \
  -d '{
    "tokenType": "Bearer",
    "accessToken": "<access_token>",
    "refreshToken": "<refresh_token>",
    "expiresIn": 3600,
    "scopes": ["read", "write"],
    "clientId": "<client_id>",
    "clientSecret": "<client_secret>",
    "redirectUri": "https://missionsquad.example.com/webhooks/oauth/callback/123",
    "codeVerifier": "<pkce_verifier>"
  }'
```

All token fields are encrypted before storage. The SDK uses stored tokens for automatic refresh on 401 or expiry.

---

### DELETE `/mcp/servers/:name`

Remove an MCP server. Stops the server, removes configuration from the database, and cleans up resources.

```bash
curl -X DELETE http://mcp:8082/mcp/servers/helper-tools
```

---

### PUT `/mcp/servers/:name/enable`

Enable a previously disabled server. Updates the `enabled` flag and starts the server.

```bash
curl -X PUT http://mcp:8082/mcp/servers/helper-tools/enable
```

---

### PUT `/mcp/servers/:name/disable`

Disable a server without removing it. Updates the `enabled` flag and stops the server.

```bash
curl -X PUT http://mcp:8082/mcp/servers/helper-tools/disable
```

---

## Streamable HTTP Transport Behavior

- Streamable HTTP servers use `transportType: "streamable_http"` with `url`, optional `headers`, and optional `reconnectionOptions`
- `sessionId` is persisted after a successful connection and reused on restart
- If a request fails with HTTP 404 while a `sessionId` is present, the session ID is cleared and the client retries once without it
- If Streamable HTTP initialization fails with HTTP 400, 404, or 405, the client automatically falls back to the legacy SSE transport
- If OAuth tokens are stored for a server, the SDK supplies `Authorization` headers and any static `Authorization` header in `headers` is ignored

## OAuth2 Authentication Flows

### Streamable HTTP OAuth (MissionSquad Callback)

This flow applies to `streamable_http` servers that require OAuth 2.1. Tokens are stored in the MCP API, refreshed automatically, and never passed through tool arguments.

1. Register the MCP server with `transportType: "streamable_http"` and a valid `url`
2. In MissionSquad, create an `oauth_callback` webhook with `oauthConfig` populated (`provider`, `state`, `codeVerifier`, `redirectUri`, `scopes`, `mcpServerName`, `authorizationServer`, `tokenEndpoint`, `clientId`, optional `clientSecret`)
3. Start the OAuth authorization in your client and direct the user to the authorization URL with `redirect_uri` set to the MissionSquad webhook callback
4. MissionSquad exchanges the authorization code for tokens and calls `POST /mcp/servers/:name/oauth`
5. The MCP API stores encrypted tokens and uses the SDK `OAuthClientProvider` for automatic refresh on 401 or expiry

If refresh fails or tokens are missing, the transport throws a re-auth required error and the flow must be re-run.

### Stdio OAuth2 (Google Workspace Example)

For MCP servers that require user-specific OAuth2 authentication (e.g., Google), the API provides a secure, scalable workflow. Users grant consent once and the platform performs actions on their behalf.

**Prerequisites:**
- A Google Cloud project with required APIs enabled (e.g., Gmail, Calendar)
- OAuth consent screen configured
- OAuth 2.0 Client ID for a "Web application" with:
  - **Authorized JavaScript origins**: Your front-end URL
  - **Authorized redirect URIs**: `http://<mcp-api-host>/auth/google/callback`
- Downloaded credentials JSON

**Setup:**

1. Set `GOOGLE_OAUTH_CREDENTIALS` in the MCP API environment to the full credentials JSON (single-line string)
2. Install the MCP server with `env: { "MCP_AUTH_TYPE": "OAUTH2_GOOGLE" }`:

```bash
curl -X POST http://mcp:8082/packages/install \
  -H "Content-Type: application/json" \
  -d '{
    "name": "@missionsquad/mcp-google-workspace",
    "serverName": "mcp-google-workspace",
    "env": { "MCP_AUTH_TYPE": "OAUTH2_GOOGLE" }
  }'
```

3. Direct users to `http://<mcp-api-host>/auth/google/login?user_id=<userId>` to initiate consent
4. After consent, the API exchanges the authorization code for tokens and stores them encrypted in the secrets database
5. Subsequent tool calls for that user automatically inject credentials — the front-end never handles tokens

## See also

- [Packages](/api/mcp-api/packages) — Install and manage MCP server packages
- [Secrets](/api/mcp-api/secrets) — Encrypted secret management
- [MCP API Overview](/api/mcp-api/)
