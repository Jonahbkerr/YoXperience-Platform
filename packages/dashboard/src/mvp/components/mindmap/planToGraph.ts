import type { Edge, Node } from '@xyflow/react';
import type { Button, Panel } from '../../api';

export interface IntentNodeData extends Record<string, unknown> {
  label: string;
}

export interface IntegrationNodeData extends Record<string, unknown> {
  integration: string;
  label: string;
  emoji: string;
}

export interface ActionNodeData extends Record<string, unknown> {
  integration: string;
  action: string;
  label: string;
  params: Record<string, unknown>;
  rationale: string;
  priority: number;
  suggested: boolean;
}

export interface ResultNodeData extends Record<string, unknown> {
  integration: string;
  action: string;
  result?: unknown;
  error?: string;
  ok: boolean;
}

export type MindMapNodeData =
  | IntentNodeData
  | IntegrationNodeData
  | ActionNodeData
  | ResultNodeData;

export type MindMapNode = Node<MindMapNodeData>;

const MAX_ACTIONS = 4;

interface BuildArgs {
  plan: { panels: Panel[]; assistant_message?: string };
  enabledIntegrations: string[];
}

interface BuildResult {
  nodes: MindMapNode[];
  edges: Edge[];
}

interface ActionAgg {
  button: Button;
  priority: number;
  rationales: string[];
}

export function planToGraph({ plan }: BuildArgs): BuildResult {
  const nodes: MindMapNode[] = [];
  const edges: Edge[] = [];

  // Intent node (center)
  const intentLabel = plan.assistant_message && plan.assistant_message.trim().length > 0
    ? plan.assistant_message
    : 'What do you want to do?';

  nodes.push({
    id: 'intent',
    type: 'intent',
    position: { x: 0, y: 0 },
    data: { label: intentLabel } satisfies IntentNodeData,
    draggable: true,
  });

  // Aggregate actions across panels, dedupe by integration.action
  const actionByKey = new Map<string, ActionAgg>();
  for (const panel of plan.panels ?? []) {
    for (const b of panel.buttons ?? []) {
      const key = `${b.integration}.${b.action}`;
      const existing = actionByKey.get(key);
      if (existing) {
        existing.priority = Math.max(existing.priority, panel.priority);
        if (panel.rationale && !existing.rationales.includes(panel.rationale)) {
          existing.rationales.push(panel.rationale);
        }
      } else {
        actionByKey.set(key, {
          button: b,
          priority: panel.priority,
          rationales: panel.rationale ? [panel.rationale] : [],
        });
      }
    }
  }

  // Top N by priority
  const topActions = [...actionByKey.values()]
    .sort((a, b) => b.priority - a.priority)
    .slice(0, MAX_ACTIONS);

  // Fan them out in a semi-circle below the intent
  // Angles: evenly distributed in an arc from 30° to 150° (measured from +x axis, so below-center)
  const n = topActions.length;
  const radius = 240;

  topActions.forEach((agg, i) => {
    const actionId = `action:${agg.button.integration}.${agg.button.action}`;

    // Distribute across the lower arc: angle from 30° to 150° (in standard math coords, where +y is up)
    // We want them below center, so angle in [200°, 340°] (third+fourth quadrant), i.e., [-160°, -20°] from +x
    const startAngle = -160;
    const endAngle = -20;
    const t = n === 1 ? 0.5 : i / (n - 1);
    const angleDeg = startAngle + (endAngle - startAngle) * t;
    const rad = angleDeg * (Math.PI / 180);
    const x = Math.round(Math.cos(rad) * radius);
    const y = Math.round(-Math.sin(rad) * radius); // flip y because screen y grows downward

    const suggested = agg.priority >= 7;

    nodes.push({
      id: actionId,
      type: 'action',
      position: { x, y },
      data: {
        integration: agg.button.integration,
        action: agg.button.action,
        label: agg.button.label,
        params: agg.button.params ?? {},
        rationale: agg.rationales.join(' • '),
        priority: agg.priority,
        suggested,
      } satisfies ActionNodeData,
      draggable: true,
    });

    edges.push({
      id: `edge:intent->${actionId}`,
      source: 'intent',
      target: actionId,
      animated: suggested,
      style: suggested
        ? { stroke: '#4a80d0', strokeWidth: 2, strokeDasharray: '6 4' }
        : { stroke: '#cbd2d9', strokeWidth: 1 },
      className: suggested ? 'yxp-mm-edge-suggestion' : 'yxp-mm-edge-static',
    });
  });

  return { nodes, edges };
}
