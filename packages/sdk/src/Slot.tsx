import { useEffect, useRef } from "react";
import { useYoXperience } from "./YoXperienceProvider.js";
import type { SlotProps, VariantProps, YoXperienceContextValue } from "./types.js";

export function Slot({ name, variants, fallback = null }: SlotProps) {
  const { config, isLoading, trackEvent, registerSlot } = useYoXperience();
  const registeredRef = useRef(false);

  // Auto-register this slot with the gateway on first mount
  useEffect(() => {
    if (!registeredRef.current) {
      registeredRef.current = true;
      registerSlot(name, Object.keys(variants));
    }
  }, [name, variants, registerSlot]);

  if (isLoading || !config) {
    return <>{fallback}</>;
  }

  const slotConfig = config.slots[name];
  if (!slotConfig) {
    // No server config yet — render first variant as default
    const fallbackKey = Object.keys(variants)[0];
    if (!fallbackKey) return null;
    const FallbackComponent = variants[fallbackKey];
    return (
      <SlotWrapper
        Component={FallbackComponent}
        slotKey={name}
        variant={fallbackKey}
        trackEvent={trackEvent}
      />
    );
  }

  const Component = variants[slotConfig.variant];
  if (!Component) {
    const fallbackKey = Object.keys(variants)[0];
    if (!fallbackKey) return null;
    const FallbackComponent = variants[fallbackKey];
    return (
      <SlotWrapper
        Component={FallbackComponent}
        slotKey={name}
        variant={fallbackKey}
        trackEvent={trackEvent}
      />
    );
  }

  return (
    <SlotWrapper
      Component={Component}
      slotKey={name}
      variant={slotConfig.variant}
      trackEvent={trackEvent}
    />
  );
}

function SlotWrapper({
  Component,
  slotKey,
  variant,
  trackEvent,
}: {
  Component: React.ComponentType<VariantProps>;
  slotKey: string;
  variant: string;
  trackEvent: YoXperienceContextValue["trackEvent"];
}) {
  useEffect(() => {
    trackEvent(slotKey, variant, "impression");
  }, [slotKey, variant, trackEvent]);

  const boundTrack = (
    eventType: string,
    metadata?: Record<string, unknown>
  ) => {
    trackEvent(slotKey, variant, eventType, metadata);
  };

  return (
    <Component slotKey={slotKey} variant={variant} trackEvent={boundTrack} />
  );
}
