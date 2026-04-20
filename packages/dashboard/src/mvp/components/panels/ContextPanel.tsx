import { Panel } from '../../api';
import { PanelButtons } from '../PanelButtons';
import { Rationale } from '../Rationale';

export function ContextPanel({ panel, onAction }: { panel: Panel; onAction?: () => void }) {
  const data = panel.data as { title?: string; body?: string };
  return (
    <div style={{ border: '1px dashed #cfd6dc', borderRadius: 8, padding: 14, marginBottom: 10, background: 'white' }}>
      <div style={{ fontWeight: 600, fontSize: 14 }}>{data.title ?? 'Context'}</div>
      {data.body && <div style={{ fontSize: 13, marginTop: 4, color: '#333' }}>{data.body}</div>}
      <PanelButtons buttons={panel.buttons} onAction={onAction} />
      <Rationale text={panel.rationale} />
    </div>
  );
}
