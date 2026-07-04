import { eq, and } from "drizzle-orm";
import { db } from "../db/client.js";
import { slotDefinitions, endUserPreferences, projects } from "../db/schema.js";

export interface SlotConfig {
  slotKey: string;
  variant: string;
  availableVariants: string[];
  confidence: number;
  mode: "auto" | "forced" | "split";
}

export interface LayoutConfig {
  userId: string;
  slots: Record<string, SlotConfig>;
  resolvedAt: string;
  experimentsEnabled: boolean;
}

/**
 * Emergency stop. EXPERIMENTS_ENABLED=false on the gateway pins every
 * slot in every project to its default variant, regardless of per-project
 * or per-slot settings. Read per-request so a redeploy isn't needed to
 * flip it on platforms that support live env updates.
 */
function globalExperimentsEnabled(): boolean {
  return process.env.EXPERIMENTS_ENABLED !== "false";
}

/**
 * Deterministic weighted selection based on hash of userId + slotKey.
 * Same user always gets the same variant for a given slot.
 */
function deterministicWeightedSelect(
  userId: string,
  slotKey: string,
  trafficSplit: Record<string, number>
): string {
  const seed = userId + ":" + slotKey;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  const bucket = ((hash % 100) + 100) % 100;

  let cumulative = 0;
  const entries = Object.entries(trafficSplit);
  for (const [variant, pct] of entries) {
    cumulative += pct;
    if (bucket < cumulative) {
      return variant;
    }
  }
  return entries[entries.length - 1][0];
}

export async function resolveLayout(
  projectId: string,
  endUserId: string
): Promise<LayoutConfig> {
  const [project] = await db
    .select({ experimentsEnabled: projects.experimentsEnabled })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  const experimentsEnabled =
    globalExperimentsEnabled() && (project?.experimentsEnabled ?? true);

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
    const mode = slot.mode;

    let variant: string;
    let confidence = 0;

    if (!experimentsEnabled) {
      // Kill switch active — everyone gets the default variant
      variant = slot.defaultVariant;
      confidence = 1;
    } else if (mode === "forced" && slot.forcedVariant) {
      variant = slot.forcedVariant;
      confidence = 1;
    } else if (mode === "split" && slot.trafficSplit) {
      const split: Record<string, number> = JSON.parse(slot.trafficSplit);
      variant = deterministicWeightedSelect(endUserId, slot.slotKey, split);
      confidence = (split[variant] ?? 0) / 100;
    } else {
      // mode === 'auto' — existing EMA behavior
      const pref = prefMap.get(slot.slotKey);
      if (pref) {
        variant = pref.resolvedVariant;
        const weights: Record<string, number> = JSON.parse(
          pref.variantWeights
        );
        confidence = weights[variant] ?? 0;
      } else {
        variant = slot.defaultVariant;
      }
    }

    slotConfigs[slot.slotKey] = {
      slotKey: slot.slotKey,
      variant,
      availableVariants: variants,
      confidence,
      mode,
    };
  }

  return {
    userId: endUserId,
    slots: slotConfigs,
    resolvedAt: new Date().toISOString(),
    experimentsEnabled,
  };
}
