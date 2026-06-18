---
title: Workflows
---

# Workflows

A workflow runs one or more **helper agents** (in batches), interpolates their outputs and your
supplied **data** into a single prompt, and sends that prompt to a **main agent** that produces the
final result. Workflows are saved as configs and executed as resumable, streamable runs.

- All endpoints require `x-api-key`. Configs and runs are namespaced to your account; a run owned by
  another account returns `404`.
- Two interpolation mechanisms live inside the workflow's `mainPrompt`:
  1. **Data templates** <code v-pre>{{ path }}</code> — replaced inline with a value from `dataPayload`
     (text, or pretty-printed JSON for objects/arrays). This is the "interpolate data, not just agents"
     feature.
  2. **Helper selectors** `<selector|#|dataKey>` — an agent step. The helper agent runs on `dataKey`
     and its output replaces the whole token in the prompt. `dataKey` may itself contain
     <code v-pre>{{...}}</code> templates or a comma-separated list of data keys / literals.
- The delimiter between a helper's selector and its data key defaults to `|#|` and is configurable per
  workflow.

## Data interpolation

`dataPayload` is a JSON **string** that must parse to an **object**. You can set it on the config and
override it per run. Inside `mainPrompt`:

```text
Summarize the topic "{{ topic }}" for the {{ audience.segment }} audience.

Research notes:
<agent/agt_research01|#|topic>

Competitor list:
<agent/agt_competitors|#|{{ competitors }}>
```

- <code v-pre>{{ topic }}</code> and <code v-pre>{{ audience.segment }}</code> resolve against
  `dataPayload` (top-level key first, then dotted path with array-index support) and are rendered as
  text where they appear.
- `<agent/agt_research01|#|topic>` runs the agent `agent/agt_research01` with the value of
  `dataPayload.topic` as input; the agent's output replaces the token.
- A helper's `dataKey` may be a <code v-pre>{{...}}</code> template, a top-level data key, a literal, a
  comma-separated list of those, or a `{ "scrape_url": "https://..." }` object (the URL is fetched and
  inlined).

A missing data path raises a run failure with `errorCode: "WORKFLOW_DATA_INTERPOLATION_ERROR"` and the
offending `dataPath`.

## Config shape

```ts
interface WorkflowConfigRecord {
  id: string
  userId: string
  name: string
  mainAgentId: string | null    // derived from mainAgentRef when it is an owned ref
  mainAgentRef?: string | null   // canonical: "agent/<agentId>" or "shared/<ownerUsername>/<slug>"; null clears
  mainPrompt: string
  dataPayload: string            // JSON string; must parse to an object; default "{}"
  concurrency: number            // helper batch size; default 1
  delimiter: string              // helper selector delimiter; default "|#|"
  failureMessage: string         // default ""
  failureInstruction: string     // default ""
  createdAt: number
  updatedAt: number
}
```

Normalization on create/update:

- `name` defaults to `"Untitled Workflow"`.
- `mainAgentRef` may be a string (sets the ref), `null` (clears), or omitted (keeps the existing ref).
  `mainAgentId` is derived server-side from an owned `mainAgentRef`; it is not taken from the body.
- `dataPayload` must be a valid JSON string (default `"{}"`).
- `concurrency` defaults to `1`; `delimiter` defaults to `"|#|"`.
- Client-supplied `userId`, `mainAgentId`, `createdAt`, `updatedAt` are ignored (server-derived).

---

## Config endpoints

### GET `/v1/core/workflows`

List your workflow configs (sorted by `updatedAt` descending). Response
`{ success: true, data: WorkflowConfigRecord[] }`.

### POST `/v1/core/workflows`

Create a config. Body is a `Partial<WorkflowConfigRecord>`.

```ts
await fetch("https://agents.missionsquad.ai/v1/core/workflows", {
  method: "POST",
  headers: { "x-api-key": process.env.MSQ_API_KEY!, "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "Research synthesis",
    mainAgentRef: "agent/agt_synth01",
    mainPrompt:
      'Topic: {{ topic }}\n\nResearch:\n<agent/agt_research01|#|topic>\n\nSynthesize the above.',
    dataPayload: JSON.stringify({ topic: "MissionSquad workflows" }),
    concurrency: 2,
    delimiter: "|#|",
    failureMessage: "A helper failed.",
    failureInstruction: "Use the remaining helper outputs."
  })
});
```

Response `{ success: true, data: WorkflowConfigRecord }`. Errors are
`{ success: false, errorCode?: string, message: string }` with `400`:

- invalid `dataPayload` JSON,
- `WORKFLOW_MAIN_AGENT_NOT_FOUND` when `mainAgentRef` cannot be resolved,
- `WORKFLOW_HELPER_NAME_UNRESOLVED` when a helper selector cannot be resolved.

### PUT `/v1/core/workflows/:id`

Update a config. The body is partial and merged onto the existing record; omitted fields keep their
values. `404` when the config does not exist for your account; `400` on validation failure. Response
`{ success: true, data: WorkflowConfigRecord }`.

### DELETE `/v1/core/workflows/:id`

Delete a config. Response `{ success: boolean, message: "Deleted" | "Not found" }` — HTTP **200** even
when nothing was deleted (check `success`).

---

## Run record shape

```ts
type WorkflowRunStatus = "queued" | "running" | "completed" | "error" | "cancelled"

interface WorkflowRunRecord {
  runId: string
  workflowConfigId: string | null
  factoryRunId?: string                 // set when started as a factory step
  ownerUserId: string
  workflowNameSnapshot: string
  status: WorkflowRunStatus
  startedAt: number
  completedAt?: number
  cancelledAt?: number
  errorMessage?: string
  aggregateUsage: { promptTokens?: number; completionTokens?: number; totalTokens?: number } | null
  helpers: Array<{
    helperRunId: string
    patternIndex: number
    agentRef: string
    agentId: string
    agentName: string
    agentUsername: string
    agentSlug: string
    sessionId: string
    chatId: string | null
    resolvedInput: string
    status: WorkflowRunStatus
    startedAt?: number
    completedAt?: number
    errorMessage?: string
    usage: { promptTokens?: number; completionTokens?: number; totalTokens?: number } | null
  }>
  main: {
    sessionId: string | null
    chatId: string | null
    agentRef: string | null
    agentId: string | null
    agentName: string | null
    agentUsername: string | null
    agentSlug: string | null
    status: "pending" | WorkflowRunStatus
    startedAt?: number
    completedAt?: number
    errorMessage?: string
    usage: { promptTokens?: number; completionTokens?: number; totalTokens?: number } | null
  }
  resumeSnapshot: {
    schemaVersion: 1
    phase: "queued" | "helpers" | "main" | "completed" | "error" | "cancelled"
    helpers: Array<{ /* helper snapshot with previewContent */ }>
    main: { /* main snapshot with previewContent */ }
    aggregateUsage: { promptTokens?: number; completionTokens?: number; totalTokens?: number } | null
    updatedAt: number
  }
  createdAt: number
  updatedAt: number
}
```

---

## Run endpoints

### POST `/v1/core/workflow-runs`

Start an async run from a saved config. Execution proceeds after the response.

Body:

```ts
{
  workflowId: string;     // required
  dataPayload?: string;   // optional JSON string; REPLACES the config's dataPayload for this run
}
```

Response (HTTP **202**): `{ success: true, runId: string, data: WorkflowRunRecord }`.

Validation: `400` when `workflowId` is missing, when `dataPayload` is provided but is not a string, or
when `dataPayload` is not valid JSON; `404` when the config does not exist for your account.

```ts
await fetch("https://agents.missionsquad.ai/v1/core/workflow-runs", {
  method: "POST",
  headers: { "x-api-key": process.env.MSQ_API_KEY!, "Content-Type": "application/json" },
  body: JSON.stringify({
    workflowId: "wf_cfg_01",
    dataPayload: JSON.stringify({ topic: "MissionSquad workflows", audience: { segment: "developers" } })
  })
});
```

### GET `/v1/core/workflows/:id/runs`

List runs for a config. Query: `limit` (default `20`, clamped `1–100`), `offset` (default `0`).
Response `{ success: true, data: WorkflowRunRecord[] }` (sorted by `updatedAt` desc); `404` when the
config does not exist for your account.

### GET `/v1/core/workflow-runs/:runId`

Fetch a run's current state. Response `{ success: true, data: WorkflowRunRecord }`; `404` when missing
or owned by another account.

### GET `/v1/core/workflow-runs/:runId/hydrated`

Fetch a run plus the persisted helper and main chat transcripts. Use this when you want the full
messages instead of the lightweight `resumeSnapshot.previewContent` fields.

```ts
{
  success: true,
  data: {
    record: WorkflowRunRecord;
    mainChat: { id: string; agentSlug: string; messages: unknown[] } | null;
    helperChats: Array<{ helperRunId: string; chat: { id: string; agentSlug: string; messages: unknown[] } | null }>;
  }
}
```

### GET `/v1/core/workflow-runs/:runId/stream`

Stream live progress over SSE. Headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`,
`Connection: keep-alive`. The first frame is always
`data: {"type":"snapshot","record":<WorkflowRunRecord>}`; heartbeat comment lines
`:workflow-heartbeat <epoch-ms>` are written every 10 seconds; the stream ends with `data: [DONE]`.

Forwarded `data:` event types (each carries `runId` plus contextual fields):

`snapshot`, `run_started`, `helper_started`, `helper_message_start`, `helper_content_delta`,
`helper_message_stop`, `helper_usage`, `helper_tool_event`, `helper_completed`, `helper_error`,
`main_started`, `main_message_start`, `main_content_delta`, `main_message_stop`, `main_usage`,
`main_tool_event`, `main_completed`, `workflow_completed`, `workflow_cancelled`, `error`.

On failure the server sends `{ type: "error", message, errorCode?, dataPath? }` then `[DONE]`; on
cancellation `{ type: "workflow_cancelled" }` then `[DONE]`.

```text
data: {"type":"snapshot","record":{"runId":"wf_run_01","status":"queued"}}

data: {"type":"run_started","runId":"wf_run_01","workflowId":"wf_cfg_01"}

data: {"type":"helper_content_delta","runId":"wf_run_01","helperRunId":"h_01","patternIndex":0,"delta":"Finding one..."}

data: {"type":"main_content_delta","runId":"wf_run_01","delta":"Here is the synthesis..."}

data: {"type":"workflow_completed","runId":"wf_run_01","status":"completed","aggregateUsage":{"promptTokens":1200,"completionTokens":350,"totalTokens":1550}}

data: [DONE]
```

### POST `/v1/core/workflow-runs/:runId/cancel`

Cancel a queued/running run. Response
`{ success: true, found: boolean, cancelled: boolean, alreadyCancelled: boolean }`. `400` when `runId`
is blank; `404` when missing/not owned. Already-terminal runs still return `success: true` and report
the cancellation lookup via the three flags.

---

## Legacy: POST `/v1/core/agent-workflow`

Execute a workflow immediately by agent name over SSE, without a saved config. It persists its
resumability snapshot through the general run store (not the `workflowRuns` collection).

Body:

```ts
{
  agentName: string;                                   // required
  messages: Array<{ role: string; content: string }>;  // required array
  data?: Record<string, unknown>;
  delimiter?: string;
  concurrency?: number;
  failureMessage?: string;
  failureInstruction?: string;
}
```

- `400` when `agentName` is missing/blank or `messages` is not an array.
- Optional headers: `x-session-id` (client session forwarded into execution), `x-client-id` (used for
  tool-event registration when `x-session-id` is present).
- Streaming SSE; response header `X-Run-Id` carries the run id; terminal marker is `data: [DONE]`.

Observed SSE event types: `status`, `workflow_started`, `helper_started`, `content_delta`,
`helper_completed`, `message_start`, `message_stop`, `tool_call_start`, `tool_call_delta`,
`tool_call_done`, `thinking_start`, `thinking_delta`, `thinking_stop`, `final_result`,
`workflow_completed`, `error`. (These differ from the persisted-run stream above: they carry no
`runId` in the payloads.)

Prefer the persisted workflow API (`/v1/core/workflows` + `/v1/core/workflow-runs`) for new
integrations — it supports saved configs, async starts, reconnection to live progress, and full
transcript retrieval.

## See also

- [Agents](/api/reference/agents)
- [Factories](/api/reference/factories)
- [Video Processing](/api/reference/video)
- [Workflows (platform guide)](/platform/workflows)
- [Endpoint Index](/api/reference/endpoint-index)
