---
title: Video Processing
---

# Video Processing

Analyze video with a vision-capable model. Two families are available:

1. **Generic analysis** — run a model over a video against your own batch/final prompts and (optional)
   JSON schemas, and get a structured report back.
2. **Video → Workflow** — analyze a screen-recording/demo video and get a structured report
   (identified services, goal summary, ordered steps with approximate timestamps) you can use to
   author a [Workflow](/api/reference/workflows).

Each family has two run modes:

- **`analyze`** endpoints are **synchronous** — the request blocks until analysis completes and the
  finished report is returned under `data.report`.
- **`runs`** endpoints are **asynchronous** — they return `202` immediately with a run record; you
  then poll `GET /v1/core/video/runs/:runId`, subscribe to the SSE stream, or cancel the run. The
  run's `result` is populated only when `status` is `"completed"`.

And two video sources:

- **By `fileId`** (JSON body) — the video must already be one of your uploaded files (see
  [Files](/api/reference/files)).
- **By upload** (`multipart/form-data`) — send the binary in the `file` field plus a `request` JSON
  string. Uploads are capped at **512 MiB** and **one file**, and the extension must be one of
  `.mp4 .mov .mkv .webm .avi .ts .mxf .flv .m4v .3gp .3g2`.

All endpoints require `x-api-key`. There is **no duration limit** enforced at the API layer; bound the
work with `options` (frame sampling, clip range, token caps).

## Shared request types

```ts
interface VideoProcessingOptionsInput {
  clipStartSec?: number       // >= 0
  clipEndSec?: number         // > 0 and > clipStartSec
  sampleFps?: number
  maxWidth?: number
  maxHeight?: number
  framesPerBatch?: number
  maxTotalFrames?: number
  priorBatchWindow?: number | "all"
  maxTokensPerBatch?: number
  maxTokensFinal?: number
  maxBatchBytes?: number
  requestTimeoutMs?: number
  maxRetries?: number
}

// Response format objects use the Rosetta shape:
//   { type: "text" }
// | { type: "json_object", schema?: object }
// | { type: "json_schema", json_schema: { name?: string; strict?: boolean; schema: object } }
interface GenericVideoPromptInput {
  batchInstructions: string       // required
  finalInstructions: string       // required
  batchSystemPrompt?: string
  finalSystemPrompt?: string
  batchResponseFormat?: RosettaResponseFormat
  finalResponseFormat?: RosettaResponseFormat
}

interface GenericVideoAnalyzeRequest {
  model: string
  fileId: string
  options?: VideoProcessingOptionsInput
  prompt: GenericVideoPromptInput
}

interface VideoToWorkflowAnalyzeRequest {
  model: string
  fileId: string
  options?: VideoProcessingOptionsInput
  // No `prompt` — the analyst prompt is built in by the server.
}
```

For the **upload** variants, omit `fileId` and send the request as a JSON string in the `request` form
field (i.e. `Omit<GenericVideoAnalyzeRequest, "fileId">` or
`Omit<VideoToWorkflowAnalyzeRequest, "fileId">`). Supplying `fileId` on an upload endpoint returns
`400 "request.fileId is not allowed on upload endpoints"`.

## Shared response types

```ts
interface VideoProcessingSource {
  type: "fileId" | "upload"
  fileId?: string
  filename: string
}

interface GenericVideoReportResponse {
  source: VideoProcessingSource
  metadata?: { durationSec: number; fps: number; width: number; height: number }
  framesAnalyzed: number
  batches: Array<{
    batchIndex: number
    startSec: number
    endSec: number
    frameCount: number
    rawText: string
    parsed?: Record<string, unknown> | unknown[] | null
    usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number }
  }>
  finalResult?: {
    rawText: string
    parsed?: Record<string, unknown> | unknown[] | null
    usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number }
  }
  totalUsage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number }
  warnings: string[]
}

interface VideoToWorkflowReportResponse {
  source: VideoProcessingSource
  durationSec?: number
  framesAnalyzed: number
  identifiedServices?: string[]
  goalSummary?: string
  steps: Array<{ index: number; description: string; approxTimestampSec?: number; uiElements?: string[] }>
  rawSynthesis?: string
  batchSummaries: Array<{
    batchIndex: number
    startSec: number
    endSec: number
    text: string
    usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number }
  }>
  totalUsage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number }
  warnings: string[]
}

interface VideoProcessingRunRecord {
  runId: string
  ownerUserId: string
  kind: "generic" | "video_to_workflow"
  source: VideoProcessingSource
  modelName: string
  status: "queued" | "running" | "completed" | "error" | "cancelled"
  requestSummary: { model: string; source: VideoProcessingSource; options?: VideoProcessingOptionsInput; prompt?: GenericVideoPromptInput }
  result?: GenericVideoReportResponse | VideoToWorkflowReportResponse   // present when completed
  partialResult?: GenericVideoReportResponse | VideoToWorkflowReportResponse
  errorMessage?: string
  errorStage?: string
  failedBatchIndex?: number
  attemptCount?: number
  createdAt: number
  updatedAt: number
  startedAt?: number
  completedAt?: number
  cancelledAt?: number
}
```

All success bodies are wrapped as `{ success: true, data: ... }`; errors are
`{ success: false, error: { message: string } }`.

---

## Generic analysis

### POST `/v1/core/video/analyze`

Synchronously analyze a stored video. Body: `GenericVideoAnalyzeRequest`.

```ts
await fetch("https://agents.missionsquad.ai/v1/core/video/analyze", {
  method: "POST",
  headers: { "x-api-key": process.env.MSQ_API_KEY!, "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "my-gemini-vision",
    fileId: "file_abc123",
    options: { sampleFps: 1, maxTotalFrames: 120, maxWidth: 768 },
    prompt: {
      batchInstructions: "Describe what happens in these frames, with on-screen text.",
      finalInstructions: "Summarize the full clip as a timeline of events.",
      finalResponseFormat: {
        type: "json_schema",
        json_schema: {
          schema: {
            type: "object",
            properties: { events: { type: "array", items: { type: "string" } } },
            required: ["events"]
          }
        }
      }
    }
  })
});
```

Response (HTTP **200**): `{ success: true, data: { report: GenericVideoReportResponse } }`.

Status codes: `400` on invalid body / missing `model` / missing `fileId` / invalid `prompt.*` /
invalid `options.*`; `404` when the file or model is not found; `500` when analysis fails upstream.

### POST `/v1/core/video/analyze/upload`

Same as above but `multipart/form-data`:

- `file` — the video binary (single file, ≤ 512 MiB, allowed extension).
- `request` — a JSON string of `Omit<GenericVideoAnalyzeRequest, "fileId">`.

```bash
curl -X POST "https://agents.missionsquad.ai/v1/core/video/analyze/upload" \
  -H "x-api-key: $MSQ_API_KEY" \
  -F "file=@./demo.mp4;type=video/mp4" \
  -F 'request={"model":"my-gemini-vision","prompt":{"batchInstructions":"Describe these frames.","finalInstructions":"Summarize the clip."}}'
```

Response (HTTP **200**): `{ success: true, data: { report: GenericVideoReportResponse } }`. `400`
includes `"No file uploaded."`, the `request`-JSON errors, and `"Unsupported video file extension: <ext>"`.

### POST `/v1/core/video/runs`

Asynchronous generic analysis. Body: `GenericVideoAnalyzeRequest` (same validation as `/analyze`).

Response (HTTP **202**): `{ success: true, data: VideoProcessingRunRecord }` (status `"queued"`).

### POST `/v1/core/video/runs/upload`

Asynchronous generic analysis with an uploaded file. `multipart/form-data` with `file` + `request`
(`Omit<GenericVideoAnalyzeRequest, "fileId">`). Response (HTTP **202**):
`{ success: true, data: VideoProcessingRunRecord }`.

---

## Video → Workflow

These endpoints analyze a demo/screen-recording and return a structured description of the workflow it
demonstrates. The output is the **raw material** for authoring a workflow config — it is not itself a
ready-to-save workflow body. Use the report's `identifiedServices`, `goalSummary`, and `steps` to
construct and `POST` a config to [`/v1/core/workflows`](/api/reference/workflows).

### POST `/v1/core/video-to-workflow/analyze`

Synchronous. Body: `VideoToWorkflowAnalyzeRequest`. Response (HTTP **200**):
`{ success: true, data: { report: VideoToWorkflowReportResponse } }`.

```ts
await fetch("https://agents.missionsquad.ai/v1/core/video-to-workflow/analyze", {
  method: "POST",
  headers: { "x-api-key": process.env.MSQ_API_KEY!, "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "my-gemini-vision",
    fileId: "file_demo01",
    options: { sampleFps: 1, maxTotalFrames: 200 }
  })
});
```

### POST `/v1/core/video-to-workflow/analyze/upload`

Synchronous, `multipart/form-data` with `file` + `request` (`Omit<VideoToWorkflowAnalyzeRequest, "fileId">`).
Response (HTTP **200**): `{ success: true, data: { report: VideoToWorkflowReportResponse } }`.

### POST `/v1/core/video-to-workflow/runs`

Asynchronous. Body: `VideoToWorkflowAnalyzeRequest`. Response (HTTP **202**):
`{ success: true, data: VideoProcessingRunRecord }` (`kind: "video_to_workflow"`).

### POST `/v1/core/video-to-workflow/runs/upload`

Asynchronous with an uploaded file. `multipart/form-data` with `file` + `request`. Response
(HTTP **202**): `{ success: true, data: VideoProcessingRunRecord }`.

---

## Run lifecycle (shared)

These operate on any video run regardless of `kind`. Runs owned by another account return `404`
(`"Video processing run not found."`), not `403`.

### GET `/v1/core/video/runs/:runId`

Fetch a run's current state. Response `{ success: true, data: VideoProcessingRunRecord }`. When
`status === "completed"`, `data.result` holds the full report. `400` when `runId` is blank; `404`
when missing/not owned.

### GET `/v1/core/video/runs/:runId/stream`

Stream run progress over SSE. Headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`,
`Connection: keep-alive`. Heartbeat comment lines `:video-heartbeat <epoch-ms>` are written every 10
seconds. The stream terminates with `data: [DONE]`.

`data:` event payloads:

| `type` | Payload (besides `type`) |
| --- | --- |
| `snapshot` | `record: VideoProcessingRunRecord` (always first) |
| `status` | `runId`, `status: "queued" \| "running"`, `updatedAt` |
| `result` | `runId`, `result: VideoProcessingResult`, `updatedAt` |
| `error` | `runId`, `error: { message; stage?; failedBatchIndex?; attemptCount?; partialReport? }`, `updatedAt` |
| `cancelled` | `runId`, `message`, `updatedAt` |

If the run is already terminal when you connect, you receive the snapshot, the matching terminal frame
(`result`/`error`/`cancelled`), and `[DONE]`. Pre-stream errors are returned as JSON `404`
(`"Video processing run not found."`) when the run is missing/not owned, or `400` (empty body) when
`runId` is blank.

### POST `/v1/core/video/runs/:runId/cancel`

Cancel an in-flight run. Response `{ success: true, data: VideoProcessingRunRecord }` (status
`"cancelled"`; already-terminal runs are returned unchanged). `400` when `runId` is blank; `404` when
missing/not owned.

## See also

- [Workflows](/api/reference/workflows)
- [Files](/api/reference/files)
- [Video → Workflow (platform guide)](/platform/video-to-workflow)
- [Endpoint Index](/api/reference/endpoint-index)
