import { Router, type Request, type Response, type NextFunction } from "express";
import { eq, and, sql, gte } from "drizzle-orm";
import { db } from "../db/client.js";
import { telemetryEvents, slotDefinitions, endUserPreferences, projects } from "../db/schema.js";
import { requireAuth } from "../middleware/auth.js";
import { requireOrgAccess } from "../middleware/org-access.js";
import { computeSlotRecommendation, type VariantStat } from "../lib/recommendations.js";

const router = Router({ mergeParams: true });

async function verifyProjectAccess(projectId: string, orgId: string) {
  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.orgId, orgId)))
    .limit(1);
  return project;
}

// GET / — Analytics summary for a project
router.get(
  "/",
  requireAuth,
  requireOrgAccess("member"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId } = req.params;
      const orgId = req.auth!.orgId;

      const project = await verifyProjectAccess(projectId, orgId);
      if (!project) {
        res.status(404).json({ error: "Project not found" });
        return;
      }

      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Total events (24h)
      const [totalEvents] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(telemetryEvents)
        .where(
          and(
            eq(telemetryEvents.projectId, projectId),
            gte(telemetryEvents.createdAt, twentyFourHoursAgo)
          )
        );

      // Unique end users (24h)
      const [uniqueUsers] = await db
        .select({
          count: sql<number>`count(distinct ${telemetryEvents.endUserId})::int`,
        })
        .from(telemetryEvents)
        .where(
          and(
            eq(telemetryEvents.projectId, projectId),
            gte(telemetryEvents.createdAt, twentyFourHoursAgo)
          )
        );

      // Events by slot (24h)
      const eventsBySlot = await db
        .select({
          slotKey: telemetryEvents.slotKey,
          count: sql<number>`count(*)::int`,
        })
        .from(telemetryEvents)
        .where(
          and(
            eq(telemetryEvents.projectId, projectId),
            gte(telemetryEvents.createdAt, twentyFourHoursAgo)
          )
        )
        .groupBy(telemetryEvents.slotKey)
        .orderBy(sql`count(*) desc`);

      // Events by type (24h)
      const eventsByType = await db
        .select({
          eventType: telemetryEvents.eventType,
          count: sql<number>`count(*)::int`,
        })
        .from(telemetryEvents)
        .where(
          and(
            eq(telemetryEvents.projectId, projectId),
            gte(telemetryEvents.createdAt, twentyFourHoursAgo)
          )
        )
        .groupBy(telemetryEvents.eventType)
        .orderBy(sql`count(*) desc`);

      // Slot definitions count
      const slots = await db
        .select()
        .from(slotDefinitions)
        .where(eq(slotDefinitions.projectId, projectId));

      // Winning variants per slot
      const slotWinners: Record<
        string,
        { variant: string; confidence: number }
      > = {};
      for (const slot of slots) {
        // Get the most common resolved variant for this slot
        const prefs = await db
          .select()
          .from(endUserPreferences)
          .where(
            and(
              eq(endUserPreferences.projectId, projectId),
              eq(endUserPreferences.slotKey, slot.slotKey)
            )
          );

        if (prefs.length > 0) {
          // Aggregate variant counts
          const variantCounts: Record<string, number> = {};
          let totalConfidence = 0;
          for (const pref of prefs) {
            variantCounts[pref.resolvedVariant] =
              (variantCounts[pref.resolvedVariant] ?? 0) + 1;
            const weights: Record<string, number> = JSON.parse(
              pref.variantWeights
            );
            totalConfidence += weights[pref.resolvedVariant] ?? 0;
          }
          const winner = Object.entries(variantCounts).reduce((a, b) =>
            b[1] > a[1] ? b : a
          );
          slotWinners[slot.slotKey] = {
            variant: winner[0],
            confidence: Math.round((totalConfidence / prefs.length) * 100),
          };
        }
      }

      res.json({
        totalEvents24h: totalEvents.count,
        uniqueUsers24h: uniqueUsers.count,
        activeSlots: slots.length,
        eventsBySlot,
        eventsByType,
        slotWinners,
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /insights — AI recommendation reports for a project
// Per-slot aggregates of the LLM analysis stored in endUserPreferences,
// plus the most recent individual recommendations with rationale.
router.get(
  "/insights",
  requireAuth,
  requireOrgAccess("member"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId } = req.params;
      const orgId = req.auth!.orgId;

      const project = await verifyProjectAccess(projectId, orgId);
      if (!project) {
        res.status(404).json({ error: "Project not found" });
        return;
      }

      // Per-slot rollup: users analyzed, variant distribution, freshness
      const slotRollups = await db
        .select({
          slotKey: endUserPreferences.slotKey,
          resolvedVariant: endUserPreferences.resolvedVariant,
          users: sql<number>`count(*)::int`,
          lastUpdated: sql<string>`max(${endUserPreferences.updatedAt})`,
          withRationale: sql<number>`count(${endUserPreferences.rationale})::int`,
        })
        .from(endUserPreferences)
        .where(eq(endUserPreferences.projectId, projectId))
        .groupBy(endUserPreferences.slotKey, endUserPreferences.resolvedVariant)
        .orderBy(endUserPreferences.slotKey, sql`count(*) desc`);

      // Latest individual LLM recommendations (the human-readable reports)
      const latest = await db
        .select({
          endUserId: endUserPreferences.endUserId,
          slotKey: endUserPreferences.slotKey,
          resolvedVariant: endUserPreferences.resolvedVariant,
          variantWeights: endUserPreferences.variantWeights,
          rationale: endUserPreferences.rationale,
          updatedAt: endUserPreferences.updatedAt,
        })
        .from(endUserPreferences)
        .where(
          and(
            eq(endUserPreferences.projectId, projectId),
            sql`${endUserPreferences.rationale} is not null`
          )
        )
        .orderBy(sql`${endUserPreferences.updatedAt} desc`)
        .limit(50);

      const [totals] = await db
        .select({
          analyzedUsers: sql<number>`count(distinct ${endUserPreferences.endUserId})::int`,
          totalRecommendations: sql<number>`count(*)::int`,
          llmRecommendations: sql<number>`count(${endUserPreferences.rationale})::int`,
        })
        .from(endUserPreferences)
        .where(eq(endUserPreferences.projectId, projectId));

      res.json({
        totals,
        slots: slotRollups,
        recommendations: latest.map((r) => ({
          ...r,
          variantWeights: safeParseWeights(r.variantWeights),
        })),
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /recommendations — site-level, human-approvable recommendations.
// For each slot, aggregate ALL visitors' telemetry into a per-variant
// engagement rate, pick a winner if the data is statistically ready, and
// compare it to the current default so the owner can decide whether to
// promote it. This is the human-in-the-loop layer above the per-user LLM.
router.get(
  "/recommendations",
  requireAuth,
  requireOrgAccess("member"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId } = req.params;
      const orgId = req.auth!.orgId;

      const project = await verifyProjectAccess(projectId, orgId);
      if (!project) {
        res.status(404).json({ error: "Project not found" });
        return;
      }

      const slots = await db
        .select()
        .from(slotDefinitions)
        .where(eq(slotDefinitions.projectId, projectId))
        .orderBy(slotDefinitions.createdAt);

      // Per slot+variant engagement rollup across ALL telemetry.
      // Positive engagement = anything that isn't a passive impression or an
      // explicit dismiss (covers click, hover, scroll, install_click, etc.).
      const perf = await db
        .select({
          slotKey: telemetryEvents.slotKey,
          variant: telemetryEvents.variant,
          impressions: sql<number>`count(*) filter (where ${telemetryEvents.eventType} = 'impression')::int`,
          engagements: sql<number>`count(*) filter (where ${telemetryEvents.eventType} not in ('impression','dismiss'))::int`,
          dismisses: sql<number>`count(*) filter (where ${telemetryEvents.eventType} = 'dismiss')::int`,
        })
        .from(telemetryEvents)
        .where(eq(telemetryEvents.projectId, projectId))
        .groupBy(telemetryEvents.slotKey, telemetryEvents.variant);

      const statsBySlot = new Map<string, VariantStat[]>();
      for (const p of perf) {
        const list = statsBySlot.get(p.slotKey) ?? [];
        list.push({
          variant: p.variant,
          impressions: p.impressions,
          engagements: p.engagements,
          dismisses: p.dismisses,
        });
        statsBySlot.set(p.slotKey, list);
      }

      const recommendations = slots.map((s) => {
        let variants: string[] = [];
        try {
          const parsed = JSON.parse(s.variants);
          variants = Array.isArray(parsed) ? parsed : [];
        } catch {
          variants = [];
        }
        return computeSlotRecommendation(
          {
            slotKey: s.slotKey,
            variants,
            defaultVariant: s.defaultVariant,
            mode: s.mode as "auto" | "forced" | "split",
            forcedVariant: s.forcedVariant ?? null,
          },
          statsBySlot.get(s.slotKey) ?? [],
        );
      });

      // Attach the slot id (dashboard needs it to PATCH) and one supporting
      // LLM rationale for the winning variant, when present.
      const slotIdByKey = new Map(slots.map((s) => [s.slotKey, s.id]));
      const withContext = await Promise.all(
        recommendations.map(async (rec) => {
          let aiRationale: string | null = null;
          if (rec.winner) {
            const [row] = await db
              .select({ rationale: endUserPreferences.rationale })
              .from(endUserPreferences)
              .where(
                and(
                  eq(endUserPreferences.projectId, projectId),
                  eq(endUserPreferences.slotKey, rec.slotKey),
                  eq(endUserPreferences.resolvedVariant, rec.winner),
                  sql`${endUserPreferences.rationale} is not null`,
                ),
              )
              .orderBy(sql`${endUserPreferences.updatedAt} desc`)
              .limit(1);
            aiRationale = row?.rationale ?? null;
          }
          return { ...rec, slotId: slotIdByKey.get(rec.slotKey) ?? null, aiRationale };
        }),
      );

      const summary = {
        actionable: withContext.filter((r) => r.status === "recommend").length,
        keep: withContext.filter((r) => r.status === "keep").length,
        gathering: withContext.filter((r) => r.status === "gathering").length,
      };

      res.json({ summary, recommendations: withContext });
    } catch (err) {
      next(err);
    }
  }
);

function safeParseWeights(raw: string): Record<string, number> | null {
  try {
    const parsed = JSON.parse(raw);
    // Some rows are double-encoded ("\"{...}\"") — unwrap once more
    return typeof parsed === "string" ? JSON.parse(parsed) : parsed;
  } catch {
    return null;
  }
}

export default router;
