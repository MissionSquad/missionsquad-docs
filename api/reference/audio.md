---
title: Audio (TTS/STT)
---

# Audio (TTS/STT)

Audio endpoints for speech generation (Text-to-Speech) and transcription (Speech-to-Text).

## Endpoints

- POST `/v1/core/audio/tts`
- POST `/v1/core/audio/tts/stream`
- POST `/v1/core/audio/stt`

## Supported Providers

Current provider support in MissionSquad API:

| Provider key | TTS (`/tts`) | Streaming TTS (`/tts/stream`) | STT (`/stt`) | Notes |
| --- | --- | --- | --- | --- |
| `openai` | Yes | Yes | Yes | Supports STT `timestampGranularities` (`word`, `segment`). |
| `groq` | Yes | No | Yes | TTS output is currently `wav` in provider mapping. |
| `elevenlabs` | Yes | Yes | Yes | Supports diarization and audio event tagging in STT. |
| `google` | No | No | No | Not supported for these audio endpoints. |
| `anthropic` | No | No | No | Not supported for these audio endpoints. |

Provider configuration rules:

- For `openai` and `groq`, provider credentials must be configured for the user.
- `elevenlabs` can run in temporary mode without saved provider config by passing request-level `apiKey` (and optional `url`).

## POST `/v1/core/audio/tts`

Generate speech and return binary audio.

### Request body (JSON)

Required:

- `text` (string)
- Either:
  - `voiceName` (saved voice alias), or
  - `providerKey` + `voice`

Optional:

- `model`
- `responseFormat`: `mp3` | `opus` | `aac` | `flac` | `wav` | `pcm`
- `speed`
- `ttsOptions` (provider-specific options)
- `apiKey`, `url` (temporary ElevenLabs usage)

### Response

- Binary audio payload
- `Content-Type` derived from `responseFormat`:
  - `mp3` -> `audio/mpeg`
  - `opus` -> `audio/opus`
  - `aac` -> `audio/aac`
  - `flac` -> `audio/flac`
  - `wav` -> `audio/wav`
  - `pcm` -> `audio/L16`

### Example

```bash
curl -X POST "https://agents.missionsquad.ai/v1/core/audio/tts" \
  -H "x-api-key: $MSQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "providerKey": "openai",
    "voice": "alloy",
    "text": "Mission Squad audio test.",
    "responseFormat": "mp3"
  }' \
  --output speech.mp3
```

## POST `/v1/core/audio/tts/stream`

Stream generated audio over SSE.

### Request body (JSON)

Same fields as `/v1/core/audio/tts`.

### Stream events

- `data: {"type":"audio_chunk","b64":"..."}`
- `data: {"type":"audio_stop"}`
- `data: {"type":"error","message":"..."}`
- `data: [DONE]`

### Provider notes

- Streaming is supported for `openai` and `elevenlabs`.
- If a provider does not support streaming TTS, you will receive an SSE `error` event.

## POST `/v1/core/audio/stt`

Transcribe uploaded audio.

### Request (`multipart/form-data`)

Required fields:

- `file`
- `providerKey`

Optional fields:

- `model`
- `language`
- `prompt`
- `responseFormat` or `response_format`: `json` | `text` | `srt` | `verbose_json` | `vtt`
- `timestampGranularities`
  - `word`
  - `segment`
  - array, JSON array string, or comma-separated string
- `diarize` (`true`/`false` or boolean)
- `tagAudioEvents` (`true`/`false` or boolean)
- `extraParams` or `extra_params` (JSON object or JSON object string)
- `apiKey`, `url` (temporary ElevenLabs usage)

### File validation

Accepted MIME types:

- `audio/mpeg`
- `audio/wav`
- `audio/ogg`
- `audio/webm`

### Response

JSON transcription payload:

- `text` (string)
- `model` (string)
- Optional provider-dependent fields:
  - `language`
  - `duration`
  - `segments`
  - `words`

### Validation and errors

- `400` for invalid/missing required fields, invalid booleans, invalid JSON object fields, invalid timestamp granularity values, unsupported MIME types, or unconfigured providers.
- `401` for unauthorized requests.
- `500` when transcription fails.

### Example

```bash
curl -X POST "https://agents.missionsquad.ai/v1/core/audio/stt" \
  -H "x-api-key: $MSQ_API_KEY" \
  -F "providerKey=openai" \
  -F "file=@./sample.wav;type=audio/wav" \
  -F "response_format=verbose_json" \
  -F "timestampGranularities=[\"word\",\"segment\"]"
```

## See also

- [Core Utilities](/api/reference/core-utilities)
- [Providers](/api/reference/providers)
- [Models](/api/reference/models)
- [Endpoint Index](/api/reference/endpoint-index)
