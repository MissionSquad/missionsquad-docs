<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { streamAsk, type Message } from '../lib/streamAsk';

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

const index = reactive<{ data: SearchIndex | null }>({ data: null });

const open = ref(false);
const question = ref('');
const loading = ref(false);
const answer = ref('');
const error = ref<string | null>(null);

const answerBoxRef = ref<HTMLDivElement | null>(null);
function scrollAnswerToBottom(): void {
  const el = answerBoxRef.value;
  if (el) el.scrollTop = el.scrollHeight;
}

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

async function askNow(): Promise<void> {
  if (!index.data || !question.value.trim()) return;
  loading.value = true;
  answer.value = '';
  error.value = null;
  try {
    // Rank top-k chunks for context
    const qvec = await embedQuery(question.value.trim());
    const ranked = index.data.chunks
      .map((chunk) => ({ score: cosine(qvec, chunk.embedding), chunk }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((r) => r.chunk);

    const context = ranked
      .map(
        (c, i) =>
          `# [${i + 1}] ${c.title} — ${c.heading}\nURL: ${c.url}\n${c.content}`
      )
      .join('\n\n');

    const messages: Message[] = [
      {
        role: 'system',
        content:
          'You are a helpful assistant answering questions using Mission Squad Docs. Use the provided context. Cite section titles naturally and include the URL when directly referencing specific sections.'
      },
      {
        role: 'user',
        content: `Question: ${question.value.trim()}\n\nContext:\n${context}`
      }
    ];

    await streamAsk(
      { model: index.data.model || 'gpt-5-nano', messages },
      {
        onToken: (t) => { answer.value += t; nextTick(scrollAnswerToBottom); },
        onError: (e) => { error.value = e instanceof Error ? e.message : String(e); },
        onDone: () => { nextTick(scrollAnswerToBottom); }
      }
    );
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    loading.value = false;
    await nextTick();
    scrollAnswerToBottom();
  }
}

async function openPanel(): Promise<void> {
  if (!index.data) await loadIndex();
  open.value = true;
}
function closePanel(): void {
  open.value = false;
}

async function onAskOpen(ev: Event): Promise<void> {
  const e = ev as CustomEvent<{ question?: string }>;
  const q = (e.detail?.question ?? '').toString().trim();
  if (q) {
    question.value = q;
  }
  await openPanel();
  await askNow();
}

function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape' && open.value) {
    e.stopPropagation();
    closePanel();
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown);
  window.addEventListener('ms-ask-open', onAskOpen as EventListener);
});
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown);
  window.removeEventListener('ms-ask-open', onAskOpen as EventListener);
});
</script>

<template>
  <div class="ms-ask-root">
    <button class="ask-trigger" type="button" @click="openPanel" aria-haspopup="dialog" :aria-expanded="open ? 'true' : 'false'">
      Ask AI
    </button>

    <!-- Backdrop -->
    <div v-if="open" class="ms-ask-overlay" @click="closePanel" />

    <!-- Floating Panel -->
    <div v-if="open" class="ms-ask-panel" role="dialog" aria-label="Ask the docs" aria-modal="true">
      <div class="ask-header">
        <div class="ask-title">Ask the docs</div>
        <button class="ask-close" type="button" @click="closePanel" aria-label="Close">×</button>
      </div>

      <div class="ask-body">
        <div class="row">
          <input
            class="ask-input"
            v-model="question"
            type="text"
            placeholder="Type your question…"
            aria-label="Ask the docs"
            @keyup.enter="askNow"
          />
          <button
            class="ask-btn"
            @click="askNow"
            :disabled="loading"
            :aria-busy="loading ? 'true' : 'false'"
          >
            {{ loading ? 'Asking…' : 'Ask' }}
          </button>
        </div>

        <div v-if="loading" class="ask-loading">Thinking…</div>
        <div v-if="error" class="ask-error">{{ error }}</div>

        <div v-if="answer" ref="answerBoxRef" class="answer-box">
          {{ answer }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Root in navbar */
.ms-ask-root { position: relative; display: inline-flex; align-items: center; margin-left: .75rem; }

/* Small trigger styled to fit VitePress navbar */
.ask-trigger {
  padding: .35rem .6rem;
  border-radius: .5rem;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: .9rem;
}

/* Backdrop */
.ms-ask-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.4);
  z-index: 98;
}

/* Floating panel below the navbar, fixed so it doesn't push content */
.ms-ask-panel {
  position: fixed;
  /* Keep symmetric vertical margins while accounting for the navbar at the top */
  --ask-vmargin: 8px;
  top: calc(var(--vp-nav-height, 56px) + var(--ask-vmargin));
  right: 16px;
  bottom: calc(var(--vp-nav-height, 56px) + var(--ask-vmargin));
  width: 46rem;
  max-width: 92vw;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  border: 1px solid var(--vp-c-divider);
  border-radius: .75rem;
  box-shadow: 0 8px 24px rgba(0,0,0,.2);
  padding: 1rem;
  z-index: 99;
}

/* Panel content */
.ask-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: .5rem;
  margin-bottom: .5rem;
}
.ask-title { font-weight: 600; }
.ask-close {
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  border-radius: .5rem;
  width: 2rem; height: 2rem; line-height: 1.9rem; text-align: center;
}

.ask-body { display: flex; flex-direction: column; gap: .5rem; flex: 1; min-height: 0; }

.row { display: flex; gap: .5rem; align-items: center; }
.ask-input {
  flex: 1;
  padding: .5rem .75rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: .5rem;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
}
.ask-btn {
  padding: .5rem .75rem;
  border-radius: .5rem;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-brand-1);
  
  color: #333; /* normal state text near-black */
  font-weight: bold;
}
.ask-btn:not(:disabled):hover { background: var(--vp-c-bg-elv); }
.ask-btn:disabled {
  background: var(--vp-c-bg-soft);
  color: #fff;         /* disabled/working state shows white text */
  cursor: progress;    /* indicate waiting */
  opacity: 1;          /* ensure contrast stays strong */
}

/* Feedback areas */
.ask-loading { opacity: .8; }
.ask-error { color: #c00; white-space: pre-wrap; }

/* Scrollable answer with distinct background */
.answer-box {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: .5rem;
  padding: .75rem;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
