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
  if (!r.ok) {
    index.data = { model: '', dims: 0, builtAt: new Date().toISOString(), chunks: [] };
    return;
  }
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
  for (let i = 0; i < n; i++) dot += a[i]! * b[i]!;
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
  return json.data[0]!.embedding;
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
