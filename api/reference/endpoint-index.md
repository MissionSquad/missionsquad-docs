---
title: Endpoint Index
---

# Endpoint Index

A consolidated list of user-facing endpoints from the MissionSquad API User Guide with links to detailed reference pages.

## Core

- GET `/v1/models` — see [Models](/api/reference/models)
- GET `/v1/modelmap` — see [Models](/api/reference/models)
- POST `/v1/chat/completions` — see [Chat Completions](/api/reference/chat-completions)
- POST `/v1/chat/cancel` — see [Chat Completions](/api/reference/chat-completions)
- POST `/v1/embeddings` — see [Embeddings](/api/reference/embeddings)

### Providers

- GET `/v1/core/providers` — see [Providers](/api/reference/providers)
- POST `/v1/core/add/provider` — see [Providers](/api/reference/providers)
- POST `/v1/core/delete/provider` — see [Providers](/api/reference/providers)

### Models

- POST `/v1/core/models` — see [Models](/api/reference/models)
- POST `/v1/core/add/model` — see [Models](/api/reference/models)
- POST `/v1/core/delete/model` — see [Models](/api/reference/models)

### Agents

- GET `/v1/core/agents` — see [Agents](/api/reference/agents)
- POST `/v1/core/add/agent` — see [Agents](/api/reference/agents)
- POST `/v1/core/delete/agent` — see [Agents](/api/reference/agents)
- POST `/v1/core/agents/publish` — see [Agents](/api/reference/agents)
- GET `/v1/core/agents/published` — see [Agents](/api/reference/agents)
- GET `/v1/core/agents/shared-with-me` — see [Agents](/api/reference/agents)
- POST `/v1/core/agents/:username/:slug/shares` — see [Agents](/api/reference/agents)
- GET `/v1/core/agents/:username/:slug/shares` — see [Agents](/api/reference/agents)
- DELETE `/v1/core/agents/:username/:slug/shares` — see [Agents](/api/reference/agents)
- GET `/v1/public/agent/:username/:slug` — see [Agents](/api/reference/agents)
- POST `/v1/public/agent/:username/:slug/chat` — see [Agents](/api/reference/agents)
- POST `/v1/public/agent/:username/:slug/speak` — see [Agents](/api/reference/agents)
- GET `/v1/public/agent/:username/:slug/sessions` — see [Agents](/api/reference/agents)
- GET `/v1/public/agent/:username/:slug/sessions/:id` — see [Agents](/api/reference/agents)
- POST `/v1/public/agent/:username/:slug/sessions` — see [Agents](/api/reference/agents)
- PATCH `/v1/public/agent/:username/:slug/sessions/:id/title` — see [Agents](/api/reference/agents)
- DELETE `/v1/public/agent/:username/:slug/sessions/:id` — see [Agents](/api/reference/agents)

### Core Utilities

- POST `/v1/core/generate/prompt` — see [Core Utilities](/api/reference/core-utilities)
- POST `/v1/core/agent-workflow` — see [Core Utilities](/api/reference/core-utilities)
- GET `/v1/core/workflows` — see [Core Utilities](/api/reference/core-utilities)
- POST `/v1/core/workflows` — see [Core Utilities](/api/reference/core-utilities)
- PUT `/v1/core/workflows/:id` — see [Core Utilities](/api/reference/core-utilities)
- DELETE `/v1/core/workflows/:id` — see [Core Utilities](/api/reference/core-utilities)
- POST `/v1/core/workflow-runs` — see [Core Utilities](/api/reference/core-utilities)
- GET `/v1/core/workflows/:id/runs` — see [Core Utilities](/api/reference/core-utilities)
- GET `/v1/core/workflow-runs/:runId` — see [Core Utilities](/api/reference/core-utilities)
- GET `/v1/core/workflow-runs/:runId/hydrated` — see [Core Utilities](/api/reference/core-utilities)
- GET `/v1/core/workflow-runs/:runId/stream` — see [Core Utilities](/api/reference/core-utilities)
- POST `/v1/core/workflow-runs/:runId/cancel` — see [Core Utilities](/api/reference/core-utilities)
- GET `/v1/core/config` — see [Core Utilities](/api/reference/core-utilities)
- POST `/v1/core/scrape-url` — see [Core Utilities](/api/reference/core-utilities)
- GET `/v1/core/tools` — see [Core Utilities](/api/reference/core-utilities)
- GET `/v1/core/servers` — see [Core Utilities](/api/reference/core-utilities)

### Usage

- GET `/v1/core/usage/raw` — see [Usage](/api/reference/usage)
- GET `/v1/core/usage/summary` — see [Usage](/api/reference/usage)
- GET `/v1/core/usage/models` — see [Usage](/api/reference/usage)
- GET `/v1/core/usage/timeseries` — see [Usage](/api/reference/usage)
- GET `/v1/core/usage/billing` — see [Usage](/api/reference/usage)

### Audio and Voice

- POST `/v1/core/audio/tts` — see [Audio (TTS/STT)](/api/reference/audio)
- POST `/v1/core/audio/tts/stream` — see [Audio (TTS/STT)](/api/reference/audio)
- POST `/v1/core/audio/stt` — see [Audio (TTS/STT)](/api/reference/audio)

### Local Collections (MissionSquad Core)

- GET `/v1/core/collections` — see [Collections](/api/reference/collections)
- POST `/v1/core/collections/:collectionName/search` — see [Collections](/api/reference/collections)
- GET `/v1/core/collections/:collectionName/diagnostics` — see [Collections](/api/reference/collections)
- POST `/v1/core/collections/:collectionName/recover` — see [Collections](/api/reference/collections)

## Vector Stores & Files

### Vector Stores

- GET `/v1/vector_stores` — see [Vector Stores](/api/reference/vector-stores)
- POST `/v1/vector_stores` — see [Vector Stores](/api/reference/vector-stores)
- GET `/v1/vector_stores/:id` — see [Vector Stores](/api/reference/vector-stores)
- DELETE `/v1/vector_stores/:id` — see [Vector Stores](/api/reference/vector-stores)
- GET `/v1/vector_stores/:id/files` — see [Vector Stores](/api/reference/vector-stores)
- POST `/v1/vector_stores/:id/files` — see [Vector Stores](/api/reference/vector-stores)
- GET `/v1/vector_stores/:id/files/:fileId` — see [Vector Stores](/api/reference/vector-stores)
- POST `/v1/vector_stores/cancel` — see [Vector Stores](/api/reference/vector-stores)

### Files

- GET `/v1/files` — see [Files](/api/reference/files)
- POST `/v1/files` (multipart) — see [Files](/api/reference/files)
- GET `/v1/files/:id` — see [Files](/api/reference/files)
- DELETE `/v1/files/:id` — see [Files](/api/reference/files)
- GET `/v1/files/:id/content` — see [Files](/api/reference/files)

### Convenience

- GET `/v1/user-collections` — see [Convenience](/api/reference/convenience)
- GET `/v1/vector_stores/:id/file-details` — see [Convenience](/api/reference/convenience)

## MCP API (Admin)

The [MCP API](/api/mcp-api/) is a separate, admin-only sidecar service. These endpoints are served by the MCP API, not the MissionSquad API.

### Packages

- POST `/packages/install` — see [Packages](/api/mcp-api/packages)
- GET `/packages` — see [Packages](/api/mcp-api/packages)
- GET `/packages/by-name/:name` — see [Packages](/api/mcp-api/packages)
- GET `/packages/by-id/:name` — see [Packages](/api/mcp-api/packages)
- DELETE `/packages/:name` — see [Packages](/api/mcp-api/packages)
- PUT `/packages/:name/enable` — see [Packages](/api/mcp-api/packages)
- PUT `/packages/:name/disable` — see [Packages](/api/mcp-api/packages)
- GET `/packages/updates` — see [Packages](/api/mcp-api/packages)
- PUT `/packages/:name/upgrade` — see [Packages](/api/mcp-api/packages)
- PUT `/packages/upgrade-all` — see [Packages](/api/mcp-api/packages)

### Servers & Tools

- GET `/mcp/tools` — see [Servers & Tools](/api/mcp-api/servers)
- POST `/mcp/tool/call` — see [Servers & Tools](/api/mcp-api/servers)
- GET `/mcp/servers` — see [Servers & Tools](/api/mcp-api/servers)
- GET `/mcp/servers/:name` — see [Servers & Tools](/api/mcp-api/servers)
- POST `/mcp/servers` — see [Servers & Tools](/api/mcp-api/servers)
- PUT `/mcp/servers/:name` — see [Servers & Tools](/api/mcp-api/servers)
- POST `/mcp/servers/:name/oauth` — see [Servers & Tools](/api/mcp-api/servers)
- DELETE `/mcp/servers/:name` — see [Servers & Tools](/api/mcp-api/servers)
- PUT `/mcp/servers/:name/enable` — see [Servers & Tools](/api/mcp-api/servers)
- PUT `/mcp/servers/:name/disable` — see [Servers & Tools](/api/mcp-api/servers)

### Secrets

- POST `/secrets/set` — see [Secrets](/api/mcp-api/secrets)
- POST `/secrets/delete` — see [Secrets](/api/mcp-api/secrets)

### Health

- GET `/healthz` — see [MCP API Overview](/api/mcp-api/)

## See also

- [API Overview](/api/)
- [Chat Completions](/api/reference/chat-completions)
- [Audio (TTS/STT)](/api/reference/audio)
- [Embeddings](/api/reference/embeddings)
- [Providers](/api/reference/providers)
- [Models](/api/reference/models)
- [Agents](/api/reference/agents)
- [Usage](/api/reference/usage)
- [Core Utilities](/api/reference/core-utilities)
- [Collections](/api/reference/collections)
- [Vector Stores](/api/reference/vector-stores)
- [Files](/api/reference/files)
- [Convenience](/api/reference/convenience)
- [MCP API (Admin)](/api/mcp-api/)
