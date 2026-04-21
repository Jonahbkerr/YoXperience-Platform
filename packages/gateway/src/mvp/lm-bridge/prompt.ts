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

export const WorkflowStepSchema = z.object({
  id: z.string(),
  label: z.string(),
  integration: z.string(),
  action: z.string(),
  params: z.record(z.string(), z.unknown()).optional(),
  rationale: z.string().optional(),
});

export const RenderPlanSchema = z.object({
  assistant_message: z.string().default(''),
  panels: z.array(PanelSchema).max(6).default([]),
  workflow: z.array(WorkflowStepSchema).max(8).optional(),
});

export type Button = z.infer<typeof ButtonSchema>;
export type WorkflowStep = z.infer<typeof WorkflowStepSchema>;
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
        return `- integration="${a.integration}", action="${a.action}", params=${paramDesc}  // ${a.label}`;
      }).join('\n');

  return `You are YoXperience, an agent whose PRIMARY OUTPUT is actionable UI — not text.

The user does NOT want to read prose. They want steps or buttons to click.

On every turn:
1. Read the user's latest message (and conversation history).
2. "assistant_message" MUST be a status tag under 8 words (e.g., "3-step workflow ready", "Email options").
3. Decide: is the user's intent MULTI-STEP (like "reply to John then schedule a meeting") or SINGLE-SHOT (like "show my emails")?
   - Multi-step → return a "workflow" array of ordered steps.
   - Single-shot → return "panels" with action buttons.
   - Default to panels if ambiguous.

AVAILABLE ACTIONS (the ONLY action IDs you may reference):
${actionList}

Respond ONLY with strict JSON:
{
  "assistant_message": "status tag under 8 words",
  "workflow": [   // OPTIONAL — include ONLY for multi-step intents
    {
      "id": "s1",
      "label": "short step title (under 40 chars)",
      "integration": "MUST be one of the integration names",
      "action": "MUST be one of the action IDs",
      "params": { ... values matching the action's params, or {} },
      "rationale": "one sentence — why this step"
    }
  ],
  "panels": [   // use for single-shot; may be empty if workflow is present
    {
      "type": "action_card" | "context_panel" | "quick_actions",
      "priority": 0-10,
      "data": { "title": "...", "body": "..." },
      "buttons": [
        {
          "label": "button text",
          "integration": "MUST be one of the integration names",
          "action": "MUST be one of the action IDs",
          "params": { ... }
        }
      ],
      "rationale": "one sentence"
    }
  ]
}

Adapt to the user:
- "user_patterns" in the context contains what this user actually does often:
  top_actions (most-executed), top_action_at_this_hour (what they do at this time of day),
  recent_recipients (emails they've written to), recent_slack_channels (channels they've used),
  last_workflow_summary (their most recent chain of actions).
- USE these signals: bump priority of actions in top_actions, pre-fill params with recent_recipients or recent_slack_channels when relevant.
- If the user's ambiguous intent matches something they do often at this hour, surface that FIRST.
- Do NOT mention patterns explicitly in the assistant_message — just reflect them in the UI choices.

Rules:
- Max 4 panels. Max 6 workflow steps.
- If the user asked for something specific ("show emails", "what's my schedule"), single-shot panel is usually right.
- If the user asked for a compound task ("reply to X and schedule Y", "draft an email and Slack the team"), use workflow.
- For workflow: order steps logically. Each step SHOULD depend on or follow from the prior one.
- "integration" and "action" MUST be the exact values shown above — separate strings. Do NOT put "gmail.list_unread" as the action; the action is just "list_unread".
- Never invent action IDs. Only use the exact integration and action values listed.
- For free-text params (message bodies, channel, subject), pre-fill with sensible inferred values. The user WILL edit before running.
- Keep titles under 40 chars.
- Return ONLY the JSON object. No prose outside JSON. No markdown fences.`;
}

export function buildUserPrompt(context: object): string {
  return `Workflow context:\n${JSON.stringify(context, null, 2)}`;
}
