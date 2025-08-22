---
title: Endpoint Index
---

# Endpoint Index

A consolidated list of user-facing endpoints from the MissionSquad API User Guide with links to detailed reference pages.

## Core

- GET `/v1/models` — see [Models](/api/reference/models)
- GET `/v1/modelmap` — see [Models](/api/reference/models)
- POST `/v1/chat/completions` — see [Chat Completions](/api/reference/chat-completions)
- POST `/v1/embeddings` — see [Embeddings](/api/reference/embeddings)

### Providers

- GET `/v1/core/providers` — see [Providers](/api/reference/providers)
- POST `/v1/core/add/provider` — see [Providers](/api/reference/providers)
- POST `/v1/core/delete/provider` — see [Providers](/api/reference/providers)

### Models

- POST `/v1/core/models` — see [Models](/api/reference/models)
- POST `/v1/core/add/model` — see [Models](/api/reference/models)
- POST `/v1/core/delete/model` — see [Models](/api/reference/models)

### Agents

- GET `/v1/core/agents` — see [Agents](/api/reference/agents)
- POST `/v1/core/add/agent` — see [Agents](/api/reference/agents)
- POST `/v1/core/delete/agent` — see [Agents](/api/reference/agents)

### Core Utilities

- POST `/v1/core/generate/prompt` — see [Core Utilities](/api/reference/core-utilities)
- POST `/v1/core/agent-workflow` — see [Core Utilities](/api/reference/core-utilities)
- GET `/v1/core/config` — see [Core Utilities](/api/reference/core-utilities)
- POST `/v1/core/scrape-url` — see [Core Utilities](/api/reference/core-utilities)
- GET `/v1/core/tools` — see [Core Utilities](/api/reference/core-utilities)
- GET `/v1/core/servers` — see [Core Utilities](/api/reference/core-utilities)

### Local Collections (MissionSquad Core)

- GET `/v1/core/collections` — see [Collections](/api/reference/collections)
- POST `/v1/core/collections/:collectionName/search` — see [Collections](/api/reference/collections)
- GET `/v1/core/collections/:collectionName/diagnostics` — see [Collections](/api/reference/collections)
- POST `/v1/core/collections/:collectionName/recover` — see [Collections](/api/reference/collections)

## Vector Stores & Files

### Vector Stores

- GET `/v1/vector_stores` — see [Vector Stores](/api/reference/vector-stores)
- POST `/v1/vector_stores` — see [Vector Stores](/api/reference/vector-stores)
- GET `/v1/vector_stores/:id` — see [Vector Stores](/api/reference/vector-stores)
- DELETE `/v1/vector_stores/:id` — see [Vector Stores](/api/reference/vector-stores)
- GET `/v1/vector_stores/:id/files` — see [Vector Stores](/api/reference/vector-stores)
- POST `/v1/vector_stores/:id/files` — see [Vector Stores](/api/reference/vector-stores)
- GET `/v1/vector_stores/:id/files/:fileId` — see [Vector Stores](/api/reference/vector-stores)
- POST `/v1/vector_stores/cancel` — see [Vector Stores](/api/reference/vector-stores)

### Files

- GET `/v1/files` — see [Files](/api/reference/files)
- POST `/v1/files` (multipart) — see [Files](/api/reference/files)
- GET `/v1/files/:id` — see [Files](/api/reference/files)
- DELETE `/v1/files/:id` — see [Files](/api/reference/files)
- GET `/v1/files/:id/content` — see [Files](/api/reference/files)

### Convenience

- GET `/v1/user-collections` — see [Convenience](/api/reference/convenience)
- GET `/v1/vector_stores/:id/file-details` — see [Convenience](/api/reference/convenience)

## See also

- [API Overview](/api/)
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
