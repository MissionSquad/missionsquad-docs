---
title: Factories
---

# Factories

Factories chain **agents** and **workflows** into an ordered sequence of steps that pass a single
payload forward, with optional looping and scheduled execution. Each step is either an agent step or
a workflow step; the text a step produces (`output`) becomes the next step's input (`carryPayload`).

- All endpoints require authentication via `x-api-key: <your-msq-api-key>` (the OpenAI-style
  `Authorization: Bearer msq-...` is also accepted).
- Factory configs, runs, step runs, and schedules are namespaced to your account. You can only read
  or mutate records you own; a record owned by another account returns `404`.
- Base URL in examples: `https://agents.missionsquad.ai`.

## Concepts & data model

A **factory config** (`FactoryConfigRecord`) holds an ordered `steps` array (1–50 steps) plus
loop/cap controls. A **step** (`FactoryStepConfig`) has a discriminant `kind` and references exactly
one target:

- `kind: "agent"` → set `agentRef` only (an agent ref/id, with optional `promptOverride`).
- `kind: "workflow"` → set `workflowRef` only (a `workflowConfigId`, optional payload `payloadSchema`,
  and an optional fixer agent that repairs payloads that fail schema validation).

Each step ends with a `transition` that controls the cursor: `{ kind: "next" }`, `{ kind: "stop" }`,
or `{ kind: "loop_to_index", targetIndex }`. Set `continuous: true` for a looping factory (it
requires at least one `loop_to_index` transition).

A **run** (`FactoryRunRecord`) executes a snapshot of the config. It maintains a `cursor` and a
single `carryPayload` string that each step reads as input and overwrites with its output. A run can
be paused, resumed, and cancelled.

```ts
interface FactoryConfigRecord {
  id: string
  userId: string
  name: string
  description?: string
  steps: FactoryStepConfig[]
  continuous: boolean
  limitTotalInvocations?: boolean
  maxTotalInvocations: number
  createdAt: number
  updatedAt: number
}

type FactoryStepKind = "agent" | "workflow"

interface FactoryStepConfig {
  stepId: string
  index: number
  name: string
  kind: FactoryStepKind
  limitStepInvocations?: boolean
  agentRef?: {
    // canonical agent ref: "agent/<agentId>" for owned, "shared/<ownerUsername>/<slug>" for shared
    agentRef?: string
    agentId?: string          // legacy owned-agent id (normalized to "agent/<agentId>")
    promptOverride?: string   // optional per-step prompt prepended to the carry payload
  }
  workflowRef?: {
    workflowConfigId: string
    payloadSchema?: Record<string, unknown>  // JSON Schema the carry payload must satisfy
    fixerAgentRef?: string                    // agent used to repair an invalid payload
    fixerAgentId?: string
    maxRepairAttempts?: number                // 0–5; forced to 0 when no fixer agent is set
  }
  maxStepInvocations: number
  transition: FactoryTransition
}

type FactoryTransition =
  | { kind: "next" }
  | { kind: "loop_to_index"; targetIndex: number }
  | { kind: "stop" }

type FactoryRunStatus = "queued" | "running" | "paused" | "completed" | "cancelled" | "error"

interface FactoryRunRecord {
  runId: string
  factoryConfigId: string | null
  ownerUserId: string
  factoryNameSnapshot: string
  configSnapshot: FactoryConfigRecord
  trigger: "manual" | "scheduler"
  scheduleId?: string
  status: FactoryRunStatus
  cursor: {
    nextStepIndex: number | null
    iterationCount: number
    completedCycleCount?: number
  }
  carryPayload: string
  aggregateUsage: {
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
  } | null
  perStepInvocationCounts: Record<string, number>
  startedAt: number
  completedAt?: number
  cancelledAt?: number
  pausedAt?: number
  errorMessage?: string
  createdAt: number
  updatedAt: number
}

type FactoryStepRunStatus = "queued" | "running" | "completed" | "error" | "cancelled" | "skipped"

interface FactoryStepRunRecord {
  stepRunId: string
  runId: string
  ownerUserId: string
  factoryConfigId: string
  stepId: string
  stepIndex: number
  stepName: string
  sequence: number
  kind: FactoryStepKind
  invoked: {
    kind: "agent" | "workflow" | "fixer_agent"
    agentRef?: string
    agentId?: string
    agentName?: string
    agentUsername?: string
    workflowConfigId?: string
    workflowName?: string
  }
  triggeredBy: "manual_start" | "previous_step_output" | "loopback" | "scheduler"
  upstreamStepRunId: string | null
  input: string
  output: string
  workflowDataPayloadIn: string | null
  workflowRunId?: string
  chatId?: string
  validation?: {
    schemaPresent: boolean
    initialOutcome: "pass" | "fail" | "not_applicable"
    repairAttempts: number
    finalOutcome: "pass" | "fail"
    errors?: Array<{ path: string; message: string }>
  }
  status: FactoryStepRunStatus
  startedAt: number
  completedAt?: number
  errorMessage?: string
  usage: { promptTokens?: number; completionTokens?: number; totalTokens?: number } | null
  toolEvents: unknown[]
  createdAt: number
  updatedAt: number
}

type FactoryScheduleStatus = "enabled" | "disabled" | "running"

interface FactoryScheduleRecord {
  id: string
  userId: string
  factoryConfigId: string
  label?: string
  startDate: number                                  // epoch ms anchor
  timesToRun: Array<{ hour: number; minute: number }> // UTC times of day
  repeatInterval: "once" | "daily" | "weekly" | "monthly"
  daysOfWeek?: number[]                              // 0=Sun … 6=Sat (weekly)
  dayOfMonth?: number                               // 1–31 (monthly)
  status: FactoryScheduleStatus
  lastRunAt?: number
  nextRunAt: number                                 // server-computed (UTC)
  initialCarryPayload?: string
  createdAt: number
  updatedAt: number
}
```

> Scheduling is computed in **UTC**. There is no cron expression and no timezone field —
> `timesToRun` are interpreted as UTC times of day.

---

## Factory configs

### GET `/v1/core/factories`

List your factory configs.

```ts
await fetch("https://agents.missionsquad.ai/v1/core/factories", {
  headers: { "x-api-key": process.env.MSQ_API_KEY! }
});
```

Response: `{ success: true, data: FactoryConfigRecord[] }`.

### POST `/v1/core/factories`

Create a factory. The body is a `Partial<FactoryConfigRecord>`; the server fills `id`, `userId`,
`createdAt`, `updatedAt`, per-step `stepId`/`index`, and step defaults.

Body:

```ts
{
  id?: string;                       // generated when omitted
  name: string;                      // required, trimmed
  description?: string;
  steps: FactoryStepConfig[];        // required; 1–50 entries
  continuous?: boolean;              // default false
  limitTotalInvocations?: boolean;   // default false
  maxTotalInvocations?: number;      // default 10; when limited must be 1–100000
}
```

Per-step rules:

- `kind: "agent"` requires `agentRef` and forbids `workflowRef`. The agent ref is resolved against
  your account; unknown/forbidden agents return `400`.
- `kind: "workflow"` requires `workflowRef.workflowConfigId` and forbids `agentRef`. An optional
  `payloadSchema` is validated as a JSON Schema; `maxRepairAttempts` is clamped to `0–5` and forced
  to `0` when no fixer agent is set.
- `maxStepInvocations` is clamped to `1–10000` when `limitStepInvocations` is true (else coerced to `1`).
- `transition.loop_to_index.targetIndex` must be a valid step index. `continuous: true` requires at
  least one `loop_to_index` transition.

Example:

```ts
await fetch("https://agents.missionsquad.ai/v1/core/factories", {
  method: "POST",
  headers: { "x-api-key": process.env.MSQ_API_KEY!, "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "Research → Draft → Polish",
    description: "Three-step content pipeline",
    steps: [
      {
        name: "Research",
        kind: "agent",
        agentRef: { agentRef: "agent/agt_research01" },
        maxStepInvocations: 1,
        transition: { kind: "next" }
      },
      {
        name: "Draft",
        kind: "workflow",
        workflowRef: {
          workflowConfigId: "wf_cfg_draft",
          payloadSchema: {
            type: "object",
            properties: { topic: { type: "string" }, notes: { type: "string" } },
            required: ["topic"]
          },
          fixerAgentRef: "agent/agt_fixer01",
          maxRepairAttempts: 2
        },
        maxStepInvocations: 1,
        transition: { kind: "next" }
      },
      {
        name: "Polish",
        kind: "agent",
        agentRef: { agentRef: "agent/agt_editor01" },
        maxStepInvocations: 1,
        transition: { kind: "stop" }
      }
    ]
  })
});
```

Response: `{ success: true, data: FactoryConfigRecord }` (HTTP **200**).

Error cases:

- `403` `{ success: false, errorCode: "FACTORY_LIMIT_REACHED", message: "Factory limit reached" }`
  when the account's `maxFactories` limit is hit.
- `400` `{ success: false, errorCode?: string, message: string }` for any validation failure.
  `errorCode` values include: `FACTORY_INVALID_NAME`, `FACTORY_STEPS_REQUIRED`,
  `FACTORY_STEP_KIND_MISMATCH`, `FACTORY_STEP_AGENT_REF_INVALID`, `FACTORY_STEP_AGENT_FORBIDDEN`,
  `FACTORY_STEP_AGENT_NOT_FOUND`, `FACTORY_STEP_WORKFLOW_NOT_FOUND`, `FACTORY_STEP_SCHEMA_INVALID`,
  `FACTORY_STEP_FIXER_AGENT_REF_INVALID`, `FACTORY_STEP_FIXER_AGENT_NOT_FOUND`,
  `FACTORY_MAX_INVOCATIONS_OUT_OF_RANGE`, `FACTORY_INVALID_TRANSITION`, `FACTORY_CONTINUOUS_NO_LOOP`,
  `FACTORY_TOTAL_RUN_CAP_REQUIRES_LAST_STEP_LOOP`.

### GET `/v1/core/factories/:id`

Fetch one factory config. Response `{ success: true, data: FactoryConfigRecord }`; `404`
`{ success: false, message: "Factory config not found" }` when missing.

### PUT `/v1/core/factories/:id`

Update a factory config. The body is a `Partial<FactoryConfigRecord>` merged onto the existing
record (`{ ...existing, ...body, id }`), then re-validated with the same rules as create. `404` when
the config does not exist; `400` with the same `errorCode` set on validation failure. Response
`{ success: true, data: FactoryConfigRecord }`.

### DELETE `/v1/core/factories/:id`

Delete a factory config. Response `{ success: boolean, message: "Deleted" | "Not found" }` — note the
HTTP status is **200** even when nothing was deleted; check the `success` flag.

### GET `/v1/core/factories/:id/runs`

List runs for a factory config.

Query parameters:

- `limit` — default `20`, clamped to `1–100`.
- `offset` — default `0`, minimum `0`.

Response `{ success: true, data: FactoryRunRecord[] }`; `404` when the factory config does not exist.

---

## Factory runs

### POST `/v1/core/factory-runs`

Start a run from a saved factory config. Execution proceeds asynchronously after the response.

Body:

```ts
{
  factoryConfigId: string;      // required
  initialCarryPayload?: string; // seeds the run's carryPayload; non-strings coerce to ""
}
```

Example:

```ts
await fetch("https://agents.missionsquad.ai/v1/core/factory-runs", {
  method: "POST",
  headers: { "x-api-key": process.env.MSQ_API_KEY!, "Content-Type": "application/json" },
  body: JSON.stringify({
    factoryConfigId: "fac_cfg_01",
    initialCarryPayload: JSON.stringify({ topic: "MissionSquad factories" })
  })
});
```

Response (HTTP **202**): `{ success: true, runId: string, data: FactoryRunRecord }`.

Error cases:

- `400` `{ success: false, message: "factoryConfigId required" }`.
- `429` `{ success: false, errorCode: "FACTORY_CONCURRENT_LIMIT_REACHED", message: "Factory concurrent run limit reached" }`
  when the account's `maxConcurrentFactoryRuns` limit is hit.
- `404` `{ success: false, message: "Factory config not found" }`.

### GET `/v1/core/factory-runs/:runId`

Fetch a run's current persisted state. Response `{ success: true, data: FactoryRunRecord }`; `404`
`{ success: false, message: "Factory run not found" }` when missing or owned by another account.

### GET `/v1/core/factory-runs/:runId/steps`

List the step runs for a run.

Query parameters: `limit` (default `50`, clamped `1–100`), `offset` (default `0`).

Response `{ success: true, data: FactoryStepRunRecord[] }`; `404` when the run is missing/not owned.

### GET `/v1/core/factory-runs/:runId/steps/:stepRunId`

Fetch one step run. Response `{ success: true, data: FactoryStepRunRecord }`; `404`
`{ success: false, message: "Factory step run not found" }`.

### GET `/v1/core/factory-runs/:runId/steps/:stepRunId/hydrated`

Fetch a step run plus the full transcripts it produced — the inner workflow run (for workflow steps)
and/or the agent chat session (for agent steps).

Response:

```ts
{
  success: true,
  data: {
    stepRun: FactoryStepRunRecord;
    workflowRun?: {                 // present for kind "workflow" runs you own
      record: WorkflowRunRecord;
      mainChat: { id: string; agentSlug: string; messages: unknown[] } | null;
      helperChats: Array<{ helperRunId: string; chat: { id: string; agentSlug: string; messages: unknown[] } | null }>;
    } | null;
    chatSession?: PublicChatSessionRecord | null; // present for kind "agent" steps
  }
}
```

(`WorkflowRunRecord` is defined in [Workflows](/api/reference/workflows); `PublicChatSessionRecord`
in [Agents](/api/reference/agents).)

### GET `/v1/core/factory-runs/:runId/stream`

Stream live run progress over Server-Sent Events.

- Headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`.
- The first frame is always `data: {"type":"snapshot","record":<FactoryRunRecord>}`.
- For a live run, the snapshot is followed by replayed event history, then live events.
- The server writes heartbeat comment lines `:factory-heartbeat <epoch-ms>` every 10 seconds.
- Stream terminates with `data: [DONE]`.

Run/step `data:` events (each carries `type` plus the listed fields):

| `type` | Payload fields (besides `type`) |
| --- | --- |
| `snapshot` | `record: FactoryRunRecord` |
| `run_started` | `runId`, `factoryConfigId` |
| `run_paused` | — |
| `step_started` | `stepRunId`, `stepIndex`, `kind`, `invoked`, `stepRun` |
| `step_agent_delta` | `stepRunId`, `delta` |
| `step_agent_replace` | `stepRunId`, `content` |
| `step_agent_tool_event` | `stepRunId`, `event` |
| `step_validation_attempt` | `stepRunId`, `attempt`, `errors: Array<{ path; message }>` |
| `step_completed` | `stepRunId`, `usage` |
| `step_error` | `stepRunId`, `message` |
| `run_completed` / `run_completed_at_cap` / `run_completed_step_cap` | `aggregateUsage` |
| `run_cancelled` | — |
| `run_error` | `message` |
| `error` | `message` |

Workflow steps re-emit the inner workflow's events with a `step_workflow_*` prefix, e.g.
`step_workflow_main_delta`, `step_workflow_helper_completed`, `step_workflow_completed`, each as
`{ type, stepRunId, event }`.

```ts
const res = await fetch(
  "https://agents.missionsquad.ai/v1/core/factory-runs/fac_run_01/stream",
  { headers: { "x-api-key": process.env.MSQ_API_KEY! } }
);
const reader = res.body!.getReader();
const decoder = new TextDecoder();
while (true) {
  const { value, done } = await reader.read();
  if (done) break;
  console.log(decoder.decode(value, { stream: true }));
}
```

### POST `/v1/core/factory-runs/:runId/pause`

Pause a non-terminal run. Sets `status: "paused"` and emits `run_paused`. If the run is already
terminal it is a no-op:
`{ success: true, noop: true, message: "...", data: FactoryRunRecord }`. Otherwise
`{ success: true, data: FactoryRunRecord }`. `404` when missing/not owned.

### POST `/v1/core/factory-runs/:runId/resume`

Resume a paused run (sets `status: "running"`, re-invokes execution). If the run is not paused it is
a no-op with `noop: true`. `404` when missing/not owned.

### POST `/v1/core/factory-runs/:runId/cancel`

Cancel a run. Response `{ success: true, found: boolean, cancelled: boolean, alreadyCancelled: boolean }`.
`400` `{ success: false, message: "runId required" }`; `404` when missing/not owned.

---

## Factory schedules

Schedules run a factory on a recurring UTC cadence.

### GET `/v1/core/factory-schedules`

List your schedules. Response `{ success: true, data: FactoryScheduleRecord[] }`.

### POST `/v1/core/factory-schedules`

Create a schedule. The server computes `nextRunAt` and fills `id`/`createdAt`/`updatedAt`.

Body:

```ts
{
  factoryConfigId: string;                         // required; must be an owned factory
  timesToRun: Array<{ hour: number; minute: number }>; // required, >= 1 entry (UTC)
  label?: string;
  startDate?: number;                              // default Date.now()
  repeatInterval?: "once" | "daily" | "weekly" | "monthly"; // default "once"
  daysOfWeek?: number[];                           // 0=Sun … 6=Sat (weekly)
  dayOfMonth?: number;                             // 1–31 (monthly)
  status?: "enabled" | "disabled" | "running";     // default "enabled"
  initialCarryPayload?: string;
}
```

Example:

```ts
await fetch("https://agents.missionsquad.ai/v1/core/factory-schedules", {
  method: "POST",
  headers: { "x-api-key": process.env.MSQ_API_KEY!, "Content-Type": "application/json" },
  body: JSON.stringify({
    factoryConfigId: "fac_cfg_01",
    label: "Weekday morning digest",
    repeatInterval: "weekly",
    daysOfWeek: [1, 2, 3, 4, 5],
    timesToRun: [{ hour: 13, minute: 0 }], // 13:00 UTC
    initialCarryPayload: JSON.stringify({ mode: "digest" })
  })
});
```

Response `{ success: true, data: FactoryScheduleRecord }`; `400`
`{ success: false, message: string }` (e.g. `"factoryConfigId required"`, `"Factory config not found"`,
`"timesToRun required"`).

### PUT `/v1/core/factory-schedules/:id`

Update a schedule. Body is a `Partial<FactoryScheduleRecord>` merged onto the existing record and
re-validated; `nextRunAt` is recomputed. `404` when missing; `400` on validation failure. Response
`{ success: true, data: FactoryScheduleRecord }`.

### DELETE `/v1/core/factory-schedules/:id`

Delete a schedule. Response `{ success: boolean }` (HTTP **200**; `success` reflects whether a row
was removed).

### POST `/v1/core/factory-schedules/:id/toggle`

Flip a schedule between `enabled` and `disabled` (re-computes `nextRunAt` when enabling). Response
`{ success: true, data: FactoryScheduleRecord }`; `404` when missing.

---

## Notes

- `createFactory` and `createFactorySchedule` return HTTP **200** on success; `createFactoryRun`
  returns **202**.
- `deleteFactory` and `deleteFactorySchedule` always return HTTP **200** — read the `success` flag to
  know whether a record was actually removed.
- Workflow steps validate the carry payload against `payloadSchema` before running. When a fixer
  agent is configured, up to `maxRepairAttempts` repair passes are attempted before the step fails.

## See also

- [Workflows](/api/reference/workflows)
- [Agents](/api/reference/agents)
- [Factories (platform guide)](/platform/factories)
- [Endpoint Index](/api/reference/endpoint-index)
