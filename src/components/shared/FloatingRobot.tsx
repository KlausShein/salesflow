import React, { useState, useRef, useEffect, useCallback } from 'react';
import Lottie from 'lottie-react';
import robotAnimation from '../../assets/robot.json';
import { useAssistantContext } from '../../hooks/useAssistantContext'; // adjust path if needed

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

const SESSION_ID = `session_${Date.now()}`;
const API_URL = import.meta.env.VITE_AI_API_URL || 'http://localhost:3001';

const FloatingRobot: React.FC = () => {
  const [open, setOpen]         = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', text: "Hi! I'm your PrintPOS assistant. Ask me about today's sales, expenses, distributions, or anything about your business! 🖨️" },
  ]);
  const [input, setInput]   = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef           = useRef<HTMLDivElement>(null);
  const { fetchContext }    = useAssistantContext();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', text }]);
    setLoading(true);

    try {
      // Fetch live Supabase data and attach as context
      const context = await fetchContext();

      const res = await fetch(`${API_URL}/api/assistant`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message:   text,
          sessionId: SESSION_ID,
          context,           // ← live business data sent alongside the message
        }),
      });

      const data = await res.json();
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: data.text ?? 'Sorry, I could not get a response.',
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: 'Connection error. Make sure the server is running.',
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, fetchContext]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') sendMessage();
  };

  const SUGGESTIONS = [
    "What are today's sales?",
    'Show this month summary',
    'How are distributions looking?',
    'Any expense alerts?',
  ];

  return (
    <>
      {/* ── Floating Robot Button ── */}
      <div
        onClick={() => setOpen(o => !o)}
        role="button"
        aria-label="Open AI Assistant"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && setOpen(o => !o)}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 110,
          height: 110,
          zIndex: 40,
          cursor: 'pointer',
          animation: 'robotFloat 3s ease-in-out infinite',
          filter: open ? 'drop-shadow(0 0 12px rgba(99,102,241,0.7))' : 'none',
          transition: 'filter 0.3s ease',
        }}
      >
        <Lottie animationData={robotAnimation} loop autoplay />
        <style>{`
          @keyframes robotFloat {
            0%, 100% { transform: translateY(0px); }
            50%       { transform: translateY(-14px); }
          }
        `}</style>
      </div>

      {/* ── Chat Panel ── */}
      {open && (
        <div style={{
          position: 'fixed',
          bottom: 148,
          right: 24,
          width: 340,
          maxHeight: 480,
          background: '#1e1e2e',
          border: '1px solid rgba(99,102,241,0.35)',
          borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 999,
          overflow: 'hidden',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}>

          {/* Header */}
          <div style={{
            padding: '12px 16px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>🤖</span>
              <div>
                <div style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>PrintPOS Assistant</div>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10 }}>Powered by live data</div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                borderRadius: 6,
                color: '#fff',
                width: 24,
                height: 24,
                cursor: 'pointer',
                fontSize: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >✕</button>
          </div>

          {/* Quick suggestion chips — only on fresh chat */}
          {messages.length === 1 && (
            <div style={{
              padding: '8px 12px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  style={{
                    background: 'rgba(99,102,241,0.15)',
                    border: '1px solid rgba(99,102,241,0.3)',
                    borderRadius: 20,
                    color: '#a5b4fc',
                    fontSize: 11,
                    padding: '4px 10px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >{s}</button>
              ))}
            </div>
          )}

          {/* Messages */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}>
            {messages.map((msg, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}>
                <div style={{
                  maxWidth: '82%',
                  padding: '9px 13px',
                  borderRadius: msg.role === 'user'
                    ? '14px 14px 4px 14px'
                    : '14px 14px 14px 4px',
                  background: msg.role === 'user'
                    ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                    : 'rgba(255,255,255,0.07)',
                  color: msg.role === 'user' ? '#fff' : '#e2e8f0',
                  fontSize: 13,
                  lineHeight: 1.5,
                  border: msg.role === 'assistant'
                    ? '1px solid rgba(255,255,255,0.08)'
                    : 'none',
                  whiteSpace: 'pre-wrap',
                }}>
                  {msg.text}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{
                  padding: '9px 13px',
                  borderRadius: '14px 14px 14px 4px',
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#94a3b8',
                  fontSize: 11,
                  display: 'flex',
                  gap: 6,
                  alignItems: 'center',
                }}>
                  <span>Analyzing your data</span>
                  {[0, 0.4, 0.8].map((delay, i) => (
                    <span key={i} style={{
                      display: 'inline-block',
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: '#6366f1',
                      animation: `pulse 1.2s ease-in-out ${delay}s infinite`,
                    }} />
                  ))}
                  <style>{`
                    @keyframes pulse {
                      0%, 100% { opacity: 0.2; transform: scale(0.8); }
                      50% { opacity: 1; transform: scale(1); }
                    }
                  `}</style>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: '10px 12px',
            borderTop: '1px solid rgba(255,255,255,0.07)',
            display: 'flex',
            gap: 8,
          }}>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about sales, expenses…"
              disabled={loading}
              autoFocus
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(99,102,241,0.3)',
                borderRadius: 10,
                padding: '8px 12px',
                color: '#e2e8f0',
                fontSize: 13,
                outline: 'none',
              }}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              style={{
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                border: 'none',
                borderRadius: 10,
                color: '#fff',
                padding: '8px 14px',
                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                fontSize: 16,
                opacity: loading || !input.trim() ? 0.5 : 1,
                transition: 'opacity 0.2s',
              }}
            >➤</button>
          </div>
        </div>
      )}
    </>
  );
};

export default FloatingRobot;