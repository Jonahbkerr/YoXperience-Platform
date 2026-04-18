import { useEffect, useState } from 'react';
import { api, IntegrationsResponse } from '../api';

export function IntegrationSidebar() {
  const [info, setInfo] = useState<IntegrationsResponse | null>(null);

  const refresh = async () => setInfo(await api.integrations());
  useEffect(() => { refresh(); }, []);

  if (!info) return <div style={{ padding: 16 }}>Loading...</div>;

  return (
    <aside style={{ width: 240, borderRight: '1px solid #eee', padding: 16 }}>
      <h3 style={{ margin: '0 0 12px' }}>Integrations</h3>
      {info.available.map(name => {
        const enabled = info.enabled.includes(name);
        const connected = info.connected.includes(name);
        return (
          <div key={name} style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 600 }}>{name}</div>
            {connected ? (
              <>
                <label style={{ display: 'block', fontSize: 12 }}>
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={async () => {
                      if (enabled) await api.disable(name); else await api.enable(name);
                      refresh();
                    }}
                  />{' '}enabled
                </label>
                <button onClick={async () => { await api.disconnect(name); refresh(); }}
                        style={{ fontSize: 11 }}>Disconnect</button>
              </>
            ) : (
              <a href="/api/integrations/google/authorize"
                 style={{ fontSize: 12 }}>Connect</a>
            )}
          </div>
        );
      })}
    </aside>
  );
}
