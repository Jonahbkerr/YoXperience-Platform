import { describe, it, expect } from 'vitest';
import { buildSystemPrompt, RenderPlanSchema } from '../../src/mvp/lm-bridge/prompt';

describe('prompt', () => {
  it('includes available tools in system prompt', () => {
    const sys = buildSystemPrompt(['gmail', 'calendar']);
    expect(sys).toContain('gmail');
    expect(sys).toContain('calendar');
    expect(sys).toContain('JSON');
  });

  it('validates a well-formed render plan', () => {
    const valid = {
      panels: [
        { type: 'action_card', priority: 1, data: { title: 'X' }, rationale: 'Y' },
      ],
    };
    expect(() => RenderPlanSchema.parse(valid)).not.toThrow();
  });

  it('rejects invalid render plan', () => {
    expect(() => RenderPlanSchema.parse({ foo: 'bar' })).toThrow();
  });
});
