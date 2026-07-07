import type { LayoutConfig } from "./types";

function headers(publishableKey: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "x-api-key": publishableKey,
  };
}

export function createYoXperienceClient(apiBaseUrl: string, publishableKey: string) {
  const base = apiBaseUrl + "/v1";
  const h = headers(publishableKey);

  return {
    async fetchLayout(userId: string): Promise<LayoutConfig> {
      const res = await fetch(`${base}/layout/${encodeURIComponent(userId)}`, { headers: h });
      if (!res.ok) throw new Error(`Layout fetch failed: ${res.status}`);
      return res.json();
    },

    async sendTelemetry(
      userId: string,
      events: Array<{ slotKey: string; variant: string; eventType: string; metadata?: Record<string, unknown> }>,
    ): Promise<void> {
      await fetch(`${base}/telemetry`, {
        method: "POST",
        headers: h,
        body: JSON.stringify({ userId, events }),
      }).catch(() => {});
    },

    async registerSlots(
      slots: Array<{ slotKey: string; variants: string[]; defaultVariant?: string }>,
    ): Promise<void> {
      await fetch(`${base}/register-slots`, {
        method: "POST",
        headers: h,
        body: JSON.stringify({ slots }),
      }).catch(() => {});
    },

    // Credit a downstream conversion (subscribe, install, analysis, signup)
    // back to every slot variant this user was exposed to — server-side.
    async sendConversion(userId: string, conversionType: string): Promise<void> {
      await fetch(`${base}/conversion`, {
        method: "POST",
        headers: h,
        body: JSON.stringify({ userId, conversionType }),
      }).catch(() => {});
    },
  };
}
