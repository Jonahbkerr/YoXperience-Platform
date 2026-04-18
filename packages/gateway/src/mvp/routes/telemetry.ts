import { Router } from 'express';
import { DB } from '../db';

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(',')];
  for (const row of rows) lines.push(headers.map(h => escape(row[h])).join(','));
  return lines.join('\n');
}

export function telemetryRouter(db: DB): Router {
  const r = Router();

  r.get('/telemetry/:table.csv', (req, res) => {
    const allowed = ['events', 'lm_decisions', 'panels_rendered'];
    const table = req.params.table;
    if (!allowed.includes(table)) return res.status(400).send('invalid table');
    const rows = db.prepare(`SELECT * FROM ${table} ORDER BY id DESC LIMIT 10000`).all() as Record<string, unknown>[];
    res.type('text/csv').send(toCsv(rows));
  });

  r.post('/panels/:id/dismiss', (req, res) => {
    const id = Number(req.params.id);
    db.prepare('UPDATE panels_rendered SET dismissed = 1 WHERE id = ?').run(id);
    res.json({ ok: true });
  });

  return r;
}
