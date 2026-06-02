import { EventTracker, EventRecord } from './tracker';

export interface ChatTurn { role: 'user' | 'assistant'; text: string }

export interface WorkflowContext {
  timestamp: number;
  time_of_day: string;
  recent_actions: EventRecord[];
  active_integrations: string[];
  recent_chat: ChatTurn[];
  latest_user_message: string | null;
}

export interface BuildContextInput {
  tracker: EventTracker;
  enabledIntegrations: string[];
  limit?: number;
}

export function buildContext(input: BuildContextInput): WorkflowContext {
  const now = Date.now();
  const d = new Date(now);
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');

  const events = input.tracker.recent(input.limit ?? 30);

  const chatTurns: ChatTurn[] = events
    .filter(e => e.event_type === 'chat_message')
    .slice(0, 6)
    .reverse()
    .map(e => {
      const dd = e.data as { role?: string; text?: string };
      const role = dd.role === 'assistant' ? 'assistant' : 'user';
      return { role, text: dd.text ?? '' };
    });

  const latestUser = [...chatTurns].reverse().find(t => t.role === 'user')?.text ?? null;

  const nonChatActions = events.filter(e => e.event_type !== 'chat_message').slice(0, 10);

  return {
    timestamp: now,
    time_of_day: `${hh}:${mm}`,
    recent_actions: nonChatActions,
    active_integrations: input.enabledIntegrations,
    recent_chat: chatTurns,
    latest_user_message: latestUser,
  };
}
