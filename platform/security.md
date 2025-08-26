---
title: Security & Isolation
---

# Security & Isolation

Mission Squad Platform enforces account‑level isolation and secure handling of credentials and data. This page summarizes core guarantees and recommended practices.

## Core guarantees

- Namespacing: All entities (providers, models, agents, files, vector stores, schedules) are namespaced per account.  
- Credential storage: Provider API keys are encrypted at rest; the UI masks values on read.  
- Principle of least privilege: Agents can only access the tools (MCP) and collections (RAG) explicitly attached to them.  
- Event visibility: Logs show server events; redact sensitive data from prompts and tool outputs.  
- Data egress: Outbound tool calls use TLS (HTTPS) and depend on your connected MCP servers and their configured authentication (token/ PAT/ etc.).  
- Deployment modes:
  - Cloud‑hosted: Managed by Mission Squad; keys stored and encrypted in our infrastructure.
  - Customer‑hosted: Keys and data remain within your infrastructure, subject to your security controls.  [Contact for self-hosted options](https://missionsquad.ai/contact)

## Recommended practices

- Separate providers per environment or region (e.g., “openai‑prod”, “openai‑eu”).  
- Use dedicated API keys with least scopes (e.g., GitHub PAT for MCP github server). Rotate regularly.  
- Attach only the minimum tool functions an agent needs; avoid broad “all tools” permissions.  
- Keep RAG collections scoped by purpose (e.g., “finance‑kb”, “eng‑handbook”) to reduce over‑exposure in prompts.  
- Redact or avoid PII in prompts and tool outputs where possible.  
- Prefer deterministic models (low temperature) for compliance/regulated workflows.  
- If self-hosted, monitor server logs for unexpected tool usage; disable or remove tools quickly if needed.

## Incident response checklist

1) Disable or delete the impacted Provider entry in Providers.  
2) Revoke/rotate the upstream vendor key (OpenAI/Anthropic/etc.).  
3) Audit Agents that used the provider; temporarily disable Schedules relying on them.  
4) Review MCP servers for unexpected tool activity; rotate tokens if necessary.  
5) If embeddings may contain sensitive content, review Vector Stores access and detach from Agents until validated.

## API reference touchpoints

- [Providers](/api/reference/providers)  
  - `GET /v1/core/providers`, `POST /v1/core/add/provider`, `POST /v1/core/delete/provider`  
- [Agents](/api/reference/agents)  
  - `GET /v1/core/agents`, `POST /v1/core/add/agent`, `POST /v1/core/delete/agent`  
- Tools/Servers (MCP): [Core Utilities](/api/reference/core-utilities)  
  - `GET /v1/core/servers`, `GET /v1/core/tools`  
- Files & Vector Stores: [Files](/api/reference/files), [Vector Stores](/api/reference/vector-stores)  
- Collections (diagnostics/recovery): [Collections](/api/reference/collections)

<!-- ## Screenshot placeholder

![Security — Providers and Agent permissions overview](./images/security-overview.png)
(Description: A composite image: Providers tab with masked API keys; Agents editor showing “Use Tools (MCP)” with a few specific functions selected; and an Embeddings selector with one collection attached. Emphasize masked secrets and least‑privilege selections.) -->
