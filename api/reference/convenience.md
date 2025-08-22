---
title: Convenience Endpoints
---

# Convenience Endpoints

Helper endpoints for summarized lists and decoded file details.

## GET `/v1/user-collections`

Returns your vector stores with `files: []` (empty placeholder array). Use file listing endpoints to fetch details on demand.

```ts
const res = await fetch("https://agents.missionsquad.ai/v1/user-collections", {
  headers: { "x-api-key": process.env.MSQ_API_KEY! }
});
const data = await res.json();
console.log(data);
```

Example response:

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

---

## GET `/v1/vector_stores/:id/file-details`

Returns detailed file info for the vector store with decoded filenames and user‑relative paths.

```ts
const res = await fetch("https://agents.missionsquad.ai/v1/vector_stores/vs_123abc456def/file-details", {
  headers: { "x-api-key": process.env.MSQ_API_KEY! }
});
const data = await res.json();
console.log(data);
```

Example response:

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
```

## See also

- [Vector Stores](/api/reference/vector-stores)
- [Files](/api/reference/files)
