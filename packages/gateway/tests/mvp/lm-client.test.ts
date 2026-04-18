import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LMClient } from '../../src/mvp/lm-bridge/client';

describe('LMClient', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('returns parsed render plan on success', async () => {
    const mockResponse = {
      choices: [{
        message: {
          content: JSON.stringify({
            panels: [{ type: 'action_card', priority: 5, data: { title: 'Hi' }, rationale: 'test' }],
          }),
        },
      }],
    };
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const client = new LMClient({ url: 'http://x/v1', model: 'm' });
    const result = await client.renderPlan('sys', 'user');

    expect(result.panels).toHaveLength(1);
    expect(result.panels[0].type).toBe('action_card');
  });

  it('throws on invalid JSON', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'not json' } }] }),
    });
    const client = new LMClient({ url: 'http://x/v1', model: 'm' });
    await expect(client.renderPlan('sys', 'user')).rejects.toThrow();
  });

  it('throws on HTTP error', async () => {
    (global.fetch as any).mockResolvedValue({ ok: false, status: 500 });
    const client = new LMClient({ url: 'http://x/v1', model: 'm' });
    await expect(client.renderPlan('sys', 'user')).rejects.toThrow();
  });
});
