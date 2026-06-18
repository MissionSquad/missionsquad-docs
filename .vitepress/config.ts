import { withMermaid } from "vitepress-plugin-mermaid";
import llmstxt from "vitepress-plugin-llms";
import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";

// `vitepress dev` (port 5173) only serves the per-page `<path>.md` LLM variants;
// the aggregate `llms.txt` / `llms-full.txt` are build artifacts and otherwise fall
// through to the SPA HTML in dev. This dev-only shim serves the last build's copies
// from `.vitepress/dist` so the dev server matches `vitepress preview` and production.
// (Run `yarn build` once to populate them; they refresh on each build.)
function serveBuiltLlmsTxtInDev(): Plugin {
  const targets = new Set(["/llms.txt", "/llms-full.txt"]);
  return {
    name: "serve-built-llms-txt-in-dev",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? "").split("?")[0] ?? "";
        if (!targets.has(url)) return next();
        try {
          const file = path.resolve(process.cwd(), ".vitepress/dist", url.slice(1));
          const content = fs.readFileSync(file, "utf8");
          res.setHeader("Content-Type", "text/plain; charset=utf-8");
          res.end(content);
        } catch {
          next(); // not built yet — let VitePress handle it
        }
      });
    },
  };
}

export default withMermaid({
  title: "Mission Squad Docs",
  description: "MissionSquad API and Guides",
  srcDir: ".",
  cleanUrls: true,
  ignoreDeadLinks: true,
  lastUpdated: true,
  sitemap: {
    hostname: "https://docs.missionsquad.ai",
  },
  // Dev-only proxy to route local API requests without CORS issues.
  vite: {
    plugins: [
      serveBuiltLlmsTxtInDev(),
      // Generates /llms.txt (section index), /llms-full.txt (full bundle), and a
      // Markdown variant of every page for AI agents. `domain` makes the links in
      // llms.txt absolute; `ignoreFiles` keeps repo meta-docs out of the LLM output.
      llmstxt({
        domain: "https://docs.missionsquad.ai",
        description:
          "MissionSquad API and platform documentation for developers and AI agents. OpenAI-compatible chat/embeddings, agents, workflows, factories, video analysis, webhooks, and a hosted MCP server.",
        ignoreFiles: ["**/README.md", "VITEPRESS_GUIDE.md", "tasks/**", "platform/images/**"],
      }),
    ],
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
      { text: "Hosting", link: "/hosting/" },
      { text: "API", link: "/api/" },
      { text: "MCP Server", link: "/mcp-server/" },
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
            { text: "Factories", link: "/platform/factories" },
            { text: "Video → Workflow", link: "/platform/video-to-workflow" },
            { text: "Schedules", link: "/platform/schedules" },
            { text: "Recipes", link: "/platform/recipes" },
            { text: "Security & Isolation", link: "/platform/security" },
            { text: "Webhooks", link: "/platform/webhooks" },
            { text: "Troubleshooting", link: "/platform/troubleshooting" },
          ],
        },
      ],
      "/hosting/": [
        {
          text: "Hosting",
          items: [
            { text: "Docker & Compose", link: "/hosting/" },
            { text: "Google Cloud (Cloud Run)", link: "/hosting/gcp/" },
            { text: "AWS (ECS Fargate)", link: "/hosting/aws/" },
          ],
        },
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
            { text: "Audio (TTS/STT)", link: "/api/reference/audio" },
            { text: "Embeddings", link: "/api/reference/embeddings" },
            { text: "Providers", link: "/api/reference/providers" },
            { text: "Models", link: "/api/reference/models" },
            { text: "Agents", link: "/api/reference/agents" },
            { text: "Workflows", link: "/api/reference/workflows" },
            { text: "Factories", link: "/api/reference/factories" },
            { text: "Video Processing", link: "/api/reference/video" },
            { text: "MCP Servers (Connect & OAuth)", link: "/api/reference/mcp-servers" },
            { text: "Usage", link: "/api/reference/usage" },
            { text: "Core Utilities", link: "/api/reference/core-utilities" },
            { text: "Collections", link: "/api/reference/collections" },
            { text: "Vector Stores", link: "/api/reference/vector-stores" },
            { text: "Files", link: "/api/reference/files" },
            { text: "Webhooks", link: "/api/reference/webhooks" },
            { text: "Convenience", link: "/api/reference/convenience" },
            { text: "Endpoint Index", link: "/api/reference/endpoint-index" },
          ],
        },
        {
          text: "MCP API (Admin)",
          items: [
            { text: "Overview", link: "/api/mcp-api/" },
            { text: "Packages", link: "/api/mcp-api/packages" },
            { text: "Servers & Tools", link: "/api/mcp-api/servers" },
            { text: "Secrets", link: "/api/mcp-api/secrets" },
          ],
        },
      ],
      "/mcp-server/": [
        {
          text: "Mission Squad MCP Server",
          items: [
            { text: "Overview", link: "/mcp-server/" },
            { text: "Connect", link: "/mcp-server/#connecting" },
            { text: "Tool Reference", link: "/mcp-server/#tool-reference" },
          ],
        },
      ],
    },
  },
  // Mermaid options (global rendering tweaks for readability at ~700px width)
  mermaid: {
    startOnLoad: false, // Changed to false to control initialization manually
    flowchart: {
      curve: "linear",
      nodeSpacing: 30,
      rankSpacing: 40,
      htmlLabels: true,
    },
    themeVariables: {
      fontSize: "14px",
    },
  },
  // Plugin container options (optional)
  mermaidPlugin: {
    class: "mermaid",
  },
});
