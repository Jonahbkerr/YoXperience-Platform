import { DB } from '../db';

export class TokenStore {
  constructor(private db: DB) {}

  save(service: string, tokens: Record<string, unknown>): void {
    this.db.prepare(`
      INSERT INTO integrations (service, tokens, connected_at)
      VALUES (?, ?, ?)
      ON CONFLICT(service) DO UPDATE SET tokens = excluded.tokens, connected_at = excluded.connected_at
    `).run(service, JSON.stringify(tokens), Date.now());
  }

  get(service: string): Record<string, unknown> | undefined {
    const row = this.db.prepare('SELECT tokens FROM integrations WHERE service = ?').get(service) as { tokens: string } | undefined;
    return row ? JSON.parse(row.tokens) : undefined;
  }

  list(): string[] {
    const rows = this.db.prepare('SELECT service FROM integrations').all() as { service: string }[];
    return rows.map(r => r.service);
  }

  remove(service: string): void {
    this.db.prepare('DELETE FROM integrations WHERE service = ?').run(service);
  }
}
