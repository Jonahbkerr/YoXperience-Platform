import type { LayoutConfig } from "./types.js";

export function createYoXperienceClient(
  baseUrl: string,
  publishableKey: string
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-api-key": publishableKey,
  };

  return {
    async fetchLayout(userId: string): Promise<LayoutConfig> {
      const res = await fetch(`${baseUrl}/v1/layout/${userId}`, { headers });
      if (!res.ok) throw new Error(`Layout fetch failed: ${res.status}`);
      return res.json();
    },

    async sendTelemetry(
      userId: string,
      events: Array<{
        slotKey: string;
        variant: string;
        eventType: string;
        metadata?: Record<string, unknown>;
      }>
    ): Promise<void> {
      await fetch(`${baseUrl}/v1/telemetry`, {
        method: "POST",
        headers,
        body: JSON.stringify({ userId, events }),
      }).catch(() => {});
    },

    async registerSlots(
      slots: Array<{
        slotKey: string;
        variants: string[];
        defaultVariant?: string;
      }>
    ): Promise<void> {
      await fetch(`${baseUrl}/v1/register-slots`, {
        method: "POST",
        headers,
        body: JSON.stringify({ slots }),
      }).catch(() => {});
    },
  };
}
