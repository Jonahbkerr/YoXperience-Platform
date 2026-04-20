import { useState } from 'react';
import { api, Button, ExecuteResponse } from '../api';
import { PrettyResult } from './PrettyResult';

interface ResultState {
  ok?: boolean;
  result?: unknown;
  error?: string;
  running?: boolean;
  pendingConfirm?: { integration: string; action: string; params: Record<string, unknown> };
}

export function PanelButtons({ buttons, onAction }: { buttons?: Button[]; onAction?: () => void }) {
  const [results, setResults] = useState<Record<number, ResultState>>({});

  if (!buttons || buttons.length === 0) return null;

  const invoke = async (idx: number, b: Button, confirmed = false) => {
    setResults(r => ({ ...r, [idx]: { running: true } }));
    try {
      const res: ExecuteResponse = await api.execute(b.integration, b.action, b.params ?? {}, confirmed);
      if (res.needsConfirmation) {
        setResults(r => ({
          ...r,
          [idx]: {
            pendingConfirm: {
              integration: res.integration!,
              action: res.action!,
              params: res.params ?? {},
            },
          },
        }));
        return;
      }
      setResults(r => ({
        ...r,
        [idx]: { ok: res.ok, result: res.result, error: res.error },
      }));
      if (res.ok && onAction) onAction();
    } catch (e) {
      setResults(r => ({ ...r, [idx]: { ok: false, error: (e as Error).message } }));
    }
  };

  return (
    <div style={{ marginTop: 8 }}>
      {buttons.map((b, i) => {
        const state = results[i];
        return (
          <div key={i} style={{ marginBottom: 10 }}>
            <button
              onClick={() => invoke(i, b)}
              disabled={state?.running}
              style={{
                marginRight: 8,
                padding: '6px 12px',
                cursor: state?.running ? 'wait' : 'pointer',
                background: '#111',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                fontSize: 13,
              }}
              title={`${b.integration}.${b.action}`}
            >
              {state?.running ? 'running...' : b.label}
            </button>
            <span style={{ fontSize: 10, color: '#aaa' }}>
              {b.integration}.{b.action}
            </span>

            {state?.pendingConfirm && (
              <div
                style={{
                  marginTop: 8,
                  padding: 10,
                  background: '#fff9e6',
                  border: '1px solid #f0c040',
                  borderRadius: 6,
                  fontSize: 12,
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 4 }}>⚠ Confirm write action</div>
                <div style={{ marginBottom: 6 }}>
                  {b.integration}.{b.action}(
                  <code style={{ fontSize: 11 }}>
                    {JSON.stringify(state.pendingConfirm.params)}
                  </code>
                  )
                </div>
                <button
                  onClick={() => invoke(i, b, true)}
                  style={{ marginRight: 6, padding: '3px 8px', background: '#c43', color: 'white', border: 'none', borderRadius: 4 }}
                >
                  Confirm
                </button>
                <button
                  onClick={() => setResults(r => ({ ...r, [i]: {} }))}
                  style={{ padding: '3px 8px' }}
                >
                  Cancel
                </button>
              </div>
            )}

            {state && !state.pendingConfirm && !state.running && (
              <PrettyResult integration={b.integration} action={b.action} state={state} />
            )}
          </div>
        );
      })}
    </div>
  );
}
