import type { ReactNode, ComponentType } from "react";

export interface SlotConfig {
  slotKey: string;
  variant: string;
  availableVariants: string[];
  confidence: number;
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
}
