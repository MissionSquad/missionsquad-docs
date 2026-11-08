import type { Mermaid } from 'mermaid';

/**
 * Renders ```mermaid blocks in Ask AI answers as diagrams.
 *
 * `renderAnswerMarkdown` turns each mermaid fence into
 * `<div class="ask-mermaid" data-source="…">` holding a plain code block as
 * the fallback. This module replaces that fallback with the diagram's SVG.
 *
 * - Uses a dedicated class (not `.mermaid`) so the theme's page-level
 *   `mermaid.run({ querySelector: '.mermaid' })` never touches answers.
 * - `securityLevel: 'strict'`: the diagram source is model output, so click
 *   handlers and raw HTML in labels are disabled (Mermaid sanitizes labels).
 * - Invalid or incomplete diagrams keep the code-block fallback.
 * - The source stays in `data-source`, so diagrams can be re-rendered (for
 *   example after a light/dark theme switch).
 */

let mermaidLoader: Promise<Mermaid> | null = null;
let renderCount = 0;

function loadMermaid(): Promise<Mermaid> {
  mermaidLoader ??= import('mermaid').then((module) => module.default);
  return mermaidLoader;
}

/** Same layout options the docs pages use (MermaidDiagram.vue, theme/index.ts). */
function configure(mermaid: Mermaid, dark: boolean): void {
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: dark ? 'dark' : 'default',
    flowchart: {
      curve: 'linear',
      nodeSpacing: 30,
      rankSpacing: 40,
      htmlLabels: true
    },
    themeVariables: {
      fontSize: '14px'
    }
  });
}

/**
 * Render (or re-render) every mermaid placeholder inside `root`.
 *
 * @param root element containing the rendered answer HTML
 * @param dark whether the docs are in dark mode
 */
export async function renderAnswerDiagrams(root: HTMLElement, dark: boolean): Promise<void> {
  const nodes = Array.from(root.querySelectorAll<HTMLElement>('.ask-mermaid[data-source]'));
  if (nodes.length === 0) return;

  let mermaid: Mermaid;
  try {
    mermaid = await loadMermaid();
  } catch (error) {
    console.warn('Ask AI: could not load Mermaid; showing diagram source instead.', error);
    return;
  }
  configure(mermaid, dark);

  for (const node of nodes) {
    const source = node.dataset.source ?? '';
    if (!source.trim()) continue;
    try {
      const valid = await mermaid.parse(source, { suppressErrors: true });
      if (!valid) continue;
      renderCount += 1;
      const { svg } = await mermaid.render(`ask-mermaid-${renderCount}`, source);
      node.innerHTML = svg;
      // Mermaid sizes the SVG to 100% of its container with the natural width
      // as max-width, which shrinks wide diagrams to unreadable text in the
      // narrow answer panel. Show it at its natural size instead; the
      // container scrolls horizontally when it is wider than the panel.
      const svgElement = node.querySelector('svg');
      const naturalWidth = svgElement?.style.maxWidth;
      if (svgElement && naturalWidth) {
        svgElement.style.width = naturalWidth;
        svgElement.style.maxWidth = 'none';
      }
      node.classList.add('ask-mermaid--rendered');
    } catch (error) {
      console.warn('Ask AI: could not render a Mermaid diagram; showing its source instead.', error);
    }
  }
}
