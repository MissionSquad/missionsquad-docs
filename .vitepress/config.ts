import { defineConfig } from 'vitepress';

export default defineConfig({
  title: "Mission Squad Docs",
  description: "MissionSquad API and Guides",
  srcDir: ".",
  cleanUrls: true,
  // Dev-only proxy to route local API requests without CORS issues.
  vite: {
    server: {
      proxy: {
        "/api/embed": {
          target: "https://docs.missionsquad.ai",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/dev-api/, ""),
          // Explicitly set safe headers for CF WAF; dev Referer from localhost can be blocked
          headers: {
            referer: "https://docs.missionsquad.ai/",
            origin: "https://docs.missionsquad.ai",
          },
          // Strip Referer/Origin at the proxy layer to avoid CF WAF blocks from localhost dev
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              try {
                proxyReq.removeHeader("referer");
                proxyReq.removeHeader("origin");
              } catch {
                // ignore
              }
            });
          },
          // secure: false, // uncomment if using self-signed https backend
          // ws: true, // uncomment if backend uses websockets
        },
        "/api/ask": {
          target: "https://docs.missionsquad.ai",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/dev-api/, ""),
          headers: {
            referer: "https://docs.missionsquad.ai/",
            origin: "https://docs.missionsquad.ai",
          },
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              try {
                proxyReq.removeHeader("referer");
                proxyReq.removeHeader("origin");
              } catch {
                // ignore
              }
            });
          },
          // secure: false, // uncomment if using self-signed https backend
          // ws: true, // uncomment if backend uses websockets
        },
      },
    },
  },
  themeConfig: {
    nav: [
      { text: "Platform", link: "/platform/" },
      { text: "API", link: "/api/" },
    ],
    sidebar: {
      "/platform/": [
        {
          text: "Overview",
          items: [{ text: "Platform Overview", link: "/platform/" }],
        },
        {
          text: "Guides",
          items: [
            { text: "Getting Started", link: "/platform/getting-started" },
            { text: "Providers", link: "/platform/providers" },
            { text: "Models", link: "/platform/models" },
            { text: "Agents", link: "/platform/agents" },
            { text: "MCP (Tools)", link: "/platform/mcp" },
            { text: "Prompt Studio", link: "/platform/prompt-studio" },
            { text: "Embeddings", link: "/platform/embeddings" },
            { text: "Workflows", link: "/platform/workflows" },
            { text: "Schedules", link: "/platform/schedules" },
            { text: "Recipes", link: "/platform/recipes" },
            { text: "Security & Isolation", link: "/platform/security" },
            { text: "Troubleshooting", link: "/platform/troubleshooting" }
          ]
        }
      ],
      "/api/": [
        {
          text: "Overview",
          items: [{ text: "MissionSquad API Overview", link: "/api/" }],
        },
        {
          text: "Reference",
          items: [
            {
              text: "Chat Completions",
              link: "/api/reference/chat-completions",
            },
            { text: "Embeddings", link: "/api/reference/embeddings" },
            { text: "Providers", link: "/api/reference/providers" },
            { text: "Models", link: "/api/reference/models" },
            { text: "Agents", link: "/api/reference/agents" },
            { text: "Core Utilities", link: "/api/reference/core-utilities" },
            { text: "Collections", link: "/api/reference/collections" },
            { text: "Vector Stores", link: "/api/reference/vector-stores" },
            { text: "Files", link: "/api/reference/files" },
            { text: "Convenience", link: "/api/reference/convenience" },
            { text: "Endpoint Index", link: "/api/reference/endpoint-index" },
          ],
        },
      ],
    },
  },
});
