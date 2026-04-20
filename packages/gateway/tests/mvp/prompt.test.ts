import { describe, it, expect } from 'vitest';
import { buildSystemPrompt, RenderPlanSchema } from '../../src/mvp/lm-bridge/prompt';

describe('prompt', () => {
  it('includes available tools in system prompt', () => {
    const sys = buildSystemPrompt([
      { integration: 'gmail', action: 'list_unread', label: 'List unread', params: [] },
      { integration: 'calendar', action: 'list_upcoming', label: 'Upcoming events', params: [] },
    ]);
    expect(sys).toContain('gmail.list_unread');
    expect(sys).toContain('calendar.list_upcoming');
    expect(sys).toContain('JSON');
  });

  it('validates a well-formed render plan', () => {
    const valid = {
      panels: [
        { type: 'action_card', priority: 1, data: { title: 'X' }, rationale: 'Y',
          buttons: [{ label: 'Do', integration: 'slack', action: 'list_channels' }] },
      ],
    };
    expect(() => RenderPlanSchema.parse(valid)).not.toThrow();
  });

  it('rejects invalid render plan', () => {
    expect(() => RenderPlanSchema.parse({ foo: 'bar' })).toThrow();
  });
});
