import { Router, type Request, type Response, type NextFunction } from "express";
import { eq, and, sql, gte } from "drizzle-orm";
import { db } from "../db/client.js";
import { telemetryEvents, slotDefinitions, endUserPreferences, projects } from "../db/schema.js";
import { requireAuth } from "../middleware/auth.js";
import { requireOrgAccess } from "../middleware/org-access.js";

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

export default router;
