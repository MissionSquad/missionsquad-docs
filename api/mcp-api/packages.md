---
title: Packages
---

# Packages

Package management endpoints for installing, upgrading, and managing MCP server packages. Supports Node.js (npm) and Python (pip) packages, as well as remote Streamable HTTP servers.

## Endpoints

### POST `/packages/install`

Install an MCP server package and register it with the system.

#### Node.js Package (Auto-Detected Entry Point)

The simplest case. The API installs the npm package and resolves the entry point from the package's `bin` or `main` field:

```bash
curl -X POST http://mcp:8082/packages/install \
  -H "Content-Type: application/json" \
  -d '{
    "name": "@missionsquad/mcp-github",
    "serverName": "github"
  }'
```

#### Node.js Package (Custom Command)

When you need to specify the command and arguments explicitly:

```bash
curl -X POST http://mcp:8082/packages/install \
  -H "Content-Type: application/json" \
  -d '{
    "name": "@modelcontextprotocol/server-filesystem",
    "serverName": "filesystem",
    "command": "node",
    "args": ["./packages/modelcontextprotocol-server-filesystem/node_modules/@modelcontextprotocol/server-filesystem/dist/index.js", "/data"],
    "env": { "NODE_ENV": "production" }
  }'
```

#### Streamable HTTP Package

For remote MCP servers accessible over HTTP:

```bash
curl -X POST http://mcp:8082/packages/install \
  -H "Content-Type: application/json" \
  -d '{
    "name": "remote-mcp-package",
    "serverName": "remote-server",
    "transportType": "streamable_http",
    "url": "https://example.com/mcp",
    "headers": { "X-Custom-Header": "value" }
  }'
```

#### Python Package (Standard `python -m` Entry)

For Python packages that support `python -m <module>`:

```bash
curl -X POST http://mcp:8082/packages/install \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-python-mcp",
    "serverName": "python-mcp",
    "runtime": "python",
    "pythonModule": "my_python_mcp"
  }'
```

The server will run as: `<venv>/bin/python -u -m my_python_mcp`

#### Python Package (Console Script Entry Point)

Some Python packages expose a console script instead of supporting `python -m`. Use the `command` field to point to the installed console script binary:

```bash
curl -X POST http://mcp:8082/packages/install \
  -H "Content-Type: application/json" \
  -d '{
    "name": "klaviyo-mcp-server",
    "version": "0.3.0",
    "serverName": "klaviyo",
    "runtime": "python",
    "pythonModule": "klaviyo_mcp_server",
    "command": "/app/packages/python/klaviyo/bin/klaviyo-mcp-server",
    "pipDependencies": ["fastmcp<3"],
    "env": {
      "PRIVATE_API_KEY": "your-api-key",
      "READ_ONLY": "false"
    }
  }'
```

Notes:
- `command` overrides the default `python -m <module>` invocation
- `pipDependencies` installs additional pip specs alongside the main package
- The venv path follows the pattern `<PYTHON_VENV_DIR>/<serverName>`

#### Request Body Fields

**Common fields:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | Yes | — | npm or pip package name |
| `version` | string | No | `"latest"` | Package version to install |
| `serverName` | string | Yes | — | Unique MCP server identifier |
| `transportType` | string | No | `"stdio"` | `"stdio"` or `"streamable_http"` |
| `command` | string | No | Auto-detected | Command to start the server |
| `args` | string[] | No | `[]` | Command-line arguments |
| `env` | object | No | `{}` | Environment variables for the server process |
| `secretName` | string | No | — | Secret name to associate with this server |
| `enabled` | boolean | No | `true` | Whether to start the server after installation |
| `failOnWarning` | boolean | No | `false` | Fail installation if npm emits warnings |

**Streamable HTTP fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | string | Yes | The MCP HTTP endpoint |
| `headers` | object | No | Static HTTP headers to send with requests |
| `sessionId` | string | No | Session ID to resume a previous session |
| `reconnectionOptions` | object | No | SSE reconnection settings |

**Python fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `runtime` | string | Yes | Must be `"python"` |
| `pythonModule` | string | Yes | Python module name (e.g. `my_mcp_server`) |
| `pythonArgs` | string[] | No | Additional arguments passed after the module name |
| `pipDependencies` | string[] | No | Additional pip specs installed alongside the main package |
| `pipIndexUrl` | string | No | Custom PyPI index URL |
| `pipExtraIndexUrl` | string | No | Additional PyPI index URL |

**Python install behavior:**

- A virtual environment is created at `packages/python/<serverName>` (or `PYTHON_VENV_DIR/<serverName>` if configured)
- Without `command`: the server runs as `<venv>/bin/python -u -m <pythonModule> [pythonArgs...]`
- With `command`: the server runs as `<command> [args...]` with the venv environment variables set
- `pipDependencies` are installed in the same `pip install` invocation as the main package
- `pipDependencies`, `pipIndexUrl`, and `pipExtraIndexUrl` are persisted and reused for upgrades

---

### GET `/packages`

List all installed packages.

```bash
curl http://mcp:8082/packages
```

Optional query parameters:

- `checkUpdates=true` — Check for available updates before returning

Response:

```json
{
  "success": true,
  "packages": [
    {
      "name": "@missionsquad/mcp-github",
      "version": "1.0.0",
      "latestVersion": "1.1.0",
      "updateAvailable": true,
      "installPath": "/app/packages/missionsquad-mcp-github",
      "status": "installed",
      "installed": "2025-03-01T12:00:00Z",
      "lastUpgraded": "2025-03-01T12:00:00Z",
      "mcpServerId": "github",
      "enabled": true
    }
  ]
}
```

---

### GET `/packages/by-name/:name`

Get a package by its npm/pip name.

```bash
curl http://mcp:8082/packages/by-name/@missionsquad/mcp-github
```

Supports the `checkUpdates=true` query parameter.

---

### GET `/packages/by-id/:name`

Get a package by its MCP server ID.

```bash
curl http://mcp:8082/packages/by-id/github
```

Supports the `checkUpdates=true` query parameter.

---

### DELETE `/packages/:name`

Uninstall a package. Removes the package files, stops the associated MCP server, and deletes the server configuration.

```bash
curl -X DELETE http://mcp:8082/packages/github
```

---

### PUT `/packages/:name/enable`

Enable a previously disabled package and start its associated MCP server.

```bash
curl -X PUT http://mcp:8082/packages/github/enable
```

---

### PUT `/packages/:name/disable`

Disable a package and stop its associated MCP server without removing it.

```bash
curl -X PUT http://mcp:8082/packages/github/disable
```

---

### GET `/packages/updates`

Check for available package updates.

```bash
curl http://mcp:8082/packages/updates
```

Optional query parameters:

- `name=server-name` — Check for updates for a specific package

Response:

```json
{
  "success": true,
  "updates": [
    {
      "serverName": "github",
      "currentVersion": "1.0.0",
      "latestVersion": "1.1.0",
      "updateAvailable": true
    }
  ]
}
```

---

### PUT `/packages/:name/upgrade`

Upgrade a package to a specific version (or latest).

```bash
curl -X PUT http://mcp:8082/packages/github/upgrade \
  -H "Content-Type: application/json" \
  -d '{ "version": "1.1.0" }'
```

The `version` field is optional; if omitted, upgrades to the latest version.

Upgrades work for both `stdio` and `streamable_http` servers. Streamable HTTP upgrades preserve `url`, `headers`, `sessionId`, and `reconnectionOptions`.

Response:

```json
{
  "success": true,
  "package": { },
  "server": { }
}
```

---

### PUT `/packages/upgrade-all`

Upgrade all installed packages to their latest versions.

```bash
curl -X PUT http://mcp:8082/packages/upgrade-all
```

Response:

```json
{
  "success": true,
  "results": [
    { "serverName": "github", "success": true },
    { "serverName": "helper-tools", "success": false, "error": "Error message" }
  ]
}
```

## See also

- [Servers & Tools](/api/mcp-api/servers) — Manage MCP servers and call tools
- [Secrets](/api/mcp-api/secrets) — Encrypted secret management
- [MCP API Overview](/api/mcp-api/)
