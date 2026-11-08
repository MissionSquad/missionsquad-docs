<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useData } from 'vitepress';
import { streamAsk, type Message } from '../lib/streamAsk';
import { renderAnswerMarkdown } from '../lib/renderMarkdown';
import { renderAnswerDiagrams } from '../lib/askMermaid';

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
// The model answers in markdown; render it (safely) instead of showing raw text.
const answerHtml = computed(() => renderAnswerMarkdown(answer.value));
const error = ref<string | null>(null);

const answerBoxRef = ref<HTMLDivElement | null>(null);
const { isDark } = useData();

/** Turn ```mermaid blocks in the finished answer into diagrams. */
async function renderDiagrams(): Promise<void> {
  await nextTick();
  if (answerBoxRef.value) await renderAnswerDiagrams(answerBoxRef.value, isDark.value);
}

// Re-render diagrams in the current answer when the docs theme switches.
watch(isDark, () => {
  if (!loading.value && answer.value) void renderDiagrams();
});
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
    // Diagrams render only once the answer is complete — a half-streamed
    // diagram can't be parsed, so it shows as code until then.
    await renderDiagrams();
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

        <!-- answerHtml is sanitized by renderAnswerMarkdown (raw HTML escaped, unsafe links dropped) -->
        <div v-if="answer" ref="answerBoxRef" class="answer-box" v-html="answerHtml"></div>
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
  /* the panel mounts inside the VitePress navbar, which sets white-space: nowrap */
  white-space: normal;
  overflow-wrap: anywhere;
  line-height: 1.65;
  font-size: .95rem;
}

/* Rendered markdown inside the answer (v-html content needs :deep) */
.answer-box > :deep(:first-child) { margin-top: 0; }
.answer-box > :deep(:last-child) { margin-bottom: 0; }
.answer-box :deep(p) { margin: 0 0 .75rem; }
.answer-box :deep(h1),
.answer-box :deep(h2),
.answer-box :deep(h3),
.answer-box :deep(h4) {
  margin: 1.1rem 0 .5rem;
  line-height: 1.3;
  font-weight: 600;
  border: none;
  padding: 0;
}
.answer-box :deep(h1) { font-size: 1.2rem; }
.answer-box :deep(h2) { font-size: 1.1rem; }
.answer-box :deep(h3),
.answer-box :deep(h4) { font-size: 1rem; }
.answer-box :deep(ul),
.answer-box :deep(ol) { margin: 0 0 .75rem; padding-left: 1.4rem; }
.answer-box :deep(ul) { list-style: disc; }
.answer-box :deep(ol) { list-style: decimal; }
.answer-box :deep(li) { margin: .2rem 0; }
.answer-box :deep(li > p) { margin: 0; }
.answer-box :deep(a) {
  color: var(--vp-c-brand-1);
  text-decoration: underline;
  text-underline-offset: 2px;
}
.answer-box :deep(a:hover) { color: var(--vp-c-brand-2); }
.answer-box :deep(strong) { font-weight: 600; }
.answer-box :deep(code) {
  font-family: var(--vp-font-family-mono);
  font-size: .85em;
  background: var(--vp-code-bg);
  color: var(--vp-code-color);
  padding: .15em .35em;
  border-radius: 4px;
}
.answer-box :deep(pre) {
  margin: 0 0 .75rem;
  padding: .75rem 1rem;
  background: var(--vp-code-block-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  overflow-x: auto;
  line-height: 1.5;
}
.answer-box :deep(pre code) {
  background: transparent;
  color: var(--vp-c-text-1);
  padding: 0;
  font-size: .85rem;
  white-space: pre;
}
.answer-box :deep(blockquote) {
  margin: 0 0 .75rem;
  padding-left: .75rem;
  border-left: 3px solid var(--vp-c-divider);
  color: var(--vp-c-text-2);
}
.answer-box :deep(hr) {
  border: none;
  border-top: 1px solid var(--vp-c-divider);
  margin: 1rem 0;
}
.answer-box :deep(table) {
  display: block;
  width: 100%;
  overflow-x: auto;
  border-collapse: collapse;
  margin: 0 0 .75rem;
  font-size: .9rem;
}
.answer-box :deep(th),
.answer-box :deep(td) {
  border: 1px solid var(--vp-c-divider);
  padding: .4rem .6rem;
  text-align: left;
  vertical-align: top;
}
.answer-box :deep(th) { background: var(--vp-c-bg-alt); font-weight: 600; }
.answer-box :deep(.ask-mermaid--rendered) {
  display: block;
  margin: 0 0 .75rem;
  padding: .75rem;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  overflow-x: auto;
}
/* natural size (set in askMermaid.ts), centered when narrower than the box,
   horizontally scrollable when wider */
.answer-box :deep(.ask-mermaid--rendered svg) {
  display: block;
  margin: 0 auto;
  height: auto;
}
</style>
