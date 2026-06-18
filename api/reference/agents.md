---
title: Agents
---

# Agents

Create, publish, share, and invoke named agents.

- Management endpoints under `/v1/core/...` operate on agents in the authenticated user's account.
- Routes under `/v1/public/agent/:username/:slug...` are still authenticated in the current API. Access is limited to the owner or an explicitly shared recipient.
- Shared agents can also be invoked through `POST /v1/chat/completions` by passing `model: "shared/<ownerUsername>/<slug>"`.

## Endpoints

### GET `/v1/core/agents`

Returns your agent configurations (map keyed by agent name).

```ts
await fetch("https://agents.missionsquad.ai/v1/core/agents", {
  headers: { "x-api-key": process.env.MSQ_API_KEY! }
});
```

Response shape:

```ts
{
  data: {
    [agentName: string]: {
      type: "user-agent";
      config: Record<string, unknown>;
    };
  };
}
```

### POST `/v1/core/add/agent`

Create or update an agent.

Body (required + optional fields supported by the server). The body is `Omit<NewAgentConfig, "modelId">`
plus the override fields below; `model` is the model **name** (resolved to a model id server-side):

```ts
{
  name: string;                     // required
  description: string;              // required
  systemPrompt: string;             // required (or supply systemPromptId)
  systemPromptId?: string;          // a promptId from POST /v1/core/generate/prompt; resolved to systemPrompt
  model: string;                    // required; name of a model you've added (or its id)
  overwrite?: boolean;
  previousName?: string;            // if renaming, migrates references in workflows
  icon?: string;
  addToday?: boolean;               // if true and first message is `system`, current date is injected
  timezoneOffset?: string;          // for date formatting; defaults to "-0500" if not provided
  tools?: string[];                 // MCP function names; resolved to selectedFunctions automatically
  selectedFunctions?: {             // or preselect MCP functions per server explicitly
    [serverName: string]: string[];
  };
  modelOptions?: { temperature?: number; maxTokens?: number };
  embeddingOptions?: { model: string; collections: string[]; type: string }; // RAG
  voice?: {                         // attach a saved voice for /speak
    savedVoiceName: string;
    responseFormat?: "mp3" | "opus" | "aac" | "flac" | "wav" | "pcm";
    speed?: number;
    ttsOptions?: Record<string, unknown>;
  };
  responseProcessorAgent?: string;
}
```

Status codes: `200` `{ status: "success", message, data }`; `400` for missing required fields or an
expired `systemPromptId`; `404` when `model` cannot be resolved; `409` when the agent already exists
and `overwrite` is not set.

> Programmatic tool calling for Claude is configured on the **model**, not the agent — see
> [Models](/api/reference/models#programmatic-tool-calling). An agent inherits it from its model.

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

### POST `/v1/core/delete/agent`

Delete an agent by name.

Body:

```json
{ "name": "my-agent" }
```

```ts
await fetch("https://agents.missionsquad.ai/v1/core/delete/agent", {
  method: "POST",
  headers: { "x-api-key": process.env.MSQ_API_KEY!, "Content-Type": "application/json" },
  body: JSON.stringify({ name: "my-agent" })
});
```

### PUT `/v1/core/update/agent`

Update an existing agent by name. Omitted fields keep their current values. The protected utility
agents `title-agent` and `msq-config-agent` cannot be modified (`403`).

Body:

```ts
{
  name: string;                     // required; identifies the agent
  description?: string;
  icon?: string;
  systemPrompt?: string;
  systemPromptId?: string;
  model?: string;                   // model name; defaults to the existing model when omitted
  addToday?: boolean;
  timezoneOffset?: string;
  tools?: string[];
  selectedFunctions?: { [serverName: string]: string[] };
  modelOptions?: { temperature?: number; maxTokens?: number };
  temperature?: number;             // deprecated; use modelOptions.temperature
  maxTokens?: number;               // deprecated; use modelOptions.maxTokens
  combineSystemPrompts?: boolean;
  convertSystemPrompt?: boolean;
}
```

Status codes: `200` `{ status: "success", message, data }`; `400` missing `name` / expired
`systemPromptId`; `403` protected utility agent; `404` agent or model not found.

### POST `/v1/core/agent/speak`

Run an owned agent and stream text deltas plus synthesized audio (TTS) as SSE. The agent must have a
saved `voice` configured.

Request body:

```ts
{
  name: string;                     // agent name
  messages: Array<{ role: "system" | "user" | "assistant" | "tool"; content: string | null; /* ... */ }>;
  processorAgentName?: string;      // optional response-processor agent
  ttsOverrides?: {
    responseFormat?: "mp3" | "opus" | "aac" | "flac" | "wav" | "pcm"; // default "opus"
    speed?: number;
    ttsOptions?: Record<string, unknown>;
  };
}
```

Streaming response (`Content-Type: text/event-stream`):

- `data: {"type":"status","stage":"generating","time":<ms>}` (initial + 10s keepalive)
- `data: {"type":"text_delta","content":"..."}`
- `data: {"type":"message_stop"}`
- `data: {"type":"audio_chunk","b64":"..."}`
- `data: {"type":"audio_stop"}`
- `data: {"type":"error","message":"..."}`
- `data: [DONE]`

Pre-stream errors: `400` (missing `name`/`messages`), `404` (agent not found).

### POST `/v1/core/agents/publish`

Toggle an owned agent's published state. Publishing creates or updates a stable public slug derived from `agentName`.

Request body:

```ts
{
  agentId: string;
  agentName: string;
}
```

Response body:

```ts
{
  success: true;
  data: {
    userId: string;
    username: string;
    agentId: string;
    agentName: string;
    slug: string;
    isPublished: boolean;
    publishedAt: number;
    updatedAt: number;
  };
}
```

Important error cases:

- `403` if the account does not have agent publishing enabled.
- `404` if the agent does not exist in the caller's account.
- `409` if a conflicting publish record already exists.
- `429` with `error: "LIMIT_EXCEEDED"` when the account has reached `maxPublishedAgents`.

### GET `/v1/core/agents/published`

List publish records for the authenticated user.

Response body:

```ts
{
  success: true;
  data: Array<{
    userId: string;
    username: string;
    agentId: string;
    agentName: string;
    slug: string;
    isPublished: boolean;
    publishedAt: number;
    updatedAt: number;
  }>;
}
```

### GET `/v1/core/agents/shared-with-me`

List agents that were explicitly shared with the authenticated user by username or email.

Response body:

```ts
{
  success: true;
  data: Array<{
    agentId: string;
    agentName: string;
    icon?: string;
    slug: string;
    description: string;
    isPublished: boolean;
    publishedAt: number;
    ownerUsername: string;
    sharedAt: number;
    sharedVia: "username" | "email";
    hasVoice: boolean;
    editable: boolean;     // true when the owner shared this agent with edit access
    modelName: string;     // friendly display name of the agent's model
    toolsCount: number;    // number of MCP functions/tools the agent uses
  }>;
}
```

`editable: true` means you may edit a curated subset of the agent's config via the shared-agent config
endpoints below.

To invoke one of these via `POST /v1/chat/completions`, construct the shared model id as:

```ts
const model = `shared/${ownerUsername}/${slug}`;
```

### POST `/v1/core/agents/:username/:slug/shares`

Create or refresh a share record for a published agent. `:username` must match the authenticated owner.
Re-issuing this call for the same recipient updates the `editable` flag (there is no separate
"make editable" endpoint).

Request body:

```ts
{
  recipient: string;   // username or email
  editable?: boolean;  // when strictly true, the recipient may edit a curated subset of fields
}
```

Response body:

```ts
{
  success: true;
}
```

Important error cases:

- `403` if the caller is not the owner named in `:username`.
- `404` if the published agent does not exist or the username recipient does not exist.

### GET `/v1/core/agents/:username/:slug/shares`

List the normalized recipient entries for a published agent. `:username` must match the authenticated owner.

Response body:

```ts
{
  success: true;
  data: Array<{
    recipientType: "username" | "email";
    recipient: string; // normalized lowercase username or email
    createdAt: number;
    editable: boolean;
  }>;
}
```

### DELETE `/v1/core/agents/:username/:slug/shares`

Revoke a share for a published agent. `:username` must match the authenticated owner.

Request body:

```ts
{
  recipientType: "username" | "email";
  recipient: string;
}
```

Response body:

```ts
{
  success: boolean;
}
```

## Editing a shared agent (collaborative editing)

When an owner shares an agent with `editable: true`, the recipient may edit a curated subset of the
agent's configuration. Edits are written to the **owner's** agent config. All four endpoints below are
gated by `enforceSharedAgentEditAccess`: access is allowed for the owner, or for a recipient who holds
an editable share. Unauthenticated callers get `401` (`code: "AUTH_REQUIRED"`); non-editable callers
get `403` (`code: "OWNER_OR_SHARED_EDIT_ONLY"`).

### GET `/v1/core/agents/:username/:slug/config`

Fetch the owner's full agent config for editing.

Response body:

```ts
{
  success: true;
  data: AgentConfig;   // the owner's full agent configuration
  modelName: string;   // friendly model display name
}
```

### PUT `/v1/core/agents/:username/:slug/config`

Update the shared agent's config. The **model is never changed** here (it stays the owner's model), and
non-owners cannot send `name`, `model`, `modelId`, `responseProcessorAgent`, `temperature`, or
`maxTokens` (those return `400` `code: "FIELD_NOT_EDITABLE"`). Referenced tools, embedding collections,
and voices must belong to the owner (validated against the owner-resource endpoints below; mismatches
return `400` `code: "INVALID_OWNER_RESOURCE"`).

Request body (all optional):

```ts
{
  description?: string;
  icon?: string | null;
  systemPrompt?: string;
  systemPromptId?: string;
  modelOptions?: { temperature?: number; maxTokens?: number };
  addToday?: boolean;
  timezoneOffset?: string;
  combineSystemPrompts?: boolean;
  convertSystemPrompt?: boolean;
  toolOptions?: {
    systemTools?: string[];
    userTools?: string[];
    selectedFunctions?: { [serverName: string]: string[] };
  };
  embeddingOptions?: { model: string; collections: string[]; type: string };
  voice?: {
    savedVoiceName?: string | null;
    responseFormat?: "mp3" | "opus" | "aac" | "flac" | "wav" | "pcm";
    speed?: number;
    ttsOptions?: Record<string, unknown>;
  } | null;
}
```

Response body: `{ status: "success", message: string, data: AgentConfig }`.

### GET `/v1/core/agents/:username/:slug/owner-tools`

List the owner's MCP servers and tools so an editor can pick valid `toolOptions`. Returns a
credential-free projection:

```ts
{
  success: true;
  servers: Array<{ name: string; displayName: string; description: string; enabled: boolean; installed: boolean; source: string }>;
  tools: unknown; // the owner's tools, grouped by server
}
```

### GET `/v1/core/agents/:username/:slug/owner-embeddings`

List the owner's vector stores and embedding models for picking valid `embeddingOptions`:

```ts
{
  success: true;
  vectorStores: Array<{ name: string; safeName: string; embeddingModel: string }>;
  embeddingModels: Array<{ id: string; name: string; modelName: string; providerKey: string }>;
}
```

### GET `/v1/core/agents/:username/:slug/owner-voices`

List the owner's saved voices for picking a valid `voice.savedVoiceName`:

```ts
{
  success: true;
  voices: Array<{ id: string; name: string; providerKey: string; responseFormat: string; speed: number }>;
}
```

### GET `/v1/public/agent/:username/:slug`

Fetch the public-safe metadata for a published or shared agent. The caller must be the owner or an explicitly shared viewer.

Response body:

```ts
{
  success: true;
  data: {
    name: string;
    description?: string;
    hasVoice: boolean;
    settings: {
      titleAgentName: string | null;
    };
  };
}
```

Important error cases:

- `401` with `code: "AUTH_REQUIRED"` when the request is unauthenticated.
- `403` with `code: "OWNER_OR_SHARED_ONLY"` when the caller does not have access.
- `404` when the published agent or backing agent configuration does not exist.

### POST `/v1/public/agent/:username/:slug/chat`

Chat with a published/shared agent using the owner's model, tool, and agent configuration.

Request body:

```ts
{
  messages: Array<{
    role: "system" | "user" | "assistant" | "tool";
    content: string | null;
    name?: string;
    tool_calls?: Array<{
      id?: string;
      type: string;
      function: {
        name: string;
        arguments: string;
      };
    }>;
    tool_call_id?: string;
    providerState?: Record<string, unknown>;
    rawContentBlocks?: unknown[];
  }>;
  stream?: boolean;
  sessionId?: string;
  chatId?: string;
  requestTimeoutMs?: number; // integer, 1-1800000
  maxRetries?: number; // integer, 0-10
}
```

Non-stream response:

```ts
// JSON completion payload returned by the agent execution path.
// In MissionSquad API deployments this is the same completion object family
// used by the rest of the chat API.
Record<string, unknown>
```

Streaming response:

- `Content-Type: text/event-stream`
- Response header `X-Run-Id: <runId>`
- `data: {"object":"chat.completion.chunk",...}` OpenAI-style content chunks
- `data: {"type":"status","stage":"generating","time":<unix-ms>}` keepalive/status events before first content and during idle periods
- `data: {"object":"chat.completion.context","messages":[...],"providerState":...}` final persisted-context event
- `data: {"object":"chat.completion.chunk","usage":{...}}` final usage chunk when token data is available
- `data: [DONE]`

### POST `/v1/public/agent/:username/:slug/speak`

Run the agent and receive text plus synthesized audio as SSE.

Request body:

```ts
{
  messages: Array<{
    role: "system" | "user" | "assistant" | "tool";
    content: string | null;
    name?: string;
    tool_calls?: Array<{
      id?: string;
      type: string;
      function: {
        name: string;
        arguments: string;
      };
    }>;
    tool_call_id?: string;
    providerState?: Record<string, unknown>;
    rawContentBlocks?: unknown[];
  }>;
  chatId?: string;
  processorAgentName?: string;
  sessionId?: string;
  ttsOverrides?: {
    responseFormat?: "mp3" | "opus" | "aac" | "flac" | "wav" | "pcm";
    speed?: number;
    ttsOptions?: Record<string, unknown>;
  };
}
```

Streaming response:

- `Content-Type: text/event-stream`
- Response header `X-Run-Id: <runId>`
- `data: {"type":"run","runId":"..."}`
- `data: {"type":"status","stage":"generating"|"audio","time":<unix-ms>}`
- `data: {"type":"text_delta","content":"..."}`
- `data: {"type":"message_stop"}`
- `data: {"type":"audio_chunk","b64":"..."}`
- `data: {"type":"audio_stop"}`
- `data: {"type":"usage","promptTokens":number,"completionTokens":number,"totalTokens":number}`
- `data: {"type":"error","message":"..."}`
- `data: [DONE]`

### GET `/v1/public/agent/:username/:slug/sessions`

List saved chat sessions for the authenticated viewer and the specified published/shared agent.

Query parameters:

```ts
{
  limit?: number; // default 50
  offset?: number; // default 0
}
```

Response body:

```ts
{
  success: true;
  data: PublicChatSessionRecord[];
}
```

### GET `/v1/public/agent/:username/:slug/sessions/:id`

Fetch one saved public-agent chat session for the authenticated viewer.

Response body:

```ts
{
  success: true;
  data: PublicChatSessionRecord;
}
```

### POST `/v1/public/agent/:username/:slug/sessions`

Create or replace a saved chat session for the authenticated viewer. The server injects `userId`, `agentUsername`, and `agentSlug` from auth and route params before validating the record.

Request body:

```ts
{
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ModelMessageRecord[];
  providerState?: Record<string, unknown>;
}
```

Response body:

```ts
{
  success: true;
}
```

### PATCH `/v1/public/agent/:username/:slug/sessions/:id/title`

Update only the saved session title.

Request body:

```ts
{
  title: string;
  updatedAt?: number;
}
```

Response body:

```ts
{
  success: true;
  title: string;
  updatedAt: number;
}
```

### DELETE `/v1/public/agent/:username/:slug/sessions/:id`

Delete a saved session for the authenticated viewer.

Response body:

```ts
{
  success: boolean;
  message: "Deleted" | "Not found";
}
```

Shared record types used by the session endpoints:

```ts
type ModelMessageRecord = {
  role: string;
  content: string | null | Array<
    | { type: "text"; text: string }
    | { type: "image"; image: { mimeType: string; base64Data: string } }
  >;
  name?: string;
  tool_calls?: Array<{
    id?: string;
    type: string;
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
  providerState?: Record<string, unknown>;
  rawContentBlocks?: unknown[];
  tokenUsage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  toolEvents?: Array<{
    type:
      | "tool_start"
      | "tool_end"
      | "tool_error"
      | "tool_warning"
      | "llm_start"
      | "llm_end"
      | "llm_chunk";
    message?: string;
    data: Record<string, unknown>;
    sessionId?: string;
    clientId?: string;
    timestamp?: number;
  }>;
};

type PublicChatSessionRecord = {
  id: string;
  userId: string;
  agentUsername: string;
  agentSlug: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ModelMessageRecord[];
  providerState?: Record<string, unknown>;
};
```

## Notes

- Agents can be invoked from chat completions by setting `model` to the agent's `name` (e.g., `model: "my-custom-agent"`).
- Share-management endpoints require the authenticated owner to use their own username in `:username`.
- Routes under `/v1/public/agent/:username/:slug...` are access-checked, not anonymous. A valid API key and explicit owner/share access are required.

## See also

- [Models](/api/reference/models)
- [Chat Completions](/api/reference/chat-completions)
- [Core Utilities](/api/reference/core-utilities)
