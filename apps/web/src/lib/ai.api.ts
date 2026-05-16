import type { AiChatMessageDto } from '@gpls/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export async function* streamAiChat(
  messages: AiChatMessageDto[],
): AsyncGenerator<string> {
  const res = await fetch(`${API_BASE}/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });

  if (!res.ok || !res.body) {
    throw new Error(`AI chat failed: ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6).trim();
      if (payload === '[DONE]') return;
      try {
        const parsed = JSON.parse(payload) as { delta?: string };
        if (parsed.delta) yield parsed.delta;
      } catch {
        // ignore malformed chunks
      }
    }
  }
}

export function getRemainingQuestions(): number {
  // Client-side counter stored in sessionStorage
  if (typeof window === 'undefined') return 10;
  const key = 'ai_questions_today';
  const stored = sessionStorage.getItem(key);
  if (!stored) return 10;
  try {
    const { count, date } = JSON.parse(stored) as { count: number; date: string };
    const today = new Date().toISOString().slice(0, 10);
    if (date !== today) return 10;
    return Math.max(0, 10 - count);
  } catch {
    return 10;
  }
}

export function incrementQuestionCount(): void {
  if (typeof window === 'undefined') return;
  const key = 'ai_questions_today';
  const today = new Date().toISOString().slice(0, 10);
  try {
    const stored = sessionStorage.getItem(key);
    const current = stored ? JSON.parse(stored) as { count: number; date: string } : { count: 0, date: today };
    const count = current.date === today ? current.count + 1 : 1;
    sessionStorage.setItem(key, JSON.stringify({ count, date: today }));
  } catch {
    // ignore
  }
}
