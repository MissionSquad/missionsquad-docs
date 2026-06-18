---
title: Video → Workflow
---

# Video → Workflow

Purpose: turn a screen recording or demo video into the outline of a MissionSquad
[workflow](/platform/workflows) — or run general video analysis against your own prompts.

## Two capabilities

- **Generic video analysis** — run a vision‑capable model over a video with your own batch and final
  prompts (and optional JSON schemas) to get a structured report.
- **Video → Workflow** — analyze a demo recording and get a structured description of the workflow it
  demonstrates: the services used, a goal summary, and an ordered list of steps with approximate
  timestamps. Use this as the starting point to author a workflow config.

## Run modes

- **Analyze** (synchronous): submit and wait for the finished report in the response.
- **Runs** (asynchronous): submit and get a run id back immediately, then poll or stream progress and
  read the result when the run completes. Use this for longer videos.

## Sources & limits

- Provide a video by **file id** (a previously uploaded file) or by **direct upload**
  (`multipart/form-data`).
- Uploads are capped at **512 MiB** and one file, with common video extensions
  (`.mp4 .mov .mkv .webm .avi`, and more).
- Bound the work with `options` — frame sampling (`sampleFps`, `framesPerBatch`, `maxTotalFrames`),
  a clip range (`clipStartSec`/`clipEndSec`), and token caps.

## From report to workflow

The Video → Workflow report is the **raw material** for a workflow — it is not a ready‑to‑save config.
Use its `identifiedServices`, `goalSummary`, and `steps` to author a workflow on the
[Workflows](/platform/workflows) screen (or via `POST /v1/core/workflows`).

## API parity

- Generic: `POST /v1/core/video/analyze`, `POST /v1/core/video/runs` (+ `/upload` variants)
- Video → Workflow: `POST /v1/core/video-to-workflow/analyze`, `.../runs` (+ `/upload` variants)
- Run lifecycle: `GET /v1/core/video/runs/:runId`, `.../stream`, `.../cancel`

See [Video Processing (API)](/api/reference/video) for full request/response types and SSE events.
