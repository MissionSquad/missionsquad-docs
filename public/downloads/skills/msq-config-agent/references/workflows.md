# Building a Workflow

A workflow is one orchestrator (main) agent whose `mainPrompt` delegates to helper agents. Helpers run on the workflow's `dataPayload` and their outputs are interpolated into the prompt the main agent receives.

## Procedure

1. Break the goal into concrete steps; decide which are delegated to helpers.
2. One orchestrator/main agent plus one helper per delegated step. Helpers do the fetching; the orchestrator usually needs no tools.
3. Create/update every required agent first (see SKILL.md → Creating an agent). `msq_list_agents` for each agent's exact `name` and `id`.
4. **Helper interpolation** is exactly `<agent-name|#|data-property>`, e.g. `<web-researcher|#|topic>`.
   - `agent-name` is the exact helper agent name (canonicalized to `agent/<id>` on save; unknown names are rejected).
   - `data-property` is a top-level key of the workflow `dataPayload`; its value is sent to that helper as its input, and the helper's output replaces the token in the prompt the main agent receives.
5. `mainAgentRef` is `agent/<id>` — the orchestrator's id, not its name.
6. `dataPayload` is a JSON **string**, e.g. `"{\"topic\":\"solar energy\"}"`. Never pass a raw object.
7. Lifecycle: `msq_create_workflow`, `msq_list_workflows` / `msq_get_workflow`, `msq_update_workflow`, `msq_delete_workflow`. Never use deprecated legacy workflow tool names.
8. **Test before hand-off**: `msq_run_workflow` (optional per-run `dataPayload` override) → `msq_get_workflow_run_status` (waits for completion, reports helper success/failure) → `msq_get_workflow_result` (main agent's output). History: `msq_list_workflow_runs`. Runaway run: `msq_cancel_workflow_run`.

## Plan template to show the user before creating

- Workflow name: `<name>`
- Helper agents: `<name> — <what it fetches/does>, tools: <...>, model: <efficient model>`
- Orchestrator agent: `<name> — model: <capable model>`, tools: none unless required
- `dataPayload` keys: `<key: example value>`
- Interpolation tokens in mainPrompt: `<helper-name|#|key>` for each helper
