---
title: Providers
---

# Providers

Purpose: Store vendor credentials once per account; all subsequent model/agent actions reuse them.

![Full‑page Providers tab showing Provider dropdown [1], API Key input [2] with masked state after save, Supported Models expandable list [3], and a Delete action [4].](./images/providers.png)

## Key UI elements

1. Provider Name (dropdown): choose `openai`, `google`, `anthropic`, `groq`, or custom.  
2. API Key: paste the vendor key; the UI masks after save.  
3. Supported Models: expandable list the platform fetched for this provider (for inspection).  
4. Delete: removes the provider from your namespace only.

## Tips

- Use separate provider entries for different accounts or regions if you need isolation.
- For OpenAI‑compatible endpoints (e.g., Together, LM Studio/vLLM, custom runtimes), add as `missionsquad` or custom with the appropriate base URL via API.

## API parity

- List: `GET /v1/core/providers`  
- Add: `POST /v1/core/add/provider`  
- Delete: `POST /v1/core/delete/provider`  
See [Providers](/api/reference/providers)

## Troubleshooting

- If Supported Models is empty, verify the key and provider availability.
