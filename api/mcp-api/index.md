---
title: MCP API Overview
---

# MCP API Overview

The MCP API is an admin-only companion service deployed as a sidecar container alongside the [MissionSquad API](/api/). It exposes Model Context Protocol (MCP) servers via a unified HTTP API with encrypted multi-user secret management, package lifecycle operations, and OAuth authentication flows.

**Audience:** Instance operators and administrators. The MCP API is not intended for end-user consumption. End users interact with MCP tools through the [MissionSquad API](/api/) (via chat completions with tool use) or the [Platform UI](/platform/mcp).

## Architecture

The MCP API acts as a secure proxy between the MissionSquad API and MCP servers:

1. **MissionSquad API** communicates with MCP API internally via the `TOOLS_HOST` environment variable (e.g., `http://mcp:8082`)
2. **MCP API** manages server lifecycle, retrieves and decrypts user-specific secrets, and forwards tool calls to MCP servers
3. **MCP Servers** execute tools (e.g., GitHub operations, web search, file system access) and return results

```
MissionSquad API  ──TOOLS_HOST──►  MCP API  ──stdio/http──►  MCP Servers
  (external)                     (internal)                 (github, webtools, ...)
```

Key design properties:

- **Multi-user support**: Multiple users access the same MCP server instances with isolated credentials
- **Encryption at rest**: All secrets stored with AES-256-GCM encryption in MongoDB
- **Transport abstraction**: Supports both `stdio` and `streamable_http` MCP server transports
- **Package management**: Install, upgrade, enable/disable MCP server packages (Node.js and Python)

## Deployment

The MCP API is deployed as a private service alongside the MissionSquad API. It should **not** be publicly exposed unless explicitly required. In all hosting configurations:

- **Docker Compose**: Service `mcp` on port 8082 (see [Hosting — Docker & Compose](/hosting/))
- **AWS ECS**: Private Fargate task behind an internal load balancer (see [Hosting — AWS](/hosting/aws/))
- **Google Cloud Run**: Private Cloud Run service with internal-only ingress (see [Hosting — GCP](/hosting/gcp/))

Docker image: `ghcr.io/missionsquad/mcp-api:<version>`

Volumes:
- `./packages:/app/packages` — Persistent storage for installed MCP server packages

See the [Hosting guide](/hosting/) for the full Docker Compose configuration.

## Authentication

The MCP API does not use API key authentication. Access is gated by network-level controls (private networking, internal load balancers). Only the MissionSquad API and authorized administrators should have network access to the MCP API.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | HTTP server port (typically set to `8082` in deployments) |
| `DEBUG` | `false` | Enable debug logging |
| `MONGO_USER` | `root` | MongoDB username |
| `MONGO_PASS` | `example` | MongoDB password |
| `MONGO_HOST` | `localhost:27017` | MongoDB host and port |
| `MONGO_DBNAME` | `squad-test` | MongoDB database name for MCP server records and packages |
| `MONGO_REPLICASET` | — | MongoDB replica set name (optional) |
| `PAYLOAD_LIMIT` | `6mb` | Maximum request body size |
| `SECRETS_KEY` | `secret` | AES-256-GCM encryption key. **Must be changed in production.** Generate with `openssl rand -hex 32` |
| `SECRETS_DBNAME` | `secrets` | MongoDB database name for encrypted secrets |
| `INSTALL_ON_START` | `@missionsquad/mcp-github\|github,@missionsquad/mcp-helper-tools\|helper-tools` | Packages to auto-install on first run |
| `SEARXNG_URL` | — | SearXNG instance URL for the built-in web search tool |
| `PYTHON_BIN` | Auto-detect | Path to Python executable. Falls back to `python3` then `python` |
| `PYTHON_VENV_DIR` | `packages/python` | Base directory for Python virtual environments |
| `PIP_INDEX_URL` | — | Custom PyPI index URL for pip |
| `PIP_EXTRA_INDEX_URL` | — | Additional PyPI index URL for pip |
| `GOOGLE_OAUTH_CREDENTIALS` | — | Full Google OAuth credentials JSON (single-line) for the Stdio OAuth2 flow |

## Health Check

```
GET /healthz
```

Returns `{ "status": "ok" }` when the server is running. Use this for container orchestration health probes (Docker `healthcheck`, ECS health checks, Cloud Run startup probes).

## Auto-Install on First Run

The `INSTALL_ON_START` environment variable configures packages to install automatically on the first application start. The format is a comma-separated list of `package|serverName` pairs:

```
INSTALL_ON_START=@missionsquad/mcp-github|github,@missionsquad/mcp-helper-tools|helper-tools
```

Behavior:
- Only runs once (tracked via the `appState` MongoDB collection)
- Skips packages that were previously installed and then uninstalled by the user
- Each entry installs the package and registers it as an MCP server with the given name

## Built-in Servers

MCP API ships with built-in servers that run in-process (no child process spawned). Built-in servers are always connected, cannot be deleted or disabled by users, and appear alongside dynamically registered servers in API responses.

### Web Tools (SearXNG)

**Server name:** `webtools`

| Tool | Description |
|------|-------------|
| `web_search` | Search the web via a SearXNG instance |
| `get_url_content` | Fetch a URL and convert the page content to markdown |

Requires the `SEARXNG_URL` environment variable. If not configured, `web_search` is unavailable.

## API Reference

- [Packages](/api/mcp-api/packages) — Install, upgrade, enable/disable MCP server packages
- [Servers & Tools](/api/mcp-api/servers) — Manage MCP servers, list and call tools, OAuth flows
- [Secrets](/api/mcp-api/secrets) — Encrypted secret storage and security model
