---
title: MCP (Tools)
---

# MCP (Tools)

Purpose: Connect tool servers that expose functions your agents can call.

## What you’ll see

- Server list (left): entries like `webtools`, `github`, `alphavantage`, `helper-tools`, `etherscan`, `rss`. Each shows status (connected ✓) and has Server Logs for quick debugging.
- Server config: Run Command, Server Description, optional Authentication Token.
- Available Tools (right): a collapsible list of tool definitions per server, each with name, description, and inputSchema (JSON Schema). Use these to craft correct tool calls in prompts.

## Workflow

1) Connect server → confirm status = connected.  
2) Inspect tool input schemas → update your agent prompt to request tool usage.  
3) In Agents, enable Use Tools and select specific functions.

## Tips

- Keep auth tokens out of prompts; store them in server config.
- Start with read‑only functions; expand to write actions (e.g., GitHub `create_issue`) once confident.
- Grant least privilege by selecting only the functions an agent truly needs.

## Connecting external (remote) MCP servers

Beyond platform‑managed servers, you can connect **external** MCP servers — remote, Streamable HTTP
servers hosted elsewhere — to your account, including ones protected by OAuth 2.0. MissionSquad runs
the whole OAuth 2.0 authorization‑code + PKCE flow for you and supports three client‑registration
strategies:

- **CIMD** (Client ID Metadata Document) — MissionSquad's served metadata URL is the `client_id`.
- **DCR** (Dynamic Client Registration) — MissionSquad registers a client with the provider
  automatically.
- **Manual** — you supply a `client_id`/`client_secret`.

The flow is: discover the server's OAuth metadata → register it → install it → start the OAuth flow
(approve in a popup) → call its tools. For API‑key servers, save per‑server secrets instead of running
OAuth. See [MCP Servers (Connect & OAuth)](/api/reference/mcp-servers) for the full API.

## Mission Squad's own MCP server

To let an AI agent drive MissionSquad itself, use the hosted
[Mission Squad MCP Server](/mcp-server/) at `https://mcp.missionsquad.ai`. It exposes the entire API
(models, agents, workflows, factories, collections, files, and more) as `msq_*` tools, authenticated
with your MissionSquad API key.

## API parity

- Servers inventory: `GET /v1/core/servers`
- Tools inventory: `GET /v1/core/tools`
- Connect external servers + OAuth: see [MCP Servers (Connect & OAuth)](/api/reference/mcp-servers)

See [Core Utilities](/api/reference/core-utilities)

## Operator / Admin API

For instance operators who manage MCP servers, packages, and secrets programmatically, see the [MCP API documentation](/api/mcp-api/). The MCP API is a separate admin-only sidecar service that provides endpoints for package installation, server lifecycle management, encrypted secret storage, and OAuth configuration.

<!-- ## Screenshot placeholder

![MCP screen — Connected server and tool schemas](./images/mcp-servers-tools.png)
(Description: MCP tab with a left sidebar list of servers (each with a “Connected ✓” badge), a main panel showing a selected server’s Run Command, Description, optional Auth Token, and a right pane listing Available Tools. Each tool shows name, description, and a pretty‑printed inputSchema (JSON Schema). Include a small “Server Logs” expandable panel with recent connection output.) -->
