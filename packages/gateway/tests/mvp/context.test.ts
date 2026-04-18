import { describe, it, expect, beforeEach } from 'vitest';
import { openDb, runMigrations, DB } from '../../src/mvp/db';
import { EventTracker } from '../../src/mvp/workflow/tracker';
import { buildContext } from '../../src/mvp/workflow/context';

describe('buildContext', () => {
  let db: DB;
  let tracker: EventTracker;

  beforeEach(() => {
    db = openDb(':memory:');
    runMigrations(db);
    tracker = new EventTracker(db);
  });

  it('returns context with recent events and metadata', () => {
    tracker.log('click', { target: 'inbox' });
    const ctx = buildContext({ tracker, enabledIntegrations: ['gmail'] });
    expect(ctx.recent_actions).toHaveLength(1);
    expect(ctx.recent_actions[0].event_type).toBe('click');
    expect(ctx.active_integrations).toEqual(['gmail']);
    expect(typeof ctx.time_of_day).toBe('string');
    expect(typeof ctx.timestamp).toBe('number');
  });

  it('caps recent actions at 20', () => {
    for (let i = 0; i < 25; i++) tracker.log('x', { i });
    const ctx = buildContext({ tracker, enabledIntegrations: [] });
    expect(ctx.recent_actions).toHaveLength(20);
  });
});
