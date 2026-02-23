import { Router, type Request, type Response, type NextFunction } from "express";
import crypto from "node:crypto";
import { nanoid } from "nanoid";
import { eq, and } from "drizzle-orm";
import { db } from "../db/client.js";
import { apiKeys, projects } from "../db/schema.js";
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

// GET / — List keys (masked)
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

      const keys = await db
        .select({
          id: apiKeys.id,
          name: apiKeys.name,
          keyPrefix: apiKeys.keyPrefix,
          lastFour: apiKeys.lastFour,
          type: apiKeys.type,
          isActive: apiKeys.isActive,
          createdAt: apiKeys.createdAt,
          lastUsedAt: apiKeys.lastUsedAt,
        })
        .from(apiKeys)
        .where(eq(apiKeys.projectId, projectId))
        .orderBy(apiKeys.createdAt);

      res.json({ keys });
    } catch (err) {
      next(err);
    }
  }
);

// POST / — Generate key (returns raw key once)
router.post(
  "/",
  requireAuth,
  requireOrgAccess("admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId } = req.params;
      const orgId = req.auth!.orgId;
      const { name, type = "publishable" } = req.body;

      if (!name || typeof name !== "string" || name.length < 1 || name.length > 80) {
        res.status(400).json({ error: "Name must be 1-80 characters" });
        return;
      }

      if (!["publishable", "secret"].includes(type)) {
        res.status(400).json({ error: "Type must be 'publishable' or 'secret'" });
        return;
      }

      const project = await verifyProjectAccess(projectId, orgId);
      if (!project) {
        res.status(404).json({ error: "Project not found" });
        return;
      }

      const prefix = type === "secret" ? "yxp_sk_" : "yxp_pk_";
      const random = nanoid(32);
      const rawKey = prefix + random;
      const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
      const lastFour = random.slice(-4);

      const [key] = await db
        .insert(apiKeys)
        .values({
          projectId,
          name,
          keyPrefix: prefix,
          keyHash,
          lastFour,
          type,
        })
        .returning();

      res.status(201).json({
        key: {
          id: key.id,
          name: key.name,
          keyPrefix: key.keyPrefix,
          lastFour: key.lastFour,
          type: key.type,
          isActive: key.isActive,
          createdAt: key.createdAt,
        },
        rawKey,
      });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /:keyId — Revoke key (soft-revoke)
router.delete(
  "/:keyId",
  requireAuth,
  requireOrgAccess("admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId, keyId } = req.params;
      const orgId = req.auth!.orgId;

      const project = await verifyProjectAccess(projectId, orgId);
      if (!project) {
        res.status(404).json({ error: "Project not found" });
        return;
      }

      const [key] = await db
        .select({ id: apiKeys.id })
        .from(apiKeys)
        .where(and(eq(apiKeys.id, keyId), eq(apiKeys.projectId, projectId)))
        .limit(1);

      if (!key) {
        res.status(404).json({ error: "API key not found" });
        return;
      }

      await db
        .update(apiKeys)
        .set({ isActive: false })
        .where(eq(apiKeys.id, keyId));

      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
