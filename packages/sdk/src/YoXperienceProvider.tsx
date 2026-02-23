import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { createYoXperienceClient } from "./client.js";
import type {
  LayoutConfig,
  YoXperienceContextValue,
  YoXperienceProviderProps,
} from "./types.js";

const YoXperienceContext = createContext<YoXperienceContextValue | null>(null);

export function useYoXperience(): YoXperienceContextValue {
  const ctx = useContext(YoXperienceContext);
  if (!ctx)
    throw new Error(
      "useYoXperience must be used within <YoXperienceProvider>"
    );
  return ctx;
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
  const [error, setError] = useState<Error | null>(null);

  const clientRef = useRef(
    createYoXperienceClient(apiBaseUrl, publishableKey)
  );
  const eventBufferRef = useRef<
    Array<{
      slotKey: string;
      variant: string;
      eventType: string;
      metadata?: Record<string, unknown>;
    }>
  >([]);

  const fetchConfig = useCallback(async () => {
    try {
      const layout = await clientRef.current.fetchLayout(userId);
      setConfig(layout);
      setError(null);
      onConfigLoaded?.(layout);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [userId, onConfigLoaded]);

  // Initial fetch + polling
  useEffect(() => {
    setIsLoading(true);
    fetchConfig();

    if (pollInterval > 0) {
      const interval = setInterval(fetchConfig, pollInterval);
      return () => clearInterval(interval);
    }
  }, [fetchConfig, pollInterval]);

  // Flush telemetry buffer every 2 seconds
  useEffect(() => {
    const flush = setInterval(() => {
      const events = eventBufferRef.current.splice(0);
      if (events.length > 0) {
        clientRef.current.sendTelemetry(userId, events);
      }
    }, 2000);
    return () => clearInterval(flush);
  }, [userId]);

  const trackEvent = useCallback(
    (
      slotKey: string,
      variant: string,
      eventType: string,
      metadata?: Record<string, unknown>
    ) => {
      eventBufferRef.current.push({ slotKey, variant, eventType, metadata });
    },
    []
  );

  return (
    <YoXperienceContext.Provider
      value={{ config, isLoading, error, trackEvent }}
    >
      {children}
    </YoXperienceContext.Provider>
  );
}
