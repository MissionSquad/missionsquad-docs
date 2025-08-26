---
title: Troubleshooting
---

# Troubleshooting

Common issues and quick checks for the Mission Squad Platform UI.

## Provider added but no models appear

Symptoms:
- Providers page shows the provider but “Supported Models” is empty.
- Models → Discover returns nothing or errors.

Checks:
- Confirm the API key is valid and has access to the vendor’s catalog/tier.
- If region-specific, ensure the correct account/region is used.
- Try Models → Discover once (rate limits can apply).

API touchpoints:
- `GET /v1/core/providers`, `POST /v1/core/add/provider` — see [Providers](/api/reference/providers)
- `POST /v1/core/models` — see [Models](/api/reference/models)

<!-- Screenshot placeholder:
![Troubleshooting — Models discovery empty](./images/troubleshoot-models-discovery.png)
(Description: Models tab with a provider selected, discovery attempted, and an empty/failed result notice, plus a note about verifying key/entitlements.) -->

---

## Tool list is empty (MCP)

Symptoms:
- MCP tab shows server not connected.
- No tools listed for a server.

Checks:
- Verify the server “Connected ✓” state.
- Open Server Logs and scan for authentication or startup errors.
- Confirm any required tokens are present in server config (not in prompts).

API touchpoints:
- `GET /v1/core/servers`, `GET /v1/core/tools` — see [Core Utilities](/api/reference/core-utilities)

<!-- Screenshot placeholder:
![Troubleshooting — MCP server logs](./images/troubleshoot-mcp-logs.png)
(Description: MCP tab with a selected server showing a “Disconnected” status and an expanded “Server Logs” panel highlighting an auth or startup error.) -->

---

## Agent ignores tools

Symptoms:
- Prompt Studio run completes without calling tools though “Use Tools” is enabled.

Checks:
- In Agents, ensure “Use Tools (MCP)” is ON and specific functions are selected.
- In the system prompt, explicitly instruct tool usage and when to call which function.
- In Prompt Studio, enable Streaming and Show Tool Events to see `tool_start`/`tool_end`.

API touchpoints:
- `POST /v1/chat/completions` (agent runs) — see [Chat Completions](/api/reference/chat-completions)
- `GET /v1/core/tools` (inventory) — see [Core Utilities](/api/reference/core-utilities)

---

## RAG isn’t used

Symptoms:
- Answers do not cite embedded content or appear ungrounded.

Checks:
- Ensure “Use Embeddings (RAG)” is enabled on the Agent.
- Verify the intended collection(s) are selected.
- Confirm files finished embedding (Embeddings tab; status not pending/failed).
- Update the prompt to require grounding/citation from retrieved snippets.

API touchpoints:
- Files and Vector Stores — see [Files](/api/reference/files), [Vector Stores](/api/reference/vector-stores)
- Collections diagnostics — see [Collections](/api/reference/collections)

---

## Streaming shows nothing

Symptoms:
- No SSE deltas or Tool Events visible during runs.

Checks:
- Turn ON Streaming in Prompt Studio.
- Disable “Hide Tool Events”.
- Increase Timeout (s) for long-running tool flows.
- Check MCP server connectivity if tools are expected.

API touchpoints:
- `POST /v1/chat/completions` (streaming chunks) — see [Chat Completions](/api/reference/chat-completions)

---

## Email not received (Schedules)

Symptoms:
- Schedule shows Enabled, but no email arrives.

Checks:
- Verify schedule time zone and “Times to Run”.
- Confirm recipient emails (and Slack channel if applicable).
- Ensure the underlying agent run succeeds in Prompt Studio.

API touchpoints:
- Schedules are managed by the platform; underlying data operations use chat/files/vector endpoints.

---

## MCP server won’t connect

Symptoms:
- Server stays Disconnected after save/restart.

Checks:
- Validate Run Command path and environment availability (e.g., Node, Python).
- Confirm any required environment variables or tokens are set in server config.
- Review Server Logs for port conflicts or permission errors.

---

## Rate limit or quota errors

Symptoms:
- Vendor-specific rate limit errors; intermittent failures.

Checks:
- Reduce concurrency or add backoff in scheduled cadences.
- Use a different provider/model tier if available.
- Add multiple providers and distribute traffic.

---

## “Model not found” when using an agent name

Symptoms:
- `POST /v1/chat/completions` returns model-not-found for `model: "<agent-name>"`.

Checks:
- Ensure the agent exists and is not deleted/renamed.
- Verify the name matches exactly (case/spacing).
- Confirm the workspace/account namespace context.

API touchpoints:
- `GET /v1/models` (returns models and agents) — see [Models](/api/reference/models)
- `GET /v1/core/agents` — see [Agents](/api/reference/agents)

---

## Vector Store embedding stuck

Symptoms:
- Files remain “pending” for long periods.

Checks:
- Re-try embedding or click “Cancel embedding” then re-add files.
- Check file sizes and formats (try smaller batches).
- Review Collections diagnostics.

API touchpoints:
- Vector Stores and Files — see [Vector Stores](/api/reference/vector-stores), [Files](/api/reference/files)
- Collections (diagnostics/recover) — see [Collections](/api/reference/collections)

---

## File upload issues

Symptoms:
- Upload fails or file not visible in list.

Checks:
- Verify file type and size.
- Re-attempt upload; check network stability.
- Inspect server logs if self-hosted.

API touchpoints:
- `POST /v1/files` (multipart) — see [Files](/api/reference/files)
