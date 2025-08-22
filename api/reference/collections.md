---
title: Local Collections (MissionSquad Core)
---

# Local Collections (MissionSquad Core)

Operate on embedded collections managed by MissionSquad Core (separate from Vector Stores). Collections are identified by `safeName` (the `:collectionName` param).

## Endpoints

### GET `/v1/core/collections`

Returns an array of `EmbeddingCollection` objects (API keys masked in objects).

```ts
await fetch("https://agents.missionsquad.ai/v1/core/collections", {
  headers: { "x-api-key": process.env.MSQ_API_KEY! }
});
```

---

### POST `/v1/core/collections/:collectionName/search`

Body:

```ts
{
  query: string,
  embeddingModelName: string,
  topK?: number
}
```

Returns:

```ts
{
  success: boolean,
  results?: Array<{
    id?: string,
    text: string,
    _distance?: number,
    metadata?: Record<string, any>,
    fileName?: string,
    path?: string,
    lines?: [number, number],
    collection?: string,
    model?: string
  }>,
  message?: string
}
```

Example:

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

Notes:
- If `embeddingModelName` is unsupported, the server returns `400` with a clear message.

---

### GET `/v1/core/collections/:collectionName/diagnostics`

Returns:

```ts
{ success: true, diagnostics, collectionName, safeName }
```

---

### POST `/v1/core/collections/:collectionName/recover`

Attempt recovery of a collection.

Body:

```ts
{
  strategy?: "auto" | "repair" | "reembed",  // defaults to "auto"
  force?: boolean                             // defaults to false
}
```

Response includes flags such as `strategyUsed`, `dataRecovered`, and `vectorCount` when applicable.

## See also

- [Vector Stores](/api/reference/vector-stores)
- [Files](/api/reference/files)
- [API Overview](/api/)
