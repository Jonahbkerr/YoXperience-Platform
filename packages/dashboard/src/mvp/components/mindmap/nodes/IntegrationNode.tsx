import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { IntegrationNodeData } from '../planToGraph';

type IntegrationNodeType = {
  id: string;
  type: 'integration';
  position: { x: number; y: number };
  data: IntegrationNodeData;
};

export function IntegrationNode({ data }: NodeProps<IntegrationNodeType>) {
  const modifierClass =
    data.integration === 'gmail' ? 'yxp-mm-gmail'
    : data.integration === 'calendar' ? 'yxp-mm-calendar'
    : data.integration === 'slack' ? 'yxp-mm-slack'
    : '';

  return (
    <div className={`yxp-mm-node yxp-mm-node-integration ${modifierClass}`}>
      <Handle type="target" position={Position.Top} className="yxp-mm-handle" />
      <div className="yxp-mm-integration-inner">
        <span className="yxp-mm-integration-emoji">{data.emoji}</span>
        <span className="yxp-mm-integration-label">{data.label}</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="yxp-mm-handle" />
    </div>
  );
}
