import { Router } from 'express';
import { EventTracker, EventRecord } from '../workflow/tracker';

export function chatRouter(tracker: EventTracker): Router {
  const r = Router();

  r.post('/chat', (req, res) => {
    const { text, source } = req.body ?? {};
    if (typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'text required' });
    }
    tracker.log('chat_message', { role: 'user', text: text.trim(), source: source ?? 'text' });
    res.json({ ok: true });
  });

  r.get('/chat', (_req, res) => {
    const events = tracker.recent(50);
    const messages = events
      .filter(e => e.event_type === 'chat_message')
      .map(e => ({ timestamp: e.timestamp, ...(e.data as Record<string, unknown>) }))
      .reverse();
    res.json({ messages });
  });

  return r;
}

export function extractChatHistory(events: EventRecord[], limit = 6): { role: string; text: string }[] {
  const chat = events
    .filter(e => e.event_type === 'chat_message')
    .slice(0, limit)
    .reverse()
    .map(e => {
      const d = e.data as { role?: string; text?: string };
      return { role: d.role ?? 'user', text: d.text ?? '' };
    });
  return chat;
}
