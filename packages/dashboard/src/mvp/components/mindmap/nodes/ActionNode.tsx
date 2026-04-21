import { useState } from 'react';
import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react';
import { api, type ExecuteResponse } from '../../../api';
import type { ActionNodeData, ResultNodeData } from '../planToGraph';

type ActionNodeType = {
  id: string;
  type: 'action';
  position: { x: number; y: number };
  data: ActionNodeData & {
    onExecuted?: () => void;
  };
};

const RESULT_Y_OFFSET = 260;

const WRITE_ACTIONS = new Set(['send_message', 'create_draft', 'create_event', 'send_email']);
const HAS_EDITABLE_PARAMS = new Set(['send_message', 'create_draft', 'create_event', 'send_email', 'search']);

export function ActionNode({ id, data }: NodeProps<ActionNodeType>) {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [editedParams, setEditedParams] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(data.params ?? {})) {
      out[k] = typeof v === 'string' ? v : JSON.stringify(v);
    }
    return out;
  });

  const rf = useReactFlow();

  const suggestedClass = data.suggested ? 'yxp-mm-action-suggested' : '';
  const runningClass = running ? 'yxp-mm-action-running' : '';
  const integrationClass = `yxp-mm-${data.integration}`;
  const isWrite = WRITE_ACTIONS.has(data.action);
  const canEdit = HAS_EDITABLE_PARAMS.has(data.action) && Object.keys(editedParams).length > 0;

  const spawnResult = (res: ExecuteResponse) => {
    const me = rf.getNode(id);
    const pos = me?.position ?? { x: 0, y: 0 };
    const resultId = `result:${id}:${Date.now()}`;
    const resultNode = {
      id: resultId,
      type: 'result',
      position: { x: pos.x, y: pos.y + RESULT_Y_OFFSET },
      data: {
        integration: data.integration,
        action: data.action,
        result: res.result,
        error: res.error,
        ok: !!res.ok,
      } satisfies ResultNodeData,
      draggable: true,
    };
    rf.addNodes(resultNode);
    rf.addEdges({
      id: `edge:${id}->${resultId}`,
      source: id,
      target: resultId,
      style: { stroke: res.ok ? '#7cb27f' : '#d06a6a', strokeWidth: 1 },
      className: 'yxp-mm-edge-static',
    });
  };

  const invoke = async (confirmed = false) => {
    setError(null);
    setRunning(true);
    try {
      // Use edited params if we have any, else the LM's defaults
      const params = canEdit ? editedParams : data.params ?? {};
      const res = await api.execute(data.integration, data.action, params, confirmed);
      if (res.needsConfirmation) {
        // Already know it needs confirmation; auto-continue since user clicked Send
        // (We show inline confirm UI only for unexpected write actions — but since we expanded,
        //  the user already saw params and clicked Send)
        setRunning(false);
        return;
      }
      spawnResult(res);
      if (res.ok && data.onExecuted) data.onExecuted();
      if (!res.ok && res.error) setError(res.error);
      if (res.ok) setExpanded(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRunning(false);
    }
  };

  const onHeaderClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (running) return;
    if (canEdit) {
      setExpanded(v => !v);
    } else {
      void invoke(isWrite); // confirmed=true if write, since no params to edit
    }
  };

  const submit = (e: React.MouseEvent) => {
    e.stopPropagation();
    void invoke(true);
  };

  return (
    <div
      className={`yxp-mm-node yxp-mm-node-action ${integrationClass} ${suggestedClass} ${runningClass} ${expanded ? 'yxp-mm-action-expanded' : ''}`}
      title={data.rationale || `${data.integration}.${data.action}`}
    >
      <Handle type="target" position={Position.Top} className="yxp-mm-handle" />

      <div className="yxp-mm-action-header" onClick={onHeaderClick}>
        <div className="yxp-mm-action-label">
          {running && <span className="yxp-mm-action-spinner">…</span>}
          {data.label}
          {canEdit && !expanded && <span className="yxp-mm-action-chev"> ▾</span>}
        </div>
        <div className="yxp-mm-action-sub">{data.integration}.{data.action}</div>
      </div>

      {expanded && canEdit && (
        <div className="yxp-mm-action-form" onClick={(e) => e.stopPropagation()}>
          {Object.keys(editedParams).map((k) => {
            const isLong = k === 'body';
            return (
              <label key={k} className="yxp-mm-action-field">
                <span className="yxp-mm-action-field-label">{k}</span>
                {isLong ? (
                  <textarea
                    className="yxp-mm-action-textarea"
                    value={editedParams[k]}
                    rows={3}
                    onChange={(e) => setEditedParams((p) => ({ ...p, [k]: e.target.value }))}
                  />
                ) : (
                  <input
                    className="yxp-mm-action-input"
                    type="text"
                    value={editedParams[k]}
                    onChange={(e) => setEditedParams((p) => ({ ...p, [k]: e.target.value }))}
                  />
                )}
              </label>
            );
          })}
          <div className="yxp-mm-action-form-row">
            <button
              className="yxp-mm-action-send"
              onClick={submit}
              disabled={running}
            >
              {running ? 'Sending…' : (isWrite ? '⚠ Send' : 'Run')}
            </button>
            <button
              className="yxp-mm-action-cancel"
              onClick={(e) => { e.stopPropagation(); setExpanded(false); }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="yxp-mm-action-error">{error}</div>
      )}

      <Handle type="source" position={Position.Bottom} className="yxp-mm-handle" />
    </div>
  );
}
