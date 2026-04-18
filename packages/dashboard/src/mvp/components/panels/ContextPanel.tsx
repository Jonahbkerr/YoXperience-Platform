import { Panel } from '../../api';

export function ContextPanel({ panel }: { panel: Panel }) {
  return (
    <div style={{ border: '1px dashed #bbb', borderRadius: 8, padding: 12, marginBottom: 8 }}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>Context</div>
      <pre style={{ fontSize: 11, margin: 0, whiteSpace: 'pre-wrap' }}>
        {JSON.stringify(panel.data, null, 2)}
      </pre>
      <div style={{ fontSize: 10, color: '#999', marginTop: 6 }}>{panel.rationale}</div>
    </div>
  );
}
