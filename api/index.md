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
  model: "my-gpt4", // model or agent name in your account namespace
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
- Chat and embeddings resolve model/agent names within your namespace.

## OpenAI-Compatible Endpoints

- POST `/v1/chat/completions`
- POST `/v1/embeddings`

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
- Unsupported embeddings: `text-embedding-3-large` is not supported. Use `text-embedding-3-small` or `nomic-embed-text-v1.5`. Requests with unsupported models will return 400 with a message.

## Endpoint Index

Core (excluding published/public chat):
- GET `/v1/models`
- GET `/v1/modelmap`
- POST `/v1/chat/completions`
- POST `/v1/embeddings`
- GET `/v1/core/providers`
- POST `/v1/core/add/provider`
- POST `/v1/core/delete/provider`
- POST `/v1/core/models`
- POST `/v1/core/add/model`
- POST `/v1/core/delete/model`
- GET `/v1/core/agents`
- POST `/v1/core/add/agent`
- POST `/v1/core/delete/agent`
- POST `/v1/core/generate/prompt`
- POST `/v1/core/agent-workflow`
- GET `/v1/core/config`
- POST `/v1/core/scrape-url`
- GET `/v1/core/tools`
- GET `/v1/core/servers`
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

## See also

- [Chat Completions](/api/reference/chat-completions)
- [Embeddings](/api/reference/embeddings)
- [Providers](/api/reference/providers)
- [Models](/api/reference/models)
- [Agents](/api/reference/agents)
- [Core Utilities](/api/reference/core-utilities)
- [Collections](/api/reference/collections)
- [Vector Stores](/api/reference/vector-stores)
- [Files](/api/reference/files)
- [Convenience](/api/reference/convenience)
- [Endpoint Index](/api/reference/endpoint-index)
