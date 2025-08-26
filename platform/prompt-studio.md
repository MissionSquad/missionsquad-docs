---
title: Prompt Studio
---

# Prompt Studio

Purpose: Iterate quickly on prompts and verify tool/RAG behavior before publishing or scheduling.

## Controls

- Prompt name (optional).  
- Target Model or Agent — pick a named model or an agent.  
- Load prompt from agent — import an existing agent’s prompt for editing.  
- Save prompt to agent — overwrite/save back (requires selecting the agent).  
- Timeout (s) — server execution timeout.  
- Streaming — toggle ON to see SSE deltas and Tool Events live (helpful for debugging).  
- Hide Tool Events — toggle if you only want the final answer.

## Usage pattern

1) Select the agent you’re working on.  
2) Toggle Streaming ON and Show Tool Events to watch `tool_start`/`tool_end` traces.  
3) Iterate: adjust the system prompt and re‑run until the trace and answer quality meet your criteria.  
4) Save prompt back to the agent.

## API parity

- Chat run: `POST /v1/chat/completions` (OpenAI‑compatible; `model` may be an agent name)  
- Workflows test: `POST /v1/core/agent-workflow`  
- Streaming uses OpenAI‑style SSE chunks  
See [Chat Completions](/api/reference/chat-completions) and [Core Utilities](/api/reference/core-utilities)

<!-- ## Screenshot placeholder

![Prompt Studio — Streaming with live Tool Events](./images/prompt-studio-streaming.png)
(Description: Prompt Studio screen with a left selector “Target Model or Agent”, a large prompt input area, a Streaming toggle enabled, and a right panel showing live event logs: `tool_start`, `tool_end`, and token deltas. Include buttons “Load prompt from agent” and “Save prompt to agent”.) -->
