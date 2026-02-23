import { eq, and } from "drizzle-orm";
import { db } from "../db/client.js";
import { slotDefinitions, endUserPreferences } from "../db/schema.js";

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

export async function resolveLayout(
  projectId: string,
  endUserId: string
): Promise<LayoutConfig> {
  const slots = await db
    .select()
    .from(slotDefinitions)
    .where(eq(slotDefinitions.projectId, projectId));

  const prefs = await db
    .select()
    .from(endUserPreferences)
    .where(
      and(
        eq(endUserPreferences.projectId, projectId),
        eq(endUserPreferences.endUserId, endUserId)
      )
    );

  const prefMap = new Map(prefs.map((p) => [p.slotKey, p]));

  const slotConfigs: Record<string, SlotConfig> = {};

  for (const slot of slots) {
    const variants: string[] = JSON.parse(slot.variants);
    const pref = prefMap.get(slot.slotKey);

    let variant = slot.defaultVariant;
    let confidence = 0;

    if (pref) {
      variant = pref.resolvedVariant;
      const weights: Record<string, number> = JSON.parse(pref.variantWeights);
      confidence = weights[variant] ?? 0;
    }

    slotConfigs[slot.slotKey] = {
      slotKey: slot.slotKey,
      variant,
      availableVariants: variants,
      confidence,
    };
  }

  return {
    userId: endUserId,
    slots: slotConfigs,
    resolvedAt: new Date().toISOString(),
  };
}
