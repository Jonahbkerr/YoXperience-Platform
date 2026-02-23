import { Router, type Request, type Response, type NextFunction } from "express";
import { eq, and, sql, gte } from "drizzle-orm";
import { requireApiKey } from "../middleware/api-key-auth.js";
import { resolveLayout } from "../services/layout-resolver.js";
import { writeTelemetryEvents } from "../services/telemetry-writer.js";
import { db } from "../db/client.js";
import { slotDefinitions, telemetryEvents, endUserPreferences } from "../db/schema.js";

const router = Router();

// All SDK routes require API key auth
router.use(requireApiKey);

// GET /v1/layout/:endUserId — Resolve personalized layout
router.get(
  "/layout/:endUserId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { endUserId } = req.params;
      const { projectId } = req.apiKey!;

      const layout = await resolveLayout(projectId, endUserId);
      res.json(layout);
    } catch (err) {
      next(err);
    }
  }
);

// POST /v1/telemetry — Ingest telemetry events
router.post(
  "/telemetry",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId } = req.apiKey!;
      const { userId, events } = req.body;

      if (!userId || typeof userId !== "string") {
        res.status(400).json({ error: "userId is required" });
        return;
      }

      if (!Array.isArray(events) || events.length === 0) {
        res.status(400).json({ error: "events array is required" });
        return;
      }

      for (const evt of events) {
        if (!evt.slotKey || !evt.variant || !evt.eventType) {
          res.status(400).json({
            error: "Each event needs slotKey, variant, and eventType",
          });
          return;
        }
      }

      const count = await writeTelemetryEvents(projectId, userId, events);
      res.status(202).json({ accepted: count });
    } catch (err) {
      next(err);
    }
  }
);

// POST /v1/register-slots — Auto-register slots from SDK
// The SDK calls this on mount with slot definitions found in the React tree.
// Creates missing slots; merges new variants into existing ones.
router.post(
  "/register-slots",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId } = req.apiKey!;
      const { slots } = req.body;

      if (!Array.isArray(slots) || slots.length === 0) {
        res.status(400).json({ error: "slots array is required" });
        return;
      }

      const results: Array<{ slotKey: string; action: "created" | "updated" | "unchanged" }> = [];

      for (const slot of slots) {
        if (!slot.slotKey || !Array.isArray(slot.variants) || slot.variants.length === 0) {
          continue;
        }

        const existing = await db
          .select()
          .from(slotDefinitions)
          .where(
            and(
              eq(slotDefinitions.projectId, projectId),
              eq(slotDefinitions.slotKey, slot.slotKey)
            )
          )
          .limit(1);

        if (existing.length === 0) {
          await db.insert(slotDefinitions).values({
            projectId,
            slotKey: slot.slotKey,
            description: slot.description || "Auto-registered from SDK",
            variants: JSON.stringify(slot.variants),
            defaultVariant: slot.defaultVariant || slot.variants[0],
          });
          results.push({ slotKey: slot.slotKey, action: "created" });
        } else {
          const existingVariants: string[] = JSON.parse(existing[0].variants);
          const merged = [...new Set([...existingVariants, ...slot.variants])];

          if (merged.length > existingVariants.length) {
            await db
              .update(slotDefinitions)
              .set({ variants: JSON.stringify(merged) })
              .where(eq(slotDefinitions.id, existing[0].id));
            results.push({ slotKey: slot.slotKey, action: "updated" });
          } else {
            results.push({ slotKey: slot.slotKey, action: "unchanged" });
          }
        }
      }

      res.json({ registered: results });
    } catch (err) {
      next(err);
    }
  }
);

// GET /v1/analytics — SDK-facing analytics for the project
router.get(
  "/analytics",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId } = req.apiKey!;
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

      // Unique users (24h)
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

      // Slot definitions
      const slots = await db
        .select()
        .from(slotDefinitions)
        .where(eq(slotDefinitions.projectId, projectId));

      // Per-slot, per-variant, per-event-type breakdown (24h)
      const eventBreakdown = await db
        .select({
          slotKey: telemetryEvents.slotKey,
          variant: telemetryEvents.variant,
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
        .groupBy(
          telemetryEvents.slotKey,
          telemetryEvents.variant,
          telemetryEvents.eventType
        );

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

      // Slot winners from end_user_preferences
      const slotWinners: Record<string, { variant: string; confidence: number }> = {};
      for (const slot of slots) {
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
          const variantCounts: Record<string, number> = {};
          let totalConfidence = 0;
          for (const pref of prefs) {
            variantCounts[pref.resolvedVariant] =
              (variantCounts[pref.resolvedVariant] ?? 0) + 1;
            const weights: Record<string, number> = JSON.parse(pref.variantWeights);
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

      // Build per-slot analytics with variant breakdown
      const EVENT_WEIGHTS: Record<string, number> = {
        click: 0.5,
        hover: 0.1,
        scroll: 0.15,
        dismiss: -0.3,
        impression: 0.0,
      };

      const slotsAnalytics = slots.map((slot) => {
        const variants: string[] = JSON.parse(slot.variants);
        const slotEvents = eventBreakdown.filter((e) => e.slotKey === slot.slotKey);

        // Build per-variant breakdown
        const variantBreakdown = variants.map((variant) => {
          const variantEvents = slotEvents.filter((e) => e.variant === variant);
          const impressions = variantEvents.find((e) => e.eventType === "impression")?.count ?? 0;
          const clicks = variantEvents.find((e) => e.eventType === "click")?.count ?? 0;
          const hovers = variantEvents.find((e) => e.eventType === "hover")?.count ?? 0;
          const dismissals = variantEvents.find((e) => e.eventType === "dismiss")?.count ?? 0;
          const scrolls = variantEvents.find((e) => e.eventType === "scroll")?.count ?? 0;

          const weightedScore =
            clicks * EVENT_WEIGHTS.click +
            hovers * EVENT_WEIGHTS.hover +
            scrolls * EVENT_WEIGHTS.scroll +
            dismissals * EVENT_WEIGHTS.dismiss;
          const engagement = impressions > 0 ? Math.round((weightedScore / impressions) * 100) / 100 : 0;

          return { variant, impressions, clicks, hovers, dismissals, engagement };
        });

        const totalSlotEvents = slotEvents.reduce((sum, e) => sum + e.count, 0);

        return {
          slotKey: slot.slotKey,
          variants,
          defaultVariant: slot.defaultVariant,
          totalEvents: totalSlotEvents,
          winner: slotWinners[slot.slotKey] ?? null,
          variantBreakdown,
        };
      });

      res.json({
        totalEvents24h: totalEvents.count,
        uniqueUsers24h: uniqueUsers.count,
        slots: slotsAnalytics,
        eventsByType,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
