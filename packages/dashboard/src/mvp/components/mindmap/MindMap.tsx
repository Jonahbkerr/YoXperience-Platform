import { useEffect, useMemo, useRef } from 'react';
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import type { RenderResponse } from '../../api';
import { IntentNode } from './nodes/IntentNode';
import { IntegrationNode } from './nodes/IntegrationNode';
import { ActionNode } from './nodes/ActionNode';
import { ResultNode } from './nodes/ResultNode';
import { planToGraph, type MindMapNodeData } from './planToGraph';
import './mindmap.css';

interface Props {
  plan: RenderResponse['plan'];
  enabledIntegrations: string[];
  onExecuted?: () => void;
}

// Cast custom node components to the shape ReactFlow expects for `nodeTypes`.
// xyflow's types for nodeTypes want generic ComponentType<NodeProps>, so we relax here.
const nodeTypes: NodeTypes = {
  intent: IntentNode as unknown as NodeTypes[string],
  integration: IntegrationNode as unknown as NodeTypes[string],
  action: ActionNode as unknown as NodeTypes[string],
  result: ResultNode as unknown as NodeTypes[string],
};

function MindMapInner({ plan, enabledIntegrations, onExecuted }: Props) {
  const onExecutedRef = useRef(onExecuted);
  useEffect(() => { onExecutedRef.current = onExecuted; }, [onExecuted]);

  const built = useMemo(
    () => planToGraph({ plan, enabledIntegrations }),
    [plan, enabledIntegrations],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<MindMapNodeData>>(
    built.nodes as Node<MindMapNodeData>[],
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(built.edges);

  // When the plan changes, rebuild intent/integration/action nodes but PRESERVE result nodes
  // (result nodes represent completed actions the user performed).
  useEffect(() => {
    setNodes((prev) => {
      const existingResults = prev.filter(n => n.type === 'result');
      const nextCore = built.nodes as Node<MindMapNodeData>[];
      // Avoid id collisions — results have unique ids with timestamps.
      return [...nextCore, ...existingResults];
    });
    setEdges((prev) => {
      const existingResultEdges = prev.filter(e => e.id.startsWith('edge:action:') || e.id.includes('->result:'));
      // A cleaner test: keep any edge whose target id starts with "result:".
      const resultEdges = prev.filter(e => typeof e.target === 'string' && e.target.startsWith('result:'));
      // Dedupe (just in case).
      const seen = new Set<string>();
      const kept = [...resultEdges, ...existingResultEdges].filter(e => {
        if (seen.has(e.id)) return false;
        seen.add(e.id);
        return true;
      });
      return [...built.edges, ...kept];
    });
    // built is derived from plan + enabledIntegrations via useMemo, so this runs when they change.
  }, [built, setNodes, setEdges]);

  // Inject onExecuted callback into action node data so ActionNode can call it on success.
  // Action nodes carry an optional `onExecuted` on their data object.
  const nodesWithCallbacks = useMemo<Node<MindMapNodeData>[]>(() => {
    return nodes.map((n) => {
      if (n.type !== 'action') return n;
      const nextData = {
        ...(n.data as Record<string, unknown>),
        onExecuted: () => onExecutedRef.current?.(),
      } as unknown as MindMapNodeData;
      return { ...n, data: nextData };
    });
  }, [nodes]);

  return (
    <div className="yxp-mm-root">
      <ReactFlow
        nodes={nodesWithCallbacks}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.25}
        maxZoom={1.75}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={24} size={1} color="#dde2e7" />
        <Controls showInteractive={false} />
        <MiniMap
          pannable
          zoomable
          position="bottom-right"
          style={{ width: 140, height: 100 }}
        />
      </ReactFlow>
    </div>
  );
}

export function MindMap(props: Props) {
  return (
    <ReactFlowProvider>
      <MindMapInner {...props} />
    </ReactFlowProvider>
  );
}
