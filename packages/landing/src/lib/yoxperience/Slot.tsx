import { useEffect, useRef } from "react";
import { useYoXperienceOptional } from "./YoXperienceProvider";
import type { SlotProps, VariantProps, YoXperienceContextValue } from "./types";

export function Slot({ name, variants, fallback = null }: SlotProps) {
  const ctx = useYoXperienceOptional();
  const registeredRef = useRef(false);

  // Auto-register this slot with the gateway on first mount
  useEffect(() => {
    if (!registeredRef.current && ctx) {
      registeredRef.current = true;
      ctx.registerSlot(name, Object.keys(variants));
    }
  }, [name, variants, ctx]);

  // No provider (e.g. local dev without YXP key) — render first variant as default
  if (!ctx) {
    const fallbackKey = Object.keys(variants)[0];
    if (!fallbackKey) return <>{fallback}</>;
    const FallbackComponent = variants[fallbackKey];
    return <FallbackComponent slotKey={name} variant={fallbackKey} trackEvent={() => {}} />;
  }

  const { config, isLoading, trackEvent } = ctx;

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
