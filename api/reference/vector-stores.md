---
title: Vector Stores
---

# Vector Stores

Vector stores let you create named collections of embedded files with configurable chunking strategies. Files are uploaded via the Files API and then associated with a vector store for embedding and search.

## Endpoints

### GET `/v1/vector_stores`

Returns a list of your vector stores.

```ts
await fetch("https://agents.missionsquad.ai/v1/vector_stores", {
  headers: { "x-api-key": process.env.MSQ_API_KEY! }
});
```

---

### POST `/v1/vector_stores`

Create a new vector store (if not existing), optionally enqueue files to embed.

Body:

```ts
{
  name: string,
  file_ids?: string[],
  chunking_strategy?: { type: "auto" } | {
    type: "static",
    static: { max_chunk_size_tokens: number, chunk_overlap_tokens: number }
  },
  metadata?: Record<string, any>,
  embeddingModelName?: string,     // Optional embedding model to use when embedding files into this store
  enhancePDF?: boolean,            // Optional PDF preprocessing flag
  sseSessionId?: string,           // Optional; if provided, you can cancel via /v1/vector_stores/cancel
  batchSize?: number               // Optional; per-batch concurrency (server may have global limits)
}
```

Response: the VectorStore object (bytes/file_counts update as processing completes). If `embeddingModelName` is unsupported, the request returns `400` with an error message.

Example (Create store and add files):

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
```

---

### GET `/v1/vector_stores/:id`

Return details for a vector store you own.

---

### DELETE `/v1/vector_stores/:id`

Deletes the vector store, its core collection, associated file records, and attempts to remove on‑disk files.

---

### GET `/v1/vector_stores/:id/files`

Lists files associated with the vector store.

---

### POST `/v1/vector_stores/:id/files`

Add an existing uploaded file to the vector store and embed it.

Body:

```ts
{
  file_id: string,
  chunking_strategy?: {
    type: "auto"
  } | {
    type: "static",
    static: { max_chunk_size_tokens: number, chunk_overlap_tokens: number }
  },
  enhancePDF?: boolean           // optional, defaults to the vector store setting if omitted
}
```

Notes:
- Returns `409` if file is already in the store.

---

### GET `/v1/vector_stores/:id/files/:fileId`

Returns the association record for a specific file in the store.

---

### POST `/v1/vector_stores/cancel`

Cancel an in‑progress embedding session that was started with `sseSessionId`.

Body:

```ts
{ sessionId: string }
```

Example:

```ts
await fetch("https://agents.missionsquad.ai/v1/vector_stores/cancel", {
  method: "POST",
  headers: { "x-api-key": process.env.MSQ_API_KEY!, "Content-Type": "application/json" },
  body: JSON.stringify({ sessionId: "embed-session-1" })
});
```

## See also

- [Files](/api/reference/files)
- [Collections](/api/reference/collections)
- [API Overview](/api/)
