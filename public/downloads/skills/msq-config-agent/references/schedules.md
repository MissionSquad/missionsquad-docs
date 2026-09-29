# Schedules

Two scheduling mechanisms exist. Pick by what is being run:
- **Scheduled run** — runs a single agent with a fixed prompt on a timer, optionally emailing the result.
- **Factory schedule** — runs a factory on a timer with an optional `initialCarryPayload`.

(Scheduled Agent Pages are a third, separate mechanism — see `agent-pages.md`.)

All times are **UTC**. Always confirm the user's timezone and exact timing, convert to UTC, and show the converted time back to the user before creating.

## Scheduled runs (single agent, with email)

1. Ensure the target agent exists (create if needed — SKILL.md → Creating an agent).
2. `msq_create_scheduled_run` with:
   - `label`: descriptive name
   - `agentName`: the agent to run
   - `prompt`: what to tell the agent each run
   - `timesToRun`: array of `{hour, minute}`, 24h, UTC
   - `repeatInterval`: `daily` | `weekly` | `monthly` | `once`
   - `sendEmail`: `true` for delivery to the account owner (server default when omitted)
   - `startDate`: Unix timestamp in **milliseconds**
   - weekly: `daysOfWeek` array, 0=Sunday … 6=Saturday
   - monthly: `dayOfMonth` 1–31
3. Verify with `msq_list_scheduled_runs`.
4. Manage: `msq_update_scheduled_run`, `msq_toggle_scheduled_run` (enable/disable), `msq_delete_scheduled_run`. Past results: `msq_get_scheduled_run_results`.
5. Never mention `emailTo` — that option is not implemented.

## Factory schedules

1. Ensure the factory exists and has been tested (see `factories.md`).
2. `msq_create_factory_schedule` with: the factory id, `timesToRun` (`{hour, minute}` UTC), `repeatInterval`, `daysOfWeek` for weekly, `dayOfMonth` for monthly, optional `initialCarryPayload` (JSON string).
3. Verify with `msq_list_factory_schedules`.
4. Manage: `msq_update_factory_schedule`, `msq_toggle_factory_schedule` (enable/disable without editing other fields), `msq_delete_factory_schedule`.
5. Do not create trigger agents or scheduled runs to kick off factories — use the factory schedule directly.

## Plan template to show the user before creating

- Type: `<scheduled run | factory schedule>`
- Target: `<agent name | factory name>`
- Prompt / initialCarryPayload: `<...>`
- Cadence: `<daily|weekly (days)|monthly (day)|once>` at `<local time, timezone>` = `<hh:mm UTC>`
- Email delivery: `<yes|no>` (scheduled runs only)
- Start date: `<date>`
