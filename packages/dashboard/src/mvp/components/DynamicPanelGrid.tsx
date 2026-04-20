import { useEffect, useState } from 'react';
import { Panel } from '../api';
import { ActionCard } from './panels/ActionCard';
import { ContextPanel } from './panels/ContextPanel';
import { QuickActions } from './panels/QuickActions';
import { ShimmerPanel } from './ShimmerPanel';

interface Props {
  panels: Panel[];
  loading: boolean;
  onAction?: () => void;
}

export function DynamicPanelGrid({ panels, loading, onAction }: Props) {
  const [visibleCount, setVisibleCount] = useState(panels.length);
  const sorted = [...panels].sort((a, b) => b.priority - a.priority);

  useEffect(() => {
    if (sorted.length === 0) { setVisibleCount(0); return; }
    setVisibleCount(0);
    let i = 0;
    const tick = () => {
      i++;
      setVisibleCount(i);
      if (i < sorted.length) setTimeout(tick, 220);
    };
    const t = setTimeout(tick, 60);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(sorted.map(p => p.data.title ?? p.type))]);

  if (loading && sorted.length === 0) {
    return (
      <div style={{ flex: 1, padding: 20, overflow: 'auto' }}>
        <ShimmerPanel />
        <ShimmerPanel />
        <ShimmerPanel />
      </div>
    );
  }

  return (
    <div style={{ flex: 1, padding: 20, overflow: 'auto' }}>
      {sorted.length === 0 && (
        <div style={{ color: '#999', padding: 20 }}>
          No recommendations yet. Try clicking "Seed demo data" then "Render now".
        </div>
      )}
      {sorted.slice(0, visibleCount).map((p, i) => {
        const key = `${p.type}-${p.data.title ?? i}`;
        if (p.type === 'action_card') return <div key={key} className="yxp-panel-enter"><ActionCard panel={p} onAction={onAction} /></div>;
        if (p.type === 'context_panel') return <div key={key} className="yxp-panel-enter"><ContextPanel panel={p} onAction={onAction} /></div>;
        if (p.type === 'quick_actions') return <div key={key} className="yxp-panel-enter"><QuickActions panel={p} onAction={onAction} /></div>;
        return null;
      })}
      {loading && sorted.length > 0 && (
        <div style={{ fontSize: 12, color: '#888', marginTop: 8 }}>
          <span className="yxp-thinking-dot" />
          <span className="yxp-thinking-dot" />
          <span className="yxp-thinking-dot" />
          rethinking…
        </div>
      )}
    </div>
  );
}
