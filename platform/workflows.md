---
title: Workflows
---

# Workflows

Purpose: Compose multi‑agent pipelines. Helper agents run first (in parallel), then their outputs are interpolated into a final prompt for the primary agent.

## Concepts

- Main Agent: the final agent that produces the delivered output.
- Helper Agents: upstream agents that generate structured inputs (facts, summaries, lists) for the main agent.
- Data interpolation: the workflow's `mainPrompt` can interpolate both **helper outputs** and **your supplied data**.
- Parallelism: helper agents run in batches (set by `concurrency`).

## Interpolating data, not just agents

Workflows now interpolate plain data alongside agent outputs. You supply a JSON object as the
workflow's `dataPayload` (and can override it per run), then reference it in `mainPrompt` two ways:

- **Data templates** <code v-pre>{{ path }}</code> — replaced inline with a value from `dataPayload`
  (text, or pretty‑printed JSON for objects/arrays). Supports dotted paths and array indices, e.g.
  <code v-pre>{{ audience.segment }}</code> or <code v-pre>{{ sources.0.title }}</code>.
- **Helper selectors** `<selector|#|dataKey>` — run a helper agent and substitute its output. The
  `dataKey` can itself be a <code v-pre>{{...}}</code> template, a top‑level data key, a comma‑separated
  list, or a `{ "scrape_url": "https://..." }` object (the page is fetched and inlined).

The selector delimiter defaults to `|#|` and is configurable per workflow.

## Design tips

- Keep helper agents single‑purpose (e.g., “gather latest headlines”, “extract tickers”).  
- Use Prompt Studio to harden each helper before composing.  
- Prefer explicit placeholders in templates; avoid implicit concatenation.  
- Validate helper outputs (length, format) before interpolation to reduce prompt bloat.

## API parity

- Saved configs + resumable runs: `POST /v1/core/workflows`, `POST /v1/core/workflow-runs`
- Legacy immediate execution: `POST /v1/core/agent-workflow`

See [Workflows (API)](/api/reference/workflows). To chain workflows and agents into longer,
schedulable pipelines, see [Factories](/platform/factories).

<!-- ## Screenshot placeholder

![Workflows — Primary agent with helper agents fan‑in](./images/workflows-overview.png)
(Description: A diagram or UI showing helper agents (boxes) running in parallel, producing outputs wired into a final template for the primary agent, then a single output. Include labels for parallel phase and final composition phase.) -->
