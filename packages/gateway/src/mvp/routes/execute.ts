import { Router } from 'express';
import { IntegrationRegistry } from '../integrations/registry';
import { EventTracker } from '../workflow/tracker';
import { DB } from '../db';

const WRITE_ACTIONS = new Set(['send_message', 'create_draft', 'create_event']);

export function executeRouter(registry: IntegrationRegistry, tracker: EventTracker, db: DB): Router {
  const r = Router();

  r.post('/demo/seed', (_req, res) => {
    db.prepare('DELETE FROM panels_rendered').run();
    db.prepare('DELETE FROM lm_decisions').run();
    db.prepare('DELETE FROM events').run();
    const now = Date.now();
    const events: [string, Record<string, unknown>, number][] = [
      ['session_start', { source: 'demo_seed' }, now - 300_000],
      ['opened_app', { area: 'dashboard' }, now - 280_000],
      ['checked_time', { part_of_day: 'morning' }, now - 260_000],
      ['intent', { goal: 'catch up on overnight messages and review todays schedule' }, now - 240_000],
    ];
    const stmt = db.prepare('INSERT INTO events (timestamp, event_type, data) VALUES (?, ?, ?)');
    for (const [type, data, ts] of events) stmt.run(ts, type, JSON.stringify(data));
    res.json({ ok: true, seeded: events.length });
  });

  r.get('/demo/status', (_req, res) => {
    res.json({ demoMode: process.env.DEMO_MODE === 'true' });
  });

  r.post('/execute', async (req, res) => {
    const { integration, action, params, confirmed } = req.body ?? {};
    if (typeof integration !== 'string' || typeof action !== 'string') {
      return res.status(400).json({ error: 'integration and action required' });
    }
    const tool = registry.get(integration);
    if (!tool) return res.status(404).json({ error: `unknown integration: ${integration}` });

    if (WRITE_ACTIONS.has(action) && !confirmed) {
      return res.json({ ok: false, needsConfirmation: true, integration, action, params });
    }

    tracker.log('execute', { integration, action, params });
    try {
      const result = await tool.execute(action, params ?? {});
      tracker.log('execute_ok', { integration, action });
      res.json({ ok: true, result });
    } catch (err) {
      tracker.log('execute_error', { integration, action, error: (err as Error).message });
      res.status(500).json({ ok: false, error: (err as Error).message });
    }
  });

  r.get('/actions', (_req, res) => {
    const all: { integration: string; action: string; label: string; params: unknown[] }[] = [];
    for (const name of registry.enabledNames()) {
      const tool = registry.get(name);
      if (!tool) continue;
      for (const a of tool.listActions()) {
        all.push({ integration: name, action: a.id, label: a.label, params: a.params });
      }
    }
    res.json({ actions: all });
  });

  return r;
}
