---
title: Getting Started
---

# Mission Squad Platform — Getting Started

Audience: Builders who prefer UI over raw API calls. This page gives you the fastest path to a working setup and maps the UI to the corresponding API endpoints.

## Deployment Modes

- Cloud‑hosted
  - Managed by Mission Squad; minimal setup.
- Customer‑hosted
  - Self‑deployed in your environment; integrates with your security and networking controls. [Contact for self-hosted options](https://missionsquad.ai/contact)

## Concepts at a glance

- Providers: secure, per‑account API credentials for model vendors (OpenAI, Google, Anthropic, Groq, OpenAI‑compatible APIs, or your own externally accessible API).
- Models: named configurations you create per provider model (temperature, max tokens, etc.).
- Agents: task‑specific wrappers around a model + system prompt, optional Tools (MCP), optional RAG collections.
- MCP: Model Context Protocol servers that expose tools (functions) agents can call.
- Prompt Studio: scratchpad to run models/agents, observe tool events, and save prompts back to agents.
- Embeddings: vector stores (knowledge bases) created from your files for RAG.
- Workflows: multi‑agent orchestration (primary + helper agents).
- Schedules: recurring runs of an agent/workflow with delivery (email; Slack if configured).

## First‑run checklist (≈10 minutes)

1) Add a Provider → Providers tab → enter API key for, e.g., `openai`.  
2) Discover & Save a Model → Models tab → select provider & provider model → give it a friendly name (e.g., `gpt-4.1-mini-factual`).  
3) Install/Enable Tools (optional) → MCP tab → connect servers (e.g., `webtools`, `github`) and confirm they show "connected" with listed tool schemas.  
4) Create an Agent → Agents tab → bind to your named model, paste a system prompt, optionally enable Tools and pick functions; optionally attach Embeddings collections.  
5) Test in Prompt Studio → choose Target Model or Agent → toggle Streaming ON to watch tool events; iterate prompt.  
6) Schedule it (optional) → Schedules tab → pick agent, paste the prompt, set frequency/time, set recipients → enable.

API parity (developer reference):
- Providers: `GET/POST /v1/core/providers`, `POST /v1/core/add/provider`, `POST /v1/core/delete/provider` — see [Providers](/api/reference/providers)
- Models: `POST /v1/core/models`, `POST /v1/core/add/model`, `POST /v1/core/delete/model`, `GET /v1/models` — see [Models](/api/reference/models)
- Agents: `GET /v1/core/agents`, `POST /v1/core/add/agent`, `POST /v1/core/delete/agent` — see [Agents](/api/reference/agents)
- Tools/Servers inventory: `GET /v1/core/tools`, `GET /v1/core/servers` — see [Core Utilities](/api/reference/core-utilities)
- Chat runs: `POST /v1/chat/completions` (OpenAI‑compatible; `model` can be an agent name) — see [Chat Completions](/api/reference/chat-completions)
- Embeddings & files: `/v1/files`, `/v1/vector_stores` — see [Files](/api/reference/files) and [Vector Stores](/api/reference/vector-stores)
- Workflows: `POST /v1/core/agent-workflow` — see [Core Utilities](/api/reference/core-utilities)

## Navigation overview

![Top navigation — Header with tabs for Providers, Models, Agents, Workflows, Schedules, Embeddings, Prompt Studio, MCP. The active tab is highlighted.](./images/top-navigation.png)

- [Providers](/platform/providers) — add credentials and view each provider’s Supported Models snapshot.
- [Models](/platform/models) — create named configurations per provider model; adjust generation params.
- [Agents](/platform/agents) — define task prompts, bind to a model, and enable Tools (MCP) and Embeddings (RAG).
- [Workflows](/platform/workflows) — compose primary + helper agents.
- [Schedules](/platform/schedules) — configure recurring runs and delivery.
- [Embeddings](/platform/embeddings) — create/search vector stores; upload files.
- [Prompt Studio](/platform/prompt-studio) — run quick tests, stream events, and save prompts back to an agent.
- [MCP (Tools)](/platform/mcp) — manage servers; inspect available tools and their input schemas.

## Next steps

- Set up a provider and model: [Providers](/platform/providers), [Models](/platform/models)
- Create an agent and test it in Prompt Studio: [Agents](/platform/agents), [Prompt Studio](/platform/prompt-studio)
- Optional: Connect MCP tools, attach embeddings, and add schedules: [MCP (Tools)](/platform/mcp), [Embeddings](/platform/embeddings), [Schedules](/platform/schedules)
