<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue';

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

interface RankedHit {
  score: number;
  chunk: DocChunk;
}

interface RecentItem {
  q: string;
  title: string;
  url: string;
  t: number;
}

const LOCAL_RECENTS_KEY = 'msq_recent_searches_v1';

const query = ref<string>('');
const loading = ref<boolean>(false);
const index = reactive<{ data: SearchIndex | null }>({ data: null });
const results = ref<RankedHit[]>([]);
const selected = ref<number>(-1); // selection within list items (results + optional AI row)
const overlayOpen = ref<boolean>(false);
const recents = ref<RecentItem[]>([]);

const overlayInputRef = ref<HTMLInputElement | null>(null);

async function loadIndex(): Promise<void> {
  const r = await fetch('/search-index.json', { headers: { Accept: 'application/json' } });
  if (!r.ok) {
    index.data = { model: '', embeddingModel: '', dims: 0, builtAt: new Date().toISOString(), chunks: [] };
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

function clipSnippet(text: string, len = 180): string {
  if (text.length <= len) return text;
  return text.slice(0, len) + '…';
}

function highlight(snippet: string, q: string): string {
  const terms = q.split(/\s+/).filter(Boolean).map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (terms.length === 0) return clipSnippet(snippet);
  const re = new RegExp(`(${terms.join('|')})`, 'gi');
  return clipSnippet(snippet).replace(re, '<mark>$1</mark>');
}

async function embedQuery(q: string): Promise<Embedding> {
  const res = await fetch('/api/embed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: index.data?.embeddingModel ?? 'text-embedding-3-small',
      input: [q]
    })
  });
  type MSWrappedEmbeddingResponse = {
    embeddings: number[][];
    usage: { promptTokens: number; totalTokens: number };
    model: string;
    rawResponse: unknown;
  };
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as MSWrappedEmbeddingResponse;
  if (!Array.isArray(json.embeddings) || json.embeddings.length === 0) {
    throw new Error('No embeddings returned');
  }
  return json.embeddings[0] as Embedding;
}

async function searchNow(): Promise<void> {
  if (!index.data || query.value.trim().length === 0) {
    results.value = [];
    selected.value = -1;
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
    results.value = ranked.slice(0, 12);
    selected.value = results.value.length ? 0 : -1;
  } catch {
    // swallow errors into "no results" state
    results.value = [];
  } finally {
    loading.value = false;
  }
}

const hasResults = computed<boolean>(() => results.value.length > 0);
const listLength = computed<number>(() => results.value.length);

let debounceId: number | undefined;
function onQueryInput(): void {
  window.clearTimeout(debounceId);
  debounceId = window.setTimeout(searchNow, 160);
}

function openOverlay(): void {
  overlayOpen.value = true;
  selected.value = hasResults.value ? 0 : -1;
  document.documentElement.classList.add('ms-search-open');
  document.body.classList.add('ms-search-open');
  nextTick(() => {
    overlayInputRef.value?.focus();
  });
}
function closeOverlay(): void {
  overlayOpen.value = false;
  document.documentElement.classList.remove('ms-search-open');
  document.body.classList.remove('ms-search-open');
  // keep query and results; user may re-open
}

function onGlobalKeydown(e: KeyboardEvent): void {
  const isCmdK = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k';
  if (isCmdK) {
    e.preventDefault();
    if (!overlayOpen.value) openOverlay();
    else closeOverlay();
    return;
  }
  if (!overlayOpen.value) return;
  if (e.key === 'Escape') {
    e.preventDefault();
    closeOverlay();
    return;
  }
  if (listLength.value === 0) return;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    selected.value = Math.min(selected.value + 1, listLength.value - 1);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    selected.value = Math.max(selected.value - 1, 0);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (selected.value >= 0 && selected.value < results.value.length) {
      const hit = results.value[selected.value];
      if (hit) navigateWithRecent(hit);
    }
  }
}

function loadRecents(): void {
  try {
    const raw = localStorage.getItem(LOCAL_RECENTS_KEY);
    recents.value = raw ? (JSON.parse(raw) as RecentItem[]) : [];
  } catch {
    recents.value = [];
  }
}
function saveRecent(item: RecentItem): void {
  const items = [item, ...recents.value.filter((r) => !(r.q === item.q && r.url === item.url))];
  recents.value = items.slice(0, 10);
  try {
    localStorage.setItem(LOCAL_RECENTS_KEY, JSON.stringify(recents.value));
  } catch {
    // ignore quota errors
  }
}
function go(url: string): void {
  window.location.href = url;
}

function navigateWithRecent(hit: RankedHit): void {
  // Save only when user actually clicks/navigates
  const title = hit.chunk.heading || hit.chunk.title || query.value.trim();
  saveRecent({ q: query.value.trim(), title, url: hit.chunk.url, t: Date.now() });
  window.location.href = hit.chunk.url;
}

function onAskAI(): void {
  const q = query.value.trim();
  if (!q) return;
  closeOverlay();
  // Clear search state so the next open does not show old results
  query.value = '';
  results.value = [];
  selected.value = -1;
  window.dispatchEvent(new CustomEvent('ms-ask-open', { detail: { question: q } }));
}


onMounted(() => {
  loadIndex();
  loadRecents();
  window.addEventListener('keydown', onGlobalKeydown);
});
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onGlobalKeydown);
  document.documentElement.classList.remove('ms-search-open');
  document.body.classList.remove('ms-search-open');
});
</script>

<template>
  <div class="ms-search-root">
    <!-- Navbar trigger input: opens enhanced overlay -->
    <input
      class="ms-search-trigger"
      type="search"
      placeholder="Search…"
      aria-label="Search docs"
      @focus="openOverlay"
      readonly
    />

    <!-- Backdrop -->
    <div v-if="overlayOpen" class="ms-search-overlay" @click="closeOverlay" />

    <!-- Centered panel -->
    <div v-if="overlayOpen" class="ms-search-panel" role="dialog" aria-modal="true" aria-label="Search">
      <div class="panel-header">
        <div class="input-wrap">
          <span class="icon search" aria-hidden="true">🔎</span>
          <input
            ref="overlayInputRef"
            v-model="query"
            class="panel-input"
            type="text"
            placeholder="Search…"
            aria-label="Search docs"
            @input="onQueryInput"
          />
        </div>
        <div class="esc-pill" aria-hidden="true">ESC</div>
      </div>

      <div class="panel-body">
        <!-- Empty state: show recent searches -->
        <div v-if="!query.trim()">
          <div class="section-title">Recent searches</div>
          <ul class="recent-list" v-if="recents.length">
            <li v-for="r in recents" :key="r.t" class="recent-item">
              <button class="recent-btn" @click="go(r.url)">
                <span class="crumbs">{{ r.q }}</span>
                <span class="sep">•</span>
                <span class="title">{{ r.title }}</span>
              </button>
            </li>
          </ul>
          <div v-else class="empty-note">No recent searches yet.</div>
        </div>

        <!-- Results -->
        <div v-else class="results-section">
          <div class="results-wrap">
            <div v-if="loading" class="loading">Searching…</div>

            <ul v-if="hasResults" class="results" role="listbox">
              <li
                v-for="(hit, i) in results"
                :key="hit.chunk.id"
                :class="['hit', { active: i === selected }]"
                role="option"
                @mouseenter="selected = i"
              >
                <a href="#" class="hit-link" @click.prevent="navigateWithRecent(hit)">
                  <span class="icon hash" aria-hidden="true">#</span>
                  <div class="hit-main">
                    <div class="hit-title">
                      <span class="breadcrumbs">{{ hit.chunk.title }}</span>
                      <span class="chev">›</span>
                      <span class="heading">{{ hit.chunk.heading }}</span>
                    </div>
                    <div class="hit-snippet" v-html="highlight(hit.chunk.content, query)" />
                  </div>
                  <span class="score" aria-hidden="true">{{ hit.score.toFixed(3) }}</span>
                </a>
              </li>
            </ul>

            <div v-else-if="!loading" class="empty-note">No results.</div>
          </div>

          <div class="panel-footer">
            <button class="ask-cta" type="button" @click="onAskAI" :disabled="!query.trim()">
              <span class="icon wand" aria-hidden="true">⚡</span>
              Ask AI assistant — “{{ query.trim() || 'Type a question' }}”
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Trigger in navbar */
.ms-search-root { position: relative; display: inline-flex; align-items: center; margin-left: .75rem; }
.ms-search-trigger {
  width: 16rem;
  max-width: 38vw;
  padding: .45rem .75rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: .75rem;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  cursor: text;
}

/* Backdrop with blur */
.ms-search-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.35);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  z-index: 98;
}

/* Panel */
.ms-search-panel {
  position: fixed;
  top: calc(var(--vp-nav-height, 56px) + 12px);
  left: 50%;
  transform: translateX(-50%);
  width: min(820px, 92vw);
  max-height: 72vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  border: 1px solid var(--vp-c-divider);
  border-radius: .9rem;
  box-shadow: 0 10px 28px rgba(0,0,0,.28);
  z-index: 99;
  overscroll-behavior: contain;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: .75rem;
  padding: .75rem .9rem .4rem .9rem;
  position: sticky;
  top: 0;
  background: var(--vp-c-bg);
  border-bottom: 1px solid var(--vp-c-divider);
}
.input-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  gap: .5rem;
  padding: .45rem .65rem;
  border: 1.5px solid var(--vp-c-divider);
  border-radius: .75rem;
  background: var(--vp-c-bg-soft);
}
.panel-input {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  color: var(--vp-c-text-1);
  font-size: 1rem;
}
.esc-pill {
  font-size: .75rem;
  padding: .2rem .45rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: .5rem;
  opacity: .8;
}

.panel-body { padding: .75rem .9rem .9rem; display: flex; flex-direction: column; gap: .5rem; flex: 1; min-height: 0; }

.section-title {
  font-size: .95rem;
  font-weight: 600;
  opacity: .85;
  margin-bottom: .5rem;
}

.recent-list { display: grid; gap: .35rem; }
.recent-item {}
.recent-btn {
  width: 100%;
  text-align: left;
  padding: .6rem .7rem;
  border-radius: .6rem;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
}
.recent-btn:hover { background: var(--vp-c-bg-elv); }
.crumbs { opacity: .9; }
.sep { margin: 0 .4rem; opacity: .6; }
.title { opacity: .9; }

.loading { opacity: .8; padding: .4rem 0; }
.empty-note { opacity: .7; padding: .4rem 0; }

.results { display: grid; gap: .35rem; margin: 0; padding: 0; list-style: none; }
.hit {
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  border-radius: .6rem;
}
.hit.active { background: var(--vp-c-bg-elv); }
.hit-link {
  display: grid;
  grid-template-columns: 1.6rem 1fr auto;
  align-items: start;
  gap: .6rem;
  padding: .6rem .7rem;
  text-decoration: none;
  color: inherit;
}
.icon { width: 1.6rem; height: 1.6rem; display: inline-flex; align-items: center; justify-content: center; }
.icon.hash { opacity: .9; }
.icon.search { opacity: .75; }
.icon.wand { opacity: .9; }
.hit-main { display: grid; gap: .3rem; }
.hit-title { display: flex; gap: .35rem; align-items: center; font-weight: 600; }
.breadcrumbs { opacity: .9; }
.chev { opacity: .55; }
.heading { opacity: 1; }
.hit-snippet {
  font-size: .9rem;
  opacity: .9;
  /* Clamp to 2 lines and prevent overflow while preserving wrapping */
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.score { font-variant-numeric: tabular-nums; opacity: .55; }

.results-section {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

/* Prevent horizontal overflow by allowing grid items to shrink and content to wrap */
.hit-main { min-width: 0; }
.hit-title { flex-wrap: wrap; min-width: 0; }
.breadcrumbs, .heading, .hit-snippet { min-width: 0; overflow-wrap: anywhere; word-break: break-word; }

/* Results area should scroll inside the panel; full-width items */
.results, .hit, .hit-link { width: 100%; max-width: 100%; box-sizing: border-box; }
.results-wrap { position: relative; flex: 1; min-height: 12rem; overflow: auto; }

/* Subtle scroll indicators (fade) */
.results-wrap::before,
.results-wrap::after {
  content: "";
  position: sticky;
  left: 0;
  right: 0;
  height: 14px;
  pointer-events: none;
  z-index: 1;
}
.results-wrap::before {
  top: 0;
  background: linear-gradient(to bottom, var(--vp-c-bg), transparent);
}
.results-wrap::after {
  bottom: 0;
  background: linear-gradient(to top, var(--vp-c-bg), transparent);
}

/* Footer pinned to bottom with Ask AI action */
.panel-footer {
  position: sticky;
  bottom: 0;
  background: var(--vp-c-bg);
  border-top: 1px solid var(--vp-c-divider);
  padding-top: .5rem;
}
.ask-cta {
  width: 100%;
  display: inline-flex;
  align-items: center;
  gap: .5rem;
  padding: .6rem .7rem;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  border-radius: .6rem;
  color: var(--vp-c-text-1);
}
.ask-cta:hover { background: var(--vp-c-bg-elv); }
.ask-cta:disabled { opacity: .6; cursor: not-allowed; }

.ask-row {
  border-top: 1px dashed var(--vp-c-divider);
  margin-top: .35rem;
  padding-top: .35rem;
  border-radius: .6rem;
  background: var(--vp-c-bg-soft);
}
.ask-row.active { background: var(--vp-c-bg-elv); }
.ask-inner {
  display: grid;
  grid-template-columns: 1.6rem 1fr;
  gap: .6rem;
  padding: .6rem .7rem;
  cursor: pointer;
}
.ask-title { font-weight: 600; }
.ask-sub { opacity: .8; }
</style>
<style>
/* Prevent background page scroll when search overlay is open */
html.ms-search-open, body.ms-search-open { overflow: hidden; }
</style>
