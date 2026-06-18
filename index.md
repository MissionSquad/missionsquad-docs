# Mission Squad Docs

Welcome to the Mission Squad documentation. Use the navigation to explore the Platform UI and API guides.

- [Platform UI](/platform/)
- [Getting Started (Platform)](/platform/getting-started)
- [Hosting](/hosting/)
- [API Overview](/api/)
- [Endpoint Index](/api/reference/endpoint-index)
- [Mission Squad MCP Server](/mcp-server/)

## Platform (Cloud or Customer‑Hosted UI)

The Platform section covers navigating the dashboard, managing providers/models/agents, MCP tools, embeddings (vector stores and files), workflows, schedules, security, and troubleshooting. Each page includes API parity links to keep UI and API usage aligned.

Quick links:
- [Providers](/platform/providers) — connect and manage upstream AI providers
- [Models](/platform/models) — discover vendor models and save named configurations
- [Agents](/platform/agents) — create agents (prompts, models, tools, RAG)
- [MCP (Tools)](/platform/mcp) — connect tool servers and inspect available functions
- [Prompt Studio](/platform/prompt-studio) — iterate prompts, stream events, save back to agents
- [Embeddings](/platform/embeddings) — upload files, manage vector stores, diagnostics
- [Workflows](/platform/workflows) — compose multi‑agent pipelines with data interpolation
- [Factories](/platform/factories) — chain agents and workflows into schedulable pipelines
- [Video → Workflow](/platform/video-to-workflow) — analyze video and turn demos into workflows
- [Schedules](/platform/schedules) — run agents/workflows/factories on a cadence with delivery
- [Recipes](/platform/recipes) — opinionated end‑to‑end examples
- [Security & Isolation](/platform/security) — guarantees and best practices
- [Troubleshooting](/platform/troubleshooting) — common issues and quick checks

## API

- Read the full API Overview [here](/api/).
- Use the official OpenAI SDK by setting `baseURL` to your Mission Squad API and passing your Mission Squad API key as `apiKey` (Authorization: `Bearer msq-...` accepted). See [API](/api/) and [chat completions](/api/reference/chat-completions) for examples.
- For embeddings, use a supported embedding model such as `text-embedding-3-small` or `nomic-embed-text-v1.5`. `text-embedding-3-large` is not supported and requests will return HTTP 400.

## Mission Squad MCP Server

The [Mission Squad MCP Server](/mcp-server/) lets any MCP-capable AI agent drive MissionSquad — manage
agents, workflows, factories, collections, and files, and run chat/embeddings — using your MissionSquad
API key. Use the hosted endpoint at `https://mcp.missionsquad.ai`, or run it locally over stdio.

## MCP API (Admin)

The [MCP API](/api/mcp-api/) is an admin-only companion service deployed as a sidecar alongside the MissionSquad API. It manages MCP server lifecycle, package installation, encrypted secret storage, and tool execution. Instance operators use it to install/upgrade MCP packages, register servers, and manage per-user tool credentials.

- [MCP API Overview](/api/mcp-api/)
- [Packages](/api/mcp-api/packages) — install, upgrade, enable/disable MCP server packages
- [Servers & Tools](/api/mcp-api/servers) — manage servers, list and call tools, OAuth flows
- [Secrets](/api/mcp-api/secrets) — encrypted secret management and security model

## Where to start

- New to the UI? Begin with: [Getting Started](/platform/getting-started)
- Prefer API-first? Start here: [API](/api/)
- Self-hosting via Docker & Compose: [Hosting](/hosting/)
