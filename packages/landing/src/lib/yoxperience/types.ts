import type { ReactNode, ComponentType } from "react";

export interface SlotConfig {
  slotKey: string;
  variant: string;
  availableVariants: string[];
  confidence: number;
  mode?: "auto" | "forced" | "split";
}

export interface LayoutConfig {
  userId: string;
  slots: Record<string, SlotConfig>;
  resolvedAt: string;
}

export interface YoXperienceProviderProps {
  apiBaseUrl: string;
  publishableKey: string;
  userId: string;
  children: ReactNode;
  pollInterval?: number;
  onConfigLoaded?: (config: LayoutConfig) => void;
}

export interface VariantProps {
  slotKey: string;
  variant: string;
  trackEvent: (
    eventType: string,
    metadata?: Record<string, unknown>,
  ) => void;
}

export interface SlotProps {
  name: string;
  variants: Record<string, ComponentType<VariantProps>>;
  fallback?: ReactNode;
}

export interface YoXperienceContextValue {
  config: LayoutConfig | null;
  isLoading: boolean;
  error: Error | null;
  trackEvent: (
    slotKey: string,
    variant: string,
    eventType: string,
    metadata?: Record<string, unknown>,
  ) => void;
  registerSlot: (slotKey: string, variants: string[]) => void;
  /** Credit a downstream conversion to every slot this user was exposed to. */
  trackConversion: (conversionType: string) => void;
}

export interface VariantBreakdown {
  variant: string;
  impressions: number;
  clicks: number;
  hovers: number;
  dismissals: number;
  engagement: number;
}

export interface SlotAnalytics {
  slotKey: string;
  variants: string[];
  defaultVariant: string;
  totalEvents: number;
  winner: { variant: string; confidence: number } | null;
  variantBreakdown: VariantBreakdown[];
}

export interface SDKAnalyticsResponse {
  totalEvents24h: number;
  uniqueUsers24h: number;
  slots: SlotAnalytics[];
  eventsByType: Array<{ eventType: string; count: number }>;
}
