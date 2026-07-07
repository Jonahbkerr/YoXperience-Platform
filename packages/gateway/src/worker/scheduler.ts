/**
 * YoXperience Scheduler
 * 
 * Runs periodically to process accumulated telemetry and generate
 * LLM-powered recommendations.
 * 
 * startWorker(): called by index.ts — polls every 30 seconds
 * main(): standalone entry point for cron jobs
 * 
 * Options:
 *   ANALYSIS_INTERVAL_MIN=30   Process telemetry from last N minutes
 *   LM_STUDIO_URL              URL to LM Studio instance
 *   LM_MODEL                   Model name to use
 */

import { db } from "../db/client.js";
import { describeError } from "../lib/errors.js";
import { analyzeWithLLM, summarizeTelemetry, analyzeAndStoreRecommendations, type TelemetrySummary, type LLMRecommendation } from "../services/llm-analyzer.js";
import { telemetryEvents, endUserPreferences, slotDefinitions } from "../db/schema.js";
import { eq, and, gte, isNull } from "drizzle-orm";

const INTERVAL_MIN = parseInt(process.env.ANALYSIS_INTERVAL_MIN || "30", 10);
const LLM_ENABLED = process.env.LLM_ENABLED !== "false";
const LM_STUDIO_URL = process.env.LM_STUDIO_URL || "http://localhost:1234/v1";
const LM_MODEL = process.env.LM_MODEL || "gemma-4-26b-a4b-it-uncensored-abliterix-mlx-int5-affine";

const EVENT_WEIGHTS: Record<string, number> = {
  impression: 0.0, hover: 0.1, scroll: 0.15, click: 0.5, dismiss: -0.3,
};
const ALPHA = 0.3;

async function main() {
  console.log(`\n═══ YoXperience Scheduler ═══`);
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`Interval: ${INTERVAL_MIN} minutes`);
  console.log(`LLM: ${LLM_ENABLED ? "enabled" : "disabled"}`);
  if (LLM_ENABLED) console.log(`Model: ${LM_MODEL}`);

  const since = new Date(Date.now() - INTERVAL_MIN * 60 * 1000);

  // 1. Fetch unprocessed telemetry from the interval
  const unprocessed = await db
    .select()
    .from(telemetryEvents)
    .where(
      and(
        isNull(telemetryEvents.processedAt),
        gte(telemetryEvents.createdAt, since)
      )
    )
    .limit(1000);

  console.log(`\n📊 Unprocessed events: ${unprocessed.length}`);

  if (unprocessed.length === 0) {
    console.log("Nothing to process.");
    return; // Don't exit — just return when called from worker
  }

  // 2. Group by (projectId, endUserId, slotKey)
  const groups = new Map<string, typeof unprocessed>();
  for (const evt of unprocessed) {
    const key = `${evt.projectId}::${evt.endUserId}::${evt.slotKey}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(evt);
  }

  // 3. Load slot definitions
  const projectIds = [...new Set(unprocessed.map((e) => e.projectId))];
  const allSlots = [];
  for (const pid of projectIds) {
    const slots = await db.select().from(slotDefinitions).where(eq(slotDefinitions.projectId, pid));
    allSlots.push(...slots);
  }
  const slotMap = new Map(allSlots.map((s) => [`${s.projectId}::${s.slotKey}`, s]));

  let updatedPrefs = 0;

  // 4. EMA processing per group
  for (const [key, events] of groups) {
    const [projectId, endUserId, slotKey] = key.split("::");
    const slotDef = slotMap.get(`${projectId}::${slotKey}`);
    if (!slotDef) continue;

    const allVariants: string[] = JSON.parse(slotDef.variants);
    const deltas: Record<string, number> = {};
    for (const evt of events) {
      deltas[evt.variant] = (deltas[evt.variant] ?? 0) + (EVENT_WEIGHTS[evt.eventType] ?? 0);
    }

    const [existing] = await db
      .select()
      .from(endUserPreferences)
      .where(and(eq(endUserPreferences.projectId, projectId), eq(endUserPreferences.endUserId, endUserId), eq(endUserPreferences.slotKey, slotKey)))
      .limit(1);

    let currentWeights: Record<string, number> = {};
    if (existing) {
      currentWeights = JSON.parse(existing.variantWeights);
    } else {
      allVariants.forEach((v) => (currentWeights[v] = 1.0 / allVariants.length));
    }

    for (const variant of allVariants) {
      const delta = deltas[variant] ?? 0;
      currentWeights[variant] = Math.max(0, (currentWeights[variant] ?? 0) + ALPHA * delta);
    }

    const total = Object.values(currentWeights).reduce((a, b) => a + b, 0);
    if (total > 0) {
      for (const v of allVariants) currentWeights[v] = (currentWeights[v] ?? 0) / total;
    }

    const resolvedVariant = allVariants.reduce((best, v) => (currentWeights[v] ?? 0) > (currentWeights[best] ?? 0) ? v : best);

    if (existing) {
      await db.update(endUserPreferences).set({ variantWeights: JSON.stringify(currentWeights), resolvedVariant }).where(eq(endUserPreferences.id, existing.id));
    } else {
      await db.insert(endUserPreferences).values({ projectId, endUserId, slotKey, variantWeights: JSON.stringify(currentWeights), resolvedVariant });
    }
    updatedPrefs++;
  }

  console.log(`📈 EMA updated ${updatedPrefs} preference(s)`);

  // 5. LLM deep analysis (if enabled)
  if (LLM_ENABLED) {
    const uniqueUsers = [...new Set(unprocessed.map((e) => `${e.projectId}::${e.endUserId}`))];
    console.log(`🧠 Running LLM analysis for ${uniqueUsers.length} user(s)...`);

    // Centralized: resolves each project's own LLM connection (BYO key) and
    // optimization goals, falls back to the platform default, and stores the
    // recommendations. Keeps the worker and the on-demand /analyze route
    // behaving identically.
    const fallbackConfig = { url: LM_STUDIO_URL, model: LM_MODEL, temperature: 0.2 };
    for (const userKey of uniqueUsers) {
      const [projectId, endUserId] = userKey.split("::");
      try {
        const recommendations = await analyzeAndStoreRecommendations(projectId, endUserId, fallbackConfig);
        console.log(`  ✅ ${endUserId}: ${recommendations.length} LLM recommendation(s)`);
      } catch (err) {
        console.warn(`  ⚠️ ${endUserId}: LLM unavailable — ${describeError(err)}`);
      }
    }
  }

  // 6. Mark events as processed
  const now = new Date();
  let marked = 0;
  for (const evt of unprocessed) {
    await db.update(telemetryEvents).set({ processedAt: now }).where(eq(telemetryEvents.id, evt.id));
    marked++;
  }
  console.log(`✓ Marked ${marked} events as processed\n`);
}

// startWorker is called by index.ts — polls every 30 seconds
export function startWorker() {
  console.log("[scheduler] Worker started — polling every 30s");
  const poll = () => {
    runOnce().catch((err) => console.warn("[scheduler] Poll failed:", describeError(err)));
  };
  poll(); // Run immediately
  setInterval(poll, 30000);
}

// Standalone entry point for cron jobs
async function runOnce() {
  await main();
}

// Only auto-run if called directly (not imported)
const isDirectRun = process.argv[1]?.includes("scheduler");
if (isDirectRun) {
  main()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Scheduler failed:", err);
      process.exit(1);
    });
}
