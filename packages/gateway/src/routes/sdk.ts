import { Router, type Request, type Response, type NextFunction } from "express";
import { requireApiKey } from "../middleware/api-key-auth.js";
import { resolveLayout } from "../services/layout-resolver.js";
import { writeTelemetryEvents } from "../services/telemetry-writer.js";

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

export default router;
