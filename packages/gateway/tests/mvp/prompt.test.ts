import { describe, it, expect } from 'vitest';
import { buildSystemPrompt, RenderPlanSchema } from '../../src/mvp/lm-bridge/prompt';

describe('prompt', () => {
  it('includes available tools in system prompt', () => {
    const sys = buildSystemPrompt([
      { integration: 'gmail', action: 'list_unread', label: 'List unread', params: [] },
      { integration: 'calendar', action: 'list_upcoming', label: 'Upcoming events', params: [] },
    ]);
    expect(sys).toContain('"gmail"');
    expect(sys).toContain('"list_unread"');
    expect(sys).toContain('"calendar"');
    expect(sys).toContain('"list_upcoming"');
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
    // Invalid panel type
    expect(() => RenderPlanSchema.parse({
      panels: [{ type: 'bad_type', priority: 1, data: {}, rationale: '' }],
    })).toThrow();
  });

  it('accepts a workflow-shaped plan', () => {
    const plan = {
      assistant_message: '2-step workflow',
      panels: [],
      workflow: [
        { id: 's1', label: 'Check mail', integration: 'gmail', action: 'list_unread' },
        { id: 's2', label: 'Post update', integration: 'slack', action: 'send_message', params: { channel: '#general', text: 'hi' } },
      ],
    };
    expect(() => RenderPlanSchema.parse(plan)).not.toThrow();
  });
});
