export type Role = 'system' | 'user' | 'assistant';

export interface Message {
  role: Role;
  content: string;
}

export interface AskOptions {
  model: string;
  messages: Message[];
}

export interface StreamHandlers {
  onToken: (text: string) => void;
  onError?: (err: unknown) => void;
  onDone?: () => void;
}

/**
 * Stream assistant response tokens from the SSE proxy at /api/ask.
 * Sends { model, messages, stream: true } in the body and parses
 * Server-Sent Events frames: each "data:" line may contain a JSON chunk
 * with choices[0].delta.content or the literal [DONE].
 *
 * @param body AskOptions payload for chat completions
 * @param handlers StreamHandlers callbacks for token, error, and done
 */
export async function streamAsk(
  body: AskOptions,
  handlers: StreamHandlers
): Promise<void> {
  const res = await fetch('/api/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, stream: true })
  });

  if (!res.ok || !res.body) {
    handlers.onError?.(new Error(`HTTP ${res.status}`));
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buf = '';

  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;

      buf += decoder.decode(chunk.value, { stream: true });

      const parts = buf.split('\n\n');
      buf = parts.pop() ?? '';

      for (const part of parts) {
        const lines = part.split('\n').filter(Boolean);
        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          const data = line.slice(5).trim();
          if (data === '[DONE]') {
            handlers.onDone?.();
            return;
          }
          try {
            const json: {
              choices?: Array<{ delta?: { content?: string } }>;
            } = JSON.parse(data);
            const token = json.choices?.[0]?.delta?.content;
            if (token) handlers.onToken(token);
          } catch {
            // ignore non-JSON lines
          }
        }
      }
    }
    handlers.onDone?.();
  } catch (err) {
    handlers.onError?.(err);
  } finally {
    reader.releaseLock();
  }
}
