---
title: Platform Images Guide
---

# Platform Images Guide

This directory contains screenshot assets referenced by the Platform documentation pages. Create images matching the filenames and captions below so they render inline in the guides.

## Capture and export standards

- Resolution: 1440×900 (or larger) PNG, optimized to < 300 KB if possible (lossless or high‑quality compression).
- Theme: Use the product’s default theme. Ensure strong contrast for callouts.
- Redactions: Mask/obfuscate secrets (API keys, tokens, emails, repo names) where shown.
- Callouts:
  - Use circled numeric markers (1, 2, 3, …) placed near the UI element center.
  - Keep callouts consistent with numbers referenced in the page text.
- Cropping: Prefer focused crops that show the full relevant panel/controls without excessive whitespace.
- Annotations: Minimal, only when the caption requests; rely on callouts otherwise.
- Filenames: Use exactly the names listed below (case‑sensitive).

## Asset checklist (filenames and intended content)

1. providers-add.png
   - Page: /platform/providers
   - Content: Providers tab. Show:
     1) Provider dropdown, 2) API Key input (masked), 3) Supported Models expandable list, 4) Delete action. Include a small “Connected ✓” indicator near the provider row if applicable.

2. models-discover-save.png
   - Page: /platform/models
   - Content: Models tab with Provider selector (left), discovered provider model IDs (center list), and a right‑hand panel showing Model Name, Description, Advanced Parameters (Temperature, Max Tokens, Top‑P/Top‑K, Seed, Stop), and a Save button. Include a tooltip on Temperature.

3. agents-config.png
   - Page: /platform/agents
   - Content: Agents editor showing fields for Name, Description, Agent Prompt (large textarea), Model selector, toggles for “Use Tools (MCP)” and “Use Embeddings (RAG)”. When Tools is enabled, show multiselect of specific tool functions. When Embeddings is enabled, show a list of collections with checkboxes. Include a “Publish Agent” toggle and Save button.

4. mcp-servers-tools.png
   - Page: /platform/mcp
   - Content: MCP tab showing a left server list with “Connected ✓” badges, a main panel with Run Command, Description, optional Auth Token, and a right pane listing Available Tools with name, description, and pretty‑printed inputSchema (JSON Schema). Include an expandable “Server Logs” panel with recent lines.

5. prompt-studio-streaming.png
   - Page: /platform/prompt-studio
   - Content: Prompt Studio with Target Model/Agent selector, large prompt editor, Streaming toggle ON, and a right panel listing live events: tool_start, tool_end, token deltas. Include “Load prompt from agent” and “Save prompt to agent” buttons.

6. schedules-create.png
   - Page: /platform/schedules
   - Content: Schedules form with Agent selector, Prompt textarea, Start Date picker, Frequency dropdown (daily/weekly/etc.), Times to Run multi‑select (timezone visible), Recipients (emails and optional Slack), and an Enabled toggle in active state.

7. embeddings-store-list.png
   - Page: /platform/embeddings
   - Content: Embeddings tab showing a list of Vector Stores with columns for Name, Item Counts, Last Updated, and a status badge.

8. embeddings-vector-store.png
   - Page: /platform/embeddings
   - Content: Vector Store detail with files table (embedded/pending/failed), item counts, a “Cancel embedding” action, and a sidebar showing Store Name, Chunking Strategy, Embedding Model. Include an “Attach to Agent” hint.

9. workflows-overview.png
   - Page: /platform/workflows
   - Content: Diagram or UI representing helper agents running in parallel feeding placeholders (e.g., {{research}}, {{pros_cons}}) that interpolate into a primary agent’s final prompt. Label parallel and composition phases.

10. recipe-web-news.png
    - Page: /platform/recipes
    - Content: Composite or two screenshots: Agent configuration for a “web-news-finance” agent with Tools enabled (webtools/rss), and a Schedules entry set for 07:45 with recipients. Optionally include a small Prompt Studio output showing tool results.

11. recipe-github-triage.png
    - Page: /platform/recipes
    - Content: Agents screen for a “code-reviewer” agent with Tool permissions selected for GitHub functions (search_issues, create_issue, add_issue_comment), and Prompt Studio logs showing calls. Optional Schedules panel with hourly cadence.

12. security-overview.png
    - Page: /platform/security
    - Content: Composite: Providers tab with masked API keys; Agents editor showing specific MCP functions selected; Embeddings selector showing a single collection attached. Emphasize masked secrets and least‑privilege.

13. troubleshoot-models-discovery.png
    - Page: /platform/troubleshooting
    - Content: Models tab with a provider selected; discovery attempted with an empty/failed result notice. Include an annotation reminding to verify key entitlements.

14. troubleshoot-mcp-logs.png
    - Page: /platform/troubleshooting
    - Content: MCP tab with a selected server showing “Disconnected” and an expanded “Server Logs” panel highlighting an auth/startup error (e.g., 401 or connection refused).

15. top-navigation.png
    - Page: /platform/getting-started
    - Content: Header with tabs for Providers, Models, Agents, Workflows, Schedules, Embeddings, Prompt Studio, MCP. Active tab highlighted. Include a page title or breadcrumb matching the active section.

## Directory structure

Place all screenshots in this directory:
- /platform/images/*.png

No additional subfolders are required. Use exactly the filenames above to match the markdown references across platform pages.
