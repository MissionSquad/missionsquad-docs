import type { Theme } from 'vitepress';
import DefaultTheme from 'vitepress/theme';
import { h, onMounted, watch, nextTick } from 'vue';
import Search from './components/Search.vue';
import Ask from './components/Ask.vue';
import mediumZoom, { type Zoom } from "medium-zoom";
import './styles.css'
import './custom.css'

export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      // Place Search to the left near the title, and Ask AI immediately to its right
      "nav-bar-content-before": () => [h(Search), h(Ask)],
    });
  },
  enhanceApp({ app, router }) {
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

    // Initialize Mermaid after hydration
    const initializeMermaid = async () => {
      // Check if mermaid is available globally
      if (typeof window !== 'undefined' && (window as any).mermaid) {
        const mermaid = (window as any).mermaid;
        
        // Ensure mermaid is initialized
        if (mermaid.initialize) {
          mermaid.initialize({ 
            startOnLoad: false,
            theme: 'default',
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

        // Wait for next tick to ensure DOM is ready
        await nextTick();
        
        // Find all mermaid containers
        const mermaidElements = document.querySelectorAll('.mermaid');
        
        if (mermaidElements.length > 0) {
          // Remove any existing error messages
          mermaidElements.forEach((element) => {
            if (element.textContent?.includes('Syntax error')) {
              // Reset the element to its original state
              const code = element.getAttribute('data-mermaid') || element.textContent || '';
              element.textContent = code;
              element.removeAttribute('data-processed');
            }
          });
          
          // Re-run mermaid on all elements
          try {
            await mermaid.run({
              querySelector: '.mermaid'
            });
          } catch (error) {
            console.warn('Mermaid initialization error:', error);
            // Try legacy init method as fallback
            try {
              mermaid.init(undefined, mermaidElements);
            } catch (legacyError) {
              console.warn('Mermaid legacy init also failed:', legacyError);
            }
          }
        }
      }
    };

    // Apply zoom functionality
    requestAnimationFrame(apply);
    
    // Initialize mermaid on first load
    requestAnimationFrame(() => {
      // Wait a bit for hydration to complete
      setTimeout(initializeMermaid, 100);
    });

    // Handle route changes
    router.onAfterRouteChange = () => {
      requestAnimationFrame(() => {
        apply();
        // Re-initialize mermaid after route change
        setTimeout(initializeMermaid, 100);
      });
    };

    // Add a global mixin to handle component mounting
    app.mixin({
      mounted() {
        // Check if this component contains mermaid diagrams
        if (this.$el && this.$el.querySelector && this.$el.querySelector('.mermaid')) {
          setTimeout(initializeMermaid, 100);
        }
      }
    });
  },
} satisfies Theme;
