---
title: MissionSquad API Overview
---

# MissionSquad API Overview

The MissionSquad API is OpenAI-compatible for Chat Completions and Embeddings while using API keys via the `x-api-key` header. All resources (models, agents, embedding models, vector stores, files) are namespaced and isolated per account.

- Base URL: set to your deployment API origin (examples use `https://agents.missionsquad.ai/v1`)
- Authentication: `x-api-key: <your-msq-api-key>`
- OpenAI SDK compatibility: `Authorization: Bearer msq-...` is accepted for API keys starting with `msq-` (see below)

## Authentication

Include your MissionSquad API key with every request.

- Required header: `x-api-key: msq-****************************`
- Content types:
  - JSON: `Content-Type: application/json`
  - Uploads: `Content-Type: multipart/form-data`

Examples:

```bash
curl -H "x-api-key: $MSQ_API_KEY" https://agents.missionsquad.ai/v1/models
```

```ts
// Node 20+ fetch
const res = await fetch("https://agents.missionsquad.ai/v1/models", {
  headers: { "x-api-key": process.env.MSQ_API_KEY! }
});
```

### OpenAI SDK (compatibility path)

When using the official `openai` package, configure `baseURL` to your MissionSquad API and pass your MissionSquad API key as the SDK's `apiKey`. The SDK will send `Authorization: Bearer msq-...`, which MissionSquad accepts for API keys that start with `msq-`.

```ts
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.MSQ_API_KEY, // Authorization: Bearer msq-...
  baseURL: "https://agents.missionsquad.ai/v1"
});

const completion = await client.chat.completions.create({
  model: "my-gpt4", // model, your own published agent name, or shared/<ownerUsername>/<slug>
  messages: [
    { role: "system", content: "You are helpful." },
    { role: "user", content: "Hello!" }
  ]
});

console.log(completion.choices[0].message);
```

## Namespacing and Isolation

- All user-defined entities are scoped to your account: models, agents, embedding models, vector stores, files.
- List/CRUD operations only access resources associated with your API key.
- Chat resolves your own models and published agents in your namespace, and can also target explicitly shared published agents via `shared/<ownerUsername>/<slug>`.

## OpenAI-Compatible Endpoints

- POST `/v1/chat/completions`
- POST `/v1/chat/cancel`
- POST `/v1/embeddings`

Core audio endpoints:
- POST `/v1/core/audio/tts`
- POST `/v1/core/audio/tts/stream`
- POST `/v1/core/audio/stt`

Works with:
- Official OpenAI SDK (JavaScript/TypeScript)
- Any OpenAI-like API client (set `baseURL` to your MissionSquad API and supply your key)

See detailed reference pages in the sidebar.

## Error Handling Conventions

- 400 — Missing/invalid parameters (e.g., missing `model`, invalid `name`, unsupported embedding model)
- 401 — Unauthorized (missing/invalid API key)
- 404 — Resource not found (model, agent, vector store, or file does not exist)
- 409 — Conflict (e.g., adding a file already associated with the vector store)
- 500 — Internal errors

Provider API keys and credentials are masked in all read APIs.

## Patterns and Tips

- Prefer `x-api-key` for direct API usage.
- For OpenAI SDK usage, provide your MissionSquad API key as `apiKey` with `baseURL` set to your API origin (Authorization: Bearer msq-... supported).
- Streaming chat uses SSE with OpenAI-like chunk payloads (`text/event-stream`). In Node 20+, use `ReadableStreamDefaultReader` via `res.body.getReader()`. In browsers, consider `EventSource` or streaming-compatible readers.
- Chat completions support structured output hints via `response_format`/`responseFormat` and provider passthrough values via `extra_params`/`extraParams`.
- Audio endpoints support TTS (binary and SSE streaming) plus STT multipart uploads.
- Unsupported embeddings: `text-embedding-3-large` is not supported. Use `text-embedding-3-small` or `nomic-embed-text-v1.5`. Requests with unsupported models will return 400 with a message.

## Endpoint Index

Core:
- GET `/v1/models`
- GET `/v1/modelmap`
- POST `/v1/chat/completions`
- POST `/v1/embeddings`
- POST `/v1/core/audio/tts`
- POST `/v1/core/audio/tts/stream`
- POST `/v1/core/audio/stt`
- GET `/v1/core/providers`
- POST `/v1/core/add/provider`
- POST `/v1/core/delete/provider`
- POST `/v1/core/models`
- POST `/v1/core/add/model`
- POST `/v1/core/delete/model`
- GET `/v1/core/agents`
- POST `/v1/core/add/agent`
- POST `/v1/core/delete/agent`
- POST `/v1/core/agents/publish`
- GET `/v1/core/agents/published`
- GET `/v1/core/agents/shared-with-me`
- POST `/v1/core/agents/:username/:slug/shares`
- GET `/v1/core/agents/:username/:slug/shares`
- DELETE `/v1/core/agents/:username/:slug/shares`
- POST `/v1/core/generate/prompt`
- POST `/v1/core/agent-workflow`
- GET `/v1/core/workflows`
- POST `/v1/core/workflows`
- PUT `/v1/core/workflows/:id`
- DELETE `/v1/core/workflows/:id`
- POST `/v1/core/workflow-runs`
- GET `/v1/core/workflows/:id/runs`
- GET `/v1/core/workflow-runs/:runId`
- GET `/v1/core/workflow-runs/:runId/hydrated`
- GET `/v1/core/workflow-runs/:runId/stream`
- POST `/v1/core/workflow-runs/:runId/cancel`
- GET `/v1/core/config`
- POST `/v1/core/scrape-url`
- GET `/v1/core/tools`
- GET `/v1/core/servers`
- GET `/v1/core/usage/raw`
- GET `/v1/core/usage/summary`
- GET `/v1/core/usage/models`
- GET `/v1/core/usage/timeseries`
- GET `/v1/core/usage/billing`
- POST `/v1/core/collections/:collectionName/search`
- GET `/v1/core/collections/:collectionName/diagnostics`
- POST `/v1/core/collections/:collectionName/recover`
- GET `/v1/core/collections`

Vector Stores & Files:
- GET `/v1/vector_stores`
- POST `/v1/vector_stores`
- GET `/v1/vector_stores/:id`
- DELETE `/v1/vector_stores/:id`
- GET `/v1/vector_stores/:id/files`
- POST `/v1/vector_stores/:id/files`
- GET `/v1/vector_stores/:id/files/:fileId`
- POST `/v1/vector_stores/cancel`
- GET `/v1/files`
- POST `/v1/files` (multipart)
- GET `/v1/files/:id`
- DELETE `/v1/files/:id`
- GET `/v1/files/:id/content`
- GET `/v1/user-collections`
- GET `/v1/vector_stores/:id/file-details`

Published/shared agent access:
- GET `/v1/public/agent/:username/:slug`
- POST `/v1/public/agent/:username/:slug/chat`
- POST `/v1/public/agent/:username/:slug/speak`
- GET `/v1/public/agent/:username/:slug/sessions`
- GET `/v1/public/agent/:username/:slug/sessions/:id`
- POST `/v1/public/agent/:username/:slug/sessions`
- PATCH `/v1/public/agent/:username/:slug/sessions/:id/title`
- DELETE `/v1/public/agent/:username/:slug/sessions/:id`

Notes:

- The `/v1/public/agent/...` routes are authenticated in the current API. They are accessible to the owner or a user/email recipient that has been explicitly shared on the agent.
- See [Agents](/api/reference/agents) for the verified request and response shapes for publishing, sharing, public invocation, and public session persistence.

## MCP API (Admin)

The MCP API is a separate, admin-only companion service deployed as a sidecar container alongside the MissionSquad API. It is not publicly exposed and is intended for instance operators.

The MissionSquad API communicates with the MCP API internally via the `TOOLS_HOST` environment variable. The MCP API manages:

- MCP server package installation and lifecycle (Node.js, Python, Streamable HTTP)
- Server registration, configuration, enable/disable
- Encrypted per-user secret storage and automatic injection into tool calls
- OAuth authentication flows for tool servers

See the full [MCP API documentation](/api/mcp-api/) for endpoint reference and deployment details.

## Orchestration & advanced features

- [Workflows](/api/reference/workflows) — saved multi-agent pipelines with data interpolation
  (<code v-pre>{{ data }}</code> templates and `<selector|#|dataKey>` helper selectors) and resumable
  streaming runs.
- [Factories](/api/reference/factories) — chain agents and workflows into sequential, payload-carrying
  pipelines that can loop and run on a schedule.
- [Video Processing](/api/reference/video) — analyze video with a vision model, or convert a demo
  recording into a workflow outline.
- [MCP Servers (Connect & OAuth)](/api/reference/mcp-servers) — connect remote MCP servers, including
  OAuth 2.0 with Dynamic Client Registration.
- [Webhooks](/api/reference/webhooks) — trigger agents/tools from external systems.

## Hosted MCP Server

The [Mission Squad MCP Server](/mcp-server/) (`https://mcp.missionsquad.ai`) exposes this entire API to
AI agents as Model Context Protocol tools — authenticate with your MissionSquad API key and call any of
its 76 `msq_*` tools.

## See also

- [Chat Completions](/api/reference/chat-completions)
- [Audio (TTS/STT)](/api/reference/audio)
- [Embeddings](/api/reference/embeddings)
- [Providers](/api/reference/providers)
- [Models](/api/reference/models)
- [Agents](/api/reference/agents)
- [Workflows](/api/reference/workflows)
- [Factories](/api/reference/factories)
- [Video Processing](/api/reference/video)
- [MCP Servers (Connect & OAuth)](/api/reference/mcp-servers)
- [Usage](/api/reference/usage)
- [Core Utilities](/api/reference/core-utilities)
- [Collections](/api/reference/collections)
- [Vector Stores](/api/reference/vector-stores)
- [Files](/api/reference/files)
- [Webhooks](/api/reference/webhooks)
- [Convenience](/api/reference/convenience)
- [Endpoint Index](/api/reference/endpoint-index)
- [Mission Squad MCP Server](/mcp-server/)
- [MCP API (Admin)](/api/mcp-api/)
