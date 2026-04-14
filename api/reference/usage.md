---
title: Usage
---

# Usage

Usage endpoints expose the authenticated account's LLM usage metrics recorded by MissionSquad. These endpoints are read-only and return aggregates over the underlying `LLMUsageMetric` records:

```ts
interface LLMUsageMetric {
  chatId: string
  modelName: string
  inputTokens: number | null
  outputTokens: number | null
  startTime: number
  endTime: number
  error?: string
  username: string
  tools: boolean
}
```

## Time Range Filters

Every usage endpoint requires either:

- `start` and `end`
- or `last`

Accepted formats:

- `start` / `end`: Unix milliseconds or ISO datetime string
- `last`: compact relative window string in the format `<n><unit>`

Supported `last` units:

- `s` seconds
- `m` minutes
- `h` hours
- `d` days

Examples:

- `last=24h`
- `last=7d`
- `start=1710000000000&end=1710086400000`
- `start=2026-04-01T00:00:00Z&end=2026-04-08T00:00:00Z`

Shared optional filters:

- `modelName` — exact model name filter
- `chatId` — exact chat/run id filter
- `tools` — `true` or `false`

Validation behavior:

- `400` if neither a valid `start`/`end` pair nor a valid `last` window is provided
- `400` if `end` is not greater than `start`

## GET `/v1/core/usage/raw`

Return raw usage rows for the authenticated account.

Additional query parameters:

- `limit` default `100`, maximum `1000`
- `offset` default `0`

Example:

```ts
const res = await fetch(
  "https://agents.missionsquad.ai/v1/core/usage/raw?last=7d&limit=50&offset=0&tools=true",
  { headers: { "x-api-key": process.env.MSQ_API_KEY! } }
);
const data = await res.json();
console.log(data);
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "chatId": "chat_01",
      "modelName": "research-orchestrator",
      "inputTokens": 1200,
      "outputTokens": 340,
      "startTime": 1710000000000,
      "endTime": 1710000004200,
      "username": "alice",
      "tools": true
    }
  ]
}
```

## GET `/v1/core/usage/summary`

Return aggregate totals over the filtered range.

Response shape:

```ts
{
  success: true
  data: {
    inputTokens: number
    outputTokens: number
    callCount: number
    errorCount: number
    durationMsTotal: number
    durationMsAvg: number
  }
}
```

Example:

```ts
const res = await fetch(
  "https://agents.missionsquad.ai/v1/core/usage/summary?last=30d",
  { headers: { "x-api-key": process.env.MSQ_API_KEY! } }
);
const data = await res.json();
console.log(data);
```

Example response:

```json
{
  "success": true,
  "data": {
    "inputTokens": 15420,
    "outputTokens": 4810,
    "callCount": 42,
    "errorCount": 1,
    "durationMsTotal": 98321,
    "durationMsAvg": 2341
  }
}
```

## GET `/v1/core/usage/models`

Return aggregated usage grouped by `modelName`.

Response shape:

```ts
{
  success: true
  data: Array<{
    modelName: string
    inputTokens: number
    outputTokens: number
    callCount: number
    errorCount: number
    durationMsTotal: number
  }>
}
```

Example:

```ts
const res = await fetch(
  "https://agents.missionsquad.ai/v1/core/usage/models?last=30d",
  { headers: { "x-api-key": process.env.MSQ_API_KEY! } }
);
const data = await res.json();
console.log(data);
```

## GET `/v1/core/usage/timeseries`

Return aggregated usage buckets over time.

Additional query parameter:

- `interval` — required, one of `hour`, `day`, `month`

Validation behavior:

- `400` if `interval` is not one of `hour|day|month`

Response shape:

```ts
{
  success: true
  data: Array<{
    bucketStartMs: number
    inputTokens: number
    outputTokens: number
    callCount: number
    errorCount: number
    durationMsTotal: number
  }>
}
```

Example:

```ts
const res = await fetch(
  "https://agents.missionsquad.ai/v1/core/usage/timeseries?last=7d&interval=day",
  { headers: { "x-api-key": process.env.MSQ_API_KEY! } }
);
const data = await res.json();
console.log(data);
```

Example response:

```json
{
  "success": true,
  "data": [
    {
      "bucketStartMs": 1710000000000,
      "inputTokens": 4200,
      "outputTokens": 1130,
      "callCount": 9,
      "errorCount": 0,
      "durationMsTotal": 21440
    }
  ]
}
```

## GET `/v1/core/usage/billing`

Return billing-oriented aggregates.

Additional query parameter:

- `groupBy` — optional, one of:
  - `model` default
  - `model:day`
  - `model:month`

Validation behavior:

- `400` if `groupBy` is not `model`, `model:day`, or `model:month`

Response when `groupBy=model`:

```ts
{
  success: true
  data: Array<{
    modelName: string
    inputTokens: number
    outputTokens: number
    callCount: number
  }>
}
```

Response when `groupBy=model:day` or `model:month`:

```ts
{
  success: true
  data: Array<{
    modelName: string
    bucketStartMs: number
    inputTokens: number
    outputTokens: number
    callCount: number
  }>
}
```

Example:

```ts
const res = await fetch(
  "https://agents.missionsquad.ai/v1/core/usage/billing?last=30d&groupBy=model:day",
  { headers: { "x-api-key": process.env.MSQ_API_KEY! } }
);
const data = await res.json();
console.log(data);
```

## Error Handling

Common responses:

- `401` when the request is unauthenticated
- `400` for invalid time-range, interval, or billing-group parameters
- `500` for unexpected server errors

Example error response:

```json
{
  "success": false,
  "message": "interval must be one of hour|day|month"
}
```

## See also

- [Chat Completions](/api/reference/chat-completions)
- [Agents](/api/reference/agents)
- [API Overview](/api/)
- [Endpoint Index](/api/reference/endpoint-index)
