import { useYoXperience } from "./YoXperienceProvider.js";
import type { SlotConfig } from "./types.js";

export function useSlot(slotKey: string): {
  slot: SlotConfig | null;
  isLoading: boolean;
  trackEvent: (
    eventType: string,
    metadata?: Record<string, unknown>,
  ) => void;
} {
  const { config, isLoading, trackEvent } = useYoXperience();
  const slot = config?.slots[slotKey] ?? null;

  return {
    slot,
    isLoading,
    trackEvent: (eventType, metadata) => {
      if (slot) {
        trackEvent(slotKey, slot.variant, eventType, metadata);
      }
    },
  };
}
