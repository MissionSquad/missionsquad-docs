<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useData } from 'vitepress';
import { streamAsk, type Message } from '../lib/streamAsk';
import { renderAnswerMarkdown } from '../lib/renderMarkdown';
import { renderAnswerDiagrams } from '../lib/askMermaid';
import { copyText } from '../lib/clipboard';

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

// The panel is removed from the page while closed, so reopening it rebuilds
// the answer from markdown with diagram placeholders. Render diagrams again
// whenever a new answer element is mounted for a finished answer. (While an
// answer is streaming, askNow renders them once it completes.)
watch(answerBoxRef, (el) => {
  if (el && !loading.value) void renderDiagrams();
});

/** Full-width panel; kept while the panel is closed and reopened. */
const expanded = ref(false);
function toggleExpanded(): void {
  expanded.value = !expanded.value;
}

/** Copy the whole answer as markdown. */
const answerCopyState = ref<'idle' | 'copied' | 'failed'>('idle');
let answerCopyTimer: ReturnType<typeof setTimeout> | undefined;
async function copyAnswer(): Promise<void> {
  const copied = await copyText(answer.value);
  answerCopyState.value = copied ? 'copied' : 'failed';
  clearTimeout(answerCopyTimer);
  answerCopyTimer = setTimeout(() => { answerCopyState.value = 'idle'; }, 2000);
}
const answerCopyLabel = computed(() => {
  if (answerCopyState.value === 'copied') return 'Copied';
  if (answerCopyState.value === 'failed') return 'Copy failed';
  return 'Copy answer';
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
  clearTimeout(answerCopyTimer);
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
    <div
      v-if="open"
      class="ms-ask-panel"
      :class="{ 'ms-ask-panel--expanded': expanded }"
      role="dialog"
      aria-label="Ask the docs"
      aria-modal="true"
    >
      <div class="ask-header">
        <div class="ask-title">Ask the docs</div>
        <div class="ask-header-actions">
          <button
            class="ask-icon-btn ask-expand"
            type="button"
            @click="toggleExpanded"
            :aria-pressed="expanded ? 'true' : 'false'"
            :aria-label="expanded ? 'Restore panel width' : 'Expand panel to full width'"
            :title="expanded ? 'Restore width' : 'Full width'"
          >
            <!-- arrows pointing out (expand) / in (restore) -->
            <svg v-if="!expanded" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" />
              <line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
            </svg>
            <svg v-else viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="4 14 10 14 10 20" /><polyline points="20 10 14 10 14 4" />
              <line x1="14" y1="10" x2="21" y2="3" /><line x1="3" y1="21" x2="10" y2="14" />
            </svg>
          </button>
          <button class="ask-icon-btn ask-close" type="button" @click="closePanel" aria-label="Close" title="Close">×</button>
        </div>
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
        <div v-if="answer && !loading" class="answer-actions">
          <button
            class="ask-text-btn"
            type="button"
            @click="copyAnswer"
            title="Copy the answer as markdown"
          >
            {{ answerCopyLabel }}
          </button>
          <span class="answer-copy-status" role="status" aria-live="polite">
            {{ answerCopyState === 'copied' ? 'Answer copied to clipboard' : '' }}
          </span>
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
/* Full width: same symmetric 16px inset on both sides */
.ms-ask-panel--expanded {
  left: 16px;
  width: auto;
  max-width: none;
}

.ask-title { font-weight: 600; }
.ask-header-actions { display: flex; align-items: center; gap: .4rem; }
.ask-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  border-radius: .5rem;
  width: 2rem; height: 2rem; line-height: 1.9rem; text-align: center;
}
.ask-icon-btn:hover { background: var(--vp-c-bg); }
.ask-expand { color: var(--vp-c-text-2); }
.ask-expand:hover { color: var(--vp-c-text-1); }

/* Actions under a finished answer */
.answer-actions { display: flex; justify-content: flex-end; }
.ask-text-btn {
  padding: .3rem .65rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: .5rem;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  font-size: .85rem;
}
.ask-text-btn:hover { background: var(--vp-c-bg); color: var(--vp-c-text-1); }
.answer-copy-status {
  position: absolute;
  width: 1px; height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
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
/* Code blocks with a copy button. Markup matches VitePress code blocks, and
   the theme's global copy-code handler does the copying; these mirror the
   .vp-doc copy-button styles (vp-doc.css), which don't reach this panel. */
.answer-box :deep(.ask-code) {
  position: relative;
  margin: 0 0 .75rem;
}
.answer-box :deep(.ask-code > pre) { margin: 0; padding-right: 3.25rem; }
.answer-box :deep(.ask-code > button.copy) {
  direction: ltr;
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 3;
  border: 1px solid var(--vp-code-copy-code-border-color);
  border-radius: 4px;
  width: 32px;
  height: 32px;
  background-color: var(--vp-code-copy-code-bg);
  background-image: var(--vp-icon-copy);
  background-position: 50%;
  background-size: 16px;
  background-repeat: no-repeat;
  cursor: pointer;
  opacity: 0;
  transition: border-color .25s, background-color .25s, opacity .25s;
}
.answer-box :deep(.ask-code:hover > button.copy),
.answer-box :deep(.ask-code > button.copy:focus) { opacity: 1; }
.answer-box :deep(.ask-code > button.copy:hover),
.answer-box :deep(.ask-code > button.copy.copied) {
  border-color: var(--vp-code-copy-code-hover-border-color);
  background-color: var(--vp-code-copy-code-hover-bg);
}
.answer-box :deep(.ask-code > button.copy.copied) {
  opacity: 1;
  border-radius: 0 4px 4px 0;
  background-image: var(--vp-icon-copied);
}
.answer-box :deep(.ask-code > button.copy.copied::before) {
  position: relative;
  top: -1px;
  transform: translateX(calc(-100% - 1px));
  display: flex;
  justify-content: center;
  align-items: center;
  border: 1px solid var(--vp-code-copy-code-hover-border-color);
  border-right: 0;
  border-radius: 4px 0 0 4px;
  padding: 0 10px;
  width: fit-content;
  height: 32px;
  font-size: 12px;
  font-weight: 500;
  color: var(--vp-code-copy-code-active-text);
  background-color: var(--vp-code-copy-code-hover-bg);
  white-space: nowrap;
  content: var(--vp-code-copy-copied-text-content);
}
.answer-box :deep(.ask-code > span.lang) {
  position: absolute;
  top: 2px;
  right: 8px;
  z-index: 2;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.5;
  user-select: none;
  color: var(--vp-code-lang-color);
  transition: opacity .25s;
}
.answer-box :deep(.ask-code:hover > span.lang),
.answer-box :deep(.ask-code > button.copy:focus + span.lang) { opacity: 0; }
/* touch screens have no hover: keep the copy button visible */
@media (hover: none) {
  .answer-box :deep(.ask-code > button.copy) { opacity: 1; }
  .answer-box :deep(.ask-code > span.lang) { opacity: 0; }
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
