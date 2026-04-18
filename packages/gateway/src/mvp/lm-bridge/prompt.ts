import { z } from 'zod';

export const PanelSchema = z.object({
  type: z.enum(['action_card', 'context_panel', 'quick_actions']),
  priority: z.number().int().min(0).max(10),
  data: z.record(z.string(), z.unknown()),
  rationale: z.string(),
});

export const RenderPlanSchema = z.object({
  panels: z.array(PanelSchema).max(6),
});

export type RenderPlan = z.infer<typeof RenderPlanSchema>;

export function buildSystemPrompt(enabledIntegrations: string[]): string {
  return `You are the YoXperience UI agent. Based on the user's current workflow context and available tools, recommend which UI panels to show.

Available integrations: ${enabledIntegrations.join(', ') || 'none'}

Respond ONLY with strict JSON matching this schema:
{
  "panels": [
    { "type": "action_card" | "context_panel" | "quick_actions",
      "priority": 0-10,
      "data": { ... panel-specific fields },
      "rationale": "one sentence why" }
  ]
}

Max 6 panels. Higher priority shown first. Do not include prose outside JSON.`;
}

export function buildUserPrompt(context: object): string {
  return `Current workflow context:\n${JSON.stringify(context, null, 2)}`;
}
