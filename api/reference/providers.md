---
title: Providers
---

# Providers

Configure upstream AI providers once (API keys/URLs are stored per account with secrets masked in reads). Then reference the provider via `providerKey` when adding models.

## Endpoints

### GET `/v1/core/providers`

Returns your configured providers with masked `apiKey`.

```ts
await fetch("https://agents.missionsquad.ai/v1/core/providers", {
  headers: { "x-api-key": process.env.MSQ_API_KEY! }
});
```

### POST `/v1/core/add/provider`

Body:

```ts
{
  providerKey: string;   // e.g., "openai" | "anthropic" | "google" | "groq" | custom
  apiKey?: string;       // for built-ins, pass the key here
  url?: string;          // optionally override base URL for custom/self-hosted
}
```

Notes:
- For built-ins (`openai`, `anthropic`, `google`, `groq`), omit `url` unless overriding.
- Secrets are masked in subsequent reads.

Example (add OpenAI):

```ts
await fetch("https://agents.missionsquad.ai/v1/core/add/provider", {
  method: "POST",
  headers: { "x-api-key": process.env.MSQ_API_KEY!, "Content-Type": "application/json" },
  body: JSON.stringify({ providerKey: "openai", apiKey: process.env.OPENAI_KEY })
});
```

### POST `/v1/core/delete/provider`

Body:

```ts
{ providerKey: string }
```

Example:

```ts
await fetch("https://agents.missionsquad.ai/v1/core/delete/provider", {
  method: "POST",
  headers: { "x-api-key": process.env.MSQ_API_KEY!, "Content-Type": "application/json" },
  body: JSON.stringify({ providerKey: "openai" })
});
```

## See also

- [Models](/api/reference/models)
- [Core Utilities](/api/reference/core-utilities)
