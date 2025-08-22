# Mission Squad Docs

Welcome to the Mission Squad documentation. Use the navigation to explore the API and Platform guides.


## Platform (Cloud UI)

A dedicated section for the MissionSquad Platform (cloud or customer-hosted UI) will be available here. It will cover navigating the dashboard, managing providers/models/agents, vector stores and files, usage and settings.

See placeholder: [Platform](/platform/)

## API

- Read the full API Overview at [/api/](/api/).
- Use the official OpenAI SDK by setting `baseURL` to your MissionSquad API and passing your MissionSquad API key as `apiKey` (Authorization: `Bearer msq-...` accepted). See [/api/](/api/) and [/api/reference/chat-completions](/api/reference/chat-completions) for examples.
- For embeddings, use a supported embedding model such as `text-embedding-3-small` or `nomic-embed-text-v1.5`. `text-embedding-3-large` is not supported and requests will return HTTP 400.

