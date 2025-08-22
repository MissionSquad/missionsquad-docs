---
title: Models
---

# Models

Model operations include discovery from configured providers, adding/removing models in your namespace, and simple listing endpoints.

## Endpoints

### GET `/v1/models`

Returns a combined list of your models and agents. Each entry:

```json
{ "id": "my-gpt4", "object": "model", "owned_by": "user" }
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
  "name": "my-gpt4",
  "description": "My GPT-4 model",
  "providerKey": "openai",
  "model": "gpt-4",
  "testResponse": true,
  "getAllApiModels": false,
  "extractEmbeddingModels": false
}
```

Notes:
- Do not include `apiKey` or `url` here; they resolve from your provider configuration.
- Embedding models: If `name` includes `"embed"` or you pass `"extractEmbeddingModels": true`, the model is stored as an embedding model.
- Requests using unsupported embedding models return `400` with a specific message (e.g., `text-embedding-3-large` is not supported).

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
