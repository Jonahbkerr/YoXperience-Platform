import { RenderPlanSchema, RenderPlan } from './prompt';

export interface LMConfig {
  url: string;
  model: string;
  temperature?: number;
}

export class LMClient {
  constructor(private config: LMConfig) {}

  async renderPlan(systemPrompt: string, userPrompt: string): Promise<RenderPlan> {
    const res = await fetch(`${this.config.url}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: this.config.temperature ?? 0.2,
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) {
      throw new Error(`LM Studio HTTP ${res.status}`);
    }

    const json = await res.json() as { choices: { message: { content: string } }[] };
    const content = json.choices[0]?.message?.content;
    if (!content) throw new Error('LM Studio returned empty content');

    const parsed = JSON.parse(content);
    return RenderPlanSchema.parse(parsed);
  }
}
