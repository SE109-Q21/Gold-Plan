'use client';

import { useEffect, useRef, useState } from 'react';
import { streamAiChat, getRemainingQuestions, incrementQuestionCount } from '@/lib/ai.api';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTIONS = [
  'Giá vàng SJC hôm nay?',
  'So sánh giá SJC và DOJI?',
  'Xu hướng giá vàng tuần này?',
  'Nên mua vàng lúc này không?',
];

function hasFinancialContent(text: string): boolean {
  return /₫|\$|%|price/i.test(text);
}

function DotsIndicator() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStep(s => (s + 1) % 4), 400);
    return () => clearInterval(id);
  }, []);
  const dots = '●'.repeat(step + 1) + '○'.repeat(3 - step);
  return (
    <div className="self-start bg-ink-3 rounded-[10px_10px_10px_2px] px-3 py-2 font-mono text-[13px] leading-none font-medium text-mute tracking-[0.1em]">
      {dots}
    </div>
  );
}

export function AiChatWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [remaining, setRemaining] = useState(() => getRemainingQuestions());
  const [limitReached, setLimitReached] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, streaming]);

  async function submit(text: string) {
    const q = text.trim();
    if (!q || streaming) return;

    if (remaining <= 0 && !user) {
      setLimitReached(true);
      return;
    }
    setLimitReached(false);

    const userMsg: Message = { role: 'user', content: q };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');

    incrementQuestionCount();
    setRemaining(getRemainingQuestions());
    setStreaming(true);

    const assistantMsg: Message = { role: 'assistant', content: '' };
    setMessages([...next, assistantMsg]);

    try {
      let built = '';
      for await (const chunk of streamAiChat(next)) {
        built += chunk;
        setMessages([...next, { role: 'assistant', content: built }]);
      }
    } catch {
      setMessages([...next, { role: 'assistant', content: 'Xin lỗi, đã xảy ra lỗi. Vui lòng thử lại.' }]);
    } finally {
      setStreaming(false);
    }
  }

  function handleSend() { submit(input); }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(input); }
  }

  if (!open) {
    return (
      <Button
        onClick={() => {
          setRemaining(getRemainingQuestions());
          setOpen(true);
        }}
        aria-label="Mở trợ lý AI"
        size="icon"
        className="fixed bottom-7 right-7 z-[1000] w-14 h-14 rounded-full bg-gold shadow-[0_4px_20px_rgba(212,175,55,0.4)] transition-shadow hover:bg-gold/90"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M4 4h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H8l-4 4V5a1 1 0 0 1 1-1z" fill="white"/>
        </svg>
      </Button>
    );
  }

  const sendDisabled = streaming || !input.trim();

  return (
    <div className="fixed bottom-[100px] right-7 w-[340px] h-[480px] z-[1000] bg-ink-2 border border-line rounded-[12px] shadow-[0_8px_40px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-line shrink-0">
        <div className="flex items-center gap-[10px]">
          <div className="w-7 h-7 rounded-full bg-gold flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M4 4h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H8l-4 4V5a1 1 0 0 1 1-1z" fill="white"/>
            </svg>
          </div>
          <span className="font-display text-[13px] leading-none font-bold text-chalk tracking-[-0.01em]">
            Trợ lý AI
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen(false)}
          aria-label="Đóng"
          className="w-auto h-auto px-[6px] py-[2px] text-mute font-mono text-[16px] leading-none font-medium hover:bg-transparent hover:text-bone"
        >
          ✕
        </Button>
      </div>

      {/* Guest counter */}
      <div className="px-4 py-[6px] border-b border-hairline shrink-0">
        <span className={cn('font-mono text-[10px] tracking-[0.08em]', user ? 'text-up' : 'text-gold')}>
          {user ? 'không giới hạn câu hỏi' : `${remaining} / 10 câu hỏi hôm nay`}
        </span>
      </div>

      {/* Message list */}
      <div ref={listRef} className="flex-1 overflow-y-auto p-[12px_14px] flex flex-col gap-[10px]">
        {messages.length === 0 && (
          <div className="flex flex-col gap-6 pt-2">
            <div className="text-center font-sans text-[12px] leading-[1.5] font-medium text-mute">
              Hỏi về giá vàng, xu hướng thị trường…
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGGESTIONS.map(s => (
                <Button
                  key={s}
                  variant="outline"
                  onClick={() => submit(s)}
                  className="bg-ink-3 border-line rounded-[20px] px-3 py-[6px] h-auto font-sans text-[11px] leading-[1.3] font-medium text-bone hover:bg-ink-3 hover:border-gold transition-[border-color] duration-150"
                >
                  {s}
                </Button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => {
          const isUser = m.role === 'user';
          const showDisclaimer = !isUser && hasFinancialContent(m.content);
          return (
            <div key={i} className={cn('flex flex-col gap-1', isUser ? 'items-end' : 'items-start')}>
              <div className={cn(
                'max-w-[85%] px-3 py-2 font-sans text-[13px] leading-[1.5] font-medium text-chalk break-words',
                isUser
                  ? 'bg-[rgba(212,175,55,0.15)] border border-[rgba(212,175,55,0.3)] rounded-[10px_10px_2px_10px]'
                  : 'bg-ink-3 border border-line rounded-[10px_10px_10px_2px]',
              )}>
                {m.content}
              </div>
              {showDisclaimer && (
                <div className="italic font-sans text-[10px] leading-[1.4] font-medium text-mute max-w-[85%] pl-1">
                  Chỉ mang tính tham khảo — không phải tư vấn tài chính.
                </div>
              )}
            </div>
          );
        })}

        {streaming && messages[messages.length - 1]?.content === '' && <DotsIndicator />}
      </div>

      {/* Limit reached banner */}
      {limitReached && !user && (
        <div className="px-[14px] py-2 bg-[rgba(212,175,55,0.08)] border-t border-[rgba(212,175,55,0.2)] font-sans text-[11px] leading-[1.4] font-medium text-gold text-center shrink-0">
          Đăng ký để hỏi không giới hạn
        </div>
      )}

      {/* Input row */}
      <div className="flex items-center gap-2 px-3 py-[10px] border-t border-line shrink-0">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Hỏi về giá vàng…"
          disabled={streaming}
          className="flex-1 bg-ink-3 border-line rounded-lg font-sans text-[13px] font-medium text-chalk placeholder:text-mute focus-visible:ring-gold disabled:opacity-60 h-[36px]"
        />
        <Button
          onClick={handleSend}
          disabled={sendDisabled}
          size="icon"
          className={cn(
            'w-9 h-9 rounded-lg shrink-0 border',
            sendDisabled ? 'bg-ink-3 border-line' : 'bg-gold border-gold hover:bg-gold/90',
          )}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 8l12-6-5 6 5 6-12-6z" fill={sendDisabled ? 'var(--mute)' : '#0B0B0F'}/>
          </svg>
        </Button>
      </div>
    </div>
  );
}
