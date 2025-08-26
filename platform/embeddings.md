---
title: Embeddings (Vector Stores & Files)
---

# Embeddings (Vector Stores & Files)

Purpose: Build private knowledge bases and attach them to agents for retrieval‑augmented generation (RAG).

## Typical flow

1) Upload files → PDF, Markdown, text, code, etc.  
2) Create a Vector Store → choose a name and optionally a chunking strategy and embedding model.  
3) Add files to the store → embedding runs asynchronously; monitor counts.  
4) Attach the collection to your agent via Use Embeddings (RAG) in the Agents tab.  
5) Test in Prompt Studio and verify that the agent cites injected snippets.

## API parity

Files:
- `GET /v1/files`  
- `POST /v1/files` (multipart)  
- `GET /v1/files/:id`  
- `DELETE /v1/files/:id`  
- `GET /v1/files/:id/content`  
See [Files](/api/reference/files)

Vector Stores:
- `GET /v1/vector_stores`  
- `POST /v1/vector_stores`  
- `GET /v1/vector_stores/:id`  
- `DELETE /v1/vector_stores/:id`  
- `GET /v1/vector_stores/:id/files`  
- `POST /v1/vector_stores/:id/files`  
- `GET /v1/vector_stores/:id/files/:fileId`  
- `POST /v1/vector_stores/cancel`  
See [Vector Stores](/api/reference/vector-stores)

Convenience:
- `GET /v1/user-collections`  
- `GET /v1/vector_stores/:id/file-details`  
See [Convenience](/api/reference/convenience)

Diagnostics & Recovery (Mission Squad Core collections):
- `GET /v1/core/collections`  
- `POST /v1/core/collections/:collectionName/search`  
- `GET /v1/core/collections/:collectionName/diagnostics`  
- `POST /v1/core/collections/:collectionName/recover`  
See [Collections](/api/reference/collections)

## Tips

- Keep files small and focused when possible for higher‑quality retrieval.  
- Use consistent chunking strategy across similar document types.  
- Re‑run diagnostics if retrieval quality drops after large data changes.

<!-- ## Screenshot placeholders

![Embeddings — Vector Store list](./images/embeddings-store-list.png)
(Description: Embeddings tab with a list of Vector Stores, each showing name, item counts, last updated, and a status badge.)

![Embeddings — Vector Store with files and status](./images/embeddings-vector-store.png)
(Description: Vector Store detail showing files table (embedded/pending/failed), item counts, a “Cancel embedding” action, and a sidebar with Store Name, Chunking Strategy, and Embedding Model. Include an “Attach to Agent” hint that links back to Agents.) -->
