import { EventTracker, EventRecord } from './tracker';

export interface WorkflowContext {
  timestamp: number;
  time_of_day: string;
  recent_actions: EventRecord[];
  active_integrations: string[];
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
  return {
    timestamp: now,
    time_of_day: `${hh}:${mm}`,
    recent_actions: input.tracker.recent(input.limit ?? 20),
    active_integrations: input.enabledIntegrations,
  };
}
