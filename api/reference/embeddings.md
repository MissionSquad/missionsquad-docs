---
title: Embeddings (POST /v1/embeddings)
---

# Embeddings

POST `/v1/embeddings`

OpenAI-compatible embeddings endpoint.

## Request

Body:

- `model` (string) — Your embedding model name (in your account).
- `input` (string | string[]).

## Response

OpenAI-compatible embedding list format.

## Example

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

## Unsupported Models

`text-embedding-3-large` is not supported due to vector dimension limits. Use `text-embedding-3-small` or another supported model instead (e.g., `nomic-embed-text-v1.5`). Requests with unsupported models will return a 400 with a clear message.

## See also

- [API Overview](/api/)
- [Chat Completions](/api/reference/chat-completions)
