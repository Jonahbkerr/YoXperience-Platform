import { useEffect, useMemo, useState } from 'react';
import { api, type WorkflowStep } from '../../api';
import './workflow.css';

interface Props {
  workflow: WorkflowStep[];
  onStepExecuted?: (stepId: string) => void;
}

type StepStatus = 'pending' | 'current' | 'done' | 'error' | 'skipped';

interface StepResult {
  ok: boolean;
  result?: unknown;
  error?: string;
}

const WRITE_ACTIONS = new Set(['send_message', 'create_draft', 'create_event', 'send_email']);

const INTEGRATION_BADGE_CLASS: Record<string, string> = {
  gmail: 'yxp-wf-badge-gmail',
  calendar: 'yxp-wf-badge-calendar',
  slack: 'yxp-wf-badge-slack',
};

const INTEGRATION_FOCUS_CLASS: Record<string, string> = {
  gmail: 'yxp-wf-int-gmail',
  calendar: 'yxp-wf-int-calendar',
  slack: 'yxp-wf-int-slack',
};

function buildWorkflowSignature(steps: WorkflowStep[]): string {
  return steps.map((s) => s.id).join('|');
}

function paramsToStrings(params?: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  if (!params) return out;
  for (const [k, v] of Object.entries(params)) {
    if (typeof v === 'string') out[k] = v;
    else if (v == null) out[k] = '';
    else out[k] = JSON.stringify(v);
  }
  return out;
}

function statusIcon(status: StepStatus): string {
  switch (status) {
    case 'current': return '\u25CF'; // ●
    case 'done': return '\u2713'; // ✓
    case 'error': return '\u2717'; // ✗
    case 'skipped': return '\u2013'; // –
    case 'pending':
    default: return '\u25CB'; // ○
  }
}

export function WorkflowStepper({ workflow, onStepExecuted }: Props) {
  const signature = useMemo(() => buildWorkflowSignature(workflow), [workflow]);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [statusByStepId, setStatusByStepId] = useState<Record<string, StepStatus>>({});
  const [resultByStepId, setResultByStepId] = useState<Record<string, StepResult>>({});
  const [editedParams, setEditedParams] = useState<Record<string, Record<string, string>>>({});
  const [running, setRunning] = useState(false);

  // Reset whenever the workflow itself changes (new LM output).
  useEffect(() => {
    if (workflow.length === 0) return;
    const status: Record<string, StepStatus> = {};
    const edits: Record<string, Record<string, string>> = {};
    for (let i = 0; i < workflow.length; i++) {
      const s = workflow[i];
      status[s.id] = i === 0 ? 'current' : 'pending';
      edits[s.id] = paramsToStrings(s.params);
    }
    setCurrentIdx(0);
    setStatusByStepId(status);
    setResultByStepId({});
    setEditedParams(edits);
    setRunning(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  if (workflow.length === 0) return null;

  const current = workflow[currentIdx];
  const total = workflow.length;
  const prev = currentIdx > 0 ? workflow[currentIdx - 1] : null;
  const next = currentIdx < total - 1 ? workflow[currentIdx + 1] : null;
  const currentStatus = statusByStepId[current.id] ?? 'pending';
  const currentResult = resultByStepId[current.id];
  const isWrite = WRITE_ACTIONS.has(current.action);
  const params = editedParams[current.id] ?? {};
  const paramKeys = Object.keys(params);

  const jumpTo = (idx: number) => {
    if (idx < 0 || idx >= total) return;
    setCurrentIdx(idx);
    // Only update status for visited step if it's still pending; don't downgrade done/error/skipped
    setStatusByStepId((prevMap) => {
      const nextMap = { ...prevMap };
      // If the previously "current" step is still pending-ish, mark it pending again
      const prevCurrentId = workflow[currentIdx]?.id;
      if (prevCurrentId && nextMap[prevCurrentId] === 'current') {
        nextMap[prevCurrentId] = 'pending';
      }
      const targetId = workflow[idx].id;
      const st = nextMap[targetId];
      if (st === 'pending' || st === undefined) {
        nextMap[targetId] = 'current';
      }
      return nextMap;
    });
  };

  const updateParam = (name: string, value: string) => {
    setEditedParams((prevMap) => ({
      ...prevMap,
      [current.id]: { ...(prevMap[current.id] ?? {}), [name]: value },
    }));
  };

  const runStep = async () => {
    if (running) return;
    setRunning(true);
    try {
      // Prefer edited string params; fall back to raw step.params if no edits tracked.
      const edited = editedParams[current.id];
      const paramsToSend: Record<string, unknown> = edited
        ? { ...edited }
        : (current.params ?? {});
      const res = await api.execute(current.integration, current.action, paramsToSend, true);
      const ok = !!res.ok;
      setResultByStepId((r) => ({ ...r, [current.id]: { ok, result: res.result, error: res.error } }));
      if (ok) {
        setStatusByStepId((s) => ({ ...s, [current.id]: 'done' }));
        if (onStepExecuted) onStepExecuted(current.id);
        // auto-advance
        if (currentIdx < total - 1) {
          const nextId = workflow[currentIdx + 1].id;
          setStatusByStepId((s) => {
            const out = { ...s, [current.id]: 'done' as StepStatus };
            if (out[nextId] === 'pending' || out[nextId] === undefined) {
              out[nextId] = 'current';
            }
            return out;
          });
          setCurrentIdx(currentIdx + 1);
        }
      } else {
        setStatusByStepId((s) => ({ ...s, [current.id]: 'error' }));
      }
    } catch (e) {
      const msg = (e as Error).message;
      setResultByStepId((r) => ({ ...r, [current.id]: { ok: false, error: msg } }));
      setStatusByStepId((s) => ({ ...s, [current.id]: 'error' }));
    } finally {
      setRunning(false);
    }
  };

  const skipStep = () => {
    setStatusByStepId((s) => {
      const out = { ...s, [current.id]: 'skipped' as StepStatus };
      if (currentIdx < total - 1) {
        const nextId = workflow[currentIdx + 1].id;
        if (out[nextId] === 'pending' || out[nextId] === undefined) {
          out[nextId] = 'current';
        }
      }
      return out;
    });
    if (currentIdx < total - 1) setCurrentIdx(currentIdx + 1);
  };

  const goPrev = () => {
    if (currentIdx === 0) return;
    jumpTo(currentIdx - 1);
  };

  const goNext = () => {
    if (currentIdx >= total - 1) return;
    jumpTo(currentIdx + 1);
  };

  const nextEnabled = currentIdx < total - 1 && (currentStatus === 'done' || currentStatus === 'skipped');
  const badgeClass = INTEGRATION_BADGE_CLASS[current.integration] ?? 'yxp-wf-badge-default';
  const focusIntClass = INTEGRATION_FOCUS_CLASS[current.integration] ?? '';

  return (
    <div className="yxp-wf-root">
      {/* Status chips */}
      <div className="yxp-wf-chips" role="tablist" aria-label="Workflow steps">
        {workflow.map((s, i) => {
          const st = statusByStepId[s.id] ?? 'pending';
          const isCurrent = i === currentIdx;
          const chipClass =
            'yxp-wf-chip ' +
            (isCurrent ? 'yxp-wf-chip-current ' : '') +
            (st === 'done' ? 'yxp-wf-chip-done ' : '') +
            (st === 'error' ? 'yxp-wf-chip-error ' : '') +
            (st === 'skipped' ? 'yxp-wf-chip-skipped ' : '');
          return (
            <button
              key={s.id}
              className={chipClass.trim()}
              onClick={() => jumpTo(i)}
              title={`Step ${i + 1}: ${s.label}`}
              aria-label={`Step ${i + 1}: ${s.label} (${st})`}
              aria-selected={isCurrent}
              role="tab"
              type="button"
            >
              <span className="yxp-wf-chip-icon" aria-hidden="true">{statusIcon(isCurrent && st === 'pending' ? 'current' : st)}</span>
              <span className="yxp-wf-chip-num">{i + 1}</span>
              {isCurrent && <span className="yxp-wf-chip-label">{s.label}</span>}
            </button>
          );
        })}
      </div>

      {/* Row: prev | focus | next */}
      <div className="yxp-wf-row">
        {prev ? (
          <div
            className="yxp-wf-neighbor yxp-wf-neighbor-prev"
            onClick={() => jumpTo(currentIdx - 1)}
            role="button"
            tabIndex={0}
            title={`Back to step ${currentIdx}: ${prev.label}`}
          >
            <div className="yxp-wf-neighbor-arrow">{'\u2190'} prev</div>
            <div className="yxp-wf-neighbor-label">{prev.label}</div>
            <div className="yxp-wf-neighbor-action">{prev.integration}.{prev.action}</div>
          </div>
        ) : (
          <div className="yxp-wf-neighbor-placeholder" aria-hidden="true" />
        )}

        <div className={`yxp-wf-focus ${focusIntClass}`}>
          <div className="yxp-wf-focus-header">
            <span className="yxp-wf-focus-step-num">Step {currentIdx + 1} of {total}</span>
            <span className={`yxp-wf-badge ${badgeClass}`}>{current.integration}</span>
            <span className="yxp-wf-action-sub">{current.action}</span>
          </div>
          <h2 className="yxp-wf-focus-title">{current.label}</h2>
          {current.rationale && <p className="yxp-wf-rationale">{current.rationale}</p>}

          {paramKeys.length === 0 ? (
            <div className="yxp-wf-no-params">(no params)</div>
          ) : (
            <div className="yxp-wf-form">
              {paramKeys.map((k) => {
                const isLong = k === 'body' || k === 'text';
                return (
                  <label key={k} className="yxp-wf-field">
                    <span className="yxp-wf-field-label">{k}</span>
                    {isLong ? (
                      <textarea
                        className="yxp-wf-textarea"
                        rows={5}
                        value={params[k] ?? ''}
                        onChange={(e) => updateParam(k, e.target.value)}
                      />
                    ) : (
                      <input
                        className="yxp-wf-input"
                        type="text"
                        value={params[k] ?? ''}
                        onChange={(e) => updateParam(k, e.target.value)}
                      />
                    )}
                  </label>
                );
              })}
            </div>
          )}

          <div className="yxp-wf-buttons">
            <button
              className="yxp-wf-btn yxp-wf-btn-secondary"
              onClick={goPrev}
              disabled={currentIdx === 0}
              type="button"
            >
              {'\u2190 Prev'}
            </button>
            <button
              className="yxp-wf-btn yxp-wf-btn-ghost"
              onClick={skipStep}
              disabled={running || currentIdx >= total}
              type="button"
            >
              Skip
            </button>
            <div className="yxp-wf-spacer" />
            <button
              className={`yxp-wf-btn ${isWrite ? 'yxp-wf-btn-primary-write' : 'yxp-wf-btn-primary'}`}
              onClick={runStep}
              disabled={running}
              type="button"
            >
              {running ? 'Running…' : (isWrite ? '\u26A0 Run step' : 'Run step')}
            </button>
            {currentStatus === 'done' && currentIdx < total - 1 && (
              <button
                className="yxp-wf-btn yxp-wf-btn-secondary"
                onClick={goNext}
                disabled={!nextEnabled}
                type="button"
              >
                {'Next \u2192'}
              </button>
            )}
          </div>

          {currentStatus === 'done' && currentResult?.ok && (
            <ResultSummary integration={current.integration} action={current.action} result={currentResult.result} />
          )}

          {currentStatus === 'error' && (
            <div className="yxp-wf-error">
              <div className="yxp-wf-error-msg">
                <strong>Error:</strong> {currentResult?.error ?? 'Unknown error'}
              </div>
              <button
                className="yxp-wf-error-retry"
                onClick={runStep}
                disabled={running}
                type="button"
              >
                Retry
              </button>
            </div>
          )}
        </div>

        {next ? (
          <div
            className="yxp-wf-neighbor yxp-wf-neighbor-next"
            onClick={() => jumpTo(currentIdx + 1)}
            role="button"
            tabIndex={0}
            title={`Jump to step ${currentIdx + 2}: ${next.label}`}
          >
            <div className="yxp-wf-neighbor-arrow">next {'\u2192'}</div>
            <div className="yxp-wf-neighbor-label">{next.label}</div>
            <div className="yxp-wf-neighbor-action">{next.integration}.{next.action}</div>
          </div>
        ) : (
          <div className="yxp-wf-neighbor-placeholder" aria-hidden="true" />
        )}
      </div>
    </div>
  );
}

/* === Result summary (inline adapted from ResultNode/PrettyResult) === */

interface EmailShape { from?: string; subject?: string; snippet?: string; time?: string }
interface EventShape { title?: string; start?: string; end?: string; link?: string }
interface ChannelShape { name?: string; id?: string }

function ResultSummary({ integration, action, result }: { integration: string; action: string; result: unknown }) {
  const r = (result as Record<string, unknown> | undefined) ?? undefined;

  if (integration === 'gmail' && (action === 'list_unread' || action === 'search')) {
    const messages = ((r?.messages as EmailShape[] | undefined) ?? []);
    const prefix = action === 'search' ? '\u{1F50D}' : '\u{1F4E7}';
    const label = action === 'search' ? 'results' : 'unread';
    return (
      <div className="yxp-wf-result">
        <div className="yxp-wf-result-headline">{prefix} {messages.length} {label}</div>
        {messages.length === 0 ? (
          <div style={{ fontSize: 11, color: '#888', fontStyle: 'italic' }}>(nothing)</div>
        ) : (
          <div className="yxp-wf-result-list">
            {messages.slice(0, 8).map((m, i) => (
              <div key={i} className="yxp-wf-result-item">
                <div className="yxp-wf-result-item-top">
                  <span className="yxp-wf-result-from">{m.from ?? ''}</span>
                  <span className="yxp-wf-result-time">{m.time ?? ''}</span>
                </div>
                <div className="yxp-wf-result-subject">{m.subject ?? '(no subject)'}</div>
                {m.snippet && <div className="yxp-wf-result-snippet">{m.snippet}</div>}
              </div>
            ))}
            {messages.length > 8 && <div className="yxp-wf-result-more">+{messages.length - 8} more</div>}
          </div>
        )}
      </div>
    );
  }

  if (integration === 'calendar' && action === 'list_upcoming') {
    const events = ((r?.events as EventShape[] | undefined) ?? []);
    return (
      <div className="yxp-wf-result">
        <div className="yxp-wf-result-headline">{'\u{1F4C5}'} {events.length} event{events.length === 1 ? '' : 's'}</div>
        {events.length === 0 ? (
          <div style={{ fontSize: 11, color: '#888', fontStyle: 'italic' }}>(nothing)</div>
        ) : (
          <div className="yxp-wf-result-list">
            {events.slice(0, 8).map((e, i) => (
              <div key={i} className="yxp-wf-result-item">
                <div className="yxp-wf-result-subject">{e.title ?? '(no title)'}</div>
                <div className="yxp-wf-result-time">
                  {e.start ?? ''}{e.end ? ` \u2013 ${e.end}` : ''}
                </div>
                {e.link && <div className="yxp-wf-result-link">{e.link}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (integration === 'slack' && action === 'list_channels') {
    const channels = ((r?.channels as ChannelShape[] | undefined) ?? []);
    return (
      <div className="yxp-wf-result">
        <div className="yxp-wf-result-headline">{'\u{1F4AC}'} {channels.length} channel{channels.length === 1 ? '' : 's'}</div>
        <div className="yxp-wf-result-chips">
          {channels.slice(0, 30).map((c, i) => (
            <span key={i} className="yxp-wf-result-chip">#{c.name ?? '?'}</span>
          ))}
        </div>
      </div>
    );
  }

  if (action === 'send_message') {
    const channel = (r as { channel?: string } | undefined)?.channel;
    return (
      <div className="yxp-wf-result">
        <div className="yxp-wf-result-headline">{'\u2705'} Message sent{channel ? ` to ${channel}` : ''}</div>
      </div>
    );
  }

  if (action === 'send_email') {
    const to = (r as { to?: string } | undefined)?.to;
    return (
      <div className="yxp-wf-result">
        <div className="yxp-wf-result-headline">{'\u2705'} Email sent{to ? ` to ${to}` : ''}</div>
      </div>
    );
  }

  if (action === 'create_draft') {
    const draft = (r as { draft?: Record<string, unknown> } | undefined)?.draft;
    return (
      <div className="yxp-wf-result">
        <div className="yxp-wf-result-headline">{'\u2709'} Draft saved</div>
        {draft && (
          <div style={{ fontSize: 12, lineHeight: 1.5 }}>
            <div>To: {String(draft.to ?? '')}</div>
            <div>Subject: {String(draft.subject ?? '')}</div>
            {draft.preview != null && <div style={{ color: '#555' }}>{String(draft.preview)}</div>}
          </div>
        )}
      </div>
    );
  }

  if (action === 'create_event') {
    const ev = (r as { event?: { title?: string } } | undefined)?.event;
    return (
      <div className="yxp-wf-result">
        <div className="yxp-wf-result-headline">{'\u2705'} Event created{ev?.title ? `: ${ev.title}` : ''}</div>
      </div>
    );
  }

  // Fallback: JSON dump
  return (
    <div className="yxp-wf-result">
      <div className="yxp-wf-result-headline">{'\u2705'} Done</div>
      <pre className="yxp-wf-result-json">{truncate(JSON.stringify(r, null, 2))}</pre>
    </div>
  );
}

function truncate(s: string | undefined, max = 1200): string {
  if (!s) return '';
  return s.length > max ? s.slice(0, max) + '\n\u2026 (truncated)' : s;
}
