#!/usr/bin/env tsx
import fg from 'fast-glob';
import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import strip from 'strip-markdown';
import GithubSlugger from 'github-slugger';
import 'dotenv/config';
import remarkStringify from 'remark-stringify';

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
  embeddingModel: string;
  dims: number;
  builtAt: string;
  chunks: DocChunk[];
}

const DOCS_DIR = path.resolve(process.cwd());
const PUBLIC_DIR = path.join(DOCS_DIR, 'public');
const OUT_FILE = path.join(PUBLIC_DIR, 'search-index.json');

const MS_BASE = (process.env.MS_BASE_URL ?? 'https://your-ms.example.com').replace(/\/+$/, '');
const MS_KEY = process.env.MS_API_KEY ?? '';
const MS_EMBED_MODEL = process.env.MS_EMBED_MODEL ?? 'text-embedding-3-small';

function assertEnv(): void {
  if (!MS_KEY) throw new Error('Missing MS_API_KEY');
}

async function mdToPlain(md: string): Promise<string> {
  const file = await unified().use(remarkParse).use(strip).use(remarkStringify).process(md);
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
    if (m && m.length > 1) {
      if (buf.length) {
        yield { heading: currentHeading, content: buf.join('\n'), anchor, title };
        buf = [];
      }
      currentHeading = m[2]!.trim();
      anchor = slugger.slug(currentHeading);
    } else {
      buf.push(line);
    }
  }
  if (buf.length) {
    yield { heading: currentHeading, content: buf.join('\n'), anchor, title };
  }
}

interface MSWrappedEmbeddingResponse {
  embeddings: number[][];
  usage: { promptTokens: number; totalTokens: number };
  model: string;
  rawResponse: {
    object: 'list';
    data: Array<{ object: 'embedding'; index: number; embedding: number[] }>;
    model: string;
    usage: { prompt_tokens: number; total_tokens: number };
  };
}
async function embedBatch(texts: readonly string[]): Promise<Embedding[]> {
  const base = MS_BASE;
  const endpoint = base.endsWith('/v1') ? `${base}/embeddings` : `${base}/v1/embeddings`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MS_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ model: MS_EMBED_MODEL, input: texts })
  });
  if (!res.ok) throw new Error(`Embeddings HTTP ${res.status}`);
  const json = (await res.json()) as MSWrappedEmbeddingResponse;
  if (!Array.isArray(json.embeddings)) {
    throw new Error('Invalid embeddings response: missing embeddings[]');
  }
  return json.embeddings;
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
  if (vectors.length !== allTexts.length) {
    throw new Error(`Embedding count mismatch: got ${vectors.length}, expected ${allTexts.length}`);
  }
  const dims = vectors != null && vectors.length > 0 && vectors[0] != null ? vectors[0].length : 0;

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
      embedding: vectors[i]!
    };
  });

  const index: SearchIndex = {
    model: 'docs-agent',
    embeddingModel: MS_EMBED_MODEL,
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
