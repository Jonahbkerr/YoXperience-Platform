import { DB } from '../db';

export interface EventRecord {
  id: number;
  timestamp: number;
  event_type: string;
  data: Record<string, unknown>;
}

export class EventTracker {
  constructor(private db: DB) {}

  log(eventType: string, data: Record<string, unknown>): void {
    this.db.prepare(
      'INSERT INTO events (timestamp, event_type, data) VALUES (?, ?, ?)'
    ).run(Date.now(), eventType, JSON.stringify(data));
  }

  recent(limit: number): EventRecord[] {
    const rows = this.db.prepare(
      'SELECT id, timestamp, event_type, data FROM events ORDER BY timestamp DESC, id DESC LIMIT ?'
    ).all(limit) as { id: number; timestamp: number; event_type: string; data: string }[];
    return rows.map(r => ({
      id: r.id,
      timestamp: r.timestamp,
      event_type: r.event_type,
      data: JSON.parse(r.data),
    }));
  }
}
