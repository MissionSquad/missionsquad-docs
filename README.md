# Self-Hosted VitePress + TypeScript with Mission Squad Search and Ask (SSE)

Authoritative implementation based on .nexus/guides/self-hosted-vitepress-ts-missionsquad-search.md.

## Project Layout

```
docs/
  .vitepress/
    config.ts
    theme/
      index.ts
      components/
        Search.vue
      lib/
        streamAsk.ts
  public/
    search-index.json           # built or placeholder
  scripts/
    buildSearchIndex.ts         # build-time embeddings indexer
  worker/
    src/
      index.ts                  # Cloudflare Worker SSE proxy
    wrangler.toml
  package.json
  tsconfig.json
  index.md                      # sample content
```

## Prerequisites

- Node.js >= 20
- Yarn installed
- Mission Squad API:
  - MS_BASE_URL (e.g., https://agents.missionsquad.ai/v1 or your gateway)
  - MS_API_KEY (secret)

## Install

From the repository root:

```
cd missionsquad-docs/docs
yarn install
```

## Build-time Embeddings Index

Build the search index from Markdown content. This calls your Mission Squad embeddings endpoint and writes `public/search-index.json`.

```
cd missionsquad-docs/docs
MS_BASE_URL=https://agents.missionsquad.ai/v1 \
MS_API_KEY=sk-... \
MS_EMBED_MODEL=text-embedding-3-large \
yarn build:search
```

Notes:
- `MS_BASE_URL` may include or omit `/v1`. The indexer normalizes to call `/v1/embeddings` correctly.
- `public/search-index.json` is served at `/search-index.json`.

## Local Development

Run VitePress locally:

```
yarn dev
# open http://localhost:5173
```

The search UI loads from `/search-index.json`. Query-time embeddings and streaming Ask use `/api/*` which should point to your deployed Worker. For production, Nginx proxies `/api/*` to the Worker. During local dev, you can:
- Deploy the Worker and access it via your domain, then run VitePress behind Nginx with the provided proxy; or
- Temporarily keep the search UI visible but expect network errors for `/api/embed` until the Worker is reachable.

## Static Build

```
yarn build:all      # builds search index then VitePress site
yarn preview        # preview the static build locally
```

## Cloudflare Worker (SSE Proxy)

Code: `docs/worker/src/index.ts`

Config: `docs/worker/wrangler.toml`

Deploy:

```
cd missionsquad-docs/docs/worker
yarn dlx wrangler deploy
yarn dlx wrangler secret put MS_API_KEY
# Ensure MS_BASE_URL is set in wrangler.toml [vars] or dashboard
```

Convenience scripts (from `docs/`):

```
yarn worker:deploy
yarn worker:secret      # prompts for MS_API_KEY
```

Endpoints forwarded:
- `/api/embed` → `{MS_BASE_URL}/v1/embeddings` (normalized whether MS_BASE_URL ends with /v1 or not)
- `/api/ask` → `{MS_BASE_URL}/v1/chat/completions` (SSE pass-through)

CORS:
- The Worker allows `Access-Control-Allow-Origin: *` by default; restrict if needed.

## Nginx (Production)

Use `nginx.conf.example` in this directory as a starting point. Key points:
- Serve VitePress statics from `.vitepress/dist`
- `try_files $uri $uri.html $uri/ =404;` for clean URLs
- Proxy `/api/*` to your Worker domain with:
  - `proxy_buffering off;`
  - `proxy_set_header X-Accel-Buffering no;`
  - `proxy_read_timeout 3600s;`
  - `proxy_http_version 1.1;`

## Security

- Never expose `MS_API_KEY` to the browser.
- Store `MS_API_KEY` as a Cloudflare Worker secret.
- If docs require auth, enforce it at Nginx and in the Worker (return 401 for `/api/*`).

## Troubleshooting

- 401/403 from embeddings: wrong `MS_BASE_URL` or missing `MS_API_KEY` in Worker; for build index, ensure env vars are set.
- CORS errors: adjust `Access-Control-Allow-Origin` in Worker.
- SSE chunking/buffering: ensure Nginx buffering is disabled and `X-Accel-Buffering: no` header is present.
- No search results: ensure `public/search-index.json` exists and contains vector dimensions (`dims > 0`).
- Heading anchors: `github-slugger` ensures stable anchors from headings.

## Scripts Reference

From `docs/package.json`:
- `dev`: VitePress dev
- `build:search`: Build embeddings index
- `build`: VitePress build
- `build:all`: Build index then site
- `preview`: Preview built site
- `worker:deploy`: Deploy Cloudflare Worker
- `worker:secret`: Set `MS_API_KEY` secret
