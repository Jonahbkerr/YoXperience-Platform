import { describe, it, expect } from 'vitest';
import { IntegrationRegistry } from '../../src/mvp/integrations/registry';
import { Integration } from '../../src/mvp/integrations/types';

function fakeIntegration(name: string): Integration {
  return {
    name,
    listActions: () => [{ id: 'ping', label: 'Ping', params: [] }],
    execute: async () => ({ ok: true }),
  };
}

describe('IntegrationRegistry', () => {
  it('registers and lists integrations', () => {
    const r = new IntegrationRegistry();
    r.register(fakeIntegration('gmail'));
    r.register(fakeIntegration('slack'));
    expect(r.names()).toEqual(['gmail', 'slack']);
  });

  it('gets integration by name', () => {
    const r = new IntegrationRegistry();
    const g = fakeIntegration('gmail');
    r.register(g);
    expect(r.get('gmail')).toBe(g);
    expect(r.get('missing')).toBeUndefined();
  });

  it('lists enabled integrations only', () => {
    const r = new IntegrationRegistry();
    r.register(fakeIntegration('gmail'));
    r.register(fakeIntegration('slack'));
    r.enable('gmail');
    expect(r.enabledNames()).toEqual(['gmail']);
  });
});
