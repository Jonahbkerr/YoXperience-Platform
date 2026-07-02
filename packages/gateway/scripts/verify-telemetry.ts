/**
 * Post-run telemetry verification — self-extracting Railway credentials, drizzle queries.
 * Run: cd packages/gateway && node --import tsx scripts/verify-telemetry.ts
 */
import { spawnSync } from "child_process";

const PLATFORM_DIR = "/Users/jonahk/YoXperience-Platform";
const GATEWAY_DIR = "/Users/jonahk/YoXperience-Platform/packages/gateway";

async function main() {
  // ── Extract Railway credentials (same pattern as run-telemetry.ts) ──
  const varsResult = spawnSync("railway", ["variables"], {
    cwd: PLATFORM_DIR,
    encoding: "utf8",
    timeout: 15000,
  });

  if (varsResult.status !== 0 || !varsResult.stdout) {
    console.error("Failed to get Railway variables:", varsResult.stderr);
    process.exit(1);
  }

  const lines = varsResult.stdout.split("\n");
  let collectingUrl = false;
  let urlParts: string[] = [];

  for (const line of lines) {
    if (line.includes("DATABASE_PUBLIC_URL")) {
      collectingUrl = true;
      const match = line.match(/DATABASE_PUBLIC_URL\s*│\s*(.*)/);
      if (match && match[1].trim()) {
        urlParts.push(match[1].trim().replace(/║$/, "").trim());
      }
    } else if (collectingUrl) {
      if (line.includes("│")) {
        const match = line.match(/│\s*(.*)/);
        if (match) {
          const part = match[1].trim().replace(/║$/, "").trim();
          if (part) urlParts.push(part);
        }
      } else if (line.trim().startsWith("║") || line.trim() === "") {
        collectingUrl = false;
      }
    }
  }

  const dbPublicUrl = urlParts.join("");
  if (!dbPublicUrl) {
    console.error("Failed to extract DATABASE_PUBLIC_URL");
    process.exit(1);
  }

  // Set env BEFORE importing db (it reads DATABASE_URL at init time)
  process.env.DATABASE_URL = dbPublicUrl;
  if (process.env.PGPASSWORD) delete process.env.PGPASSWORD;

  // ── Dynamic imports (after env is set) ──
  const { db, pool } = await import("../src/db/client.js");
  const { telemetryEvents, endUserPreferences } = await import("../src/db/schema.js");
  const { sql, count, desc, isNull } = await import("drizzle-orm");

  // Aggregate stats
  const [totalEvt] = await db.select({ count: count() }).from(telemetryEvents);
  const [unproc] = await db
    .select({ count: count() })
    .from(telemetryEvents)
    .where(isNull(telemetryEvents.processedAt));
  const [totalPrefs] = await db.select({ count: count() }).from(endUserPreferences);
  const [llmPrefs] = await db
    .select({ count: count() })
    .from(endUserPreferences)
    .where(sql`${endUserPreferences.rationale} IS NOT NULL`);
  const [recent24h] = await db
    .select({ count: count() })
    .from(telemetryEvents)
    .where(sql`${telemetryEvents.createdAt} >= NOW() - INTERVAL '24 hours'`);

  console.log("=== TELEMETRY SUMMARY ===");
  console.log(
    `Events: ${totalEvt?.count} total | ${unproc?.count} unprocessed | ${recent24h?.count} in last 24h`
  );
  console.log(
    `Preferences: ${totalPrefs?.count} total | ${llmPrefs?.count} with LLM rationale`
  );

  // Recent events
  const events = await db
    .select({
      eventType: telemetryEvents.eventType,
      slotKey: telemetryEvents.slotKey,
      variant: telemetryEvents.variant,
      userId: telemetryEvents.endUserId,
      createdAt: telemetryEvents.createdAt,
    })
    .from(telemetryEvents)
    .orderBy(desc(telemetryEvents.createdAt))
    .limit(15);

  console.log("\n=== LATEST TELEMETRY EVENTS ===");
  for (const e of events) {
    console.log(
      `  ${e.createdAt?.toISOString().slice(0, 19)} | ${e.eventType.padEnd(12)} | ${e.slotKey.padEnd(25)} | ${e.variant.padEnd(15)} | ${e.userId?.slice(0, 12)}...`
    );
  }

  // Preferences with LLM rationales
  const prefs = await db
    .select({
      userId: endUserPreferences.endUserId,
      slotKey: endUserPreferences.slotKey,
      resolvedVariant: endUserPreferences.resolvedVariant,
      variantWeights: endUserPreferences.variantWeights,
      rationale: endUserPreferences.rationale,
      updatedAt: endUserPreferences.updatedAt,
    })
    .from(endUserPreferences)
    .where(sql`${endUserPreferences.rationale} IS NOT NULL`)
    .orderBy(desc(endUserPreferences.updatedAt))
    .limit(20);

  console.log("\n=== LLM RECOMMENDATIONS (prefs with rationale) ===");
  for (const p of prefs) {
    console.log(`\n  USER: ${p.userId?.slice(0, 14)}...`);
    console.log(`  SLOT: ${p.slotKey}`);
    console.log(`  RESOLVED: ${p.resolvedVariant}`);
    console.log(`  UPDATED: ${p.updatedAt?.toISOString().slice(0, 19)}`);
    if (p.rationale) {
      const r =
        typeof p.rationale === "string"
          ? p.rationale.slice(0, 300)
          : JSON.stringify(p.rationale).slice(0, 300);
      console.log(`  RATIONALE: ${r}...`);
    }
    if (p.variantWeights) {
      console.log(`  WEIGHTS: ${JSON.stringify(p.variantWeights)}`);
    }
  }

  // All preferences (including EMA-only)
  const allPrefs = await db
    .select({
      userId: endUserPreferences.endUserId,
      slotKey: endUserPreferences.slotKey,
      resolvedVariant: endUserPreferences.resolvedVariant,
      hasRationale: sql`CASE WHEN ${endUserPreferences.rationale} IS NOT NULL THEN true ELSE false END`,
      updatedAt: endUserPreferences.updatedAt,
    })
    .from(endUserPreferences)
    .orderBy(desc(endUserPreferences.updatedAt))
    .limit(30);

  console.log("\n=== ALL PREFERENCES (latest 30) ===");
  for (const p of allPrefs) {
    console.log(
      `  ${p.hasRationale ? "🧠" : "📊"} ${p.updatedAt?.toISOString().slice(0, 19)} | ${p.slotKey.padEnd(25)} | ${p.resolvedVariant.padEnd(15)} | ${p.userId?.slice(0, 12)}...`
    );
  }

  await pool.end();
  console.log("\n✅ Verification complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
