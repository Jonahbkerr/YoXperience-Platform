import { Router, type Request, type Response, type NextFunction } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "../db/client.js";
import { slotDefinitions, projects } from "../db/schema.js";
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

// GET / — List slots for a project
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

      const slots = await db
        .select()
        .from(slotDefinitions)
        .where(eq(slotDefinitions.projectId, projectId))
        .orderBy(slotDefinitions.createdAt);

      res.json({ slots });
    } catch (err) {
      next(err);
    }
  }
);

// POST / — Create slot definition
router.post(
  "/",
  requireAuth,
  requireOrgAccess("admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId } = req.params;
      const orgId = req.auth!.orgId;
      const { slotKey, description, variants, defaultVariant } = req.body;

      if (!slotKey || typeof slotKey !== "string") {
        res.status(400).json({ error: "slotKey is required" });
        return;
      }

      if (!Array.isArray(variants) || variants.length === 0) {
        res.status(400).json({ error: "variants must be a non-empty array" });
        return;
      }

      const defVariant = defaultVariant || variants[0];
      if (!variants.includes(defVariant)) {
        res.status(400).json({ error: "defaultVariant must be in variants" });
        return;
      }

      const project = await verifyProjectAccess(projectId, orgId);
      if (!project) {
        res.status(404).json({ error: "Project not found" });
        return;
      }

      // Check for duplicate slotKey
      const [existing] = await db
        .select({ id: slotDefinitions.id })
        .from(slotDefinitions)
        .where(
          and(
            eq(slotDefinitions.projectId, projectId),
            eq(slotDefinitions.slotKey, slotKey)
          )
        )
        .limit(1);

      if (existing) {
        res.status(409).json({ error: "Slot key already exists in this project" });
        return;
      }

      const [slot] = await db
        .insert(slotDefinitions)
        .values({
          projectId,
          slotKey,
          description: description || null,
          variants: JSON.stringify(variants),
          defaultVariant: defVariant,
        })
        .returning();

      res.status(201).json({ slot });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /:slotId — Update slot
router.patch(
  "/:slotId",
  requireAuth,
  requireOrgAccess("admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId, slotId } = req.params;
      const orgId = req.auth!.orgId;

      const project = await verifyProjectAccess(projectId, orgId);
      if (!project) {
        res.status(404).json({ error: "Project not found" });
        return;
      }

      const [existing] = await db
        .select()
        .from(slotDefinitions)
        .where(
          and(
            eq(slotDefinitions.id, slotId),
            eq(slotDefinitions.projectId, projectId)
          )
        )
        .limit(1);

      if (!existing) {
        res.status(404).json({ error: "Slot not found" });
        return;
      }

      const updates: Record<string, unknown> = {};
      if (req.body.description !== undefined)
        updates.description = req.body.description;
      if (req.body.variants !== undefined)
        updates.variants = JSON.stringify(req.body.variants);
      if (req.body.defaultVariant !== undefined)
        updates.defaultVariant = req.body.defaultVariant;

      // Resolve the current variants list (may be updated in this request)
      const currentVariants: string[] = req.body.variants
        ? req.body.variants
        : JSON.parse(existing.variants);

      // Mode control fields
      if (req.body.mode !== undefined) {
        const validModes = ["auto", "forced", "split"];
        if (!validModes.includes(req.body.mode)) {
          res.status(400).json({ error: "mode must be 'auto', 'forced', or 'split'" });
          return;
        }
        updates.mode = req.body.mode;
      }

      if (req.body.forcedVariant !== undefined) {
        if (req.body.forcedVariant !== null && !currentVariants.includes(req.body.forcedVariant)) {
          res.status(400).json({ error: "forcedVariant must be one of the defined variants" });
          return;
        }
        updates.forcedVariant = req.body.forcedVariant;
      }

      if (req.body.trafficSplit !== undefined) {
        if (req.body.trafficSplit !== null) {
          const split = req.body.trafficSplit;
          if (typeof split !== "object" || Array.isArray(split)) {
            res.status(400).json({ error: "trafficSplit must be an object" });
            return;
          }
          for (const key of Object.keys(split)) {
            if (!currentVariants.includes(key)) {
              res.status(400).json({ error: `trafficSplit key '${key}' is not a defined variant` });
              return;
            }
            if (typeof split[key] !== "number" || split[key] < 0) {
              res.status(400).json({ error: "trafficSplit values must be non-negative numbers" });
              return;
            }
          }
          const sum = Object.values(split).reduce((a: number, b: unknown) => a + (b as number), 0);
          if (Math.round(sum) !== 100) {
            res.status(400).json({ error: `trafficSplit percentages must sum to 100 (got ${sum})` });
            return;
          }
          updates.trafficSplit = JSON.stringify(split);
        } else {
          updates.trafficSplit = null;
        }
      }

      if (Object.keys(updates).length === 0) {
        res.json({ slot: existing });
        return;
      }

      const [updated] = await db
        .update(slotDefinitions)
        .set(updates)
        .where(eq(slotDefinitions.id, slotId))
        .returning();

      res.json({ slot: updated });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /:slotId — Delete slot
router.delete(
  "/:slotId",
  requireAuth,
  requireOrgAccess("admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId, slotId } = req.params;
      const orgId = req.auth!.orgId;

      const project = await verifyProjectAccess(projectId, orgId);
      if (!project) {
        res.status(404).json({ error: "Project not found" });
        return;
      }

      const [slot] = await db
        .select({ id: slotDefinitions.id })
        .from(slotDefinitions)
        .where(
          and(
            eq(slotDefinitions.id, slotId),
            eq(slotDefinitions.projectId, projectId)
          )
        )
        .limit(1);

      if (!slot) {
        res.status(404).json({ error: "Slot not found" });
        return;
      }

      await db
        .delete(slotDefinitions)
        .where(eq(slotDefinitions.id, slotId));

      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
