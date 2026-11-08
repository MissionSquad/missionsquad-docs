import { Marked, type Tokens } from 'marked';

/**
 * Markdown → HTML for model-generated answers (Ask AI).
 *
 * Uses `marked` (same library and major version as missionsquad-web), with
 * the three renderers that could inject markup locked down, because the input
 * is LLM output built from retrieved content:
 *
 * - raw HTML in the answer is escaped and shown as text, never rendered;
 * - links are kept only for http(s), mailto, and site-relative URLs
 *   (no `javascript:`/`data:`); external links open in a new tab;
 * - images are rendered as their alt text (no remote image loads).
 * - ```mermaid fences become placeholders that askMermaid.ts renders with
 *   Mermaid in strict security mode (source shown as code until then).
 *
 * Everything else (paragraphs, lists, code, tables, emphasis) uses marked's
 * default renderer, which escapes text content.
 */

const SAFE_URL = /^(https?:\/\/|mailto:|\/(?!\/)|#|\.{1,2}\/)/i;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** True for absolute http(s) URLs that leave the current site. */
function isExternal(href: string): boolean {
  if (!/^https?:\/\//i.test(href)) return false;
  if (typeof window === 'undefined') return true;
  try {
    return new URL(href).origin !== window.location.origin;
  } catch {
    return true;
  }
}

const markdown = new Marked({
  gfm: true,
  breaks: false,
  renderer: {
    html({ text }: Tokens.HTML | Tokens.Tag): string {
      return escapeHtml(text);
    },
    link({ href, title, tokens }: Tokens.Link): string {
      const label = this.parser.parseInline(tokens);
      const url = href.trim();
      if (!SAFE_URL.test(url)) return label;
      const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
      const targetAttr = isExternal(url) ? ' target="_blank" rel="noopener noreferrer"' : '';
      return `<a href="${escapeHtml(url)}"${titleAttr}${targetAttr}>${label}</a>`;
    },
    image({ text }: Tokens.Image): string {
      return escapeHtml(text);
    },
    // ```mermaid fences become a placeholder for askMermaid.ts to fill with
    // the diagram; until then (and if the diagram is invalid) the escaped
    // source shows as a normal code block. Other languages use the default.
    code({ text, lang }: Tokens.Code): string | false {
      if ((lang ?? '').trim().toLowerCase() !== 'mermaid') return false;
      const source = escapeHtml(text);
      return `<div class="ask-mermaid" data-source="${source}"><pre><code class="language-mermaid">${source}</code></pre></div>\n`;
    }
  }
});

/**
 * Render a (possibly partial, mid-stream) markdown answer to safe HTML.
 *
 * @param source markdown text from the model
 * @returns HTML string for `v-html`
 */
export function renderAnswerMarkdown(source: string): string {
  return markdown.parse(source, { async: false });
}
