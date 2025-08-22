# MissionSquad API: User Guide (API Key Authentication, OpenAI-Compatible)

This guide documents user-facing endpoints for the MissionSquad API using API keys via the `x-api-key` header. It excludes any user/admin/email/nginx/auth endpoints and excludes published agent and public agent chat endpoints.

The API is OpenAI-compatible for chat completions and embeddings and works with popular JavaScript/TypeScript OpenAI SDKs. Your agents, models, embedding models, vector stores, and files are namespaced to your account and isolated from other users.

- Base URL: Set this to your deployment&#39;s API origin. Examples below use `https://agents.missionsquad.ai/v1`.
- Authentication: Use API Key via header `x-api-key: <your-msq-api-key>`

Note on OpenAI SDKs:
- Official OpenAI SDKs set `Authorization: Bearer <key>`. MissionSquad accepts API keys that begin with `msq-` via the Authorization header for SDK compatibility. If you directly call our API, prefer `x-api-key`.

---

## Authentication

Include your MissionSquad API key with every request.

- Required header: `x-api-key: msq-****************************`
- Content types: 
  - JSON endpoints: `Content-Type: application/json`
  - Uploads: `Content-Type: multipart/form-data`

Examples:
- curl:
  ```bash
  curl -H "x-api-key: $MSQ_API_KEY" https://agents.missionsquad.ai/v1/models
  ```
- fetch (Node 20+):
  ```ts
  const res = await fetch("https://agents.missionsquad.ai/v1/models", {
    headers: { "x-api-key": process.env.MSQ_API_KEY! }
  });
  ```

OpenAI SDK (compatibility path):
- When using the official `openai` package, configure `baseURL` to point to your MissionSquad API and pass your MissionSquad API key as the SDK&#39;s `apiKey`. The SDK will send `Authorization: Bearer <key>`, which MissionSquad accepts for API keys that start with `msq-`.

```ts
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.MSQ_API_KEY,        // uses Authorization: Bearer msq-...
  baseURL: "https://agents.missionsquad.ai/v1"
});

const completion = await client.chat.completions.create({
  model: "my-gpt4",                        // model or agent name in your account namespace
  messages: [
    { role: "system", content: "You are helpful." },
    { role: "user", content: "Hello!" }
  ]
});
console.log(completion.choices[0].message);
```

---

## Namespacing and Isolation

- All user-defined entities are scoped to your account: models, agents, embedding models, vector stores, and files.
- List/CRUD operations only access your resources associated with your API key.
- Chat and embeddings resolve model/agent names within your namespace.

---

## OpenAI-Compatible Endpoints

Supported endpoints:
- POST `/v1/chat/completions` (OpenAI-compatible)
- POST `/v1/embeddings` (OpenAI-compatible)

These work with:
- Official OpenAI SDK (JavaScript/TypeScript)
- Any client that can target OpenAI-like APIs (set `baseURL` to your MissionSquad API and supply your API key)

### Chat Completions

POST `/v1/chat/completions`

Request body (essential fields):
- `model`: string. Your model name or agent name (within your account).
- `messages`: array of `{ role: "system" | "user" | "assistant" | "tool", content: string }`
- Optional OpenAI-style parameters (e.g., `temperature`, `max_tokens`, `top_p`, `n`, `stop`, `tools`, `tool_choice`, `stream`).

Notes and capabilities:
- `model` may be a user model or user agent name.
- Tool usage: Provide `tools` in the OpenAI function/tool format (type `function`, with `name`, `description`, and JSON Schema `parameters`). Your agent may invoke tools during the run.
- Streaming: Set `stream: true` for Server-Sent Events (SSE) stream. The API sends OpenAI-like delta chunks (`text/event-stream`).

Examples:
- JavaScript (fetch, non-streaming):
  ```ts
  const res = await fetch("https://agents.missionsquad.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "x-api-key": process.env.MSQ_API_KEY!,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "my-gpt4",
      messages: [
        { role: "system", content: "You are helpful." },
        { role: "user", content: "Write a haiku about summer." }
      ],
      temperature: 0.7
    })
  });
  const data = await res.json();
  console.log(data.choices[0].message.content);
  ```
- JavaScript (Node 20+, streaming via fetch and readable body):
  ```ts
  const res = await fetch("https://agents.missionsquad.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "x-api-key": process.env.MSQ_API_KEY!,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "my-gpt4",
      messages: [
        { role: "system", content: "You are helpful." },
        { role: "user", content: "Stream a short story in 2 paragraphs." }
      ],
      stream: true
    })
  });

  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);
    // Stream is SSE: lines prefixed with "data: ..."
    for (const line of chunk.split("\n")) {
      if (line.startsWith("data: ")) {
        const payload = line.slice(6).trim();
        if (payload === "[DONE]") break;
        try {
          const event = JSON.parse(payload);
          // event is OpenAI-like chat.completion.chunk
          // consume event.choices[0].delta?.content, etc.
        } catch {}
      }
    }
  }
  ```
- OpenAI SDK (non-streaming):
  ```ts
  import OpenAI from "openai";
  const client = new OpenAI({ apiKey: process.env.MSQ_API_KEY, baseURL: "https://agents.missionsquad.ai/v1" });

  const completion = await client.chat.completions.create({
    model: "my-gpt4-or-agent-name",
    messages: [
      { role: "user", content: "Summarize this in 3 bullet points: ..." }
    ],
    // tools: [{ type: "function", function: { name, description, parameters: { type: "object", properties: {}, required: [] } } }]
  });
  console.log(completion.choices[0].message);
  ```

Optional headers:
- `x-client-id`: arbitrary client identifier for event correlation.
- `x-session-id`: provide to correlate tool-call events and streaming usage metrics within a session.

### Embeddings

POST `/v1/embeddings`

Request body:
- `model`: string. Your embedding model name (in your account).
- `input`: string or string[].

Response:
- OpenAI-compatible embedding list format.

Example:
```ts
const res = await fetch("https://agents.missionsquad.ai/v1/embeddings", {
  method: "POST",
  headers: {
    "x-api-key": process.env.MSQ_API_KEY!,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    model: "nomic-embed-text-v1.5",           // must be an embedding model you added
    input: ["First sentence", "Second sentence"]
  })
});
const data = await res.json();
console.log(data.data[0].embedding.length);
```

Unsupported embedding model:
- `text-embedding-3-large` is not supported due to vector dimension limits. Use `text-embedding-3-small` or another supported model instead. Requests with unsupported models will return a 400 with a message.

---

## Models & Agents Listing

- GET `/v1/models`
  - Returns a combined list of your models and agents. Each entry: `{ id, object: "model" | "agent", owned_by: "user" }`.
- GET `/v1/modelmap`
  - Returns a detailed map keyed by name. Secrets are masked.

Examples:
```ts
await fetch("https://agents.missionsquad.ai/v1/models", {
  headers: { "x-api-key": process.env.MSQ_API_KEY! }
});
await fetch("https://agents.missionsquad.ai/v1/modelmap", {
  headers: { "x-api-key": process.env.MSQ_API_KEY! }
});
```

---

## Provider Management

Endpoints let you store provider API keys/URLs once, then reference the provider by `providerKey` when adding models.

- GET `/v1/core/providers`
  - Returns your configured providers with masked `apiKey`.
- POST `/v1/core/add/provider`
  - Body: `{ providerKey: string; apiKey?: string; url?: string }`
  - For built-ins (`openai`, `anthropic`, `google`, `groq`), omit `url` (unless overriding).
- POST `/v1/core/delete/provider`
  - Body: `{ providerKey: string }`

Examples:
```ts
// Add OpenAI provider (keys masked in subsequent reads)
await fetch("https://agents.missionsquad.ai/v1/core/add/provider", {
  method: "POST",
  headers: { "x-api-key": process.env.MSQ_API_KEY!, "Content-Type": "application/json" },
  body: JSON.stringify({ providerKey: "openai", apiKey: process.env.OPENAI_KEY })
});

// List providers
await fetch("https://agents.missionsquad.ai/v1/core/providers", {
  headers: { "x-api-key": process.env.MSQ_API_KEY! }
});
```

---

## Model Management

- POST `/v1/core/models` — Discover provider models
  - Body: `{ providerKey: string, url?: string, apiKey?: string }`
  - If the provider is already configured for your account, stored creds are used and `apiKey`/`url` in body are ignored.
- POST `/v1/core/add/model` — Add a model in your namespace
  - Body: 
    ```json
    {
      "name": "my-gpt4",
      "description": "My GPT-4 model",
      "providerKey": "openai",
      "model": "gpt-4",
      "testResponse": true,
      "getAllApiModels": false,
      "extractEmbeddingModels": false
    }
    ```
  - Do not include `apiKey` or `url` here; they are resolved from your provider configuration.
  - Embedding models: If `name` includes `"embed"` or you pass `"extractEmbeddingModels": true`, it is stored as an embedding model.
  - Requests using unsupported embedding models will 400 with a specific message.
- POST `/v1/core/delete/model` — Delete a model or embedding model by its name
  - Body: `{ "modelId": "my-gpt4" }`

---

## Agent Management

- GET `/v1/core/agents`
  - Returns your agent configurations (map keyed by agent name).
- POST `/v1/core/add/agent`
  - Body includes `name`, `description`, `systemPrompt`, and `model` (the model name to link).
  - Optional fields supported by the server include:
    - `overwrite?: boolean`
    - `addToday?: boolean` — if true and your first message is `system`, the current date is injected.
    - `timezoneOffset?: string` — for date formatting, defaults `-0500` if not provided.
    - `selectedFunctions?: { [serverName: string]: string[] }` — to preselect MCP functions, if applicable.
- POST `/v1/core/delete/agent`
  - Body: `{ "name": "my-agent" }`

Example:
```ts
await fetch("https://agents.missionsquad.ai/v1/core/add/agent", {
  method: "POST",
  headers: { "x-api-key": process.env.MSQ_API_KEY!, "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "my-custom-agent",
    description: "Specialized helper",
    systemPrompt: "You are helpful.",
    model: "my-gpt4",
    overwrite: false,
    addToday: true,
    timezoneOffset: "-0500"
  })
});
```

---

## Core Utilities

- POST `/v1/core/generate/prompt`
  - Generate a prompt with a model based on messages and metadata.
  - Body: `{ model, messages, name?, description?, type?: "agent" | "workflow", modelOptions? }`
- GET `/v1/core/config`
  - Returns your core config: models, agents, embedding models, and embedded collections. Secrets masked.
- POST `/v1/core/scrape-url`
  - Body: `{ url: string }` — server scrapes text content and returns it.
- GET `/v1/core/tools`
  - Returns available tool definitions (e.g., for agents to call during chats).
- GET `/v1/core/servers`
  - Returns available MCP server names/inventory for tooling (if applicable).
- POST `/v1/core/agent-workflow`
  - Execute a workflow by agent name.
  - Body: `{ agentName, messages, data?, delimiter?, concurrency?, failureMessage?, failureInstruction? }`

---

## Local Collections (MissionSquadCore embedded collections)

These endpoints operate on embedded collections managed by MissionSquad Core (separate from the Vector Stores endpoints documented later). Collections are identified by `safeName` (the `:collectionName` param).

- GET `/v1/core/collections`
  - Returns an array of `EmbeddingCollection` objects. API keys in those objects are masked.
- POST `/v1/core/collections/:collectionName/search`
  - Body: `{ query: string, embeddingModelName: string, topK?: number }`
  - Returns `{ success: boolean, results?: Array<{ id?, text, _distance?, metadata?, fileName?, path?, lines?, collection?, model? }>, message? }`
  - If the `embeddingModelName` is unsupported, returns 400 with a clear message.
- GET `/v1/core/collections/:collectionName/diagnostics`
  - Returns `{ success: true, diagnostics, collectionName, safeName }` — health and metadata for the underlying Vector DB.
- POST `/v1/core/collections/:collectionName/recover`
  - Body: `{ strategy?: "auto" | "repair" | "reembed", force?: boolean }` (defaults `auto`, `force: false`)
  - Attempts recovery of a collection; may re-embed all files if necessary.
  - Response includes flags such as `strategyUsed`, `dataRecovered`, and `vectorCount` when applicable.

Example (search):
```ts
await fetch("https://agents.missionsquad.ai/v1/core/collections/my-docs/search", {
  method: "POST",
  headers: { "x-api-key": process.env.MSQ_API_KEY!, "Content-Type": "application/json" },
  body: JSON.stringify({
    query: "vector database",
    embeddingModelName: "nomic-embed-text-v1.5",
    topK: 5
  })
});
```

---

## Vector Stores API

Vector stores let you create named collections of embedded files with configurable chunking strategies.

### Endpoints

- GET `/v1/vector_stores`
  - Returns `{ object: "list", data: VectorStore[] }`.
- POST `/v1/vector_stores`
  - Create a new vector store (if not existing), optionally enqueue files to embed.
  - Body supports:
    ```ts
    {
      name: string,
      file_ids?: string[],
      chunking_strategy?: { type: "auto" } | { type: "static", static: { max_chunk_size_tokens: number, chunk_overlap_tokens: number } },
      metadata?: Record<string, any>,
      embeddingModelName?: string,     // Optional embedding model to use when embedding files into this store
      enhancePDF?: boolean,            // Optional PDF preprocessing flag
      sseSessionId?: string,           // Optional; if provided, you can cancel via /v1/vector_stores/cancel
      batchSize?: number               // Optional; per-batch concurrency (server may have global limits)
    }
    ```
  - Response: the VectorStore object (bytes/file_counts will update as files process).
  - If `file_ids` provided, files are processed asynchronously in batches; counts update as embedding completes.
  - If `embeddingModelName` is unsupported, the request returns 400 with an error message.
- GET `/v1/vector_stores/:id`
  - Return details for a vector store you own.
- DELETE `/v1/vector_stores/:id`
  - Deletes the vector store, its core collection, associated file records, and attempts to remove on-disk files.
- GET `/v1/vector_stores/:id/files`
  - Lists files associated with the vector store.
- POST `/v1/vector_stores/:id/files`
  - Add an existing uploaded file to the vector store and embed it.
  - Body:
    ```ts
    {
      file_id: string,
      chunking_strategy?: { ... },   // optional per-file override
      enhancePDF?: boolean           // optional, defaults to the vector store setting if omitted
    }
    ```
  - 409 if file already in the store.
- GET `/v1/vector_stores/:id/files/:fileId`
  - Returns the association record for a specific file in the store.
- POST `/v1/vector_stores/cancel`
  - Body: `{ sessionId: string }`
  - Cancels an in-progress embedding session that was started with `sseSessionId`.

### Example: Create store and add files

```ts
// 1) Upload files via /v1/files (see Files API)
// 2) Create a store with those file_ids
await fetch("https://agents.missionsquad.ai/v1/vector_stores", {
  method: "POST",
  headers: { "x-api-key": process.env.MSQ_API_KEY!, "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "Research Papers",
    file_ids: ["file_abc123", "file_def456"],
    chunking_strategy: {
      type: "static",
      static: { max_chunk_size_tokens: 1024, chunk_overlap_tokens: 128 }
    },
    embeddingModelName: "nomic-embed-text-v1.5",
    enhancePDF: true,
    sseSessionId: "embed-session-1"
  })
});

// Optionally cancel the session
await fetch("https://agents.missionsquad.ai/v1/vector_stores/cancel", {
  method: "POST",
  headers: { "x-api-key": process.env.MSQ_API_KEY!, "Content-Type": "application/json" },
  body: JSON.stringify({ sessionId: "embed-session-1" })
});
```

---

## Files API

Manage files you can attach to vector stores. Filenames are stored Base64-encoded but responses return decoded names.

- GET `/v1/files`
  - Returns `{ object: "list", data: File[] }`.
- POST `/v1/files` (multipart/form-data)
  - Fields:
    - `file`: binary (required)
    - `purpose`: string (required), e.g. `"vector_store"`
    - `relativePath`: string (optional) — for grouping/preserving relative paths
    - `collectionName`: string (optional) — convenience tag
  - Returns: `FileUpload` with fields `{ id, object, bytes, created_at, filename, purpose }`.
- GET `/v1/files/:id`
  - Return file metadata.
- DELETE `/v1/files/:id`
  - Deletes your file and its vector-store associations.
- GET `/v1/files/:id/content`
  - Returns the raw file content with appropriate `Content-Type` where determinable.

Upload example (axios):
```ts
import axios from "axios";
import FormData from "form-data";
import fs from "node:fs";

const form = new FormData();
form.append("file", fs.createReadStream("./docs/paper.pdf"));
form.append("purpose", "vector_store");
// optional:
form.append("relativePath", "docs/");
form.append("collectionName", "Research Papers");

const res = await axios.post("https://agents.missionsquad.ai/v1/files", form, {
  headers: { "x-api-key": process.env.MSQ_API_KEY!, ...form.getHeaders() }
});
console.log(res.data.id);
```

---

## Convenience Endpoints

- GET `/v1/user-collections`
  - Returns your vector stores with `files: []` (empty placeholder array). Use file listing endpoints to fetch details on demand.
- GET `/v1/vector_stores/:id/file-details`
  - Returns detailed file info for the vector store with decoded filenames and user-relative paths.

---

## Error Handling Conventions

- 400: Missing/invalid parameters (e.g., missing `model`, invalid `name`, unsupported embedding model).
- 401: Unauthorized (missing/invalid API key).
- 404: Resource not found (nonexistent model, agent, vector store, or file).
- 409: Conflict (e.g., adding a file already associated with the vector store).
- 500: Internal errors.

Messages may include additional context when available. Provider API keys and credentials are masked in all read APIs.

---

## Patterns and Tips

- Prefer `x-api-key` header for direct API usage. For OpenAI SDK usage, providing your MissionSquad API key as `apiKey` with `baseURL` set to your API origin is supported (Authorization: Bearer msq-...).
- Namespacing: When you add providers/models/agents, they become available only under your account. `GET /v1/models` and `GET /v1/modelmap` reflect just your namespace.
- Adding models:
  - Configure a provider once with `/v1/core/add/provider`.
  - Discover options with `/v1/core/models`.
  - Add a model with `/v1/core/add/model` by user-friendly name, then use this name in chat/agents.
- Agents can be targeted from chat completions by their `name` (e.g., `model: "my-custom-agent"`).
- Streaming chat uses SSE with OpenAI-like chunk payloads. For browser usage, consider `EventSource` polyfills or streaming-compatible fetch readers.
- Unsupported embeddings: `text-embedding-3-large` is rejected; choose a supported alternative like `text-embedding-3-small` or `nomic-embed-text-v1.5`.

---

## Additional Endpoint Examples

Below are concrete request/response examples for endpoints that did not include examples above.

### Generate Prompt (POST /v1/core/generate/prompt)

Request:
```ts
const res = await fetch("https://agents.missionsquad.ai/v1/core/generate/prompt", {
  method: "POST",
  headers: { "x-api-key": process.env.MSQ_API_KEY!, "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "my-gpt4",
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: "Create a prompt for an agent that summarizes PDFs." }
    ],
    name: "pdf-summarizer",
    description: "Prompt to instruct summarization of PDFs",
    type: "agent"
  })
});
const data = await res.json();
console.log(data);
```

Response:
```json
{
  "data": "You are a PDF summarization assistant. Your goal is to read PDF content and produce concise summaries..."
}
```

### Agent Workflow (POST /v1/core/agent-workflow)

Request:
```ts
const res = await fetch("https://agents.missionsquad.ai/v1/core/agent-workflow", {
  method: "POST",
  headers: { "x-api-key": process.env.MSQ_API_KEY!, "Content-Type": "application/json" },
  body: JSON.stringify({
    agentName: "my-custom-agent",
    messages: [{ role: "user", content: "What is the capital of France?" }],
    data: { context: "Geography Q&A" }
  })
});
const data = await res.json();
console.log(data);
```

Response (example where workflow returns a chat completion):
```json
{
  "success": true,
  "data": {
    "id": "chatcmpl-abc123",
    "object": "chat.completion",
    "created": 1710000000,
    "model": "my-gpt4",
    "choices": [
      {
        "message": { "role": "assistant", "content": "Paris." },
        "finish_reason": "stop",
        "index": 0
      }
    ],
    "usage": {
      "prompt_tokens": 10,
      "completion_tokens": 2,
      "total_tokens": 12
    }
  }
}
```

### Scrape URL (POST /v1/core/scrape-url)

Request:
```ts
const res = await fetch("https://agents.missionsquad.ai/v1/core/scrape-url", {
  method: "POST",
  headers: { "x-api-key": process.env.MSQ_API_KEY!, "Content-Type": "application/json" },
  body: JSON.stringify({ url: "https://example.com" })
});
const data = await res.json();
console.log(data);
```

Response:
```json
{
  "success": true,
  "data": "This domain is for use in illustrative examples in documents..."
}
```

### List Tools (GET /v1/core/tools)

Request:
```ts
const res = await fetch("https://agents.missionsquad.ai/v1/core/tools", {
  headers: { "x-api-key": process.env.MSQ_API_KEY! }
});
const data = await res.json();
console.log(data);
```

Response (tools grouped by MCP server; each tool exposes an inputSchema):
```json
{
  "success": true,
  "tools": [
    {
      "weather-server": [
        {
          "name": "weather",
          "description": "Get weather information.",
          "inputSchema": {
            "type": "object",
            "properties": { "location": { "type": "string" } }
          }
        }
      ]
    },
    {
      "calculator-server": [
        {
          "name": "calculator",
          "description": "Evaluate a math expression.",
          "inputSchema": {
            "type": "object",
            "properties": { "expression": { "type": "string" } }
          }
        }
      ]
    }
  ]
}
```

### List Servers (GET /v1/core/servers)

Request:
```ts
const res = await fetch("https://agents.missionsquad.ai/v1/core/servers", {
  headers: { "x-api-key": process.env.MSQ_API_KEY! }
});
const data = await res.json();
console.log(data);
```

Response:
```json
{
  "success": true,
  "servers": [
    {
      "name": "weather-server",
      "command": "node",
      "args": ["server.js"],
      "env": { "NODE_ENV": "production" },
      "status": "connected",
      "enabled": true
    },
    {
      "name": "calculator-server",
      "command": "python",
      "args": ["calc.py"],
      "env": {},
      "status": "disconnected",
      "enabled": false
    }
  ]
}
```

### User Collections (GET /v1/user-collections)

Request:
```ts
const res = await fetch("https://agents.missionsquad.ai/v1/user-collections", {
  headers: { "x-api-key": process.env.MSQ_API_KEY! }
});
const data = await res.json();
console.log(data);
```

Response:
```json
{
  "data": [
    {
      "id": "vs_123abc456def",
      "object": "vector_store",
      "created_at": 1681612345678,
      "name": "Research Papers",
      "bytes": 1024000,
      "file_counts": {
        "in_progress": 0,
        "completed": 5,
        "failed": 0,
        "cancelled": 0,
        "total": 5
      },
      "files": []
    }
  ]
}
```

### Vector Store File Details (GET /v1/vector_stores/:id/file-details)

Request:
```ts
const res = await fetch("https://agents.missionsquad.ai/v1/vector_stores/vs_123abc456def/file-details", {
  headers: { "x-api-key": process.env.MSQ_API_KEY! }
});
const data = await res.json();
console.log(data);
```

Response:
```json
{
  "success": true,
  "vectorStoreId": "vs_123abc456def",
  "files": [
    {
      "id": "file_abc123",
      "bytes": 512000,
      "created_at": 1681612345678,
      "filename": "research_paper_1.pdf",
      "path": "docs/research_paper_1.pdf"
    },
    {
      "id": "file_def456",
      "bytes": 256000,
      "created_at": 1681612345679,
      "filename": "research_paper_2.pdf",
      "path": "docs/research_paper_2.pdf"
    }
  ]
}

---

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
