import { useEffect, useRef } from "react";
import { useYoXperienceOptional } from "./YoXperienceProvider";
import type { SlotConfig } from "./types";

export function useSlot(
  slotKey: string,
  variants?: string[],
): {
  slot: SlotConfig | null;
  isLoading: boolean;
  trackEvent: (
    eventType: string,
    metadata?: Record<string, unknown>,
  ) => void;
} {
  const ctx = useYoXperienceOptional();
  const config = ctx?.config ?? null;
  const isLoading = ctx?.isLoading ?? false;
  const slot = config?.slots[slotKey] ?? null;
  const registeredRef = useRef(false);
  const impressionTrackedRef = useRef<string | null>(null);

  // Auto-register slot variants with gateway (same as <Slot>)
  useEffect(() => {
    if (ctx && variants && variants.length > 0 && !registeredRef.current) {
      registeredRef.current = true;
      ctx.registerSlot(slotKey, variants);
    }
  }, [slotKey, variants, ctx]);

  // Auto-track impression when variant resolves (same as SlotWrapper)
  useEffect(() => {
    if (ctx && slot && impressionTrackedRef.current !== slot.variant) {
      impressionTrackedRef.current = slot.variant;
      ctx.trackEvent(slotKey, slot.variant, "impression");
    }
  }, [slot, slotKey, ctx]);

  return {
    slot,
    isLoading,
    trackEvent: (eventType, metadata) => {
      if (ctx && slot) {
        ctx.trackEvent(slotKey, slot.variant, eventType, metadata);
      }
    },
  };
}
