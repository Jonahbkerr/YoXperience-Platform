import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { createYoXperienceClient } from "./client";
import type {
  LayoutConfig,
  YoXperienceContextValue,
  YoXperienceProviderProps,
} from "./types";

const YoXperienceContext = createContext<YoXperienceContextValue | null>(null);

/**
 * Owner preview: ?yxp_preview=hero-headline:social_proof,pricing-cta:value
 * forces specific slot variants for THIS browser only, so you can see any
 * variant on the live site. Telemetry/conversions are suppressed in preview
 * mode so it never pollutes real experiment data.
 */
function parsePreviewOverrides(): Map<string, string> {
  const map = new Map<string, string>();
  if (typeof window === "undefined") return map;
  const raw = new URLSearchParams(window.location.search).get("yxp_preview");
  if (!raw) return map;
  for (const pair of raw.split(",")) {
    const [slot, variant] = pair.split(":").map((s) => s.trim());
    if (slot && variant) map.set(slot, variant);
  }
  return map;
}

export function useYoXperience(): YoXperienceContextValue {
  const ctx = useContext(YoXperienceContext);
  if (!ctx) throw new Error("useYoXperience must be used within YoXperienceProvider");
  return ctx;
}

/**
 * Safe conversion hook — returns a trackConversion(type) function that
 * no-ops when rendered outside a provider, so conversion calls can be
 * sprinkled anywhere (pricing, analysis, signup) without crashing.
 */
/** Like useYoXperience but returns null outside a provider instead of throwing. */
export function useYoXperienceOptional(): YoXperienceContextValue | null {
  return useContext(YoXperienceContext);
}

export function useConversion(): (conversionType: string) => void {
  const ctx = useContext(YoXperienceContext);
  return ctx?.trackConversion ?? (() => {});
}

export function YoXperienceProvider({
  apiBaseUrl,
  publishableKey,
  userId,
  children,
  pollInterval = 0,
  onConfigLoaded,
}: YoXperienceProviderProps) {
  const [config, setConfig] = useState<LayoutConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const clientRef = useRef(createYoXperienceClient(apiBaseUrl, publishableKey));
  const eventBufferRef = useRef<Array<{
    slotKey: string; variant: string; eventType: string; metadata?: Record<string, unknown>;
  }>>([]);
  const slotRegistryRef = useRef<Map<string, string[]>>(new Map());
  const registrationSentRef = useRef(false);
  const regTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  // Preview overrides are parsed once from the URL and never change.
  const previewRef = useRef<Map<string, string>>(parsePreviewOverrides());
  const previewMode = previewRef.current.size > 0;

  // Force previewed variants into the resolved config so useSlot/Slot pick
  // them up. Injects an entry even for slots the layout hasn't returned yet.
  const applyPreview = useCallback((layout: LayoutConfig): LayoutConfig => {
    if (previewRef.current.size === 0) return layout;
    const slots = { ...layout.slots };
    for (const [slotKey, variant] of previewRef.current) {
      slots[slotKey] = {
        slotKey,
        variant,
        availableVariants: slots[slotKey]?.availableVariants ?? [variant],
        confidence: 1,
        mode: "forced",
      };
    }
    return { ...layout, slots };
  }, []);

  // Flush buffered events to gateway (suppressed entirely in preview mode)
  const flushNow = useCallback(() => {
    const events = eventBufferRef.current.splice(0);
    if (events.length > 0 && !previewMode) {
      clientRef.current.sendTelemetry(userIdRef.current, events);
    }
  }, [previewMode]);

  const fetchConfig = useCallback(async () => {
    try {
      const layout = await clientRef.current.fetchLayout(userIdRef.current);
      const applied = applyPreview(layout);
      setConfig(applied);
      onConfigLoaded?.(applied);
      // After config loads, any mounted Slot effects will have
      // pushed impression events — flush immediately
      setTimeout(flushNow, 100);
    } catch {
      // Even if the layout fetch fails, honor preview overrides so the
      // previewed variants still render.
      if (previewRef.current.size > 0) {
        setConfig(applyPreview({ userId: userIdRef.current, slots: {}, resolvedAt: "" }));
      }
    }
    finally { setIsLoading(false); }
  }, [onConfigLoaded, flushNow, applyPreview]);

  // Initial fetch + polling
  useEffect(() => {
    setIsLoading(true);
    fetchConfig();
    if (pollInterval > 0) {
      const timer = setInterval(fetchConfig, pollInterval);
      return () => clearInterval(timer);
    }
  }, [fetchConfig, pollInterval]);

  // Flush telemetry frequently + on visibility change + on unload
  useEffect(() => {
    const flush = setInterval(flushNow, 1500);

    const onVisible = () => { if (document.visibilityState === "visible") flushNow(); };
    const onUnload = () => flushNow();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("beforeunload", onUnload);

    return () => {
      clearInterval(flush);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, [flushNow]);

  const trackEvent = useCallback(
    (slotKey: string, variant: string, eventType: string, metadata?: Record<string, unknown>) => {
      if (previewMode) return; // preview must not pollute real data
      eventBufferRef.current.push({ slotKey, variant, eventType, metadata });
      if (eventType !== "impression") {
        setTimeout(flushNow, 50);
      }
    }, [flushNow, previewMode]);

  const registerSlot = useCallback(
    (slotKey: string, variants: string[]) => {
      slotRegistryRef.current.set(slotKey, variants);
      if (regTimerRef.current) clearTimeout(regTimerRef.current);
      regTimerRef.current = setTimeout(() => {
        if (registrationSentRef.current) return;
        registrationSentRef.current = true;
        const slots = Array.from(slotRegistryRef.current.entries()).map(
          ([key, vars]) => ({ slotKey: key, variants: vars }));
        if (slots.length > 0) {
          clientRef.current.registerSlots(slots).then(() => fetchConfig());
        }
      }, 500);
    }, [fetchConfig]);

  // Credit a downstream conversion to every slot this user saw. Deduped by
  // (conversionType) client-side so a repeat action in one session fires once.
  // Attribution is server-side from the user's IMPRESSION history, so we must
  // flush any buffered impressions and let them commit BEFORE sending the
  // conversion — otherwise the exposure lookup finds nothing and credits 0.
  const firedConversionsRef = useRef<Set<string>>(new Set());
  const trackConversion = useCallback((conversionType: string) => {
    if (previewMode) return; // preview must not pollute real data
    if (firedConversionsRef.current.has(conversionType)) return;
    firedConversionsRef.current.add(conversionType);
    flushNow(); // push any pending impression events now
    const uid = userIdRef.current;
    setTimeout(() => clientRef.current.sendConversion(uid, conversionType), 2000);
  }, [flushNow, previewMode]);

  return (
    <YoXperienceContext.Provider value={{ config, isLoading, error: null, trackEvent, registerSlot, trackConversion }}>
      {children}
      {previewMode && (
        <div
          style={{
            position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 2147483647,
            background: "#111", color: "#fff", fontSize: 13, lineHeight: 1.4,
            padding: "8px 14px", display: "flex", alignItems: "center", gap: 12,
            fontFamily: "system-ui, sans-serif", boxShadow: "0 -2px 12px rgba(0,0,0,0.4)",
          }}
          data-testid="yxp-preview-banner"
        >
          <span style={{ fontWeight: 700 }}>👁 Preview mode</span>
          <span style={{ opacity: 0.85, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {Array.from(previewRef.current.entries()).map(([s, v]) => `${s} = ${v}`).join("  ·  ")}
            {"  ·  telemetry off"}
          </span>
          <a
            href={typeof window !== "undefined" ? window.location.pathname : "/"}
            style={{ marginLeft: "auto", color: "#fff", textDecoration: "underline", flexShrink: 0 }}
          >
            Exit preview
          </a>
        </div>
      )}
    </YoXperienceContext.Provider>
  );
}
