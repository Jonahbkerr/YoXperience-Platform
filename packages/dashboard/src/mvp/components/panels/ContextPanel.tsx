import { Panel } from '../../api';
import { PanelButtons } from '../PanelButtons';

export function ContextPanel({ panel }: { panel: Panel }) {
  const data = panel.data as { title?: string; body?: string };
  return (
    <div style={{ border: '1px dashed #bbb', borderRadius: 8, padding: 12, marginBottom: 8 }}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>{data.title ?? 'Context'}</div>
      {data.body && <div style={{ fontSize: 13, marginBottom: 6 }}>{data.body}</div>}
      <PanelButtons buttons={panel.buttons} />
      <div style={{ fontSize: 10, color: '#999', marginTop: 6 }}>{panel.rationale}</div>
    </div>
  );
}
