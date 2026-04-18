import { Panel } from '../../api';

export function QuickActions({ panel }: { panel: Panel }) {
  const actions = (panel.data.actions as { label: string }[]) ?? [];
  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, marginBottom: 8 }}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>Quick Actions</div>
      {actions.map((a, i) => (
        <button key={i} style={{ margin: '0 6px 6px 0' }}>{a.label}</button>
      ))}
      <div style={{ fontSize: 10, color: '#999' }}>{panel.rationale}</div>
    </div>
  );
}
