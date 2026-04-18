import { useEffect } from 'react';
import { useRenderLoop } from '../hooks/useRenderLoop';
import { api } from '../api';
import { IntegrationSidebar } from './IntegrationSidebar';
import { DynamicPanelGrid } from './DynamicPanelGrid';
import { ActivityTimeline } from './ActivityTimeline';

export function Dashboard() {
  const { data, error } = useRenderLoop(7000);

  useEffect(() => {
    api.logEvent('session_start');
    return () => { api.logEvent('session_end'); };
  }, []);

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui' }}>
      <IntegrationSidebar />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <header style={{ padding: '12px 16px', borderBottom: '1px solid #eee' }}>
          <b>YoXperience</b>
          <span style={{ color: '#999', marginLeft: 8 }}>
            {data?.fallback ? 'LM Studio unreachable — fallback' : error ? error : `renders every 7s`}
          </span>
        </header>
        <DynamicPanelGrid panels={data?.plan.panels ?? []} />
      </main>
      <ActivityTimeline />
    </div>
  );
}
