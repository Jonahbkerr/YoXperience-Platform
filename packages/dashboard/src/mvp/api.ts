const BASE = '/api';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`GET ${path} ${res.status}`);
  return res.json();
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`POST ${path} ${res.status}`);
  return res.json();
}

async function del<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`DELETE ${path} ${res.status}`);
  return res.json();
}

export interface Button {
  label: string;
  integration: string;
  action: string;
  params?: Record<string, unknown>;
}

export interface Panel {
  type: 'action_card' | 'context_panel' | 'quick_actions';
  priority: number;
  data: Record<string, unknown>;
  buttons?: Button[];
  rationale: string;
}

export interface ExecuteResponse {
  ok: boolean;
  result?: unknown;
  error?: string;
  needsConfirmation?: boolean;
  integration?: string;
  action?: string;
  params?: Record<string, unknown>;
}

export interface WorkflowStep {
  id: string;
  label: string;
  integration: string;
  action: string;
  params?: Record<string, unknown>;
  rationale?: string;
}

export interface RenderResponse {
  plan: {
    panels: Panel[];
    assistant_message?: string;
    workflow?: WorkflowStep[];
  };
  latency_ms?: number;
  error?: string;
  fallback?: boolean;
}

export interface ChatMessage {
  timestamp: number;
  role: 'user' | 'assistant';
  text: string;
  source?: string;
}

export interface IntegrationsResponse {
  available: string[];
  enabled: string[];
  connected: string[];
}

export const api = {
  render: () => get<RenderResponse>('/render'),
  logEvent: (event_type: string, data: Record<string, unknown> = {}) =>
    post<{ ok: true }>('/events', { event_type, data }),
  integrations: () => get<IntegrationsResponse>('/integrations'),
  enable: (name: string) => post<{ ok: true }>(`/integrations/${name}/enable`),
  disable: (name: string) => post<{ ok: true }>(`/integrations/${name}/disable`),
  disconnect: (name: string) => del<{ ok: true }>(`/integrations/${name}`),
  dismissPanel: (id: number) => post<{ ok: true }>(`/panels/${id}/dismiss`),
  execute: (integration: string, action: string, params: Record<string, unknown> = {}, confirmed = false) =>
    post<ExecuteResponse>('/execute', { integration, action, params, confirmed }),
  seedDemo: () => post<{ ok: true; seeded: number }>('/demo/seed'),
  demoStatus: () => get<{ demoMode: boolean }>('/demo/status'),
  sendChat: (text: string, source: 'text' | 'voice' = 'text') =>
    post<{ ok: true }>('/chat', { text, source }),
  chatHistory: () => get<{ messages: ChatMessage[] }>('/chat'),
};
