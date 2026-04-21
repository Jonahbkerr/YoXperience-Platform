import { useEffect, useRef, useState } from 'react';
import { api, ChatMessage } from '../api';

interface Props {
  refreshTrigger: number;
}

export function ChatThread({ refreshTrigger }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.chatHistory().then(r => setMessages(r.messages)).catch(() => {});
  }, [refreshTrigger]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // Only show user turns — assistant replies are expressed as panels below.
  const userTurns = messages.filter(m => m.role === 'user');

  if (userTurns.length === 0) return null;

  return (
    <div
      ref={scrollRef}
      style={{
        maxHeight: 80,
        overflow: 'auto',
        padding: '8px 20px',
        background: '#f6f7f9',
        borderBottom: '1px solid #e4e8ec',
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6,
      }}
    >
      <span style={{ fontSize: 11, color: '#888', alignSelf: 'center', marginRight: 4 }}>You asked:</span>
      {userTurns.slice(-4).map((m, i) => (
        <span
          key={i}
          style={{
            padding: '4px 10px',
            background: i === userTurns.slice(-4).length - 1 ? '#4a80d0' : 'white',
            color: i === userTurns.slice(-4).length - 1 ? 'white' : '#555',
            border: i === userTurns.slice(-4).length - 1 ? 'none' : '1px solid #e4e8ec',
            borderRadius: 12,
            fontSize: 12,
          }}
        >
          {m.text}
          {m.source === 'voice' && <span style={{ marginLeft: 4, opacity: 0.8 }}>🎤</span>}
        </span>
      ))}
    </div>
  );
}
