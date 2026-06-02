import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ResultNodeData } from '../planToGraph';

type ResultNodeType = {
  id: string;
  type: 'result';
  position: { x: number; y: number };
  data: ResultNodeData;
};

interface EmailShape { from?: string; subject?: string; snippet?: string; time?: string; unread?: boolean }
interface EventShape { title?: string; start?: string; end?: string; link?: string }
interface ChannelShape { name?: string; id?: string }

function headline(data: ResultNodeData): string {
  if (!data.ok) return `❌ ${data.error ?? 'error'}`;
  const r = data.result as Record<string, unknown> | undefined;

  if (data.integration === 'gmail' && (data.action === 'list_unread' || data.action === 'search')) {
    const messages = (r?.messages as EmailShape[] | undefined) ?? [];
    const prefix = data.action === 'search' ? '🔍' : '📧';
    const label = data.action === 'search' ? 'results' : 'unread';
    return `${prefix} ${messages.length} ${label}`;
  }
  if (data.integration === 'calendar' && data.action === 'list_upcoming') {
    const events = (r?.events as EventShape[] | undefined) ?? [];
    return `📅 ${events.length} event${events.length === 1 ? '' : 's'}`;
  }
  if (data.integration === 'slack' && data.action === 'list_channels') {
    const channels = (r?.channels as ChannelShape[] | undefined) ?? [];
    return `💬 ${channels.length} channel${channels.length === 1 ? '' : 's'}`;
  }
  if (data.action === 'send_message') {
    const channel = (r as { channel?: string } | undefined)?.channel;
    return channel ? `✅ sent to ${channel}` : '✅ sent';
  }
  if (data.action === 'create_draft') return '✉ draft saved';
  if (data.action === 'create_event') {
    const title = (r as { event?: { title?: string } } | undefined)?.event?.title;
    return title ? `✅ event: ${title}` : '✅ event created';
  }
  return '✅ done';
}

function Body({ data }: { data: ResultNodeData }) {
  if (!data.ok) return null;
  const r = data.result as Record<string, unknown> | undefined;

  if (data.integration === 'gmail' && (data.action === 'list_unread' || data.action === 'search')) {
    const messages = (r?.messages as EmailShape[] | undefined) ?? [];
    if (messages.length === 0) return <div className="yxp-mm-result-empty">(nothing)</div>;
    return (
      <div className="yxp-mm-result-list">
        {messages.slice(0, 5).map((m, i) => (
          <div key={i} className="yxp-mm-result-item">
            <div className="yxp-mm-result-item-top">
              <span className="yxp-mm-result-from">{m.from ?? ''}</span>
              <span className="yxp-mm-result-time">{m.time ?? ''}</span>
            </div>
            <div className="yxp-mm-result-subject">{m.subject ?? '(no subject)'}</div>
            {m.snippet && <div className="yxp-mm-result-snippet">{m.snippet}</div>}
          </div>
        ))}
        {messages.length > 5 && (
          <div className="yxp-mm-result-more">+{messages.length - 5} more</div>
        )}
      </div>
    );
  }

  if (data.integration === 'calendar' && data.action === 'list_upcoming') {
    const events = (r?.events as EventShape[] | undefined) ?? [];
    if (events.length === 0) return <div className="yxp-mm-result-empty">(nothing)</div>;
    return (
      <div className="yxp-mm-result-list">
        {events.slice(0, 5).map((e, i) => (
          <div key={i} className="yxp-mm-result-item">
            <div className="yxp-mm-result-subject">{e.title ?? '(no title)'}</div>
            <div className="yxp-mm-result-time">
              {e.start ?? ''}{e.end ? ` – ${e.end}` : ''}
            </div>
            {e.link && <div className="yxp-mm-result-link">{e.link}</div>}
          </div>
        ))}
      </div>
    );
  }

  if (data.integration === 'slack' && data.action === 'list_channels') {
    const channels = (r?.channels as ChannelShape[] | undefined) ?? [];
    if (channels.length === 0) return <div className="yxp-mm-result-empty">(nothing)</div>;
    return (
      <div className="yxp-mm-result-chips">
        {channels.slice(0, 20).map((c, i) => (
          <span key={i} className="yxp-mm-result-chip">#{c.name ?? '?'}</span>
        ))}
      </div>
    );
  }

  return null;
}

export function ResultNode({ data }: NodeProps<ResultNodeType>) {
  const okClass = data.ok ? 'yxp-mm-result-ok' : 'yxp-mm-result-err';
  return (
    <div className={`yxp-mm-node yxp-mm-node-result ${okClass}`}>
      <Handle type="target" position={Position.Top} className="yxp-mm-handle" />
      <div className="yxp-mm-result-headline">{headline(data)}</div>
      <Body data={data} />
    </div>
  );
}
