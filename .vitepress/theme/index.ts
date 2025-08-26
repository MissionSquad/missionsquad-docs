import type { Theme } from 'vitepress';
import DefaultTheme from 'vitepress/theme';
import { h } from 'vue';
import Search from './components/Search.vue';
import Ask from './components/Ask.vue';
import mediumZoom, { type Zoom } from "medium-zoom";
import './styles.css'

export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      // Place Search to the left near the title, and Ask AI immediately to its right
      "nav-bar-content-before": () => [h(Search), h(Ask)],
    });
  },
  enhanceApp({ router }) {
    if (typeof window === "undefined") return;

    let zoom: Zoom | null = null;
    const apply = () => {
      zoom?.detach();
      const targets = Array.from(
        document.querySelectorAll<HTMLImageElement>(".vp-doc img:not(.no-zoom)")
      ).filter((img) => !img.closest("a"));
      if (targets.length)
        zoom = mediumZoom(targets, {
          margin: 24,
          background: "rgba(0,0,0,0.6)",
        });
    };

    requestAnimationFrame(apply);
    router.onAfterRouteChange = () => {
      requestAnimationFrame(apply);
    };
  },
} satisfies Theme;
