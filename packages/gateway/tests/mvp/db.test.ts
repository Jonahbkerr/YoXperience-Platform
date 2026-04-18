import { describe, it, expect } from 'vitest';
import { openDb, runMigrations } from '../../src/mvp/db';

describe('db', () => {
  it('creates tables on migration', () => {
    const db = openDb(':memory:');
    runMigrations(db);
    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table'"
    ).all() as { name: string }[];
    const names = tables.map(t => t.name);
    expect(names).toContain('events');
    expect(names).toContain('lm_decisions');
    expect(names).toContain('integrations');
    expect(names).toContain('panels_rendered');
  });
});
