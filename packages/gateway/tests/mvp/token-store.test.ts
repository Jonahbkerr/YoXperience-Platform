import { describe, it, expect, beforeEach } from 'vitest';
import { openDb, runMigrations, DB } from '../../src/mvp/db';
import { TokenStore } from '../../src/mvp/integrations/token-store';

describe('TokenStore', () => {
  let db: DB;
  let store: TokenStore;

  beforeEach(() => {
    db = openDb(':memory:');
    runMigrations(db);
    store = new TokenStore(db);
  });

  it('saves and retrieves tokens', () => {
    store.save('gmail', { access: 'a', refresh: 'r' });
    const t = store.get('gmail');
    expect(t).toEqual({ access: 'a', refresh: 'r' });
  });

  it('returns undefined for missing service', () => {
    expect(store.get('missing')).toBeUndefined();
  });

  it('upserts on repeated save', () => {
    store.save('gmail', { access: 'a', refresh: 'r' });
    store.save('gmail', { access: 'b', refresh: 's' });
    expect(store.get('gmail')).toEqual({ access: 'b', refresh: 's' });
  });

  it('lists connected services', () => {
    store.save('gmail', { access: 'a' });
    store.save('slack', { access: 'b' });
    expect(store.list().sort()).toEqual(['gmail', 'slack']);
  });

  it('removes tokens on disconnect', () => {
    store.save('gmail', { access: 'a' });
    store.remove('gmail');
    expect(store.get('gmail')).toBeUndefined();
  });
});
