# Self-Hosted VitePress + TypeScript with Mission Squad Search and Ask (SSE) — Implementation Guide

Status: Authoritative, full implementation instructions. No code uses `any`. Everything is TypeScript-strict. Targets Node.js v20+.
Repository: https://github.com/missionsquad/missionsquad-docs

Contents:
- 0) Architecture
- 1) Prerequisites
- 2) Project layout
- 3) Initialize VitePress (TypeScript)
- 4) TypeScript config for docs
- 5) Build-time indexer (embeddings → public/search-index.json)
- 6) Cloudflare Worker proxy (SSE pass-through)
- 7) Client: Search component (Vue 3 + TS) and streaming Ask helper
- 8) Theme integration (VitePress slot injection)
- 9) Nginx static + `/api/*` SSE proxy
- 10) Package scripts, env, and build/run
- 11) Security, performance, and quality notes
- 12) CI/CD (optional)
- 13) Troubleshooting
- 14) References (primary docs)

---

## 0) Architecture

- VitePress (Markdown → static site)
- Build-time indexer parses `.md`, chunks by headings, calls Mission Squad `/v1/embeddings`, writes `public/search-index.json`
- Client search embeds query via `/api/embed` and ranks with cosine similarity in-browser
- Optional “Ask” sends top chunks to `/api/ask` which proxies `/v1/chat/completions` with SSE for streaming
- Search UI injected via default theme slots (`nav-bar-content-after`)

Self-hosted: You control the static site, Worker/API, and Nginx. No vendor lock-in.

---

## 1) Prerequisites

- Node.js >= 20 (for global `fetch` and modern ESM)
- Yarn >= 1 (Classic) or Yarn >= 3 (Berry). Commands below use yarn.
- A Mission Squad API endpoint (OpenAI-compatible) and API key
  - MS_BASE_URL (e.g., https://ms.your-domain.com)
  - MS_API_KEY (secret)
- Cloudflare account (for Workers) or alternative Node server (Worker recommended)
- Nginx for production static hosting and SSE-friendly reverse proxy

---

## 2) Project layout

You will create the following structure inside your docs project (folder name is arbitrary; “docs” used below):

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
    (generated) search-index.json
  scripts/
    buildSearchIndex.ts
  worker/
    src/
      index.ts
    wrangler.toml
  package.json
  tsconfig.json
  (your markdown content) *.md
```

---

## 3) Initialize VitePress (TypeScript)

From your repository root (or where you want docs), scaffold:

```bash
mkdir docs && cd docs
yarn init -y
yarn add -D vitepress@latest typescript@latest @types/node@latest
yarn create vitepress@latest
# Select: "TypeScript" for config
```

Add scripts to `docs/package.json`:

```json
{
  "type": "module",
  "scripts": {
    "dev": "vitepress dev",
    "build": "vitepress build",
    "preview": "vitepress preview",
    "build:search": "tsx scripts/buildSearchIndex.ts",
    "build:all": "yarn build:search && yarn build"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "fast-glob": "^3.3.2",
    "github-slugger": "^2.0.0",
    "gray-matter": "^4.0.3",
    "remark-parse": "^11.0.0",
    "strip-markdown": "^6.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.5.0",
    "unified": "^11.0.0",
    "vitepress": "latest",
    "wrangler": "^3.80.0"
  }
}
```

Minimal `.vitepress/config.ts`:

```ts
import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'Your Docs',
  description: 'Technical documentation',
  srcDir: '.',
  cleanUrls: true,
  themeConfig: {
    // Custom search UI, do not set Algolia
  }
});
```

---

## 4) TypeScript config for docs

Create `tsconfig.json` (TypeScript v5.5+ strict config):

```json
{
  "extends": "./node_modules/vitepress/types/tsconfig.vitepress.json",
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "useUnknownInCatchVariables": true,
    "exactOptionalPropertyTypes": true,
    "resolveJsonModule": true,
    "verbatimModuleSyntax": true,
    "esModuleInterop": true,
    "skipLibCheck": false,
    "forceConsistentCasingInFileNames": true,
    "types": ["vitepress/types", "node"]
  },
  "include": [
    ".vitepress/**/*.ts",
    ".vitepress/**/*.vue",
    "scripts/**/*.ts",
    "worker/src/**/*.ts"
  ]
}
```

Rationale:
- Node v20 supports global `fetch`, modern ESM
- `strict: true` ensures type safety; no `any` used in code below

---

## 5) Build-time indexer (embeddings → public/search-index.json)

Install deps (already in devDependencies above). Create `scripts/buildSearchIndex.ts`:

```ts
#!/usr/bin/env tsx
import fg from 'fast-glob';
import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import strip from 'strip-markdown';
import GithubSlugger from 'github-slugger';

type Embedding = readonly number[];

interface DocChunk {
  id: string;
  pagePath: string;
  url: string;
  title: string;
  heading: string;
  anchor: string;
  content: string;
  embedding: Embedding;
}

interface SearchIndex {
  model: string;
  dims: number;
  builtAt: string;
  chunks: DocChunk[];
}

const DOCS_DIR = path.resolve(process.cwd());
const PUBLIC_DIR = path.join(DOCS_DIR, 'public');
const OUT_FILE = path.join(PUBLIC_DIR, 'search-index.json');

const MS_BASE = process.env.MS_BASE_URL ?? 'https://your-ms.example.com';
const MS_KEY = process.env.MS_API_KEY ?? '';
const MS_EMBED_MODEL = process.env.MS_EMBED_MODEL ?? 'text-embedding-3-large';

function assertEnv(): void {
  if (!MS_KEY) throw new Error('Missing MS_API_KEY');
}

async function mdToPlain(md: string): Promise<string> {
  const file = await unified().use(remarkParse).use(strip).process(md);
  return String(file).replace(/\s+/g, ' ').trim();
}

function* chunkByHeadings(
  md: string,
  defaultTitle: string
): Generator<{ heading: string; content: string; anchor: string; title: string }> {
  const lines = md.split(/\r?\n/);
  const slugger = new GithubSlugger();
  const h1Match = md.match(/^#\s+(.+)$/m);
  const title = h1Match?.[1]?.trim() || defaultTitle;

  let currentHeading = title;
  let anchor = slugger.slug(currentHeading);
  let buf: string[] = [];

  for (const line of lines) {
    const m = /^(#{1,6})\s+(.+)$/.exec(line);
    if (m) {
      if (buf.length) {
        yield { heading: currentHeading, content: buf.join('\n'), anchor, title };
        buf = [];
      }
      currentHeading = m[2].trim();
      anchor = slugger.slug(currentHeading);
    } else {
      buf.push(line);
    }
  }
  if (buf.length) {
    yield { heading: currentHeading, content: buf.join('\n'), anchor, title };
  }
}

async function embedBatch(texts: readonly string[]): Promise<Embedding[]> {
  const res = await fetch(`${MS_BASE}/v1/embeddings`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MS_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ model: MS_EMBED_MODEL, input: texts })
  });
  if (!res.ok) throw new Error(`Embeddings HTTP ${res.status}`);
  const json: { data: Array<{ embedding: number[] }>; model: string } = await res.json();
  return json.data.map((d) => d.embedding);
}

async function main(): Promise<void> {
  assertEnv();
  await fs.mkdir(PUBLIC_DIR, { recursive: true });

  const files = await fg(['**/*.md', '!node_modules/**', '!.vitepress/**', '!public/**'], {
    cwd: DOCS_DIR,
    absolute: true
  });
  const chunksRaw: Array<{
    pagePath: string;
    seg: { heading: string; content: string; anchor: string; title: string };
  }> = [];

  for (const abs of files) {
    const rel = path.relative(DOCS_DIR, abs).replace(/\\/g, '/');
    const pagePath = `/${rel.replace(/\.md$/, '')}`;
    const raw = await fs.readFile(abs, 'utf8');
    const { content } = matter(raw);
    for (const seg of chunkByHeadings(content, path.basename(pagePath))) {
      const plain = await mdToPlain(seg.content);
      if (plain.length < 10) continue;
      chunksRaw.push({ pagePath, seg: { ...seg, content: plain } });
    }
  }

  const BATCH = 64;
  const allTexts = chunksRaw.map((c) => c.seg.content);
  const vectors: Embedding[] = [];
  for (let i = 0; i < allTexts.length; i += BATCH) {
    const part = allTexts.slice(i, i + BATCH);
    const embs = await embedBatch(part);
    vectors.push(...embs);
  }
  const dims = vectors[0]?.length ?? 0;

  const chunks: DocChunk[] = chunksRaw.map((c, i) => {
    const anchor = c.seg.anchor;
    const url = `${c.pagePath}.html#${anchor}`;
    return {
      id: `${c.pagePath}#${anchor}`,
      pagePath: c.pagePath,
      url,
      title: c.seg.title,
      heading: c.seg.heading,
      anchor,
      content: c.seg.content,
      embedding: vectors[i]
    };
  });

  const index: SearchIndex = {
    model: MS_EMBED_MODEL,
    dims,
    builtAt: new Date().toISOString(),
    chunks
  };

  await fs.writeFile(OUT_FILE, JSON.stringify(index));
  console.log(`Wrote ${chunks.length} chunks → ${path.relative(DOCS_DIR, OUT_FILE)} (${dims} dims)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

Notes:
- Uses Node v20 global `fetch`
- Writes to `public/` so the JSON serves at `/search-index.json`
- Chunking by headings; improve with token-based splitting if needed

---

## 6) Cloudflare Worker proxy (SSE pass-through)

Never expose your MS_API_KEY to the browser. Proxy `/v1/embeddings` and `/v1/chat/completions` from a server-side boundary. Cloudflare Worker is concise and supports streaming.

`worker/src/index.ts`:

```ts
export interface Env {
  MS_BASE_URL: string;
  MS_API_KEY: string;
}

function sseHeaders(extra?: HeadersInit): Headers {
  const h = new Headers({
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  if (extra) for (const [k, v] of new Headers(extra)) h.set(k, v as string);
  return h;
}

function corsHeaders(): Headers {
  return new Headers({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
}

function mergeHeaders(a: Headers, b: Headers): Headers {
  const out = new Headers(a);
  b.forEach((v, k) => out.set(k, v));
  return out;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    if (url.pathname === '/api/embed' && req.method === 'POST') {
      const upstream = await fetch(`${env.MS_BASE_URL}/v1/embeddings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.MS_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: await req.text()
      });
      return new Response(upstream.body, {
        status: upstream.status,
        headers: mergeHeaders(upstream.headers, corsHeaders())
      });
    }

    if (url.pathname === '/api/ask' && req.method === 'POST') {
      const upstream = await fetch(`${env.MS_BASE_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.MS_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: await req.text()
      });
      return new Response(upstream.body, {
        status: upstream.status,
        headers: sseHeaders(upstream.headers)
      });
    }

    return new Response('Not found', { status: 404, headers: corsHeaders() });
  }
};
```

`worker/wrangler.toml`:

```toml
name = "ms-proxy"
main = "src/index.ts"
compatibility_date = "2024-06-01"
workers_dev = true

[vars]
# Non-sensitive defaults can go here, override in Dashboard or with secrets.
MS_BASE_URL = "https://ms.your-domain.com"

# Secrets: store MS_API_KEY via `wrangler secret put MS_API_KEY`
```

Deploy:

```bash
cd worker
yarn dlx wrangler deploy
# Add MS_API_KEY as a secret:
yarn dlx wrangler secret put MS_API_KEY
# Ensure MS_BASE_URL is set in wrangler.toml vars or via dashboard
```

Rationale:
- SSE pass-through uses `Response(upstream.body)` to stream without buffering
- `X-Accel-Buffering: no` aids proxies; Nginx config also disables buffering

---

## 7) Client: Search component (Vue 3 + TS) and streaming Ask helper

Create `.vitepress/theme/components/Search.vue`:

```vue
<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';

type Embedding = readonly number[];

interface DocChunk {
  id: string;
  pagePath: string;
  url: string;
  title: string;
  heading: string;
  anchor: string;
  content: string;
  embedding: Embedding;
}

interface SearchIndex {
  model: string;
  dims: number;
  builtAt: string;
  chunks: DocChunk[];
}

interface RankedHit {
  score: number;
  chunk: DocChunk;
}

const query = ref<string>('');
const loading = ref<boolean>(false);
const index = reactive<{ data: SearchIndex | null }>({ data: null });
const results = ref<RankedHit[]>([]);
const selected = ref<number>(-1);

async function loadIndex(): Promise<void> {
  const r = await fetch('/search-index.json', { headers: { Accept: 'application/json' } });
  index.data = (await r.json()) as SearchIndex;
}

function norm(vec: Embedding): number {
  let s = 0;
  for (const v of vec) s += v * v;
  return Math.sqrt(s);
}

function cosine(a: Embedding, b: Embedding): number {
  let dot = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) dot += a[i] * b[i];
  const denom = norm(a) * norm(b);
  return denom === 0 ? 0 : dot / denom;
}

function highlight(snippet: string, q: string): string {
  const terms = q.split(/\s+/).filter(Boolean).map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (terms.length === 0) return snippet.slice(0, 180);
  const re = new RegExp(`(${terms.join('|')})`, 'gi');
  return snippet.slice(0, 180).replace(re, '<mark>$1</mark>');
}

async function embedQuery(q: string): Promise<Embedding> {
  const res = await fetch('/api/embed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: index.data?.model ?? 'text-embedding-3-large',
      input: [q]
    })
  });
  type EmbedResp = { data: Array<{ embedding: number[] }>; model: string };
  const json = (await res.json()) as EmbedResp;
  return json.data[0].embedding;
}

async function searchNow(): Promise<void> {
  if (!index.data || query.value.trim().length === 0) {
    results.value = [];
    return;
  }
  loading.value = true;
  try {
    const qvec = await embedQuery(query.value.trim());
    const ranked: RankedHit[] = index.data.chunks.map((chunk) => ({
      score: cosine(qvec, chunk.embedding),
      chunk
    }));
    ranked.sort((a, b) => b.score - a.score);
    results.value = ranked.slice(0, 8);
    selected.value = results.value.length ? 0 : -1;
  } finally {
    loading.value = false;
  }
}

function onKeydown(e: KeyboardEvent): void {
  if (!results.value.length) return;
  if (e.key === 'ArrowDown') {
    selected.value = Math.min(selected.value + 1, results.value.length - 1);
    e.preventDefault();
  } else if (e.key === 'ArrowUp') {
    selected.value = Math.max(selected.value - 1, 0);
    e.preventDefault();
  } else if (e.key === 'Enter' && selected.value >= 0) {
    const url = results.value[selected.value]?.chunk.url;
    if (url) window.location.href = url;
  }
}

const hasResults = computed<boolean>(() => results.value.length > 0);

let debounceId: number | undefined;
function onInput(): void {
  window.clearTimeout(debounceId);
  debounceId = window.setTimeout(searchNow, 180);
}

onMounted(loadIndex);
</script>

<template>
  <div class="ms-search" @keydown="onKeydown">
    <input
      class="ms-search-input"
      v-model="query"
      @input="onInput"
      type="search"
      placeholder="Search docs…"
      aria-label="Search docs"
    />
    <div v-if="loading" class="ms-search-loading">Searching…</div>

    <ul v-if="hasResults" class="ms-search-results" role="listbox">
      <li
        v-for="(hit, i) in results"
        :key="hit.chunk.id"
        :class="['ms-hit', { active: i === selected }]"
        role="option"
      >
        <a :href="hit.chunk.url" class="ms-hit-link">
          <div class="ms-hit-title">{{ hit.chunk.title }}</div>
          <div class="ms-hit-heading"># {{ hit.chunk.heading }}</div>
          <div class="ms-hit-snippet" v-html="highlight(hit.chunk.content, query)" />
        </a>
        <div class="ms-hit-score">{{ hit.score.toFixed(3) }}</div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.ms-search { position: relative; width: 28rem; max-width: 90vw; }
.ms-search-input {
  width: 100%;
  padding: .5rem .75rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: .5rem;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
}
.ms-search-results {
  position: absolute;
  top: 2.6rem; left: 0; right: 0;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: .5rem;
  max-height: 28rem; overflow: auto; z-index: 30;
  padding: .25rem;
}
.ms-hit { display: grid; grid-template-columns: 1fr auto; gap: .25rem .75rem; padding: .5rem; border-radius: .375rem; }
.ms-hit.active { background: var(--vp-c-bg-elv); }
.ms-hit-link { text-decoration: none; color: inherit; }
.ms-hit-title { font-weight: 600; }
.ms-hit-heading { font-size: .85rem; opacity: .8; }
.ms-hit-snippet { font-size: .85rem; opacity: .9; }
.ms-hit-score { font-variant-numeric: tabular-nums; opacity: .6; }
</style>
```

Create `.vitepress/theme/lib/streamAsk.ts`:

```ts
export type Role = 'system' | 'user' | 'assistant';

export interface Message {
  role: Role;
  content: string;
}

export interface AskOptions {
  model: string;
  messages: Message[];
}

export interface StreamHandlers {
  onToken: (text: string) => void;
  onError?: (err: unknown) => void;
  onDone?: () => void;
}

export async function streamAsk(
  body: AskOptions,
  handlers: StreamHandlers
): Promise<void> {
  const res = await fetch('/api/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, stream: true })
  });
  if (!res.ok || !res.body) {
    handlers.onError?.(new Error(`HTTP ${res.status}`));
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buf = '';

  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;

      buf += decoder.decode(chunk.value, { stream: true });

      const parts = buf.split('\n\n');
      buf = parts.pop() ?? '';

      for (const part of parts) {
        const lines = part.split('\n').filter(Boolean);
        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          const data = line.slice(5).trim();
          if (data === '[DONE]') {
            handlers.onDone?.();
            return;
          }
          try {
            const json: {
              choices?: Array<{ delta?: { content?: string } }>;
            } = JSON.parse(data);
            const token = json.choices?.[0]?.delta?.content;
            if (token) handlers.onToken(token);
          } catch {
            // ignore non-JSON lines
          }
        }
      }
    }
    handlers.onDone?.();
  } catch (err) {
    handlers.onError?.(err);
  } finally {
    reader.releaseLock();
  }
}
```

Optional usage in a component:
- Concatenate top-k chunks into a context string
- Call `streamAsk` with messages `[system, user]`
- Render into a `ref<string>`

---

## 8) Theme integration (VitePress slot injection)

Create `.vitepress/theme/index.ts`:

```ts
import type { Theme } from 'vitepress';
import DefaultTheme from 'vitepress/theme';
import { h } from 'vue';
import Search from './components/Search.vue';

export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'nav-bar-content-after': () => h(Search)
    });
  }
} satisfies Theme;
```

- Slot name `nav-bar-content-after` is provided by the default theme layout

---

## 9) Nginx static + `/api/*` SSE proxy

Serve VitePress statics and proxy `/api/*` to your Worker domain with SSE-friendly settings.

```
server {
  listen 443 ssl http2;
  server_name docs.your-domain.com;

  root /srv/www/docs;  # path to .vitepress/dist after build

  location / {
    try_files $uri $uri.html $uri/ =404;
  }

  location /api/ {
    # Use your Worker custom domain or workers.dev mapping
    set $worker_origin https://ms-proxy.your-domain.com;

    proxy_pass $worker_origin$request_uri;

    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Real-IP $remote_addr;

    proxy_buffering off;     # critical for SSE
    proxy_cache off;
    proxy_read_timeout 3600s;
    chunked_transfer_encoding off;

    proxy_set_header X-Accel-Buffering no;
    proxy_set_header Accept-Encoding "";
  }
}
```

- `try_files` allows clean URLs (`/guide/install` → `/guide/install.html`)
- SSE requires buffering disabled; both `proxy_buffering off;` and `X-Accel-Buffering: no`

---

## 10) Package scripts, env, and build/run

Environment variables (local dev for buildSearchIndex):
- `MS_BASE_URL` (e.g., https://ms.your-domain.com)
- `MS_API_KEY` (secret)
- `MS_EMBED_MODEL` (default `text-embedding-3-large`)

Local development (two steps):
1) Generate embeddings index:
```bash
cd docs
MS_BASE_URL=https://ms.your-domain.com \
MS_API_KEY=sk-... \
MS_EMBED_MODEL=text-embedding-3-large \
yarn build:search
```

2) Run VitePress dev:
```bash
yarn dev
# open http://localhost:5173
```

Static build and preview:
```bash
yarn build:all
yarn preview
```

Worker deploy:
```bash
cd worker
yarn dlx wrangler deploy
yarn dlx wrangler secret put MS_API_KEY
# set MS_BASE_URL via wrangler.toml [vars] or dashboard
```

Nginx deploy:
- Copy `.vitepress/dist/*` → `/srv/www/docs/`
- Reload Nginx after config deployed:
```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## 11) Security, performance, and quality notes

Security
- API key never in browser; only in Worker
- If docs are private, add auth to Nginx and Worker; return 401 on `/api/*` when not authorized
- CORS: Worker sets `Access-Control-Allow-Origin: *` by default; restrict as needed

Performance
- Batch embeddings at build-time (`BATCH = 64`), reduce round-trips
- Consider chunk size ~500–800 tokens for better recall
- If `search-index.json` becomes large, quantize vectors and host binary (Float32Array `.bin`) + small manifest

Relevance tuning
- Use cosine similarity as primary score
- Boost by heading level or exact term presence
- Snippets: center around matched terms rather than fixed slice

Reliability
- Handle missing/empty queries; debounce input
- Always guard against `index.data === null` before search
- Worker streams SSE: validate with browser Network tab that `Content-Type: text/event-stream` is present and data frames arrive incrementally

Type safety
- `strict: true` everywhere; no `any`
- All JSON responses are minimally typed to maintain correctness without over-asserting
- Error paths use `unknown` in handlers where needed

---

## 12) CI/CD (optional)

Repository
- GitHub: https://github.com/missionsquad/missionsquad-docs
- Default branch: main

Initial Git setup (from repo root):
```bash
git init
git branch -M main
git remote add origin git@github.com:missionsquad/missionsquad-docs.git
git add .
git commit -m "chore: initial docs scaffold"
git push -u origin main
```

GitHub Actions — build static docs artifact
- Creates a build artifact of `.vitepress/dist/` for deployment to your Nginx host.
- Uses Yarn, Node 20, and repository secrets for Mission Squad API config.

Create .github/workflows/docs.yml:
```yaml
name: Build VitePress Docs

on:
  push:
    branches: [ "main" ]
  pull_request:

jobs:
  build-docs:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: docs
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "yarn"
          cache-dependency-path: "docs/yarn.lock"

      - name: Install deps
        run: yarn install --frozen-lockfile

      - name: Build embeddings index
        env:
          MS_BASE_URL: ${{ secrets.MS_BASE_URL }}
          MS_API_KEY: ${{ secrets.MS_API_KEY }}
          MS_EMBED_MODEL: ${{ secrets.MS_EMBED_MODEL || 'text-embedding-3-large' }}
        run: yarn build:search

      - name: Build static site
        run: yarn build

      - name: Upload dist artifact
        uses: actions/upload-artifact@v4
        with:
          name: vitepress-dist
          path: docs/.vitepress/dist
          if-no-files-found: error
```

GitHub Actions — deploy Cloudflare Worker (SSE proxy)
- Deploys the Worker in docs/worker via Wrangler.
- Requires secrets: CLOUDFLARE_API_TOKEN, MS_API_KEY, MS_BASE_URL.
- Ensure wrangler.toml is configured under docs/worker.

Append to .github/workflows/docs.yml:
```yaml
  deploy-worker:
    runs-on: ubuntu-latest
    needs: build-docs
    if: github.ref == 'refs/heads/main'
    defaults:
      run:
        working-directory: docs/worker
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Install Wrangler (on-demand)
        run: yarn dlx wrangler --version

      - name: Deploy Worker
        env:
          # Wrangler reads CLOUDFLARE_API_TOKEN for authentication
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          # Worker runtime envs forwarded from GitHub Secrets:
          MS_API_KEY: ${{ secrets.MS_API_KEY }}
          MS_BASE_URL: ${{ secrets.MS_BASE_URL }}
        run: |
          # Provide env vars to the process; wrangler can read from wrangler.toml [vars] + secrets
          # For secrets, prefer storing via CF dashboard; here we use env for non-sensitive vars
          yarn dlx wrangler deploy
```

Secrets to configure in repository Settings → Secrets and variables → Actions:
- MS_API_KEY: Your Mission Squad API key (required for both buildSearch and Worker)
- MS_BASE_URL: Mission Squad base URL (e.g., https://ms.your-domain.com)
- MS_EMBED_MODEL: Optional; defaults to text-embedding-3-large if unset
- CLOUDFLARE_API_TOKEN: API token with permissions to deploy Workers

Post-deploy smoke tests
- Artifact: download from the Actions run and deploy contents to Nginx root (e.g., /srv/www/docs).
- Validate:
  - curl -I https://docs.your-domain.com/search-index.json (200, JSON)
  - curl -N -X POST https://docs.your-domain.com/api/ask -H "content-type: application/json" --data '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"ping"}],"stream":true}'
    - Expect text/event-stream frames and a terminal data: [DONE]

---

## 13) Troubleshooting

- `Embeddings HTTP 401/403`: Worker missing `MS_API_KEY` or MS gateway not reachable; verify `MS_BASE_URL` and secret
- `CORS error` in browser: tighten/adjust CORS headers in Worker; set `Access-Control-Allow-Origin` to your docs origin
- SSE flushes as one big chunk: ensure `proxy_buffering off;` in Nginx and `X-Accel-Buffering: no` header; confirm Cloudflare not altering `text/event-stream`
- Search shows no results: ensure `public/search-index.json` exists and includes vectors; check model dims non-zero
- Headings mismatch anchors: `github-slugger` keeps anchors consistent; ensure headings exist and are unique

---

## 14) References (primary)

- VitePress Getting Started, Routing, Theme slots, Data Loading
  - https://vitepress.dev/guide/getting-started
  - https://vitepress.dev/guide/routing
  - https://vitepress.dev/guide/extending-default-theme
  - https://vitepress.dev/guide/data-loading
- Vue 3 + TypeScript
  - https://vuejs.org/guide/typescript/overview
- OpenAI API (compat for Mission Squad) — Embeddings & Chat Completions, Streaming
  - https://platform.openai.com/docs/api-reference/embeddings
  - https://platform.openai.com/docs/api-reference/chat
  - https://platform.openai.com/docs/guides/streaming-responses
- Cosine similarity
  - https://en.wikipedia.org/wiki/Cosine_similarity
- unified / remark-parse / strip-markdown
  - https://unifiedjs.com/explore/package/remark-parse/
  - https://github.com/remarkjs/strip-markdown
- github-slugger
  - https://www.npmjs.com/package/github-slugger
- Cloudflare Workers Streaming / Typescript / Bindings
  - https://developers.cloudflare.com/workers/runtime-apis/streams/
  - https://developers.cloudflare.com/workers/languages/typescript/
  - https://developers.cloudflare.com/workers/runtime-apis/bindings/
- Nginx Static + Proxy (SSE-friendly)
  - https://docs.nginx.com/nginx/admin-guide/web-server/serving-static-content/
  - https://nginx.org/en/docs/http/ngx_http_proxy_module.html
  - https://serverfault.com/questions/801628/for-server-sent-events-sse-what-nginx-proxy-configuration-is-appropriate
  - https://serverfault.com/questions/556207/nginx-try-files-to-rewrite-html-into-clean-url

---
