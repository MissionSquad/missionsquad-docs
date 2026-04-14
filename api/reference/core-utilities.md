---
title: Core Utilities
---

# Core Utilities

Utilities for inspecting configuration, generating prompts, scraping content, listing tools/servers, and working with both legacy and persisted workflow execution APIs.

## Endpoints

### POST `/v1/core/generate/prompt`

Generate a prompt with a model based on messages and metadata.

Body:

```ts
{ model, messages, name?, description?, type?: "agent" | "workflow", modelOptions? }
```

Example:

```ts
const res = await fetch("https://agents.missionsquad.ai/v1/core/generate/prompt", {
  method: "POST",
  headers: { "x-api-key": process.env.MSQ_API_KEY!, "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "my-gpt4",
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: "Create a prompt for an agent that summarizes PDFs." }
    ],
    name: "pdf-summarizer",
    description: "Prompt to instruct summarization of PDFs",
    type: "agent"
  })
});
const data = await res.json();
console.log(data);
```

Response:

```json
{
  "data": "You are a PDF summarization assistant. Your goal is to read PDF content and produce concise summaries..."
}
```

---

### GET `/v1/core/config`

Returns your core config: models, agents, embedding models, and embedded collections. Secrets masked.

```ts
const res = await fetch("https://agents.missionsquad.ai/v1/core/config", {
  headers: { "x-api-key": process.env.MSQ_API_KEY! }
});
const data = await res.json();
console.log(data);
```

---

### POST `/v1/core/scrape-url`

Server scrapes text content and returns it.

```ts
const res = await fetch("https://agents.missionsquad.ai/v1/core/scrape-url", {
  method: "POST",
  headers: { "x-api-key": process.env.MSQ_API_KEY!, "Content-Type": "application/json" },
  body: JSON.stringify({ url: "https://example.com" })
});
const data = await res.json();
console.log(data);
```

Response:

```json
{
  "success": true,
  "data": "This domain is for use in illustrative examples in documents..."
}
```

---

### GET `/v1/core/tools`

Returns available tool definitions (e.g., for agents to call during chats).

```ts
const res = await fetch("https://agents.missionsquad.ai/v1/core/tools", {
  headers: { "x-api-key": process.env.MSQ_API_KEY! }
});
const data = await res.json();
console.log(data);
```

Response (grouped by MCP server; each tool exposes an inputSchema):

```json
{
  "success": true,
  "tools": [
    {
      "weather-server": [
        {
          "name": "weather",
          "description": "Get weather information.",
          "inputSchema": {
            "type": "object",
            "properties": { "location": { "type": "string" } }
          }
        }
      ]
    },
    {
      "calculator-server": [
        {
          "name": "calculator",
          "description": "Evaluate a math expression.",
          "inputSchema": {
            "type": "object",
            "properties": { "expression": { "type": "string" } }
          }
        }
      ]
    }
  ]
}
```

---

### GET `/v1/core/servers`

Returns available MCP server names/inventory for tooling (if applicable).

```ts
const res = await fetch("https://agents.missionsquad.ai/v1/core/servers", {
  headers: { "x-api-key": process.env.MSQ_API_KEY! }
});
const data = await res.json();
console.log(data);
```

Response:

```json
{
  "success": true,
  "servers": [
    {
      "name": "weather-server",
      "command": "node",
      "args": ["server.js"],
      "env": { "NODE_ENV": "production" },
      "status": "connected",
      "enabled": true
    },
    {
      "name": "calculator-server",
      "command": "python",
      "args": ["calc.py"],
      "env": {},
      "status": "disconnected",
      "enabled": false
    }
  ]
}
```

---

### POST `/v1/core/audio/stt` — Speech-to-Text (multipart/form-data)

For complete audio endpoint documentation (TTS + streaming + STT + provider support), see [Audio (TTS/STT)](/api/reference/audio).

Transcribe uploaded audio using a configured audio-capable provider.

Required form fields:

- `file` (multipart file)
- `providerKey` (string)

Optional form fields:

- `model`, `language`, `prompt`
- `responseFormat` or `response_format` (`json` | `text` | `srt` | `verbose_json` | `vtt`)
- `timestampGranularities`:
  - `word`
  - `segment`
  - array of those values
  - JSON array string (for multipart clients)
  - comma-separated string
- `diarize`, `tagAudioEvents` as boolean or `"true"` / `"false"`
- `extraParams` or `extra_params` as object or JSON-object string
- `apiKey`, `url` for temporary `elevenlabs` usage when that provider is not saved in account config

Validation behavior:

- `400` on invalid boolean fields, invalid JSON object payloads, or invalid `timestampGranularities`
- `400` if audio MIME type is not one of:
  - `audio/mpeg`
  - `audio/wav`
  - `audio/ogg`
  - `audio/webm`
- `400` for missing/invalid `providerKey` or file upload
- `400` when provider is not configured (except temporary ElevenLabs flow)
- `500` if transcription fails upstream

Example:

```bash
curl -X POST "https://agents.missionsquad.ai/v1/core/audio/stt" \
  -H "x-api-key: $MSQ_API_KEY" \
  -F "providerKey=openai" \
  -F "file=@./sample.wav;type=audio/wav" \
  -F "response_format=verbose_json" \
  -F "timestampGranularities=[\"word\",\"segment\"]" \
  -F "diarize=false" \
  -F "extra_params={\"temperature\":0}"
```

Example response (shape varies by provider/format):

```json
{
  "text": "Hello world.",
  "model": "provider-model-id",
  "language": "en",
  "duration": 1.2,
  "segments": [],
  "words": []
}
```

---

## Workflow APIs

MissionSquad currently exposes two workflow execution models:

- Legacy streaming execution: `POST /v1/core/agent-workflow`
- Persisted workflow configs and resumable runs:
  - `GET /v1/core/workflows`
  - `POST /v1/core/workflows`
  - `PUT /v1/core/workflows/:id`
  - `DELETE /v1/core/workflows/:id`
  - `POST /v1/core/workflow-runs`
  - `GET /v1/core/workflows/:id/runs`
  - `GET /v1/core/workflow-runs/:runId`
  - `GET /v1/core/workflow-runs/:runId/hydrated`
  - `GET /v1/core/workflow-runs/:runId/stream`
  - `POST /v1/core/workflow-runs/:runId/cancel`

The persisted workflow API is the authoritative surface for saving workflows, starting async runs, reconnecting to live progress, and retrieving helper/main chat transcripts after execution.

### Workflow config shape

Persisted workflow configs use this record shape:

```ts
interface WorkflowConfigRecord {
  id: string
  userId: string
  name: string
  mainAgentId: string | null
  mainPrompt: string
  dataPayload: string
  concurrency: number
  delimiter: string
  failureMessage: string
  failureInstruction: string
  createdAt: number
  updatedAt: number
}
```

Normalization behavior verified from the API controller:

- `id` defaults to a generated id when omitted on create
- `name` defaults to `"Untitled Workflow"`
- `mainAgentId` may be `null`, but a run will fail if the referenced main agent cannot be resolved at execution time
- `dataPayload` must be a valid JSON string; default is `"{}"`
- `concurrency` defaults to `1`
- `delimiter` defaults to `"|#|"`
- `failureMessage` and `failureInstruction` default to `""`

### GET `/v1/core/workflows`

List saved workflow configs for the authenticated account, sorted by `updatedAt` descending.

```ts
const res = await fetch("https://agents.missionsquad.ai/v1/core/workflows", {
  headers: { "x-api-key": process.env.MSQ_API_KEY! }
});
const data = await res.json();
console.log(data);
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "wf_cfg_01",
      "userId": "alice",
      "name": "Research synthesis workflow",
      "mainAgentId": "agent_main_01",
      "mainPrompt": "Synthesize the helper outputs into a single answer.",
      "dataPayload": "{\"topic\":\"mission squad\"}",
      "concurrency": 2,
      "delimiter": "|#|",
      "failureMessage": "One of the helper agents failed.",
      "failureInstruction": "Continue with the successful helper outputs only.",
      "createdAt": 1710000000000,
      "updatedAt": 1710000100000
    }
  ]
}
```

### POST `/v1/core/workflows`

Create a workflow config.

Body:

```ts
{
  id?: string
  name?: string
  mainAgentId?: string | null
  mainPrompt?: string
  dataPayload?: string // must be valid JSON string
  concurrency?: number
  delimiter?: string
  failureMessage?: string
  failureInstruction?: string
}
```

Example:

```ts
const res = await fetch("https://agents.missionsquad.ai/v1/core/workflows", {
  method: "POST",
  headers: { "x-api-key": process.env.MSQ_API_KEY!, "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "Research synthesis workflow",
    mainAgentId: "agent_main_01",
    mainPrompt: "Synthesize the helper outputs into a final answer.",
    dataPayload: JSON.stringify({ topic: "MissionSquad workflows" }),
    concurrency: 2,
    delimiter: "|#|",
    failureMessage: "A helper failed.",
    failureInstruction: "Use the remaining helper outputs."
  })
});
const data = await res.json();
console.log(data);
```

Success response:

```json
{
  "success": true,
  "data": {
    "id": "wf_cfg_01",
    "userId": "alice",
    "name": "Research synthesis workflow",
    "mainAgentId": "agent_main_01",
    "mainPrompt": "Synthesize the helper outputs into a final answer.",
    "dataPayload": "{\"topic\":\"MissionSquad workflows\"}",
    "concurrency": 2,
    "delimiter": "|#|",
    "failureMessage": "A helper failed.",
    "failureInstruction": "Use the remaining helper outputs.",
    "createdAt": 1710000000000,
    "updatedAt": 1710000000000
  }
}
```

Validation behavior:

- `400` if `dataPayload` is not valid JSON
- `400` if the normalized payload fails workflow record validation

### PUT `/v1/core/workflows/:id`

Update an existing workflow config. The request body is partial; omitted fields keep their current values.

```ts
const res = await fetch("https://agents.missionsquad.ai/v1/core/workflows/wf_cfg_01", {
  method: "PUT",
  headers: { "x-api-key": process.env.MSQ_API_KEY!, "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "Research synthesis workflow v2",
    concurrency: 3
  })
});
const data = await res.json();
console.log(data);
```

Behavior:

- `404` if the workflow config does not exist for the current account
- `400` if the updated payload is invalid

### DELETE `/v1/core/workflows/:id`

Delete a saved workflow config.

```ts
const res = await fetch("https://agents.missionsquad.ai/v1/core/workflows/wf_cfg_01", {
  method: "DELETE",
  headers: { "x-api-key": process.env.MSQ_API_KEY! }
});
const data = await res.json();
console.log(data);
```

Response:

```json
{
  "success": true,
  "message": "Deleted"
}
```

If the workflow does not exist, the API returns:

```json
{
  "success": false,
  "message": "Not found"
}
```

### Workflow run record shape

Async workflow runs persist both current status and resumable preview content:

```ts
type WorkflowRunStatus = "queued" | "running" | "completed" | "error" | "cancelled"

interface WorkflowRunRecord {
  runId: string
  workflowConfigId: string | null
  ownerUserId: string
  workflowNameSnapshot: string
  status: WorkflowRunStatus
  startedAt: number
  completedAt?: number
  cancelledAt?: number
  errorMessage?: string
  aggregateUsage: {
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
  } | null
  helpers: Array<{
    helperRunId: string
    patternIndex: number
    agentId: string
    agentName: string
    agentSlug: string
    sessionId: string
    chatId: string | null
    resolvedInput: string
    status: WorkflowRunStatus
    startedAt?: number
    completedAt?: number
    errorMessage?: string
    usage: {
      promptTokens?: number
      completionTokens?: number
      totalTokens?: number
    } | null
  }>
  main: {
    sessionId: string | null
    chatId: string | null
    agentId: string | null
    agentName: string | null
    agentSlug: string | null
    status: "pending" | WorkflowRunStatus
    startedAt?: number
    completedAt?: number
    errorMessage?: string
    usage: {
      promptTokens?: number
      completionTokens?: number
      totalTokens?: number
    } | null
  }
  resumeSnapshot: {
    schemaVersion: 1
    phase: "queued" | "helpers" | "main" | "completed" | "error" | "cancelled"
    helpers: Array<{
      helperRunId: string
      patternIndex: number
      agentName: string
      agentId: string
      agentSlug: string
      sessionId: string
      chatId: string | null
      status: WorkflowRunStatus
      previewContent: string
      usage: {
        promptTokens?: number
        completionTokens?: number
        totalTokens?: number
      } | null
      startedAt?: number
      completedAt?: number
      errorMessage?: string
    }>
    main: {
      agentId: string | null
      agentName: string | null
      agentSlug: string | null
      sessionId: string | null
      chatId: string | null
      status: "pending" | WorkflowRunStatus
      previewContent: string
      usage: {
        promptTokens?: number
        completionTokens?: number
        totalTokens?: number
      } | null
      startedAt?: number
      completedAt?: number
      errorMessage?: string
    }
    aggregateUsage: {
      promptTokens?: number
      completionTokens?: number
      totalTokens?: number
    } | null
    updatedAt: number
  }
  createdAt: number
  updatedAt: number
}
```

### POST `/v1/core/workflow-runs`

Start an async run from a saved workflow config.

Body:

```ts
{
  workflowId: string
  dataPayload?: string // optional JSON string override for this run
}
```

Validation behavior:

- `400` if `workflowId` is missing
- `400` if `dataPayload` is provided but is not a string
- `400` if `dataPayload` is not valid JSON
- `404` if the workflow config does not exist for the current account

Example:

```ts
const res = await fetch("https://agents.missionsquad.ai/v1/core/workflow-runs", {
  method: "POST",
  headers: { "x-api-key": process.env.MSQ_API_KEY!, "Content-Type": "application/json" },
  body: JSON.stringify({
    workflowId: "wf_cfg_01",
    dataPayload: JSON.stringify({ topic: "MissionSquad workflows", region: "us" })
  })
});
const data = await res.json();
console.log(data);
```

Response:

```json
{
  "success": true,
  "runId": "wf_run_01",
  "data": {
    "runId": "wf_run_01",
    "workflowConfigId": "wf_cfg_01",
    "ownerUserId": "alice",
    "workflowNameSnapshot": "Research synthesis workflow",
    "status": "queued",
    "startedAt": 1710000200000,
    "aggregateUsage": null,
    "helpers": [],
    "main": {
      "sessionId": null,
      "chatId": null,
      "agentId": "agent_main_01",
      "agentName": null,
      "agentSlug": null,
      "status": "pending",
      "usage": null
    },
    "resumeSnapshot": {
      "schemaVersion": 1,
      "phase": "queued",
      "helpers": [],
      "main": {
        "agentId": "agent_main_01",
        "agentName": null,
        "agentSlug": null,
        "sessionId": null,
        "chatId": null,
        "status": "pending",
        "previewContent": "",
        "usage": null
      },
      "aggregateUsage": null,
      "updatedAt": 1710000200000
    },
    "createdAt": 1710000200000,
    "updatedAt": 1710000200000
  }
}
```

Status code: `202 Accepted`

### GET `/v1/core/workflow-runs/:runId`

Fetch the current persisted state of a workflow run.

```ts
const res = await fetch("https://agents.missionsquad.ai/v1/core/workflow-runs/wf_run_01", {
  headers: { "x-api-key": process.env.MSQ_API_KEY! }
});
const data = await res.json();
console.log(data);
```

Behavior:

- `404` if the run does not exist or is owned by another account

### GET `/v1/core/workflows/:id/runs`

List runs for a workflow config.

Query parameters:

- `limit` default `20`, minimum `1`, maximum `100`
- `offset` default `0`, minimum `0`

```ts
const res = await fetch("https://agents.missionsquad.ai/v1/core/workflows/wf_cfg_01/runs?limit=10&offset=0", {
  headers: { "x-api-key": process.env.MSQ_API_KEY! }
});
const data = await res.json();
console.log(data);
```

Behavior:

- results are sorted by `updatedAt` descending
- `404` if the workflow config does not exist for the current account

### GET `/v1/core/workflow-runs/:runId/hydrated`

Fetch a workflow run plus the persisted helper and main public-chat transcripts created during the run.

Response shape:

```ts
{
  success: true,
  data: {
    record: WorkflowRunRecord
    mainChat: {
      id: string
      agentSlug: string
      messages: Array<Record<string, unknown>>
    } | null
    helperChats: Array<{
      helperRunId: string
      chat: {
        id: string
        agentSlug: string
        messages: Array<Record<string, unknown>>
      } | null
    }>
  }
}
```

Use this endpoint when you need the full message transcripts instead of the lightweight `resumeSnapshot.previewContent` fields.

### GET `/v1/core/workflow-runs/:runId/stream`

Stream live workflow progress over Server-Sent Events.

Headers:

- `Content-Type: text/event-stream`
- `Cache-Control: no-cache`

Connection behavior:

- the first event is always a `snapshot` event containing the current `WorkflowRunRecord`
- the server writes heartbeat comment lines every 10 seconds while the run is live
- if the run is already terminal (`completed`, `error`, or `cancelled`), the endpoint sends the initial snapshot and then `[DONE]`

Observed runtime event types emitted by the controller:

- `snapshot`
- `run_started`
- `helper_started`
- `helper_message_start`
- `helper_content_delta`
- `helper_message_stop`
- `helper_usage`
- `helper_tool_event`
- `helper_completed`
- `helper_error`
- `main_started`
- `main_message_start`
- `main_content_delta`
- `main_message_stop`
- `main_usage`
- `main_tool_event`
- `main_completed`
- `workflow_completed`
- `workflow_cancelled`
- `error`

Example:

```ts
const res = await fetch("https://agents.missionsquad.ai/v1/core/workflow-runs/wf_run_01/stream", {
  headers: { "x-api-key": process.env.MSQ_API_KEY! }
});

const reader = res.body!.getReader();
const decoder = new TextDecoder();

while (true) {
  const { value, done } = await reader.read();
  if (done) break;
  console.log(decoder.decode(value, { stream: true }));
}
```

Example event sequence:

```text
data: {"type":"snapshot","record":{"runId":"wf_run_01","status":"queued"}}

data: {"type":"run_started","runId":"wf_run_01","workflowId":"wf_cfg_01"}

data: {"type":"helper_started","runId":"wf_run_01","helperRunId":"helper_01","patternIndex":0,"agentName":"researcher"}

data: {"type":"helper_content_delta","runId":"wf_run_01","helperRunId":"helper_01","patternIndex":0,"delta":"Finding one..."}

data: {"type":"main_started","runId":"wf_run_01","sessionId":"wf-main-01","chatId":"chat_main_01","agentName":"synthesizer","input":"Synthesize the helper outputs"}

data: {"type":"main_content_delta","runId":"wf_run_01","delta":"Here is the final synthesis..."}

data: {"type":"workflow_completed","runId":"wf_run_01","status":"completed","aggregateUsage":{"promptTokens":1200,"completionTokens":350,"totalTokens":1550}}

data: [DONE]
```

Failure semantics:

- on runtime failure, the server sends `data: {"type":"error","message":"..."}` and then `data: [DONE]`
- on cancellation, the server sends `data: {"type":"workflow_cancelled"}` and then `data: [DONE]`

### POST `/v1/core/workflow-runs/:runId/cancel`

Cancel a running or queued persisted workflow run.

```ts
const res = await fetch("https://agents.missionsquad.ai/v1/core/workflow-runs/wf_run_01/cancel", {
  method: "POST",
  headers: { "x-api-key": process.env.MSQ_API_KEY! }
});
const data = await res.json();
console.log(data);
```

Response:

```json
{
  "success": true,
  "found": true,
  "cancelled": true,
  "alreadyCancelled": false
}
```

Behavior:

- `404` if the run does not exist or is owned by another account
- if the run is already terminal, the API still returns `success: true` and reports the stream-cancellation lookup result via `found`, `cancelled`, and `alreadyCancelled`

### POST `/v1/core/agent-workflow`

Execute a workflow immediately by agent name over Server-Sent Events. This is the older workflow API. It does not use saved workflow configs, and it persists its resumability snapshot through the general run store rather than the newer `workflowRuns` collection.

Body:

```ts
{
  agentName: string
  messages: Array<{ role: string; content: string }>
  data?: Record<string, unknown>
  delimiter?: string
  concurrency?: number
  failureMessage?: string
  failureInstruction?: string
}
```

Validation behavior:

- `400` if `agentName` is missing/blank or `messages` is not an array

Optional headers:

- `x-session-id`: client session id forwarded into core workflow execution
- `x-client-id`: client id used for tool-event registration when `x-session-id` is provided

Response model:

- streaming SSE response, not JSON
- response header `X-Run-Id` contains the generated run id
- terminal marker is `data: [DONE]`

Example:

```ts
const res = await fetch("https://agents.missionsquad.ai/v1/core/agent-workflow", {
  method: "POST",
  headers: {
    "x-api-key": process.env.MSQ_API_KEY!,
    "Content-Type": "application/json",
    "x-session-id": "workflow-test-session",
    "x-client-id": "workflow-docs-example"
  },
  body: JSON.stringify({
    agentName: "research-orchestrator",
    messages: [{ role: "user", content: "Research MissionSquad workflow APIs." }],
    data: { topic: "workflow docs" },
    concurrency: 2
  })
});
```

Observed SSE event types:

- `status`
- `workflow_started`
- `helper_started`
- `content_delta`
- `helper_completed`
- `message_start`
- `message_stop`
- `tool_call_start`
- `tool_call_delta`
- `tool_call_done`
- `thinking_start`
- `thinking_delta`
- `thinking_stop`
- `final_result`
- `workflow_completed`
- `error`

Example stream:

```text
data: {"type":"workflow_started","agentName":"research-orchestrator"}

data: {"type":"helper_started","agentName":"web-researcher","agentId":"agent_helper_01","chatId":"chat_helper_01","sessionId":"workflow-test-session","index":0,"total":2}

data: {"type":"content_delta","delta":"MissionSquad exposes two workflow APIs..."}

data: {"type":"helper_completed","agentName":"web-researcher","agentId":"agent_helper_01","chatId":"chat_helper_01","index":0,"result":"MissionSquad exposes two workflow APIs...","usage":{"promptTokens":220,"completionTokens":90,"totalTokens":310}}

data: {"type":"message_start"}

data: {"type":"content_delta","delta":"Here is the final synthesis..."}

data: {"type":"final_result","result":{"content":"Here is the final synthesis..."},"chatId":"chat_main_01"}

data: {"type":"workflow_completed","usage":{"promptTokens":700,"completionTokens":250,"totalTokens":950},"helperChatIds":{"0":"chat_helper_01"},"mainChatId":"chat_main_01"}

data: [DONE]
```

Notes:

- during long-lived execution, the endpoint emits `status` keepalive events every 10 seconds with `stage: "generating"`
- helper tool-call events are handled internally; only the main agent's tool-call/thinking events are forwarded to the client
- the API creates public chat records for helper and main workflow chats with `origin: "workflow"`

## See also

- [Agents](/api/reference/agents)
- [Models](/api/reference/models)
- [Audio (TTS/STT)](/api/reference/audio)
- [Endpoint Index](/api/reference/endpoint-index)
- [API Overview](/api/)
