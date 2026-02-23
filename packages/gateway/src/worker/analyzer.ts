import { eq, isNull, and } from "drizzle-orm";
import { db } from "../db/client.js";
import {
  telemetryEvents,
  endUserPreferences,
  slotDefinitions,
} from "../db/schema.js";

const EVENT_WEIGHTS: Record<string, number> = {
  impression: 0.0,
  hover: 0.1,
  scroll: 0.15,
  click: 0.5,
  dismiss: -0.3,
};

const ALPHA = 0.3;

interface AnalysisResult {
  processedCount: number;
  updatedPreferences: number;
}

export async function runAnalysis(): Promise<AnalysisResult> {
  // 1. Fetch unprocessed events
  const unprocessed = await db
    .select()
    .from(telemetryEvents)
    .where(isNull(telemetryEvents.processedAt))
    .limit(500);

  if (unprocessed.length === 0) {
    return { processedCount: 0, updatedPreferences: 0 };
  }

  // 2. Group by (projectId, endUserId, slotKey)
  const groups = new Map<string, typeof unprocessed>();
  for (const evt of unprocessed) {
    const key = `${evt.projectId}::${evt.endUserId}::${evt.slotKey}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(evt);
  }

  // 3. Load slot definitions for all involved projects
  const projectIds = [...new Set(unprocessed.map((e) => e.projectId))];
  const allSlots = [];
  for (const pid of projectIds) {
    const slots = await db
      .select()
      .from(slotDefinitions)
      .where(eq(slotDefinitions.projectId, pid));
    allSlots.push(...slots);
  }
  const slotMap = new Map(
    allSlots.map((s) => [`${s.projectId}::${s.slotKey}`, s])
  );

  let updatedPreferences = 0;

  // 4. Process each group
  for (const [key, events] of groups) {
    const [projectId, endUserId, slotKey] = key.split("::");
    const slotDef = slotMap.get(`${projectId}::${slotKey}`);
    if (!slotDef) continue;

    const allVariants: string[] = JSON.parse(slotDef.variants);

    // Calculate delta scores from this batch
    const deltas: Record<string, number> = {};
    for (const evt of events) {
      const weight = EVENT_WEIGHTS[evt.eventType] ?? 0;
      deltas[evt.variant] = (deltas[evt.variant] ?? 0) + weight;
    }

    // Load existing preferences
    const [existing] = await db
      .select()
      .from(endUserPreferences)
      .where(
        and(
          eq(endUserPreferences.projectId, projectId),
          eq(endUserPreferences.endUserId, endUserId),
          eq(endUserPreferences.slotKey, slotKey)
        )
      )
      .limit(1);

    let currentWeights: Record<string, number> = {};
    if (existing) {
      currentWeights = JSON.parse(existing.variantWeights);
    } else {
      allVariants.forEach(
        (v) => (currentWeights[v] = 1.0 / allVariants.length)
      );
    }

    // Apply EMA: new = old + alpha * delta
    for (const variant of allVariants) {
      const delta = deltas[variant] ?? 0;
      currentWeights[variant] = Math.max(
        0,
        (currentWeights[variant] ?? 0) + ALPHA * delta
      );
    }

    // Normalize to sum to 1
    const total = Object.values(currentWeights).reduce((a, b) => a + b, 0);
    if (total > 0) {
      for (const v of allVariants) {
        currentWeights[v] = (currentWeights[v] ?? 0) / total;
      }
    }

    // Pick winner
    const resolvedVariant = allVariants.reduce((best, v) =>
      (currentWeights[v] ?? 0) > (currentWeights[best] ?? 0) ? v : best
    );

    // Upsert preference
    if (existing) {
      await db
        .update(endUserPreferences)
        .set({
          variantWeights: JSON.stringify(currentWeights),
          resolvedVariant,
          updatedAt: new Date(),
        })
        .where(eq(endUserPreferences.id, existing.id));
    } else {
      await db.insert(endUserPreferences).values({
        projectId,
        endUserId,
        slotKey,
        variantWeights: JSON.stringify(currentWeights),
        resolvedVariant,
        updatedAt: new Date(),
      });
    }

    updatedPreferences++;
  }

  // 5. Mark events as processed
  const now = new Date();
  const ids = unprocessed.map((e) => e.id);
  for (const id of ids) {
    await db
      .update(telemetryEvents)
      .set({ processedAt: now })
      .where(eq(telemetryEvents.id, id));
  }

  return { processedCount: unprocessed.length, updatedPreferences };
}
