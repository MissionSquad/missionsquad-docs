---
title: Platform Overview
---

# Mission Squad Platform UI

This section documents the Mission Squad Platform UI. It covers dashboard navigation, managing providers/models/agents, MCP tools, embeddings (vector stores and files), workflows, schedules, security, and troubleshooting. Each page includes API parity links to keep UI and API usage aligned.

- [Getting Started](/platform/getting-started)
- [API docs](/api/)
- [Endpoint Index](/api/reference/endpoint-index)

## Guides

- [Providers](/platform/providers) — connect and manage upstream AI providers
- [Models](/platform/models) — discover vendor models and save named configurations
- [Agents](/platform/agents) — create agents (prompts, models, tools, RAG)
- [MCP (Tools)](/platform/mcp) — connect tool servers and inspect available functions
- [Prompt Studio](/platform/prompt-studio) — iterate prompts, stream events, save back to agents
- [Embeddings](/platform/embeddings) — upload files, manage vector stores, diagnostics
- [Workflows](/platform/workflows) — compose multi‑agent pipelines
- [Schedules](/platform/schedules) — run agents/workflows on a cadence with delivery
- [Recipes](/platform/recipes) — opinionated end‑to‑end examples
- [Security & Isolation](/platform/security) — guarantees and best practices
- [Troubleshooting](/platform/troubleshooting) — common issues and quick checks

## Concepts at a glance

- Providers: secure, per‑account credentials for model vendors (OpenAI, Google, Anthropic, Groq, OpenAI‑compatible runtimes).
- Models: named configurations per provider model (temperature, max tokens, etc.).
- Agents: model + system prompt with optional Tools (MCP) and RAG collections.
- MCP: Model Context Protocol servers that expose callable tools.
- Prompt Studio: scratchpad to test agents/models and watch tool events.
- Embeddings: files and vector stores used for RAG.
- Workflows: multi‑agent orchestration (helpers → primary).
- Schedules: recurring agent/workflow runs with delivery.
