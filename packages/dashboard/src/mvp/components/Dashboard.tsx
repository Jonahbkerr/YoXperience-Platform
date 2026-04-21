import { useEffect, useState } from 'react';
import { useRenderLoop } from '../hooks/useRenderLoop';
import { api } from '../api';
import { IntegrationSidebar } from './IntegrationSidebar';
import { ActivityTimeline } from './ActivityTimeline';
import { ChatInput } from './ChatInput';
import { ChatThread } from './ChatThread';
import { MindMap } from './mindmap/MindMap';
import { WorkflowStepper } from './workflow/WorkflowStepper';
import { DemoTour } from './DemoTour';

export function Dashboard() {
  const { data, error, loading, reload } = useRenderLoop(0);
  const [demoMode, setDemoMode] = useState<boolean | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [chatRefresh, setChatRefresh] = useState(0);
  const [enabledIntegrations, setEnabledIntegrations] = useState<string[]>([]);

  useEffect(() => {
    api.logEvent('session_start');
    api.demoStatus().then(s => setDemoMode(s.demoMode)).catch(() => setDemoMode(false));
    api.integrations().then(r => setEnabledIntegrations(r.enabled)).catch(() => {});
    return () => { api.logEvent('session_end'); };
  }, []);

  const seed = async () => {
    setSeeding(true);
    try {
      await api.seedDemo();
      setChatRefresh(n => n + 1);
      await reload();
    } finally {
      setSeeding(false);
    }
  };

  const onAction = () => {
    setTimeout(() => reload(), 600);
  };

  const sendChat = async (text: string, source: 'text' | 'voice') => {
    await api.sendChat(text, source);
    setChatRefresh(n => n + 1);
    reload();
  };

  // When new assistant message arrives, trigger refresh so the thread re-fetches
  useEffect(() => {
    if (data?.plan.assistant_message) {
      setChatRefresh(n => n + 1);
    }
  }, [data?.plan.assistant_message]);

  const statusText =
    data?.fallback ? `LM unreachable — ${data.error ?? 'fallback'}` :
    error ? error :
    data?.latency_ms ? `last turn: ${(data.latency_ms / 1000).toFixed(1)}s` :
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
            <span style={{ fontSize: 11, padding: '2px 8px', background: '#ffe9a8', borderRadius: 10, fontWeight: 500 }}>
              DEMO
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
            {loading ? 'Rendering…' : '↻ Render'}
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
            {seeding ? 'Seeding…' : 'Seed'}
          </button>
          <DemoTour
            disabled={loading}
            onTourSend={(text) => sendChat(text, 'text')}
          />
          <span style={{ color: '#999', fontSize: 12, marginLeft: 'auto' }}>{statusText}</span>
        </header>

        <ChatThread refreshTrigger={chatRefresh} />

        {data?.plan.assistant_message && (
          <div style={{
            padding: '6px 20px',
            fontSize: 11,
            color: '#888',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            background: '#fafbfc',
          }}>
            → {data.plan.assistant_message}
          </div>
        )}

        <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          {data?.plan.workflow && data.plan.workflow.length > 0 ? (
            <WorkflowStepper
              workflow={data.plan.workflow}
              onStepExecuted={() => onAction()}
            />
          ) : (
            <MindMap
              plan={data?.plan ?? { panels: [] }}
              enabledIntegrations={enabledIntegrations}
              onExecuted={onAction}
            />
          )}
        </div>

        <ChatInput onSend={sendChat} disabled={loading} />
      </main>
      <ActivityTimeline />
    </div>
  );
}
