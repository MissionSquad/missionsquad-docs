---
title: Mission Squad MCP Server
---

# Mission Squad MCP Server

The Mission Squad MCP server (`@missionsquad/mcp-msq`) exposes the MissionSquad API to AI agents as
[Model Context Protocol](https://modelcontextprotocol.io) tools. With it, an agent can manage
providers, models, agents, workflows, factories, schedules, collections, vector stores, and files —
and run chat completions and embeddings — using a single MissionSquad API key.

- **Hosted endpoint:** `https://mcp.missionsquad.ai` — use the remote server without installing
  anything.
- **Local:** run it over stdio with `npx -y @missionsquad/mcp-msq`.
- **Auth:** your MissionSquad API key (`msq-...`). The server forwards it to the API as the
  `x-api-key` header.
- **Tools:** 76 tools, all prefixed `msq_`, returning pretty-printed JSON.

Every tool call ultimately hits the MissionSquad REST API documented in the
[API reference](/api/) — the MCP server is a thin, typed wrapper, so the request/response shapes match
the corresponding REST endpoints.

## Connecting

### Hosted (remote)

Point your MCP client at `https://mcp.missionsquad.ai` and authenticate with your MissionSquad API
key. The server resolves the key from a per-call **hidden argument** named `apiKey` — a FastMCP feature
where arguments not declared in a tool's schema are passed through to the server but never shown to the
model. In practice you supply `apiKey` alongside each `tools/call` request; clients that support
hidden/passthrough arguments inject it for you. You can also pass an optional `baseUrl` hidden argument
to target a self-hosted MissionSquad API.

```jsonc
// A tools/call request carries the hidden apiKey (and optional baseUrl) in `arguments`.
// These keys are not part of any tool's published schema, so the model never sees them.
{
  "method": "tools/call",
  "params": {
    "name": "msq_list_models",
    "arguments": {
      "apiKey": "msq-************************",
      "baseUrl": "https://agents.missionsquad.ai/v1"   // optional
    }
  }
}
```

> The hosted server is in active rollout. If `https://mcp.missionsquad.ai` is not yet reachable for
> your account, use the local stdio install below — it is functionally identical.

### Local (stdio)

Run the published package directly. It speaks the MCP **stdio** transport, which every MCP client
supports.

```jsonc
{
  "mcpServers": {
    "mission-squad": {
      "command": "npx",
      "args": ["-y", "@missionsquad/mcp-msq"],
      "env": {
        "MSQ_API_KEY": "msq-************************",
        "MSQ_BASE_URL": "https://agents.missionsquad.ai/v1"
      }
    }
  }
}
```

### Configuration

| Setting | Where | Purpose |
| --- | --- | --- |
| API key | env `MSQ_API_KEY`, or hidden arg `apiKey` | Authenticates to the MissionSquad API (sent as `x-api-key`). The hidden arg takes precedence over the env var. Required. |
| Base URL | env `MSQ_BASE_URL`, or hidden arg `baseUrl` | Upstream MissionSquad API base (default `https://agents.missionsquad.ai/v1`). Must end in `/v1`. |
| `MSQ_HTTP_TIMEOUT_MS` | env | Per-request timeout for non-streaming calls (default 120000). |
| `MSQ_DEFAULT_FILE_CONTENT_MAX_BYTES` | env | Default cap on bytes returned by `msq_get_file_content` (default 1048576). |
| `LOG_LEVEL` | env | `debug` / `info` / `warn` / `error` (logs go to stderr). |

If no API key resolves, every tool fails with: *"MissionSquad API key is required. Provide hidden
argument 'apiKey' or set MSQ_API_KEY."*

## Tool reference

All tools are prefixed `msq_`. Tools marked **(no params)** take only the hidden `apiKey`/`baseUrl`.
Parameters below are the declared input schema; see the linked REST page for full response shapes.

### Models & providers

| Tool | Params | REST |
| --- | --- | --- |
| `msq_list_models` | (no params) | [GET /v1/models](/api/reference/models) |
| `msq_get_model_map` | (no params) | GET /v1/modelmap |
| `msq_list_providers` | (no params) | [GET /v1/core/providers](/api/reference/providers) |
| `msq_add_provider` | `providerKey`, `apiKey?`, `url?` | POST /v1/core/add/provider |
| `msq_delete_provider` | `providerKey` | POST /v1/core/delete/provider |
| `msq_discover_provider_models` | `providerKey`, `url?`, `apiKey?` | POST /v1/core/models |
| `msq_add_model` | `name`, `description`, `providerKey`, `model`, `testResponse?`, `getAllApiModels?`, `extractEmbeddingModels?` | [POST /v1/core/add/model](/api/reference/models) |
| `msq_delete_model` | `modelId` | POST /v1/core/delete/model |

> Note: in `msq_add_provider`/`msq_discover_provider_models`, the `apiKey` **parameter** is the
> *provider's* key sent in the request body — distinct from the hidden `apiKey` used to authenticate
> to MissionSquad.

### Chat & embeddings

| Tool | Params | REST |
| --- | --- | --- |
| `msq_chat_completions` | `model`, `messages[]`, `temperature?`, `max_tokens?`, `top_p?`, `n?`, `stop?`, `tools?`, `tool_choice?`, `stream?`, `xClientId?`, `xSessionId?` (+ passthrough) | [POST /v1/chat/completions](/api/reference/chat-completions) |
| `msq_embeddings` | `model`, `input` (string or string[]) | [POST /v1/embeddings](/api/reference/embeddings) |

`msq_chat_completions` always streams upstream and reassembles the full response; `xClientId`/
`xSessionId` are sent as the `x-client-id`/`x-session-id` headers.

### Agents

| Tool | Params | REST |
| --- | --- | --- |
| `msq_list_agents` | (no params) | [GET /v1/core/agents](/api/reference/agents) |
| `msq_add_agent` | `name`, `description`, `systemPrompt?` or `systemPromptId?`, `model`, `overwrite?`, `addToday?`, `timezoneOffset?`, `tools?`, `selectedFunctions?`, `modelOptions?` | POST /v1/core/add/agent |
| `msq_update_agent` | `name`, `description?`, `systemPrompt?`/`systemPromptId?`, `model?`, `addToday?`, `timezoneOffset?`, `tools?`, `selectedFunctions?`, `modelOptions?`, `combineSystemPrompts?`, `convertSystemPrompt?` | PUT /v1/core/update/agent |
| `msq_delete_agent` | `name` | POST /v1/core/delete/agent |
| `msq_publish_agent` | `agentId`, `agentName` | POST /v1/core/agents/publish |
| `msq_generate_prompt` | `model`, `messages[]`, `name?`, `description?`, `type?`, `modelOptions?` | POST /v1/core/generate/prompt |

`msq_add_agent` exactly one of `systemPrompt` or `systemPromptId` is required; for long prompts call
`msq_generate_prompt` first and pass the returned `systemPromptId`. `msq_add_agent` also auto-publishes
the agent.

### Workflows

| Tool | Params | REST |
| --- | --- | --- |
| `msq_list_workflows` | (no params) | [GET /v1/core/workflows](/api/reference/workflows) |
| `msq_get_workflow` | `id` | GET /v1/core/workflows (filtered) |
| `msq_create_workflow` | `id?`, `name?`, `mainAgentRef?`, `mainAgentId?`, `mainPrompt?`, `dataPayload?`, `concurrency?`, `delimiter?`, `failureMessage?`, `failureInstruction?` | POST /v1/core/workflows |
| `msq_update_workflow` | `id` + workflow fields | PUT /v1/core/workflows/:id |
| `msq_run_workflow` | `workflowId`, `dataPayload?` | POST /v1/core/workflow-runs |
| `msq_get_workflow_run_status` | `runId` | GET /v1/core/workflow-runs/:runId |
| `msq_get_workflow_result` | `runId` | GET /v1/core/workflow-runs/:runId/hydrated |

### Factories

| Tool | Params | REST |
| --- | --- | --- |
| `msq_list_factories` | (no params) | [GET /v1/core/factories](/api/reference/factories) |
| `msq_get_factory` | `id` | GET /v1/core/factories/:id |
| `msq_create_factory` | `id?`, `name`, `description?`, `steps[]`, `continuous?`, `limitTotalInvocations?`, `maxTotalInvocations?` | POST /v1/core/factories |
| `msq_update_factory` | `id` + factory fields (partial) | PUT /v1/core/factories/:id |
| `msq_delete_factory` | `id` | DELETE /v1/core/factories/:id |
| `msq_list_factory_runs` | `factoryId`, `limit?`, `offset?` | GET /v1/core/factories/:id/runs |
| `msq_run_factory` | `factoryConfigId`, `initialCarryPayload?` | POST /v1/core/factory-runs |
| `msq_get_factory_run_status` | `runId` | GET /v1/core/factory-runs/:runId |
| `msq_get_factory_result` | `runId` | GET /v1/core/factory-runs/:runId |
| `msq_list_factory_run_steps` | `runId`, `limit?`, `offset?` | GET /v1/core/factory-runs/:runId/steps |
| `msq_get_factory_run_step` | `runId`, `stepRunId` | GET …/steps/:stepRunId |
| `msq_get_factory_run_step_hydrated` | `runId`, `stepRunId` | GET …/steps/:stepRunId/hydrated |
| `msq_pause_factory_run` | `runId` | POST …/pause |
| `msq_resume_factory_run` | `runId` | POST …/resume |
| `msq_cancel_factory_run` | `runId` | POST …/cancel |

### Factory schedules

| Tool | Params |
| --- | --- |
| `msq_list_factory_schedules` | (no params) |
| `msq_create_factory_schedule` | `factoryConfigId`, `timesToRun[]`, `label?`, `startDate?`, `repeatInterval?`, `daysOfWeek?`, `dayOfMonth?`, `status?`, `initialCarryPayload?` |
| `msq_update_factory_schedule` | `id` + schedule fields (partial) |
| `msq_delete_factory_schedule` | `id` |
| `msq_toggle_factory_schedule` | `id` |

### Config, tools & servers

| Tool | Params | REST |
| --- | --- | --- |
| `msq_get_core_config` | (no params) | [GET /v1/core/config](/api/reference/core-utilities) |
| `msq_get_core_config_summary` | (no params) | GET /v1/core/config (summarized + redacted) |
| `msq_scrape_url` | `url` | POST /v1/core/scrape-url |
| `msq_list_tools` | (no params) | GET /v1/core/tools |
| `msq_list_tool_functions` | (no params) | GET /v1/core/tools (summarized) |
| `msq_list_servers` | (no params) | GET /v1/core/servers |
| `msq_list_server_tools` | `serverName` | GET /v1/mcp/servers/:name/tools |
| `msq_get_user_settings` | (no params) | GET /v1/core/user/settings |

### Local collections

| Tool | Params |
| --- | --- |
| `msq_list_core_collections` | (no params) |
| `msq_search_core_collection` | `collectionName`, `query`, `embeddingModelName`, `topK?` |
| `msq_get_core_collection_diagnostics` | `collectionName` |
| `msq_recover_core_collection` | `collectionName`, `strategy?`, `force?` |

### Vector stores & files

| Tool | Params | REST |
| --- | --- | --- |
| `msq_list_vector_stores` | (no params) | [GET /v1/vector_stores](/api/reference/vector-stores) |
| `msq_create_vector_store` | `name`, `file_ids?`, `chunking_strategy?`, `metadata?`, `embeddingModelName?`, `enhancePDF?`, `sseSessionId?`, `batchSize?` | POST /v1/vector_stores |
| `msq_get_vector_store` | `vectorStoreId` | GET /v1/vector_stores/:id |
| `msq_delete_vector_store` | `vectorStoreId` | DELETE /v1/vector_stores/:id |
| `msq_list_vector_store_files` | `vectorStoreId` | GET /v1/vector_stores/:id/files |
| `msq_add_vector_store_file` | `vectorStoreId`, `file_id`, `chunking_strategy?`, `enhancePDF?` | POST /v1/vector_stores/:id/files |
| `msq_get_vector_store_file` | `vectorStoreId`, `fileId` | GET …/files/:fileId |
| `msq_get_vector_store_file_details` | `vectorStoreId` | GET …/file-details |
| `msq_cancel_vector_store_session` | `sessionId` | POST /v1/vector_stores/cancel |
| `msq_list_files` | (no params) | [GET /v1/files](/api/reference/files) |
| `msq_upload_file` | `filePath`, `purpose`, `relativePath?`, `collectionName?`, `filename?` | POST /v1/files (multipart) |
| `msq_get_file` | `fileId` | GET /v1/files/:id |
| `msq_delete_file` | `fileId` | DELETE /v1/files/:id |
| `msq_get_file_content` | `fileId`, `maxBytes?` | GET /v1/files/:id/content |
| `msq_list_user_collections` | (no params) | GET /v1/user-collections |

> `msq_upload_file` reads `filePath` from the **server's** local filesystem. On the hosted server you
> cannot reference your own local files through this tool; upload via the
> [Files API](/api/reference/files) and reference the resulting `fileId` instead.

### Scheduled runs

| Tool | Params |
| --- | --- |
| `msq_list_scheduled_runs` | (no params) |
| `msq_create_scheduled_run` | `agentName`, `prompt`, `startDate`, `timesToRun[]`, `repeatInterval`, `daysOfWeek?`, `dayOfMonth?`, `status?`, `sendEmail?`, `deliveryMethod?`, `slackWebhookUrl?`, `slackMetadata?` |
| `msq_update_scheduled_run` | `id` + scheduled-run fields (partial) |
| `msq_delete_scheduled_run` | `id` |
| `msq_toggle_scheduled_run` | `id` |
| `msq_get_scheduled_run_results` | `id` |

## Flagship tool schemas (verbatim)

`msq_create_workflow`:

```ts
{
  id?: string                  // generated when omitted
  name?: string                // default "Untitled Workflow"
  mainAgentRef?: string | null // "agent/<agentId>" or "shared/<ownerUsername>/<slug>"; null clears
  mainAgentId?: string | null  // legacy; translated to "agent/<id>"
  mainPrompt?: string          // contains {{data}} templates and <selector|#|dataKey> helpers
  dataPayload?: string         // JSON string; must be valid JSON if provided
  concurrency?: number         // max concurrent helper executions
  delimiter?: string           // default "|#|"
  failureMessage?: string
  failureInstruction?: string
}
```

`msq_run_factory`:

```ts
{
  factoryConfigId: string
  initialCarryPayload?: string  // defaults to "" on the backend
}
```

## See also

- [API Overview](/api/)
- [Agents](/api/reference/agents) · [Workflows](/api/reference/workflows) · [Factories](/api/reference/factories)
- [MCP Servers (Connect & OAuth)](/api/reference/mcp-servers) — connect *third-party* MCP servers
- [Endpoint Index](/api/reference/endpoint-index)
