---
title: Core Utilities
---

# Core Utilities

Utilities for inspecting configuration, generating prompts, scraping content, listing tools/servers, and executing agent workflows.

## Endpoints

### POST `/v1/core/generate/prompt`

Generate a prompt with a model based on messages and metadata.

Body:

```ts
{ model, messages, name?, description?, type?: "agent" | "workflow", modelOptions? }
```

Example:

```ts
const res = await fetch("https://agents.missionsquad.ai/v1/core/generate/prompt", {
  method: "POST",
  headers: { "x-api-key": process.env.MSQ_API_KEY!, "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "my-gpt4",
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: "Create a prompt for an agent that summarizes PDFs." }
    ],
    name: "pdf-summarizer",
    description: "Prompt to instruct summarization of PDFs",
    type: "agent"
  })
});
const data = await res.json();
console.log(data);
```

Response:

```json
{
  "data": "You are a PDF summarization assistant. Your goal is to read PDF content and produce concise summaries..."
}
```

---

### GET `/v1/core/config`

Returns your core config: models, agents, embedding models, and embedded collections. Secrets masked.

```ts
const res = await fetch("https://agents.missionsquad.ai/v1/core/config", {
  headers: { "x-api-key": process.env.MSQ_API_KEY! }
});
const data = await res.json();
console.log(data);
```

---

### POST `/v1/core/scrape-url`

Server scrapes text content and returns it.

```ts
const res = await fetch("https://agents.missionsquad.ai/v1/core/scrape-url", {
  method: "POST",
  headers: { "x-api-key": process.env.MSQ_API_KEY!, "Content-Type": "application/json" },
  body: JSON.stringify({ url: "https://example.com" })
});
const data = await res.json();
console.log(data);
```

Response:

```json
{
  "success": true,
  "data": "This domain is for use in illustrative examples in documents..."
}
```

---

### GET `/v1/core/tools`

Returns available tool definitions (e.g., for agents to call during chats).

```ts
const res = await fetch("https://agents.missionsquad.ai/v1/core/tools", {
  headers: { "x-api-key": process.env.MSQ_API_KEY! }
});
const data = await res.json();
console.log(data);
```

Response (grouped by MCP server; each tool exposes an inputSchema):

```json
{
  "success": true,
  "tools": [
    {
      "weather-server": [
        {
          "name": "weather",
          "description": "Get weather information.",
          "inputSchema": {
            "type": "object",
            "properties": { "location": { "type": "string" } }
          }
        }
      ]
    },
    {
      "calculator-server": [
        {
          "name": "calculator",
          "description": "Evaluate a math expression.",
          "inputSchema": {
            "type": "object",
            "properties": { "expression": { "type": "string" } }
          }
        }
      ]
    }
  ]
}
```

---

### GET `/v1/core/servers`

Returns available MCP server names/inventory for tooling (if applicable).

```ts
const res = await fetch("https://agents.missionsquad.ai/v1/core/servers", {
  headers: { "x-api-key": process.env.MSQ_API_KEY! }
});
const data = await res.json();
console.log(data);
```

Response:

```json
{
  "success": true,
  "servers": [
    {
      "name": "weather-server",
      "command": "node",
      "args": ["server.js"],
      "env": { "NODE_ENV": "production" },
      "status": "connected",
      "enabled": true
    },
    {
      "name": "calculator-server",
      "command": "python",
      "args": ["calc.py"],
      "env": {},
      "status": "disconnected",
      "enabled": false
    }
  ]
}
```

---

### POST `/v1/core/agent-workflow`

Execute a workflow by agent name.

Body:

```ts
{ agentName, messages, data?, delimiter?, concurrency?, failureMessage?, failureInstruction? }
```

Example:

```ts
const res = await fetch("https://agents.missionsquad.ai/v1/core/agent-workflow", {
  method: "POST",
  headers: { "x-api-key": process.env.MSQ_API_KEY!, "Content-Type": "application/json" },
  body: JSON.stringify({
    agentName: "my-custom-agent",
    messages: [{ role: "user", content: "What is the capital of France?" }],
    data: { context: "Geography Q&A" }
  })
});
const data = await res.json();
console.log(data);
```

Response (example where workflow returns a chat completion):

```json
{
  "success": true,
  "data": {
    "id": "chatcmpl-abc123",
    "object": "chat.completion",
    "created": 1710000000,
    "model": "my-gpt4",
    "choices": [
      {
        "message": { "role": "assistant", "content": "Paris." },
        "finish_reason": "stop",
        "index": 0
      }
    ],
    "usage": {
      "prompt_tokens": 10,
      "completion_tokens": 2,
      "total_tokens": 12
    }
  }
}
```

## See also

- [Agents](/api/reference/agents)
- [Models](/api/reference/models)
- [API Overview](/api/)
