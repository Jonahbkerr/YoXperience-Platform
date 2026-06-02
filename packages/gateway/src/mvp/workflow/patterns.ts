import { DB } from '../db';

export interface UserPatterns {
  total_sessions: number;
  total_actions: number;
  top_actions: { integration: string; action: string; count: number }[];
  top_action_at_this_hour: { integration: string; action: string; count: number } | null;
  recent_recipients: string[];         // email addresses seen in create_draft/send_email
  recent_slack_channels: string[];     // channels seen in send_message
  last_workflow_summary: string | null;
}

interface EventRow { timestamp: number; event_type: string; data: string }

function parseJson<T = unknown>(s: string, fallback: T): T {
  try { return JSON.parse(s) as T; } catch { return fallback; }
}

export function computeUserPatterns(db: DB): UserPatterns {
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const currentHour = new Date(now).getHours();

  // Pull recent events (last 7 days)
  const events = db.prepare(
    'SELECT timestamp, event_type, data FROM events WHERE timestamp >= ? ORDER BY timestamp DESC LIMIT 500'
  ).all(sevenDaysAgo) as EventRow[];

  // Session count
  const totalSessions = events.filter(e => e.event_type === 'session_start').length;

  // Extract executed actions
  const executes = events.filter(e => e.event_type === 'execute_ok');
  const totalActions = executes.length;

  // Top actions overall
  const actionCounts = new Map<string, number>();
  for (const e of executes) {
    const d = parseJson<{ integration?: string; action?: string }>(e.data, {});
    if (d.integration && d.action) {
      const k = `${d.integration}|${d.action}`;
      actionCounts.set(k, (actionCounts.get(k) ?? 0) + 1);
    }
  }
  const topActions = [...actionCounts.entries()]
    .map(([k, count]) => {
      const [integration, action] = k.split('|');
      return { integration, action, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Top action for the current hour-of-day
  const hourBuckets = new Map<string, number>();
  for (const e of executes) {
    const hour = new Date(e.timestamp).getHours();
    if (hour !== currentHour) continue;
    const d = parseJson<{ integration?: string; action?: string }>(e.data, {});
    if (d.integration && d.action) {
      const k = `${d.integration}|${d.action}`;
      hourBuckets.set(k, (hourBuckets.get(k) ?? 0) + 1);
    }
  }
  const topHourEntry = [...hourBuckets.entries()].sort((a, b) => b[1] - a[1])[0];
  const topActionAtThisHour = topHourEntry
    ? (() => { const [integration, action] = topHourEntry[0].split('|'); return { integration, action, count: topHourEntry[1] }; })()
    : null;

  // Recent email recipients + Slack channels (from execute events with params)
  const execWithParams = events.filter(e => e.event_type === 'execute');
  const recipients = new Set<string>();
  const channels = new Set<string>();
  for (const e of execWithParams) {
    const d = parseJson<{ integration?: string; action?: string; params?: Record<string, unknown> }>(e.data, {});
    const p = d.params ?? {};
    if (d.integration === 'gmail' && typeof p.to === 'string') recipients.add(p.to.trim());
    if (d.integration === 'slack' && typeof p.channel === 'string') channels.add(p.channel.trim());
    if (recipients.size > 8 && channels.size > 8) break;
  }

  // Last workflow summary — look at a window of recent execute_ok events clustered in time
  let lastWorkflowSummary: string | null = null;
  const recent = executes.slice(0, 8);
  if (recent.length >= 2) {
    const labels = recent.slice(0, 3).reverse().map(e => {
      const d = parseJson<{ integration?: string; action?: string }>(e.data, {});
      return `${d.integration}.${d.action}`;
    });
    lastWorkflowSummary = labels.join(' → ');
  }

  return {
    total_sessions: totalSessions,
    total_actions: totalActions,
    top_actions: topActions,
    top_action_at_this_hour: topActionAtThisHour,
    recent_recipients: [...recipients].slice(0, 5),
    recent_slack_channels: [...channels].slice(0, 5),
    last_workflow_summary: lastWorkflowSummary,
  };
}
