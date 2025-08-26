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

## API parity

- Servers inventory: `GET /v1/core/servers`  
- Tools inventory: `GET /v1/core/tools`  
See [Core Utilities](/api/reference/core-utilities)

<!-- ## Screenshot placeholder

![MCP screen — Connected server and tool schemas](./images/mcp-servers-tools.png)
(Description: MCP tab with a left sidebar list of servers (each with a “Connected ✓” badge), a main panel showing a selected server’s Run Command, Description, optional Auth Token, and a right pane listing Available Tools. Each tool shows name, description, and a pretty‑printed inputSchema (JSON Schema). Include a small “Server Logs” expandable panel with recent connection output.) -->
