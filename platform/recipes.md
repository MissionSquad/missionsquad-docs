---
title: Recipes
---

# Recipes

Opinionated end‑to‑end examples that compose Providers, Models, Agents, Tools (MCP), Prompt Studio, Embeddings, and Schedules.

## A) “Web News → Daily Email” agent

### Goal
Aggregate fresh finance headlines, summarize concisely with links, and send a daily email.

### Steps
1) Providers: add OpenAI (or your preferred fast/cheap model provider).  
2) Models: save a low‑temp chat model as `gpt-4.1-mini-factual`.  
3) MCP: ensure `webtools` (or `rss`) is connected and exposes a function like `get_feed_headlines`.  
4) Agents: create `web-news-finance` with a system prompt that:
   - instructs use of the `get_feed_headlines` tool,
   - requests accurate links and short summaries,
   - defines selection criteria (accuracy, novelty).  
5) Prompt Studio: pick the agent, turn Streaming ON, verify tool calls/outputs; refine the prompt.  
6) Schedules: run daily at 07:45 (your TZ); add recipients for delivery.

### API parity
- Run via chat: `POST /v1/chat/completions` with `model: "web-news-finance"` — see [Chat Completions](/api/reference/chat-completions)
- Tools inventory: `GET /v1/core/tools` — see [Core Utilities](/api/reference/core-utilities)

<!-- ### Screenshot placeholder
![Recipe — Web News agent configured and scheduled](./images/recipe-web-news.png)
(Description: Composite or two screenshots: Agent configuration with Tools enabled; Schedules entry set for 07:45 with recipients. Include a small example of tool output in Prompt Studio.) -->

---

## B) “GitHub Triage” agent

### Goal
Search repos for new issues, post comments, and optionally create tracking issues.

### Steps
1) MCP: connect the `github` server with a least‑privilege PAT.  
2) Agents: create `code-reviewer` bound to a deterministic model; enable Tools; grant `search_issues`, `create_issue`, `add_issue_comment`.  
3) Prompt Studio: test with a repo/org filter; confirm tool traces before enabling write actions.  
4) (Optional) Schedules: run hourly and email a digest of new issues found by search.

### API parity
- Tools inventory: `GET /v1/core/tools` — see [Core Utilities](/api/reference/core-utilities)
- Run via chat: `POST /v1/chat/completions` with `model: "code-reviewer"` — see [Chat Completions](/api/reference/chat-completions)

<!-- ### Screenshot placeholder
![Recipe — GitHub triage with tool permissions](./images/recipe-github-triage.png)
(Description: Agents screen showing `code-reviewer` with Tool permissions selected for specific GitHub functions, and Prompt Studio logs demonstrating `search_issues` calls. Optional Schedules panel with hourly cadence.) -->
