import type { Theme } from 'vitepress';
import DefaultTheme from 'vitepress/theme';
import { h } from 'vue';
import Search from './components/Search.vue';
import Ask from './components/Ask.vue';

export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      // Place Search to the left near the title, and Ask AI immediately to its right
      'nav-bar-content-before': () => [h(Search), h(Ask)]
    });
  }
} satisfies Theme;
