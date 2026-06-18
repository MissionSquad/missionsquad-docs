---
title: Factories
---

# Factories

Purpose: chain **agents** and **workflows** into an ordered pipeline that passes a payload from one
step to the next, with optional looping and scheduling.

## Concepts

- **Step**: one unit of work. Each step is either an **agent step** or a **workflow step** — never
  both. A step reads the current carry payload as its input and produces an output.
- **Carry payload**: a single string that flows through the factory. Each step overwrites it with its
  output, so step _N+1_ receives step _N_'s output. Seed it with `initialCarryPayload` when you start
  a run.
- **Workflow steps with schemas**: a workflow step can declare a `payloadSchema` (JSON Schema) that the
  incoming payload must satisfy. If it doesn't, an optional **fixer agent** repairs it (up to
  `maxRepairAttempts` tries) before the workflow runs.
- **Transitions & looping**: each step ends with `next`, `stop`, or `loop_to_index`. A `continuous`
  factory loops via a `loop_to_index` transition. Invocation caps (`maxTotalInvocations`,
  per‑step `maxStepInvocations`) bound how long a looping factory runs.
- **Runs**: a run executes a snapshot of the config. Runs can be **paused**, **resumed**, and
  **cancelled**, and stream live progress.
- **Schedules**: run a factory automatically on a UTC cadence (`once`/`daily`/`weekly`/`monthly` with
  `timesToRun`).

## Design tips

- Put the deterministic, schema‑validated work in **workflow steps** and the open‑ended reasoning in
  **agent steps**.
- Use a fixer agent on workflow steps whose upstream output is free‑form, so a malformed payload
  self‑heals instead of failing the run.
- Keep the carry payload compact (prefer JSON) so each step can parse what it needs.
- For long‑running loops, set explicit invocation caps to bound cost.

## API parity

- Factory configs: `GET/POST /v1/core/factories`, `PUT/DELETE /v1/core/factories/:id`
- Runs: `POST /v1/core/factory-runs`, plus `.../steps`, `.../stream`, `.../pause`, `.../resume`, `.../cancel`
- Schedules: `GET/POST /v1/core/factory-schedules`, `PUT/DELETE /v1/core/factory-schedules/:id`, `.../toggle`

See [Factories (API)](/api/reference/factories) for full request/response types and SSE events.
