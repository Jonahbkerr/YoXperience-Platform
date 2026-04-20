interface Props {
  integration: string;
  action: string;
  state: { ok?: boolean; result?: unknown; error?: string };
}

export function PrettyResult({ integration, action, state }: Props) {
  if (state.ok === false) {
    return (
      <div style={{ marginTop: 6, padding: 8, background: '#fee', borderRadius: 4, fontSize: 12 }}>
        ❌ {state.error ?? 'Unknown error'}
      </div>
    );
  }

  const r = state.result as Record<string, unknown> | undefined;
  const box: React.CSSProperties = { marginTop: 6, padding: 10, background: '#f4f6f8', borderRadius: 6, fontSize: 12 };

  if (integration === 'gmail' && action === 'list_unread') {
    const messages = ((r?.messages as Record<string, unknown>[]) ?? []);
    return (
      <div style={box}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>📧 {messages.length} unread</div>
        {messages.map((m, i) => (
          <div key={i} style={{ padding: '6px 0', borderBottom: i < messages.length - 1 ? '1px solid #e4e8ec' : 'none' }}>
            <div style={{ fontWeight: 500 }}>{String(m.from ?? '')}</div>
            <div style={{ color: '#333' }}>{String(m.subject ?? '(no subject)')}</div>
            <div style={{ color: '#666', fontSize: 11 }}>{String(m.snippet ?? '')}</div>
            <div style={{ color: '#999', fontSize: 10 }}>{String(m.time ?? '')}</div>
          </div>
        ))}
      </div>
    );
  }

  if (integration === 'calendar' && action === 'list_upcoming') {
    const events = ((r?.events as Record<string, unknown>[]) ?? []);
    return (
      <div style={box}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>📅 {events.length} event{events.length === 1 ? '' : 's'} today</div>
        {events.map((e, i) => (
          <div key={i} style={{ padding: '6px 0', borderBottom: i < events.length - 1 ? '1px solid #e4e8ec' : 'none' }}>
            <div style={{ fontWeight: 500 }}>{String(e.title ?? '')}</div>
            <div style={{ color: '#666', fontSize: 11 }}>{String(e.start ?? '')} – {String(e.end ?? '')}</div>
            {e.link && <div style={{ color: '#4a80d0', fontSize: 11 }}>{String(e.link)}</div>}
          </div>
        ))}
      </div>
    );
  }

  if (integration === 'slack' && action === 'list_channels') {
    const channels = ((r?.channels as Record<string, unknown>[]) ?? []);
    return (
      <div style={box}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>💬 {channels.length} channel{channels.length === 1 ? '' : 's'}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {channels.map((c, i) => (
            <span key={i} style={{ padding: '3px 8px', background: 'white', borderRadius: 12, fontSize: 11, border: '1px solid #ddd' }}>
              #{String(c.name ?? '')}
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (action === 'send_message') {
    return (
      <div style={{ ...box, background: '#e6f7ea' }}>
        ✅ Message sent to {String((r as { channel?: string })?.channel ?? 'channel')}
      </div>
    );
  }

  if (action === 'create_draft') {
    const draft = (r as { draft?: Record<string, unknown>; status?: string })?.draft;
    return (
      <div style={{ ...box, background: '#e6f7ea' }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>✉ Draft saved</div>
        {draft && <div style={{ fontSize: 11 }}>To: {String(draft.to ?? '')}<br />Subject: {String(draft.subject ?? '')}<br />{String(draft.preview ?? '')}</div>}
      </div>
    );
  }

  if (action === 'create_event') {
    const e = (r as { event?: Record<string, unknown> })?.event;
    return (
      <div style={{ ...box, background: '#e6f7ea' }}>
        ✅ Event created{e ? `: ${String(e.title ?? '')}` : ''}
      </div>
    );
  }

  // Fallback: raw JSON
  return (
    <pre style={{ ...box, whiteSpace: 'pre-wrap', maxHeight: 200, overflow: 'auto' }}>
      {truncate(JSON.stringify(r, null, 2))}
    </pre>
  );
}

function truncate(s: string, max = 1000): string {
  return s.length > max ? s.slice(0, max) + '\n... (truncated)' : s;
}
