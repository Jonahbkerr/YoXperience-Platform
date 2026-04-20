import { z } from 'zod';

export const ButtonSchema = z.object({
  label: z.string(),
  integration: z.string(),
  action: z.string(),
  params: z.record(z.string(), z.unknown()).optional(),
});

export const PanelSchema = z.object({
  type: z.enum(['action_card', 'context_panel', 'quick_actions']),
  priority: z.number().int().min(0).max(10),
  data: z.record(z.string(), z.unknown()),
  buttons: z.array(ButtonSchema).optional(),
  rationale: z.string(),
});

export const RenderPlanSchema = z.object({
  panels: z.array(PanelSchema).max(6),
});

export type Button = z.infer<typeof ButtonSchema>;
export type RenderPlan = z.infer<typeof RenderPlanSchema>;

export interface AvailableAction {
  integration: string;
  action: string;
  label: string;
  params: { name: string; type: string; required?: boolean }[];
}

export function buildSystemPrompt(availableActions: AvailableAction[]): string {
  const actionList = availableActions.length === 0
    ? '(none — user has no integrations connected)'
    : availableActions.map(a => {
        const paramDesc = a.params.length === 0
          ? '()'
          : '(' + a.params.map(p => `${p.name}: ${p.type}${p.required ? '' : '?'}`).join(', ') + ')';
        return `- ${a.integration}.${a.action}${paramDesc}  // ${a.label}`;
      }).join('\n');

  return `You are the YoXperience UI agent. Based on the user's workflow context and available integration actions, recommend UI panels with clickable buttons that invoke real tools.

AVAILABLE ACTIONS (these are the ONLY actions you can reference):
${actionList}

Respond ONLY with strict JSON matching this schema:
{
  "panels": [
    {
      "type": "action_card" | "context_panel" | "quick_actions",
      "priority": 0-10,
      "data": {
        "title": "string — short heading",
        "body": "string — optional description"
      },
      "buttons": [
        {
          "label": "string — button text",
          "integration": "MUST be one of the integration names above",
          "action": "MUST be one of the action IDs above",
          "params": { ... param values matching the action signature, or {} if no params }
        }
      ],
      "rationale": "one short sentence why this panel helps the user"
    }
  ]
}

Rules:
- Max 4 panels.
- Every panel MUST include at least one button from the available actions list.
- Do NOT invent action IDs. Only use the exact integration.action pairs listed above.
- Fill required params with sensible values (for free-text params like "text", use meaningful content).
- Keep titles under 40 chars, body under 120 chars.
- Return ONLY the JSON object. No prose, no markdown fences.`;
}

export function buildUserPrompt(context: object): string {
  return `Workflow context:\n${JSON.stringify(context, null, 2)}`;
}
