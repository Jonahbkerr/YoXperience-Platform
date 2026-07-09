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
import { telemetryEvents, endUserPreferences, slotDefinitions, projects } from "../db/schema.js";
import { eq, and, gte, isNull, isNotNull, inArray, sql } from "drizzle-orm";

const INTERVAL_MIN = parseInt(process.env.ANALYSIS_INTERVAL_MIN || "30", 10);
const LLM_ENABLED = process.env.LLM_ENABLED !== "false";
const LM_STUDIO_URL = process.env.LM_STUDIO_URL || "http://localhost:1234/v1";
const LM_MODEL = process.env.LM_MODEL || "gemma-4-26b-a4b-it-uncensored-abliterix-mlx-int5-affine";

const EVENT_WEIGHTS: Record<string, number> = {
  impression: 0.0, hover: 0.1, scroll: 0.15, click: 0.5, dismiss: -0.3,
};
const ALPHA = 0.3;

// How far back a manual "Run analysis now" looks for active users, and how
// many users one run will analyze at most (each user = one LLM call).
const MANUAL_WINDOW_HOURS = 24;
const MANUAL_MAX_USERS = 50;
// Streaming (auto-mode) pass: max users per 30s tick, so slow LLM calls can't
// wedge the worker in one enormous pass.
const STREAM_MAX_USERS_PER_TICK = 10;

function platformFallbackConfig() {
  return { url: LM_STUDIO_URL, model: LM_MODEL, temperature: 0.2, apiKey: process.env.LM_STUDIO_API_KEY };
}

// Owner-initiated analysis: the dashboard's "Run analysis now" sets
// projects.analysis_requested_at; we pick it up here (runs every poll, even
// when there is no new telemetry), analyze every user active in the last
// MANUAL_WINDOW_HOURS, then record the outcome and clear the request.
async function processManualRequests() {
  const pending = await db
    .select()
    .from(projects)
    .where(isNotNull(projects.analysisRequestedAt));

  for (const project of pending) {
    // Claim the request BEFORE running: atomically clear the exact timestamp we
    // picked up and mark the run in flight. If zero rows match, another poll
    // tick / worker replica already claimed it — skip. This is what makes one
    // click equal one run, no matter how long the LLM takes.
    const claimed = await db
      .update(projects)
      .set({ analysisRequestedAt: null, lastAnalysisStatus: "running" })
      .where(and(eq(projects.id, project.id), eq(projects.analysisRequestedAt, project.analysisRequestedAt!)))
      .returning({ id: projects.id });
    if (claimed.length === 0) {
      console.log(`\n🖐️  Manual request for ${project.name} already claimed — skipping`);
      continue;
    }

    console.log(`\n🖐️  Manual analysis requested for project ${project.name} (${project.id})`);
    let status: string;

    if (!LLM_ENABLED) {
      status = "error: LLM analysis is disabled on the platform (LLM_ENABLED=false)";
    } else {
      const since = new Date(Date.now() - MANUAL_WINDOW_HOURS * 60 * 60 * 1000);
      const activeUsers = await db
        .selectDistinct({ endUserId: telemetryEvents.endUserId })
        .from(telemetryEvents)
        .where(and(eq(telemetryEvents.projectId, project.id), gte(telemetryEvents.createdAt, since)))
        .limit(MANUAL_MAX_USERS);

      if (activeUsers.length === 0) {
        status = `ok: no visitor activity in the last ${MANUAL_WINDOW_HOURS}h — nothing to analyze`;
      } else {
        let recCount = 0;
        let failed = 0;
        let attempted = 0;
        let consecutive = 0;
        let stoppedEarly = false;
        let lastError = "";
        for (const { endUserId } of activeUsers) {
          attempted++;
          try {
            const recs = await analyzeAndStoreRecommendations(project.id, endUserId, platformFallbackConfig());
            recCount += recs.length;
            consecutive = 0;
          } catch (err) {
            failed++;
            consecutive++;
            lastError = describeError(err);
            if (consecutive >= 3) {
              // Model is clearly down — each failure can take minutes to
              // surface. Stop and report honestly instead of grinding on.
              stoppedEarly = true;
              break;
            }
          }
        }
        const early = stoppedEarly ? ` (stopped early after ${consecutive} consecutive failures; ${activeUsers.length - attempted} user(s) not attempted)` : "";
        status = failed === 0
          ? `ok: analyzed ${activeUsers.length} user(s), ${recCount} recommendation(s)`
          : failed === attempted
            ? `error: all ${failed} attempted user(s) failed — ${lastError}${early}`.slice(0, 500)
            : `partial: ${attempted - failed}/${activeUsers.length} user(s) analyzed, ${recCount} recommendation(s); last error: ${lastError}${early}`.slice(0, 500);
      }
    }

    // Record the outcome. analysisRequestedAt is deliberately untouched here:
    // the claim above already cleared the request we ran; if the owner clicked
    // again mid-run, that newer request stays queued for the next poll.
    await db
      .update(projects)
      .set({ lastAnalysisAt: new Date(), lastAnalysisStatus: status })
      .where(eq(projects.id, project.id));
    console.log(`   → ${status}`);
  }
}

async function main() {
  console.log(`\n═══ YoXperience Scheduler ═══`);
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`Interval: ${INTERVAL_MIN} minutes`);
  console.log(`LLM: ${LLM_ENABLED ? "enabled" : "disabled"}`);
  if (LLM_ENABLED) console.log(`Model: ${LM_MODEL}`);

  // Owner-initiated runs first — these must fire even when no new telemetry
  // arrived (the whole point of manual mode is analyzing on demand).
  try {
    await processManualRequests();
  } catch (err) {
    console.warn(`[scheduler] manual-request pass failed: ${describeError(err)}`);
  }

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

  // 5. LLM deep analysis (if enabled) — only for projects in "auto" mode.
  // Manual-mode projects keep streaming telemetry and EMA updates, but their
  // LLM analysis runs only when the owner requests it (processManualRequests).
  if (LLM_ENABLED) {
    const projectRows = await db
      .select({ id: projects.id, aiAnalysisMode: projects.aiAnalysisMode })
      .from(projects)
      .where(inArray(projects.id, projectIds));
    const manualProjects = new Set(projectRows.filter((p) => p.aiAnalysisMode === "manual").map((p) => p.id));

    const allUsers = [...new Set(unprocessed.map((e) => `${e.projectId}::${e.endUserId}`))];
    const eligible = allUsers.filter((k) => !manualProjects.has(k.split("::")[0]));
    // Cap the streaming pass so one tick can't wedge the worker for tens of
    // minutes (slow local models take ~minutes per call). Uncapped users are
    // re-analyzed on their next event — the analysis window is 24h, so this is
    // best-effort enrichment, not data loss (EMA above already processed all).
    const uniqueUsers = eligible.slice(0, STREAM_MAX_USERS_PER_TICK);
    const skippedManual = allUsers.length - eligible.length;
    const deferred = eligible.length - uniqueUsers.length;
    console.log(`🧠 Running LLM analysis for ${uniqueUsers.length} user(s)...${skippedManual > 0 ? ` (${skippedManual} skipped — manual-mode project)` : ""}${deferred > 0 ? ` (${deferred} deferred to a later tick)` : ""}`);

    // Centralized: resolves each project's own LLM connection (BYO key) and
    // optimization goals, falls back to the platform default, and stores the
    // recommendations. Keeps the worker and the on-demand /analyze route
    // behaving identically.
    let consecutiveFailures = 0;
    for (const userKey of uniqueUsers) {
      // Owner clicks take priority: check for pending manual requests between
      // users (one cheap SELECT) so a click never starves behind a long pass.
      try {
        await processManualRequests();
      } catch (err) {
        console.warn(`[scheduler] mid-pass manual check failed: ${describeError(err)}`);
      }

      const [projectId, endUserId] = userKey.split("::");
      try {
        const recommendations = await analyzeAndStoreRecommendations(projectId, endUserId, platformFallbackConfig());
        console.log(`  ✅ ${endUserId}: ${recommendations.length} LLM recommendation(s)`);
        consecutiveFailures = 0;
      } catch (err) {
        console.warn(`  ⚠️ ${endUserId}: LLM unavailable — ${describeError(err)}`);
        consecutiveFailures++;
        if (consecutiveFailures >= 3) {
          // Circuit breaker: the model is clearly down (each failure can take
          // minutes to surface). Stop burning this tick; retry next poll.
          console.warn(`  ⛔ ${consecutiveFailures} consecutive LLM failures — ending this pass early`);
          break;
        }
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

// startWorker is called by index.ts — polls every 30 seconds.
// In-flight guard: a tick that fires while the previous run is still executing
// (slow LLM calls can take minutes) is skipped, so runs never overlap within
// this instance. Cross-instance overlap is handled by the atomic claim in
// processManualRequests.
export function startWorker() {
  console.log("[scheduler] Worker started — polling every 30s");
  let running = false;
  const poll = async () => {
    if (running) return;
    running = true;
    try {
      await runOnce();
    } catch (err) {
      console.warn("[scheduler] Poll failed:", describeError(err));
    } finally {
      running = false;
    }
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
