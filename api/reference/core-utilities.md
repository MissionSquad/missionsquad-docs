---
title: Core Utilities
---

# Core Utilities

Utilities for inspecting configuration, generating prompts, scraping content, and listing tools and
servers. Workflow configs and runs now have their own page — see [Workflows](/api/reference/workflows).

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

Returns the MCP servers available to your account. Non-external servers must be `enabled`; external
servers must be `installed` and `enabled` to appear. See
[MCP Servers (Connect & OAuth)](/api/reference/mcp-servers) for connecting external servers.

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
      "displayName": "Weather",
      "description": "Weather lookups",
      "source": "platform",
      "transportType": "stdio",
      "status": "connected",
      "enabled": true,
      "installed": true
    }
  ]
}
```

---

### POST `/v1/core/audio/stt` — Speech-to-Text (multipart/form-data)

For complete audio endpoint documentation (TTS + streaming + STT + provider support), see [Audio (TTS/STT)](/api/reference/audio).

Transcribe uploaded audio using a configured audio-capable provider.

Required form fields:

- `file` (multipart file)
- `providerKey` (string)

Optional form fields:

- `model`, `language`, `prompt`
- `responseFormat` or `response_format` (`json` | `text` | `srt` | `verbose_json` | `vtt`)
- `timestampGranularities`:
  - `word`
  - `segment`
  - array of those values
  - JSON array string (for multipart clients)
  - comma-separated string
- `diarize`, `tagAudioEvents` as boolean or `"true"` / `"false"`
- `extraParams` or `extra_params` as object or JSON-object string
- `apiKey`, `url` for temporary `elevenlabs` usage when that provider is not saved in account config

Validation behavior:

- `400` on invalid boolean fields, invalid JSON object payloads, or invalid `timestampGranularities`
- `400` if audio MIME type is not one of:
  - `audio/mpeg`
  - `audio/wav`
  - `audio/ogg`
  - `audio/webm`
- `400` for missing/invalid `providerKey` or file upload
- `400` when provider is not configured (except temporary ElevenLabs flow)
- `500` if transcription fails upstream

Example:

```bash
curl -X POST "https://agents.missionsquad.ai/v1/core/audio/stt" \
  -H "x-api-key: $MSQ_API_KEY" \
  -F "providerKey=openai" \
  -F "file=@./sample.wav;type=audio/wav" \
  -F "response_format=verbose_json" \
  -F "timestampGranularities=[\"word\",\"segment\"]" \
  -F "diarize=false" \
  -F "extra_params={\"temperature\":0}"
```

Example response (shape varies by provider/format):

```json
{
  "text": "Hello world.",
  "model": "provider-model-id",
  "language": "en",
  "duration": 1.2,
  "segments": [],
  "words": []
}
```

---

## Workflows

The workflow APIs — saved configs, async/resumable runs, live SSE streaming, transcript hydration, and
the legacy `POST /v1/core/agent-workflow` — now have a dedicated page:

- [Workflows](/api/reference/workflows)

That page covers the data-interpolation syntax (<code v-pre>{{ data }}</code> templates and
`<selector|#|dataKey>` helper selectors), the full `WorkflowConfigRecord` and `WorkflowRunRecord`
shapes, and every endpoint under `/v1/core/workflows` and `/v1/core/workflow-runs`.

## Account settings

### GET `/v1/core/user/settings`

Return your account settings (utility-agent selections). When nothing is stored, defaults are returned.

```ts
{
  success: true;
  settings: {
    userId: string;
    utilityAgents: { titleAgent: string | null; configAgent: string | null };
    updatedAt: number;
  };
}
```

### PUT `/v1/core/user/settings`

Update your settings. Only keys present in the body are changed.

Body:

```ts
{ utilityAgents?: { titleAgent?: string | null; configAgent?: string | null } }
```

Response: `{ success: true, settings: UserSettings }`. `400 "Invalid payload"` when a field is the
empty string or the wrong type.

## Config agent

The config agent is an account assistant that can manage your MissionSquad configuration through the
[Mission Squad MCP server](/mcp-server/).

### GET `/v1/core/config-agent/status`

```ts
{
  provisioned: boolean;
  agentName: string | null;
  ready: boolean;                  // true only when the config agent + its MCP tools are available
  availableProviders: Array<{ providerKey: string; modelName: string }>;
}
```

### POST `/v1/core/config-agent/provision`

Provision (or re-provision) the config agent. Body: `{ providerKey: string }`. Response
`{ success: true, message: "Config agent provisioned successfully" }`; `400` for a missing/unconfigured
provider; `409` when one already exists.

### Config-agent chat history

- GET `/v1/core/config-agent/chat` → `{ success: true, id: string | null, messages: ModelMessageRecord[], providerState? }`
- POST `/v1/core/config-agent/chat` (body `{ id?: string, messages: ModelMessageRecord[], providerState? }`) → `{ success: true, id: string }`
- POST `/v1/core/config-agent/chat/new` → `{ success: true, id: string }`

## Saved voices

Saved voices attach a provider voice to an agent for TTS (see [Audio (TTS/STT)](/api/reference/audio)
and `POST /v1/core/agent/speak` in [Agents](/api/reference/agents)).

- GET `/v1/core/voices` → `{ data: SavedVoice[] }`
- GET `/v1/core/voices/:name` → `{ data: SavedVoice }`; `404` when not found
- POST `/v1/core/add/voice` — body:

  ```ts
  {
    name: string;                  // required
    providerKey: string;           // required
    voiceId: string;               // required
    description?: string;
    labels?: Record<string, string>;
    overwrite?: boolean;
    responseFormat?: "mp3" | "opus" | "aac" | "flac" | "wav" | "pcm";
    speed?: number;                // 0.25–4.0
    ttsOptions?: Record<string, unknown>;
    apiKey?: string;               // temporary ElevenLabs usage
    url?: string;
  }
  ```

  Response `{ status: "success", message: "Voice saved" }`; `409` when it exists and `overwrite` is unset.
- POST `/v1/core/delete/voice` — body `{ name: string }`; `404` when not found
- POST `/v1/core/voice/details` — body `{ providerKey, voiceId, apiKey?, url? }` → `{ data: <provider voice details> }`
- POST `/v1/core/voice/details/saved` — body `{ name, apiKey?, url? }` → `{ data: <provider voice details> }`

## See also

- [Workflows](/api/reference/workflows)
- [Agents](/api/reference/agents)
- [Models](/api/reference/models)
- [Audio (TTS/STT)](/api/reference/audio)
- [Endpoint Index](/api/reference/endpoint-index)
- [API Overview](/api/)
