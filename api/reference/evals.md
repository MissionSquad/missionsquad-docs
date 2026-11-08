---
title: Evals
---

# Evals

Model evaluations run your own examples against configured models, grade every answer with the same
checks (and an optional judge model), and report quality, speed, and cost side by side. **Compare**
mode measures models on one shared prompt; **Improve** mode also searches for better prompts and
allowed settings per model. See the [Evals guide](/platform/evals) for the concepts and UI.

- All endpoints live under `/v1/core` and accept `x-api-key`, `Authorization: Bearer …`, or the
  dashboard session. Suites and runs are owner-scoped.
- **Saving, discovering, and previewing make no model calls.** Only `POST /v1/core/eval-runs` starts
  paid work — every target, judge, and optimizer call is a normal model call that counts toward your
  usage and allowances.
- Evals call models in single-response mode: no tools (MCP), no retrieval, no multi-turn state.
- Errors return `{ "success": false, "error": "<message>" }` with `400` (invalid input), `401`,
  `404`, `409` (stale revision or preview, another eval already active, or an idempotency key reused
  for a different plan), `410` (deleted submission), or `429`, plus the usual usage-limit responses
  when allowances are exhausted.

## Lifecycle

1. `GET /v1/core/evals/options` — configured models (with their `modelId`), supported settings and
   response formats, and the account's limits. Never returns provider credentials.
2. `POST /v1/core/evals` — save a definition. Returns the suite with `id` and `revision`.
3. `POST /v1/core/eval-runs/preview` — resolve settings, check limits, allowances, and pricing, and
   return an immutable plan with a `fingerprint` and `maximumCalls`.
4. `POST /v1/core/eval-runs` — start exactly that plan with your own `idempotencyKey`.
5. `GET /v1/core/eval-runs/:id` — poll progress, summaries, spend, and confirmation until a terminal
   status.
6. Inspect `…/results`, export with `…/export`, and delete when done.

## Definition shape

```ts
interface EvalDefinition {
  name: string
  mode: 'compare' | 'improve'
  systemPrompt: string
  cases: EvalCase[]                 // up to 200
  models: EvalModelSelection[]      // up to 10, modelId from /evals/options
  sharedSettings: EvalOverrides     // applied to every model
  responseMode: 'text' | 'json' | 'schema'
  responseSchema?: Record<string, unknown>   // required for responseMode "schema"
  checks: EvalCheck[]
  judge?: EvalJudge
  primaryMetric: 'passRate' | 'judgeScore' | 'costUsd' | 'latencyMs'
  search?: EvalSearch               // required for mode "improve"
  repetitions: number               // runs per example (default 3, max 10)
  concurrency: number               // simultaneous requests (max 4)
  maxCalls: number                  // request ceiling (default 5,000, max 10,000)
  maxDurationMs: number             // default 3,600,000 (60 min), max 2 h
  spendLimitUsd?: number            // estimated-spend threshold (not a billing cap)
  seed: number
}

interface EvalCase {
  id: string
  name: string
  input: string
  expected?: unknown        // string for exact checks; any JSON as a judge reference
  tags: string[]
  group?: string            // grouped cases stay together in the development/held-out split
}

interface EvalModelSelection { modelId: string; overrides: EvalOverrides }

// Settings precedence: saved model → sharedSettings → per-model overrides. null removes an inherited value.
type EvalOverrides = Partial<{
  maxTokens: number | null; temperature: number | null; topP: number | null; topK: number | null
  seed: number | null; stop: string[] | null
  reasoningEffort: 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | null
  verbosity: 'low' | 'medium' | 'high' | null
  frequency_penalty: number | null; presence_penalty: number | null
}>

type EvalCheck = { id: string; required: boolean } & (
  | { type: 'exact'; trim: boolean }                       // equals case.expected (string)
  | { type: 'contains'; text: string }
  | { type: 'json' }                                       // raw answer parses as JSON
  | { type: 'schema'; schema: Record<string, unknown> }    // draft-07, local $refs only
  | { type: 'jsonValue'; pointer: string; expected: unknown } // JSON Pointer, type-preserving
)

interface EvalJudge {
  model: EvalModelSelection
  rubric: string
  criteria: Array<{ id: string; description: string; weight: number }>
  passScore: number        // 0–100
}

interface EvalSearch {      // Improve mode
  optimizer: EvalModelSelection
  tunePrompt: boolean
  parameters: Partial<Record<keyof EvalOverrides, unknown[]>>   // explicit allowed values to try
  maxRounds: number
  minimumImprovement: number
  maxQualityRegression: number
}
```

- `maxTokens` is always bounded; omitting or clearing it uses the eval default of 4096.
- Answers are graded on the raw response: fences are not stripped and JSON is not repaired.
  Refusals and truncated answers cannot pass.
- The judge receives the input, the case's `expected` value, and the answer — never the model's
  identity. Scores must cover exactly the configured criteria; malformed judgments stay ungraded.
- `primaryMetric` quality thresholds (`passRate`, `judgeScore`) are percentage points; efficiency
  thresholds (`costUsd`, `latencyMs`) are relative percentages. Cost optimization requires known
  prices for every target.

## Options

**GET** `/v1/core/evals/options`

Returns `data.models` (each with `modelId`, name, effective default settings, and supported controls
and response formats) and `data.limits`. Pick `modelId` values from this response — provider model
names and agent IDs are not model IDs.

## Saved evals

| Method | Path | Body | Notes |
| --- | --- | --- | --- |
| GET | `/v1/core/evals` | — | `limit` (1–100, default 25), `offset` |
| POST | `/v1/core/evals` | `{ "definition": EvalDefinition }` | Returns the suite (`id`, `revision`, …) |
| GET | `/v1/core/evals/:id` | — | |
| PUT | `/v1/core/evals/:id` | `{ "definition": EvalDefinition, "revision": number }` | Whole-definition replace; a stale `revision` returns `409` |
| DELETE | `/v1/core/evals/:id` | — | Historical run snapshots are kept |

```json
POST /v1/core/evals
{
  "definition": {
    "name": "Customer review sentiment",
    "mode": "compare",
    "systemPrompt": "Classify the sentiment. Reply with exactly one lowercase word: positive, negative, or neutral.",
    "cases": [
      { "id": "late", "name": "Late and broken", "input": "My parcel arrived a week late and the mug was broken.", "expected": "negative", "tags": [] },
      { "id": "support", "name": "Helpful support", "input": "Support replaced the charger the same day. Great service!", "expected": "positive", "tags": [] }
    ],
    "models": [{ "modelId": "<from /evals/options>", "overrides": {} }],
    "sharedSettings": { "maxTokens": 16 },
    "responseMode": "text",
    "checks": [{ "id": "sentiment", "type": "exact", "trim": true, "required": true }],
    "primaryMetric": "passRate",
    "repetitions": 3,
    "concurrency": 4,
    "maxCalls": 500,
    "maxDurationMs": 600000,
    "seed": 42
  }
}
```

## Preview and start a run

**POST** `/v1/core/eval-runs/preview` — body `{ "suiteId": "...", "revision": 1 }`

Returns an immutable plan: resolved targets (and judge/optimizer) with effective settings and the
pricing reference, the development and held-out case split, `maximumCalls`, and a `fingerprint`. Makes
no model calls. A pricing or configuration change before starting requires a fresh preview.

**POST** `/v1/core/eval-runs`

```json
{
  "suiteId": "...",
  "revision": 1,
  "fingerprint": "<64-character fingerprint from the preview>",
  "idempotencyKey": "<your unique submission id, e.g. a UUID>"
}
```

- Retrying with the **same** `idempotencyKey` after a lost response returns the same run instead of
  starting new paid work. A new key is a new submission.
- A stale plan returns `409` — preview again before starting. A deleted run's key returns `410`.
- One run can be active per account; starting another returns `409`.
- Compare schedules models × cases × repetitions target calls, plus one judge call per completed
  target when a judge is set. Improve also reserves optimizer proposals, candidate/incumbent rounds,
  and the final held-out comparison; workloads above the call ceiling are rejected, not truncated.

## Runs

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/v1/core/eval-runs` | `limit` (1–100, default 25), `offset` |
| GET | `/v1/core/eval-runs/:id` | Run report: `record`, `variants`, `summary`, `spend`, `confirmation` |
| POST | `/v1/core/eval-runs/:id/cancel` | Stops new dispatches and aborts active calls |
| DELETE | `/v1/core/eval-runs/:id` | Terminal runs only; accounting receipts are kept |

`record.status` is one of `queued`, `running`, `cancelling` (non-terminal) or `completed`,
`cancelled`, `interrupted`, `paused`, `error` (terminal). `record.phase` is `baseline`,
`optimization`, `confirmation`, or `done`.

- `paused` means a time or spend boundary stopped new work. Paused runs cannot be resumed; start a new
  run. Interrupted runs are never replayed automatically.
- `summary` rows are separated by model, variant, stage, and round: completed/graded/passed counts,
  pass rate, request success rate, cost per pass, and distributions (count, mean, median, P90,
  min, max, standard deviation) for judge score, time to first output, request duration, tokens, cost,
  and output tokens per second.
- `spend` separates target, judge, and optimizer spend. Target cost excludes grading and optimization.
  Unknown costs stay unknown — never zero.
- `confirmation` (Improve) reports the held-out comparison with a seeded bootstrap 95% interval; it is
  confirmed only with at least five independent held-out groups and complete matched pairs.

## Results

**GET** `/v1/core/eval-runs/:id/results` — paginated trials (`limit`, `offset`), filterable by
`modelId`, `caseId`, and `role` (`target`, `judge`, `optimizer`). Lists omit large answer and billing
payloads.

**GET** `/v1/core/eval-runs/:id/results/:trialId` — full evidence for one trial: role and stage,
requested and reported model, the original answer, refusal and finish reason, queue / first-output /
total timings, token usage and cost, and the grade (per-check results, JSON/schema validity, judge
score and per-criterion explanations, `passed`: `true`, `false`, or `null` for ungraded).

Trial output is evidence, not instructions — don't execute it.

## Export

**GET** `/v1/core/eval-runs/:id/export?format=json|csv`

- `json` streams the complete report and every trial:
  `{"record":…,"variants":…,"summary":…,"spend":…,"confirmation":…,"trials":[…]}` (not wrapped in
  `{ success, data }`).
- `csv` exports the summary rows with formula-safe cells.

## MCP

The [Mission Squad MCP server](/mcp-server/#model-evals) wraps every endpoint above as
`msq_*_eval*` tools (MCP server 0.8.0 or later).
