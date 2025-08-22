export interface Env {
  MS_BASE_URL: string;
  MS_API_KEY: string;
}

function sseHeaders(extra?: HeadersInit): Headers {
  const h = new Headers({
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  if (extra) {
    const ex = new Headers(extra);
    ex.forEach((v, k) => h.set(k, v));
  }
  return h;
}

function corsHeaders(): Headers {
  return new Headers({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
}

function mergeHeaders(a: Headers, b: Headers): Headers {
  const out = new Headers(a);
  b.forEach((v, k) => out.set(k, v));
  return out;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    if (url.pathname === '/api/embed' && req.method === 'POST') {
      const base = env.MS_BASE_URL.replace(/\/+$/, '');
      const endpoint = base.endsWith('/v1') ? `${base}/embeddings` : `${base}/v1/embeddings`;
      const upstream = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.MS_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: await req.text()
      });
      return new Response(upstream.body, {
        status: upstream.status,
        headers: mergeHeaders(upstream.headers, corsHeaders())
      });
    }

    if (url.pathname === '/api/ask' && req.method === 'POST') {
      const base = env.MS_BASE_URL.replace(/\/+$/, '');
      const endpoint = base.endsWith('/v1') ? `${base}/chat/completions` : `${base}/v1/chat/completions`;
      const upstream = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.MS_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: await req.text()
      });
      return new Response(upstream.body, {
        status: upstream.status,
        headers: sseHeaders(upstream.headers)
      });
    }

    return new Response('Not found', { status: 404, headers: corsHeaders() });
  }
};
