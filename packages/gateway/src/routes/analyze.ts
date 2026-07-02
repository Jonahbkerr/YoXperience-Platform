import { Router, type Request, type Response, type NextFunction } from "express";
import { eq, and } from "drizzle-orm";
import { requireApiKey } from "../middleware/api-key-auth.js";
import { db } from "../db/client.js";
import { slotDefinitions, endUserPreferences } from "../db/schema.js";
import { analyzeWithLLM, summarizeTelemetry, type LLMRecommendation } from "../services/llm-analyzer.js";

const router = Router();
router.use(requireApiKey);

/**
 * POST /v1/analyze/:endUserId?goal=maximize+signups
 *
 * Reads telemetry for the given user, calls the LLM with the business goal,
 * and stores variant recommendations in endUserPreferences.
 * From that point on, layout requests for this user will return the
 * LLM-recommended variants instead of defaults.
 */
router.post(
  "/analyze/:endUserId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { endUserId } = req.params;
      const { projectId } = req.apiKey!;
      const goal = (req.query.goal as string) || (req.body as any)?.goal || null;

      // Get LM config from env
      const url = process.env.LM_STUDIO_URL;
      const model = process.env.LM_MODEL;
      if (!url || !model) {
        return res.status(503).json({ error: "LM_STUDIO_URL or LM_MODEL not configured" });
      }

      const cfId = process.env.CF_ACCESS_CLIENT_ID;
      const cfSecret = process.env.CF_ACCESS_CLIENT_SECRET;
      const config: any = { url, model, temperature: 0.2 };
      if (cfId && cfSecret) {
        config.cfAccess = { clientId: cfId, clientSecret: cfSecret };
      }

      // Gather available slots
      const allSlots = await db
        .select()
        .from(slotDefinitions)
        .where(eq(slotDefinitions.projectId, projectId));

      if (allSlots.length === 0) {
        return res.json({ recommendations: [], goal, slotsAnalyzed: 0 });
      }

      // Summarize telemetry
      const summaries: any[] = [];
      for (const slot of allSlots) {
        const summary = await summarizeTelemetry(projectId, endUserId, slot.slotKey);
        if (summary && summary.totalEvents > 0) {
          summaries.push(summary);
        }
      }

      if (summaries.length === 0) {
        return res.json({
          recommendations: [],
          goal,
          slotsAnalyzed: 0,
          message:
            "Not enough telemetry data yet. Wait for more user interactions.",
        });
      }

      // Call LLM
      const recs = await analyzeWithLLM(summaries, config);

      // Store recommendations in endUserPreferences
      for (const rec of recs) {
        if (!rec.slotKey || !rec.recommendedVariant) continue;

        const variantWeights: Record<string, number> = {};
        variantWeights[rec.recommendedVariant] = rec.confidence / 100;
        for (const alt of rec.alternativeVariants || []) {
          variantWeights[alt.variant] =
            (100 - rec.confidence) /
            100 /
            Math.max(1, (rec.alternativeVariants || []).length);
        }

        const [existing] = await db
          .select()
          .from(endUserPreferences)
          .where(
            and(
              eq(endUserPreferences.projectId, projectId),
              eq(endUserPreferences.endUserId, endUserId),
              eq(endUserPreferences.slotKey, rec.slotKey),
            ),
          )
          .limit(1);

        if (existing) {
          await db
            .update(endUserPreferences)
            .set({
              variantWeights: JSON.stringify(variantWeights),
              resolvedVariant: rec.recommendedVariant,
              rationale: rec.rationale || null,
              updatedAt: new Date(),
            })
            .where(eq(endUserPreferences.id, existing.id));
        } else {
          await db.insert(endUserPreferences).values({
            projectId,
            endUserId,
            slotKey: rec.slotKey,
            variantWeights: JSON.stringify(variantWeights),
            resolvedVariant: rec.recommendedVariant,
            rationale: rec.rationale || null,
          });
        }
      }

      res.json({ recommendations: recs, goal, slotsAnalyzed: summaries.length });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
