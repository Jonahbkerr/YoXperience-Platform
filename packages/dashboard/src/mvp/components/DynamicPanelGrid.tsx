import { Panel } from '../api';
import { ActionCard } from './panels/ActionCard';
import { ContextPanel } from './panels/ContextPanel';
import { QuickActions } from './panels/QuickActions';

export function DynamicPanelGrid({ panels }: { panels: Panel[] }) {
  const sorted = [...panels].sort((a, b) => b.priority - a.priority);
  return (
    <div style={{ flex: 1, padding: 16, overflow: 'auto' }}>
      {sorted.length === 0 && <div style={{ color: '#999' }}>No recommendations yet. Try interacting or connect an integration.</div>}
      {sorted.map((p, i) => {
        if (p.type === 'action_card') return <ActionCard key={i} panel={p} />;
        if (p.type === 'context_panel') return <ContextPanel key={i} panel={p} />;
        if (p.type === 'quick_actions') return <QuickActions key={i} panel={p} />;
        return null;
      })}
    </div>
  );
}
