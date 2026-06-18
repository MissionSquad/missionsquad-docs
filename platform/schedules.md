---
title: Schedules
---

# Schedules

Purpose: Run agents (or workflows) on a cadence and deliver results automatically.

## Fields

- Agent to Run — pick from your agents list.  
- Prompt — the input for that run (can differ from the agent’s stored prompt).  
- Start Date, Frequency (daily/weekly/etc.), Times to Run (timezone shown in UI).  
- Recipients — email (and Slack channel if Slack integration is configured in your deployment).  
- Enabled — master toggle; purple checkmark indicates a valid, active schedule.

## Notes

- Each schedule is stored in your account namespace.  
- Use multiple Times to Run for staggered sends.  
- You can maintain several schedules per agent with different prompts and audiences.

## Scheduling factories

In addition to scheduling single agents, you can schedule a whole [factory](/platform/factories) to run
on a recurring UTC cadence (`once`/`daily`/`weekly`/`monthly` with one or more times of day). Factory
schedules carry an optional `initialCarryPayload` that seeds each scheduled run. See
[Factories → Factory schedules](/api/reference/factories#factory-schedules).

## API parity

- Agent scheduling is a managed platform capability. Core chat/vector/files endpoints remain available for programmatic data operations.  
- Factory schedules: `GET/POST /v1/core/factory-schedules`, `PUT/DELETE /v1/core/factory-schedules/:id`, `.../toggle` — see [Factories](/api/reference/factories).  
See [Chat Completions](/api/reference/chat-completions), [Vector Stores](/api/reference/vector-stores), [Files](/api/reference/files).

<!-- ## Screenshot placeholder

![Schedules — Create and enable a daily run](./images/schedules-create.png)
(Description: Schedules tab with a form: Agent selector, Prompt textarea, Start Date picker, Frequency dropdown (daily/weekly/etc.), Times to Run multi‑select with timezone shown, Recipients (emails and optional Slack channel), and an Enabled toggle with a prominent active state indicator.) -->
