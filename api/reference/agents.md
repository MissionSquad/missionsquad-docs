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

Body (required + optional fields supported by the server):

```ts
{
  name: string;
  description: string;
  systemPrompt: string;
  model: string;                    // name of a model you've added
  overwrite?: boolean;
  addToday?: boolean;               // if true and first message is `system`, current date is injected
  timezoneOffset?: string;          // for date formatting; defaults to "-0500" if not provided
  selectedFunctions?: {             // preselect MCP functions for the agent (if applicable)
    [serverName: string]: string[];
  };
}
```

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
    slug: string;
    description: string;
    isPublished: boolean;
    publishedAt: number;
    ownerUsername: string;
    sharedAt: number;
    sharedVia: "username" | "email";
    hasVoice: boolean;
  }>;
}
```

To invoke one of these via `POST /v1/chat/completions`, construct the shared model id as:

```ts
const model = `shared/${ownerUsername}/${slug}`;
```

### POST `/v1/core/agents/:username/:slug/shares`

Create or refresh a share record for a published agent. `:username` must match the authenticated owner.

Request body:

```ts
{
  recipient: string; // username or email
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
