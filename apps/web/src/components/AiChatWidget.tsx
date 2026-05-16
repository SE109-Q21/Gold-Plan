'use client';

import { useEffect, useRef, useState } from 'react';
import { streamAiChat, getRemainingQuestions, incrementQuestionCount } from '@/lib/ai.api';
import { useAuth } from '@/contexts/auth-context';

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
    <div style={{
      alignSelf: 'flex-start',
      background: 'var(--ink-3)',
      borderRadius: '10px 10px 10px 2px',
      padding: '8px 12px',
      font: '500 13px/1 var(--font-mono)',
      color: 'var(--mute)',
      letterSpacing: '0.1em',
    }}>
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
  const [remaining, setRemaining] = useState(10);
  const [limitReached, setLimitReached] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // Load remaining on mount / open
  useEffect(() => {
    setRemaining(getRemainingQuestions());
  }, [open]);

  // Auto-scroll to bottom
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

  function handleSend() {
    submit(input);
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit(input);
    }
  }

  function handleChip(q: string) {
    submit(q);
  }

  // Closed button
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label="Open AI Assistant"
        style={{
          position: 'fixed',
          bottom: 28,
          right: 28,
          zIndex: 1000,
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'var(--gold)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(212,175,55,0.4)',
          transition: 'box-shadow 0.2s var(--ease)',
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M4 4h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H8l-4 4V5a1 1 0 0 1 1-1z"
            fill="white"
          />
        </svg>
      </button>
    );
  }

  // Open panel
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 100,
        right: 28,
        width: 340,
        height: 480,
        zIndex: 1000,
        background: 'var(--ink-2)',
        border: '1px solid var(--line)',
        borderRadius: 12,
        boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid var(--line)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'var(--gold)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 4h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H8l-4 4V5a1 1 0 0 1 1-1z"
                fill="white"
              />
            </svg>
          </div>
          <span style={{
            font: '700 13px/1 var(--font-display)',
            color: 'var(--chalk)',
            letterSpacing: '-0.01em',
          }}>
            AI Assistant
          </span>
        </div>
        <button
          onClick={() => setOpen(false)}
          aria-label="Close"
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--mute)',
            font: '500 16px/1 var(--font-mono)',
            padding: '2px 6px',
            borderRadius: 4,
          }}
        >
          ✕
        </button>
      </div>

      {/* Guest counter */}
      <div style={{
        padding: '6px 16px',
        borderBottom: '1px solid var(--hairline)',
        flexShrink: 0,
      }}>
        <span className="mono" style={{
          fontSize: 10,
          color: user ? 'var(--up)' : 'var(--gold)',
          letterSpacing: '0.08em',
        }}>
          {user ? 'unlimited questions' : `${remaining} / 10 questions today`}
        </span>
      </div>

      {/* Message list */}
      <div
        ref={listRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {/* Suggestions — show only when no messages */}
        {messages.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingTop: 8 }}>
            <div style={{
              textAlign: 'center',
              font: '500 12px/1.5 var(--font-display)',
              color: 'var(--mute)',
            }}>
              Hỏi về giá vàng, xu hướng thị trường…
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => handleChip(s)}
                  style={{
                    background: 'var(--ink-3)',
                    border: '1px solid var(--line)',
                    borderRadius: 20,
                    padding: '6px 12px',
                    font: '500 11px/1.3 var(--font-display)',
                    color: 'var(--bone)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'border-color 0.15s',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((m, i) => {
          const isUser = m.role === 'user';
          const showDisclaimer = !isUser && hasFinancialContent(m.content);
          return (
            <div key={i} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: isUser ? 'flex-end' : 'flex-start',
              gap: 4,
            }}>
              <div style={{
                maxWidth: '85%',
                background: isUser
                  ? 'rgba(212,175,55,0.15)'
                  : 'var(--ink-3)',
                border: isUser
                  ? '1px solid rgba(212,175,55,0.3)'
                  : '1px solid var(--line)',
                borderRadius: isUser
                  ? '10px 10px 2px 10px'
                  : '10px 10px 10px 2px',
                padding: '8px 12px',
                font: '500 13px/1.5 var(--font-display)',
                color: 'var(--chalk)',
                wordBreak: 'break-word',
              }}>
                {m.content}
              </div>
              {showDisclaimer && (
                <div style={{
                  font: 'italic 500 10px/1.4 var(--font-display)',
                  color: 'var(--mute)',
                  maxWidth: '85%',
                  paddingLeft: 4,
                }}>
                  For reference only — not financial advice.
                </div>
              )}
            </div>
          );
        })}

        {/* Streaming dots */}
        {streaming && messages[messages.length - 1]?.content === '' && (
          <DotsIndicator />
        )}
      </div>

      {/* Limit reached banner */}
      {limitReached && !user && (
        <div style={{
          padding: '8px 14px',
          background: 'rgba(212,175,55,0.08)',
          borderTop: '1px solid rgba(212,175,55,0.2)',
          font: '500 11px/1.4 var(--font-display)',
          color: 'var(--gold)',
          textAlign: 'center',
          flexShrink: 0,
        }}>
          Register for unlimited questions
        </div>
      )}

      {/* Input row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 12px',
        borderTop: '1px solid var(--line)',
        flexShrink: 0,
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Hỏi về giá vàng…"
          disabled={streaming}
          style={{
            flex: 1,
            background: 'var(--ink-3)',
            border: '1px solid var(--line)',
            borderRadius: 8,
            padding: '8px 12px',
            font: '500 13px/1 var(--font-display)',
            color: 'var(--chalk)',
            outline: 'none',
          }}
        />
        <button
          onClick={handleSend}
          disabled={streaming || !input.trim()}
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: streaming || !input.trim() ? 'var(--ink-3)' : 'var(--gold)',
            border: `1px solid ${streaming || !input.trim() ? 'var(--line)' : 'var(--gold)'}`,
            cursor: streaming || !input.trim() ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'background 0.15s',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M2 8l12-6-5 6 5 6-12-6z"
              fill={streaming || !input.trim() ? 'var(--mute)' : '#0B0B0F'}
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
