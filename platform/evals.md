---
title: Evals
---

# Evals

Purpose: Find the right model for a task, and tune prompts and settings, by running your own examples against the models you are considering and comparing answer quality, speed, and cost side by side.

An **eval** is a saved task: one system prompt, a set of input examples, the models to compare, and the checks that decide whether an answer passes. A **run** freezes a reviewed version of that eval and executes it in the background. Your examples and results stay private to your account.

Evals is in **Advanced** mode, in the **Evals** tab next to **Models**. In Simple mode, choose **Switch to Advanced** from the menu first.

## Two modes

- **Compare models** — "See how models handle the same examples." Every selected model gets the same system prompt and every example. Results line up in one table so the trade-offs are plain.
- **Improve prompts & settings** — "Test changes for each model, then compare the results." An optimizer model proposes one change per round — a rewritten system prompt or a value for a setting you allowed — and a change is kept only if it improves your main goal without lowering quality. See [Improve mode](#improve-mode).

## Typical flow

Choose **Start with an example** (a ready-made sentiment-classification task) or **Start blank**. The editor walks through four steps; the **Your comparison** panel shows models × examples × runs and the resulting number of answer requests as you go.

1) **Task & examples**
   - **Eval name** and **System prompt** ("Every selected model starts with these instructions.").
   - **Copy from agent** copies an existing agent's system prompt into the eval. **Generate prompt** writes one from a description (this uses a model and may incur usage charges).
   - **Input examples** — up to 200. Each has a name, the input text, and an optional **Expected answer** (text or JSON) used by exact-match checks and as a reference for the judge. **Add example**, **Duplicate example**, or **Import JSON or JSONL** (up to 6 MB).
   - **Advanced example options** — a **Group ID** keeps related examples together when Improve mode splits examples into development and held-out sets, and **Tags** break results down in the **Results by case tag** chart.
2) **Models**
   - Pick up to 10 models from the **Model catalogue** — the models you have configured, shown as cards with provider, model ID, input/output price per 1M tokens, and capability badges (**Native JSON**, **Native JSON Schema**, **Adjustable reasoning**). Search, filter by provider, capability, or price, and sort by price.
   - **Shared eval settings** apply to every model; each selected model also has its own **Settings** overrides. Overrides apply only to this eval — they never change the saved model.
   - **Response formatting** — Text, JSON, or JSON constrained by a schema, where the providers support it. Text works across every provider.
3) **Success checks** — see [Success checks](#success-checks). Choose the **Main comparison goal**: **Task pass rate**, **Judge score**, **Estimated cost per response**, or **Total request time**.
4) **Run & review**
   - **Repeat each example** (repeats show how much a model's answers vary), **Maximum duration (minutes)**, and an optional **Estimated spend threshold (USD)**.
   - **Advanced run settings** — **Simultaneous requests**, **Maximum model requests**, **Reproducibility seed**.
   - **Estimated workload** shows target + judge + optimizer requests.
   - **Review run** shows the frozen plan — examples, runs per example, the maximum number of model requests, and the effective settings for every target, judge, and optimizer model. Nothing is sent to a model until you choose **Start run**.

**Save eval** keeps the definition so you can run it again later from **Saved evals**; past runs are under **Run history**.

## Success checks

Every answer is graded on exactly what the model returned. Nothing is repaired first — no stripped code fences, no fixed-up JSON — and refusals and truncated answers always fail. Mark any check **Required for passing**; an answer passes when every required check passes (and, with a judge, when it reaches the passing score).

| Check | Passes when |
| --- | --- |
| Exact text match | The answer equals the example's expected text (optionally ignoring leading and trailing whitespace). Every example needs a text expected answer. |
| Required text | The answer contains a phrase you specify. |
| Valid JSON | The raw answer parses as JSON. |
| JSON Schema | The answer validates against a JSON Schema (draft-07, local references only). |
| Value at JSON path | The value at a JSON Pointer (for example `/status`) equals the value you specify, type included. The expected value is the same for every example. |

Up to 30 checks per eval.

**Score answer quality (optional)** — "Have another model score the answers." Pick a **Judge model**, write a **Scoring rubric**, add up to 20 weighted **Scoring criteria**, and set a **Passing score** (0–100). The judge sees the input, the expected answer, and the candidate answer, but not which model wrote it. It must return a 0–100 score with an explanation for every criterion; the final score is the weighted mean. A malformed judgment leaves the answer **Ungraded** rather than scoring it zero. Each judged answer is an extra model request.

## Reading results

A run shows its status and phase, a progress bar, and **Cancel run**. Runs continue on the server if you close the browser.

- **Overview** — a sortable table per model: **Task pass rate**, **Judge score**, **Est. cost per response**, **Cost / pass**, **Median TTFT**, **Median request time**, **Mean input / output tokens**, **Request success**, and **JSON · schema passes**. Charts plot **Quality vs. cost** and **Quality vs. request time**; **Distributions and coverage** adds mean, median, P90, range, and standard deviation, with per-trial charts and **Results by case tag**.
- **Cases** — pick an example and compare two responses side by side: pass/fail, judge score, the response, timings, tokens, and estimated cost. **Grading details** show each check's result and the judge's explanation per criterion; **Request diagnostics** show the requested and reported model, the finish reason, and provider usage.
- **Optimization** (Improve mode) — per-model held-out confirmation, quality/cost/request-time by round, and every proposed change with **Copy prompt** and **Copy settings**.
- **Run details** — recorded spend split by target, judge, and optimizer; the frozen configuration; **Export summary CSV**, **Export detailed JSON**, and **Delete run**.

Costs use the run's pricing at the time it started. A cost shows as unavailable — never as zero — when no price is configured for a model.

## Improve mode

Improve mode starts from your prompt and settings, measures a baseline for each model, then searches for something better.

- In **Run & review**, pick an **Optimizer model** and allow what it may change: **Allow changes to the system prompt** and/or **Allow specific parameter values** (explicit values to try, such as temperatures). Set **Maximum rounds**, **Minimum improvement**, and **Maximum quality drop**.
- About a fifth of your example groups are held out (chosen deterministically from the seed). Only the remaining development examples reach the optimizer.
- Each round the optimizer proposes one change per model. It is promoted only if it improves the main goal by at least the minimum and stays within the allowed quality drop compared with the original baseline. Three rounds in a row without a promotion end the search.
- At the end, the winner and the original are measured once on the held-out examples. **Held-out confirmation** reports the difference with a 95% interval, and is marked **Confirmed** only when there are at least five independent held-out groups — a small eval can show a development improvement without claiming confirmation.
- Improve mode needs at least two independent example groups.

Results never change your agents automatically. To apply a winner, use **Copy prompt** / **Copy settings** and paste them into the [agent](/platform/agents) or [model](/platform/models).

## Costs and limits

Every target, judge, and optimizer request is a normal model call: it uses your providers and counts toward your usage and allowances. Cancelling stops new requests but keeps usage already incurred.

| Limit | Maximum | Default |
| --- | --- | --- |
| Models per eval | 10 | — |
| Input examples | 200 | — |
| Repeats per example | 10 | 3 |
| Improve rounds | 10 | 5 |
| Model requests per run | 10,000 | 5,000 |
| Run duration | 2 hours | 60 minutes |
| Simultaneous requests | 4 | 4 |
| Max output tokens per answer | — | 4096 |

- One run can be active per account at a time.
- The **Estimated spend threshold** pauses new requests when estimated spend reaches it. It is an estimate, not a provider billing cap — requests already in flight can take spend past it. A run that reaches its time limit or spend threshold ends as **paused**; paused runs cannot be resumed. Start a new run from the saved eval instead.
- An interrupted run is never replayed automatically.

## What evals measure

Evals test **a model plus a system prompt on single responses** to text input, graded on text or JSON output. They do not run agent tools (MCP), retrieval from embeddings collections, workflows, factories, or multi-turn conversations. Use **Copy from agent** to test an agent's prompt across models; test the full agent in [Chat](/platform/agents) or a [workflow](/platform/workflows).

## Agents and the API

- Any agent or MCP client with the [Mission Squad MCP server](/mcp-server/#model-evals) can create, preview, start, monitor, export, and delete evals (`msq_*_eval*` tools, MCP server 0.8.0+).
- Everything in this guide is available over the API — see [Evals](/api/reference/evals).

## API parity

- Options and limits: `GET /v1/core/evals/options`
- Saved evals: `GET|POST /v1/core/evals`, `GET|PUT|DELETE /v1/core/evals/:id`
- Preview and start: `POST /v1/core/eval-runs/preview`, `POST /v1/core/eval-runs`
- Runs: `GET /v1/core/eval-runs`, `GET|DELETE /v1/core/eval-runs/:id`, `POST /v1/core/eval-runs/:id/cancel`
- Results and export: `GET /v1/core/eval-runs/:id/results[/:trialId]`, `GET /v1/core/eval-runs/:id/export?format=json|csv`

See [Evals](/api/reference/evals)

## Gotchas

- Exact-match checks need a text expected answer on every example; JSON-path checks compare against one fixed value for all examples.
- Native JSON or schema response formats depend on the provider. For a portable comparison, use Text and add **Valid JSON** / **JSON Schema** checks.
- A handful of examples or many repeats of the same examples does not establish that a result generalizes. Add representative, carefully labeled examples before switching production agents.
- Editing a saved eval while a run is active does not change that run; runs use the frozen snapshot from **Review run**.
