import { Integration } from './types';

export class IntegrationRegistry {
  private items = new Map<string, Integration>();
  private enabled = new Set<string>();

  register(integration: Integration): void {
    this.items.set(integration.name, integration);
  }

  get(name: string): Integration | undefined {
    return this.items.get(name);
  }

  names(): string[] {
    return Array.from(this.items.keys());
  }

  enable(name: string): void {
    if (this.items.has(name)) this.enabled.add(name);
  }

  disable(name: string): void {
    this.enabled.delete(name);
  }

  enabledNames(): string[] {
    return Array.from(this.enabled);
  }
}
