---
title: Models
---

# Models

Model operations include discovery from configured providers, adding/removing models in your namespace, and simple listing endpoints.

## Endpoints

### GET `/v1/models`

Returns a combined list of your models plus chat-eligible agents.

- Owned agents appear here only when they are published.
- Shared agents appear here when they are published and explicitly shared to the authenticated caller.
- Shared agents use a canonical id of `shared/<ownerUsername>/<slug>`.

Each entry:

```json
{ "id": "my-gpt4", "object": "model", "owned_by": "user" }
```

Shared agent example:

```json
{ "id": "shared/john_doe/customer-support-bot", "object": "agent", "owned_by": "john_doe" }
```

Example:

```ts
await fetch("https://agents.missionsquad.ai/v1/models", {
  headers: { "x-api-key": process.env.MSQ_API_KEY! }
});
```

### GET `/v1/modelmap`

Returns a detailed map keyed by name. Secrets are masked.

```ts
await fetch("https://agents.missionsquad.ai/v1/modelmap", {
  headers: { "x-api-key": process.env.MSQ_API_KEY! }
});
```

### POST `/v1/core/models` — Discover provider models

Body:

```ts
{
  providerKey: string,
  url?: string,     // optional override
  apiKey?: string   // optional ad-hoc; stored creds take precedence if already configured
}
```

Notes:
- If the provider is already configured for your account, stored credentials are used and any `apiKey`/`url` in the request body are ignored.

### POST `/v1/core/add/model` — Add a model in your namespace

Body:

```json
{
  "name": "my-claude",
  "description": "Claude Sonnet 4.6",
  "providerKey": "anthropic",
  "model": "claude-sonnet-4-6",
  "testResponse": true,
  "getAllApiModels": false,
  "extractEmbeddingModels": false,
  "programmaticToolCalling": true
}
```

Full body fields:

```ts
{
  name: string;
  description: string;
  providerKey: string;
  model: string;                    // the provider's model id
  testResponse?: boolean;
  getAllApiModels?: boolean;
  extractEmbeddingModels?: boolean;
  programmaticToolCalling?: boolean; // accepts boolean or "true"/"false"; see below
}
```

Notes:
- Do not include `apiKey` or `url` here; they resolve from your provider configuration.
- Embedding models: If `name` includes `"embed"` or you pass `"extractEmbeddingModels": true`, the model is stored as an embedding model.
- Requests using unsupported embedding models return `400` with a specific message (e.g., `text-embedding-3-large` is not supported).
- `programmaticToolCalling` accepts a boolean or the strings `"true"`/`"false"`; an invalid value returns `400`.

## Programmatic tool calling

Programmatic tool calling (PTC) is Anthropic's "code execution"–style tool use, where the model writes
and runs code to invoke tools instead of emitting normal tool-use blocks. In MissionSquad it is a
property of the **model configuration**, set with the `programmaticToolCalling` field on
`POST /v1/core/add/model`.

- It is **not** a chat-completions request parameter and **not** an agent-config field. An agent
  inherits PTC from its underlying model.
- When you omit `programmaticToolCalling`, it defaults based on the model: it is enabled automatically
  for Anthropic Claude **Sonnet/Opus 4.6 and newer**, and disabled for Haiku and for Claude 4.5 and
  earlier. Pass `programmaticToolCalling: false` to force it off, or `true` to force it on.
- PTC requires tools to be available to the model and is enforced/mapped downstream by the provider
  adapter; it has no effect on providers other than Anthropic.

### POST `/v1/core/delete/model` — Delete a model or embedding model

Body:

```json
{ "modelId": "my-gpt4" }
```

## See also

- [Providers](/api/reference/providers)
- [Agents](/api/reference/agents)
- [Embeddings](/api/reference/embeddings)
- [API Overview](/api/)
