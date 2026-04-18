import { Router } from 'express';
import { EventTracker } from '../workflow/tracker';

export function eventsRouter(tracker: EventTracker): Router {
  const r = Router();

  r.post('/events', (req, res) => {
    const { event_type, data } = req.body ?? {};
    if (typeof event_type !== 'string') {
      return res.status(400).json({ error: 'event_type required' });
    }
    tracker.log(event_type, data ?? {});
    res.json({ ok: true });
  });

  r.get('/events', (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 20, 200);
    res.json({ events: tracker.recent(limit) });
  });

  return r;
}
