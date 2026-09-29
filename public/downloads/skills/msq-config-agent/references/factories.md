# Building a Factory

A factory is an ordered chain of steps. Each step is an agent or a workflow. Step 1 receives the run's `initialCarryPayload`; every later step receives the previous step's output as its carry payload. The final step's output is the run result.

## Procedure

1. Break the goal into sequential steps.
2. Create/update every required agent first (see SKILL.md → Creating an agent); `msq_list_agents` for exact ids. If a step is a workflow, build it first (see `workflows.md`) and note its config id.
3. Write each step agent's prompt to state what it reads from the carry payload and exactly what it outputs for the next step. Middle steps copy the keys they received through UNCHANGED and add their own. The final step produces the deliverable.
4. Construct the `steps` array, one object per step, in order:
   ```json
   [
     { "kind": "agent", "name": "Fetch data", "agentRef": "agent/AGENT_ID_1" },
     { "kind": "agent", "name": "Analyze", "agentRef": "agent/AGENT_ID_2" }
   ]
   ```
   - Workflow steps: `{ "kind": "workflow", "name": "...", "workflowRef": "WORKFLOW_CONFIG_ID" }`
   - Transitions default to `next` for every step and `stop` for the last. Set `transition` explicitly only for loops: `{ "kind": "loop_to_index", "targetIndex": 0 }`, which also requires `continuous: true`.
   - `stepId` and `index` are generated when omitted.
5. Lifecycle: `msq_create_factory`, `msq_list_factories` / `msq_get_factory`, `msq_update_factory` (send the full `steps` array — it replaces, not merges), `msq_delete_factory`.
6. **Test before hand-off**: `msq_run_factory` (`initialCarryPayload` as a JSON string when step 1 expects keys) → `msq_get_factory_run_status` (waits for completion or pause) → `msq_get_factory_result` (final carry payload).
   - Debug a step: `msq_list_factory_run_steps` → `msq_get_factory_run_step` (or `msq_get_factory_run_step_hydrated` for linked workflow-run/chat-session detail).
   - Control: `msq_pause_factory_run`, `msq_resume_factory_run`, `msq_cancel_factory_run`. History: `msq_list_factory_runs`.
7. To run on a schedule, see `schedules.md` → Factory schedules. Never create trigger agents to schedule factories.

## Plan template to show the user before creating

- Factory name: `<name>`
- Steps, in order: `<n>. <step name> — <agent|workflow>: <name> — reads: <carry keys> → outputs: <carry keys>`
- `initialCarryPayload` keys step 1 expects: `<key: example value>`
- Loop/continuous: `<none | loop to step n>`
