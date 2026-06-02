import { describe, it, expect, beforeEach } from 'vitest';
import { openDb, runMigrations, DB } from '../../src/mvp/db';
import { EventTracker } from '../../src/mvp/workflow/tracker';

describe('EventTracker', () => {
  let db: DB;
  let tracker: EventTracker;

  beforeEach(() => {
    db = openDb(':memory:');
    runMigrations(db);
    tracker = new EventTracker(db);
  });

  it('logs and retrieves events', () => {
    tracker.log('click', { target: 'btn1' });
    tracker.log('type', { field: 'search' });
    const recent = tracker.recent(10);
    expect(recent).toHaveLength(2);
    expect(recent[0].event_type).toBe('type');
    expect(recent[1].event_type).toBe('click');
  });

  it('returns empty array when no events', () => {
    expect(tracker.recent(10)).toEqual([]);
  });

  it('respects limit', () => {
    for (let i = 0; i < 5; i++) tracker.log('x', { i });
    expect(tracker.recent(3)).toHaveLength(3);
  });
});
