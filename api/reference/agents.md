---
title: Agents
---

# Agents

Create and manage named agents that can be targeted from chat completions by their `name`.

## Endpoints

### GET `/v1/core/agents`

Returns your agent configurations (map keyed by agent name).

```ts
await fetch("https://agents.missionsquad.ai/v1/core/agents", {
  headers: { "x-api-key": process.env.MSQ_API_KEY! }
});
```

### POST `/v1/core/add/agent`

Create or update an agent.

Body (required + optional fields supported by the server):

```ts
{
  name: string;
  description: string;
  systemPrompt: string;
  model: string;                    // name of a model you've added
  overwrite?: boolean;
  addToday?: boolean;               // if true and first message is `system`, current date is injected
  timezoneOffset?: string;          // for date formatting; defaults to "-0500" if not provided
  selectedFunctions?: {             // preselect MCP functions for the agent (if applicable)
    [serverName: string]: string[];
  };
}
```

Example:

```ts
await fetch("https://agents.missionsquad.ai/v1/core/add/agent", {
  method: "POST",
  headers: { "x-api-key": process.env.MSQ_API_KEY!, "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "my-custom-agent",
    description: "Specialized helper",
    systemPrompt: "You are helpful.",
    model: "my-gpt4",
    overwrite: false,
    addToday: true,
    timezoneOffset: "-0500"
  })
});
```

### POST `/v1/core/delete/agent`

Delete an agent by name.

Body:

```json
{ "name": "my-agent" }
```

```ts
await fetch("https://agents.missionsquad.ai/v1/core/delete/agent", {
  method: "POST",
  headers: { "x-api-key": process.env.MSQ_API_KEY!, "Content-Type": "application/json" },
  body: JSON.stringify({ name: "my-agent" })
});
```

## Notes

- Agents can be invoked from chat completions by setting `model` to the agent's `name` (e.g., `model: "my-custom-agent"`).

## See also

- [Models](/api/reference/models)
- [Chat Completions](/api/reference/chat-completions)
- [Core Utilities](/api/reference/core-utilities)
