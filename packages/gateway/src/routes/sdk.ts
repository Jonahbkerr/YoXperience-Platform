import { Router, type Request, type Response, type NextFunction } from "express";
import { eq, and } from "drizzle-orm";
import { requireApiKey } from "../middleware/api-key-auth.js";
import { resolveLayout } from "../services/layout-resolver.js";
import { writeTelemetryEvents } from "../services/telemetry-writer.js";
import { db } from "../db/client.js";
import { slotDefinitions } from "../db/schema.js";

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

export default router;
