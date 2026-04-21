import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { IntentNodeData } from '../planToGraph';

type IntentNodeType = {
  id: string;
  type: 'intent';
  position: { x: number; y: number };
  data: IntentNodeData;
};

export function IntentNode({ data }: NodeProps<IntentNodeType>) {
  return (
    <div className="yxp-mm-node yxp-mm-node-intent">
      <Handle type="target" position={Position.Top} className="yxp-mm-handle" />
      <div className="yxp-mm-intent-label">{data.label}</div>
      <Handle type="source" position={Position.Bottom} className="yxp-mm-handle" />
    </div>
  );
}
