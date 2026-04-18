import { useEffect, useState } from 'react';

interface EventRow { id: number; timestamp: number; event_type: string; data: Record<string, unknown>; }

export function ActivityTimeline() {
  const [events, setEvents] = useState<EventRow[]>([]);
  useEffect(() => {
    const tick = async () => {
      const r = await fetch('/api/events?limit=30');
      const j = await r.json();
      setEvents(j.events);
    };
    tick();
    const id = setInterval(tick, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <aside style={{ width: 260, borderLeft: '1px solid #eee', padding: 16, fontSize: 12 }}>
      <h3 style={{ margin: '0 0 8px' }}>Activity</h3>
      {events.map(e => (
        <div key={e.id} style={{ marginBottom: 6 }}>
          <span style={{ color: '#999' }}>{new Date(e.timestamp).toLocaleTimeString()}</span>{' '}
          <b>{e.event_type}</b>
        </div>
      ))}
      {events.length === 0 && <div style={{ color: '#999' }}>No activity yet.</div>}
    </aside>
  );
}
