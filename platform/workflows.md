---
title: Workflows
---

# Workflows

Purpose: Compose multi‑agent pipelines. Helper agents run first (in parallel), then their outputs are interpolated into a final prompt for the primary agent.

## Concepts

- Primary Agent: the final agent that produces the delivered output.
- Helper Agents: upstream agents that generate structured inputs (facts, summaries, lists) for the primary agent.
- Interpolation: named placeholders (e.g., `{{research}}`, `{{pros_cons}}`) filled with helper outputs.
- Parallelism: helper agents run in parallel where safe to do so for latency savings.

## Design tips

- Keep helper agents single‑purpose (e.g., “gather latest headlines”, “extract tickers”).  
- Use Prompt Studio to harden each helper before composing.  
- Prefer explicit placeholders in templates; avoid implicit concatenation.  
- Validate helper outputs (length, format) before interpolation to reduce prompt bloat.

## API parity

- Execute workflow: `POST /v1/core/agent-workflow`  
See [Core Utilities](/api/reference/core-utilities)

<!-- ## Screenshot placeholder

![Workflows — Primary agent with helper agents fan‑in](./images/workflows-overview.png)
(Description: A diagram or UI showing helper agents (boxes) running in parallel, producing outputs wired into a final template for the primary agent, then a single output. Include labels for parallel phase and final composition phase.) -->
