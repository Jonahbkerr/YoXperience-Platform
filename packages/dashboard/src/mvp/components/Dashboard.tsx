import { useEffect, useState } from 'react';
import { useRenderLoop } from '../hooks/useRenderLoop';
import { api } from '../api';
import { IntegrationSidebar } from './IntegrationSidebar';
import { DynamicPanelGrid } from './DynamicPanelGrid';
import { ActivityTimeline } from './ActivityTimeline';

export function Dashboard() {
  const { data, error, loading, reload } = useRenderLoop(0);
  const [demoMode, setDemoMode] = useState<boolean | null>(null);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    api.logEvent('session_start');
    api.demoStatus().then(s => setDemoMode(s.demoMode)).catch(() => setDemoMode(false));
    return () => { api.logEvent('session_end'); };
  }, []);

  const seed = async () => {
    setSeeding(true);
    try {
      await api.seedDemo();
      await reload();
    } finally {
      setSeeding(false);
    }
  };

  const onAction = () => {
    setTimeout(() => reload(), 600);
  };

  const statusText =
    data?.fallback ? `LM Studio unreachable — ${data.error ?? 'fallback'}` :
    error ? error :
    data?.latency_ms ? `last render: ${(data.latency_ms / 1000).toFixed(1)}s` :
    'idle';

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui', background: '#fafbfc' }}>
      <IntegrationSidebar />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <header style={{
          padding: '12px 20px',
          borderBottom: '1px solid #e4e8ec',
          background: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <b style={{ fontSize: 16 }}>YoXperience</b>
          {demoMode && (
            <span style={{
              fontSize: 11,
              padding: '2px 8px',
              background: '#ffe9a8',
              borderRadius: 10,
              fontWeight: 500,
            }}>
              DEMO MODE
            </span>
          )}
          {loading && (
            <span style={{ fontSize: 12, color: '#4a80d0', fontWeight: 500 }}>
              <span className="yxp-thinking-dot" />
              <span className="yxp-thinking-dot" />
              <span className="yxp-thinking-dot" />
              thinking…
            </span>
          )}
          <button
            onClick={reload}
            disabled={loading}
            style={{
              padding: '5px 12px',
              background: loading ? '#eee' : '#111',
              color: loading ? '#888' : 'white',
              border: 'none',
              borderRadius: 6,
              cursor: loading ? 'wait' : 'pointer',
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            {loading ? 'Rendering…' : '↻ Render now'}
          </button>
          <button
            onClick={seed}
            disabled={seeding}
            style={{
              padding: '5px 12px',
              background: 'white',
              border: '1px solid #ccc',
              borderRadius: 6,
              cursor: seeding ? 'wait' : 'pointer',
              fontSize: 12,
            }}
          >
            {seeding ? 'Seeding…' : 'Seed demo data'}
          </button>
          <span style={{ color: '#999', fontSize: 12, marginLeft: 'auto' }}>{statusText}</span>
        </header>
        <DynamicPanelGrid
          panels={data?.plan.panels ?? []}
          loading={loading}
          onAction={onAction}
        />
      </main>
      <ActivityTimeline />
    </div>
  );
}
