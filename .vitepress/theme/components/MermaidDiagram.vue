<template>
  <div class="mermaid-wrapper">
    <ClientOnly>
      <div ref="mermaidContainer" class="mermaid" v-html="processedCode"></div>
      <template #fallback>
        <div class="mermaid-loading">Loading diagram...</div>
      </template>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue';

const props = defineProps<{
  code: string;
}>();

const mermaidContainer = ref<HTMLElement>();
const processedCode = ref(props.code);

const renderMermaid = async () => {
  if (typeof window === 'undefined' || !mermaidContainer.value) return;
  
  const mermaid = (window as any).mermaid;
  if (!mermaid) {
    console.warn('Mermaid library not loaded');
    return;
  }

  try {
    // Reset the container
    if (mermaidContainer.value) {
      mermaidContainer.value.textContent = props.code;
      mermaidContainer.value.removeAttribute('data-processed');
    }

    // Initialize mermaid if needed
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

    await nextTick();

    // Render the diagram
    if (mermaid.run) {
      await mermaid.run({
        nodes: [mermaidContainer.value]
      });
    } else if (mermaid.init) {
      // Fallback for older versions
      mermaid.init(undefined, mermaidContainer.value);
    }
  } catch (error) {
    console.error('Error rendering Mermaid diagram:', error);
    if (mermaidContainer.value) {
      mermaidContainer.value.innerHTML = `<div class="mermaid-error">Error rendering diagram: ${error}</div>`;
    }
  }
};

onMounted(() => {
  // Small delay to ensure mermaid library is loaded
  setTimeout(renderMermaid, 100);
});

// Re-render if code changes
watch(() => props.code, () => {
  processedCode.value = props.code;
  nextTick(() => {
    setTimeout(renderMermaid, 100);
  });
});
</script>

<style scoped>
.mermaid-wrapper {
  margin: 1.5rem 0;
}

.mermaid-loading {
  padding: 2rem;
  text-align: center;
  color: #666;
  background: #f5f5f5;
  border-radius: 4px;
}

.mermaid-error {
  padding: 1rem;
  color: #d32f2f;
  background: #ffebee;
  border: 1px solid #ffcdd2;
  border-radius: 4px;
}

:deep(.mermaid) {
  display: flex;
  justify-content: center;
  background: transparent;
}
</style>
