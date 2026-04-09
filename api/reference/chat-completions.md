---
title: Chat Completions (POST /v1/chat/completions)
---

# Chat Completions

POST `/v1/chat/completions`

OpenAI-compatible chat completions. Target either:

- a model you added
- one of your own published agents by agent name
- a shared published agent by canonical id `shared/<ownerUsername>/<slug>`

## Request

Body (essential fields):

- `model` (string) — Your model name, your own published agent name, or a shared published agent id such as `shared/john_doe/customer-support-bot`.
- `messages` (array) — Items of `{ role: "system" | "user" | "assistant" | "tool", content: string }`.

Optional OpenAI-style parameters:

- `temperature`, `max_tokens`, `top_p`, `n`, `stop`, `tools`, `tool_choice`, `stream`.
- `response_format` or `responseFormat` for structured output hints.
- `extra_params` or `extraParams` for provider-specific passthrough options.

Notes:

- `model` may be:
  - a user model name
  - an owned published agent name
  - a shared published agent id in the form `shared/<ownerUsername>/<slug>`
- Tool usage: Provide `tools` in the OpenAI function/tool format:
  - `type: "function"`
  - `function: { name: string; description?: string; parameters: JSONSchema }`
- Streaming: Set `stream: true` for Server-Sent Events (SSE). The API sends OpenAI-like delta chunks (`text/event-stream`).

### Structured output and provider params

`POST /v1/chat/completions` accepts both snake_case and camelCase for structured output and passthrough params:

- `response_format` or `responseFormat`
- `extra_params` or `extraParams`

Supported `response_format` shapes:

- Text mode:
  - `{ "type": "text" }`
- JSON object mode:
  - `{ "type": "json_object", "schema": { ...optional JSON schema object... } }`
- JSON schema mode:
  - `{ "type": "json_schema", "json_schema": { "schema": { ...required schema object... } } }`

Notes:

- If `response_format` is not in a valid shape, it is ignored and the request continues without structured output hints.
- Actual schema enforcement is provider/model-specific.

## Examples

### JavaScript (fetch, non‑streaming)

```ts
const res = await fetch("https://agents.missionsquad.ai/v1/chat/completions", {
  method: "POST",
  headers: {
    "x-api-key": process.env.MSQ_API_KEY!,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    model: "my-gpt4",
    messages: [
      { role: "system", content: "You are helpful." },
      { role: "user", content: "Write a haiku about summer." }
    ],
    temperature: 0.7
  })
});
const data = await res.json();
console.log(data.choices[0].message.content);
```

### JavaScript (Node 20+, streaming via fetch and readable body)

```ts
const res = await fetch("https://agents.missionsquad.ai/v1/chat/completions", {
  method: "POST",
  headers: {
    "x-api-key": process.env.MSQ_API_KEY!,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    model: "my-gpt4",
    messages: [
      { role: "system", content: "You are helpful." },
      { role: "user", content: "Stream a short story in 2 paragraphs." }
    ],
    stream: true
  })
});

if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

const reader = res.body.getReader();
const decoder = new TextDecoder();
while (true) {
  const { value, done } = await reader.read();
  if (done) break;
  const chunk = decoder.decode(value);
  // Stream is SSE: lines prefixed with "data: ..."
  for (const line of chunk.split("\n")) {
    if (line.startsWith("data: ")) {
      const payload = line.slice(6).trim();
      if (payload === "[DONE]") break;
      try {
        const event = JSON.parse(payload);
        // event is OpenAI-like chat.completion.chunk
        // consume event.choices[0].delta?.content, etc.
      } catch {}
    }
  }
}
```

### OpenAI SDK (non‑streaming)

```ts
import OpenAI from "openai";
const client = new OpenAI({ apiKey: process.env.MSQ_API_KEY, baseURL: "https://agents.missionsquad.ai/v1" });

const completion = await client.chat.completions.create({
  model: "my-gpt4-or-agent-name",
  messages: [
    { role: "user", content: "Summarize this in 3 bullet points: ..." }
  ],
  // tools: [{ type: "function", function: { name, description, parameters: { type: "object", properties: {}, required: [] } } }]
});
console.log(completion.choices[0].message);
```

### JavaScript (fetch, structured output)

```ts
const res = await fetch("https://agents.missionsquad.ai/v1/chat/completions", {
  method: "POST",
  headers: {
    "x-api-key": process.env.MSQ_API_KEY!,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    model: "my-gpt4",
    messages: [{ role: "user", content: "Return title and summary for this article." }],
    response_format: {
      type: "json_schema",
      json_schema: {
        schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            summary: { type: "string" }
          },
          required: ["title", "summary"],
          additionalProperties: false
        }
      }
    },
    extra_params: {
      // provider-specific passthrough values
      seed: 12345
    }
  })
});

const data = await res.json();
console.log(data.choices?.[0]?.message?.content);
```

## Optional Headers

- `x-client-id`: arbitrary client identifier for event correlation.
- `x-session-id`: provide to correlate tool-call events and streaming usage metrics within a session.

## See also

- [API Overview](/api/)
- [Embeddings](/api/reference/embeddings)
- [Agents](/api/reference/agents)
