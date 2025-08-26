# Mission Squad Docs

Welcome to the Mission Squad documentation. Use the navigation to explore the Platform UI and API guides.

- [Platform UI](/platform/)
- [Getting Started (Platform)](/platform/getting-started)
- [API Overview](/api/)
- [Endpoint Index](/api/reference/endpoint-index)

## Platform (Cloud or Customer‑Hosted UI)

The Platform section covers navigating the dashboard, managing providers/models/agents, MCP tools, embeddings (vector stores and files), workflows, schedules, security, and troubleshooting. Each page includes API parity links to keep UI and API usage aligned.

Quick links:
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

## API

- Read the full API Overview [here](/api/).
- Use the official OpenAI SDK by setting `baseURL` to your Mission Squad API and passing your Mission Squad API key as `apiKey` (Authorization: `Bearer msq-...` accepted). See [API](/api/) and [chat completions](/api/reference/chat-completions) for examples.
- For embeddings, use a supported embedding model such as `text-embedding-3-small` or `nomic-embed-text-v1.5`. `text-embedding-3-large` is not supported and requests will return HTTP 400.

## Where to start

- New to the UI? Begin with: [Getting Started](/platform/getting-started)
- Prefer API-first? Start here: [API](/api/)
