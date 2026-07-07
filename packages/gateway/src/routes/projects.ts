import { Router, type Request, type Response, type NextFunction } from "express";
import { eq, and, count } from "drizzle-orm";
import { db } from "../db/client.js";
import { projects, apiKeys } from "../db/schema.js";
import { requireAuth } from "../middleware/auth.js";
import { requireOrgAccess } from "../middleware/org-access.js";
import { slugify } from "../lib/slugify.js";
import { nanoid } from "nanoid";
import { encryptSecret, decryptSecret, lastFour } from "../lib/crypto.js";

const router = Router();

// Strip the encrypted LLM key from any project row before it leaves the server.
// Exposes only display-safe fields + booleans about what's configured.
function sanitizeProject(p: Record<string, any>) {
  const { llmApiKeyEncrypted, ...rest } = p;
  return { ...rest, hasLlmKey: !!llmApiKeyEncrypted };
}

// GET / — List projects for user's org
router.get(
  "/",
  requireAuth,
  requireOrgAccess("member"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.orgId;

      const projectList = await db
        .select({
          id: projects.id,
          name: projects.name,
          slug: projects.slug,
          coreApiUrl: projects.coreApiUrl,
          createdAt: projects.createdAt,
          updatedAt: projects.updatedAt,
        })
        .from(projects)
        .where(eq(projects.orgId, orgId))
        .orderBy(projects.createdAt);

      const result = await Promise.all(
        projectList.map(async (p) => {
          const [{ value: keyCount }] = await db
            .select({ value: count() })
            .from(apiKeys)
            .where(and(eq(apiKeys.projectId, p.id), eq(apiKeys.isActive, true)));
          return { ...p, keyCount: Number(keyCount) };
        })
      );

      res.json({ projects: result });
    } catch (err) {
      next(err);
    }
  }
);

// POST / — Create project
router.post(
  "/",
  requireAuth,
  requireOrgAccess("admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.orgId;
      const { name, coreApiUrl } = req.body;

      if (!name || typeof name !== "string" || name.length < 1 || name.length > 100) {
        res.status(400).json({ error: "Name must be 1-100 characters" });
        return;
      }

      let slug = slugify(name);
      if (!slug) slug = "project";

      // Check slug uniqueness within org, append random if collision
      const [existing] = await db
        .select({ id: projects.id })
        .from(projects)
        .where(and(eq(projects.orgId, orgId), eq(projects.slug, slug)))
        .limit(1);

      if (existing) {
        slug = slug + "-" + nanoid(4);
      }

      const [project] = await db
        .insert(projects)
        .values({
          orgId,
          name,
          slug,
          coreApiUrl: coreApiUrl || null,
        })
        .returning();

      res.status(201).json(project);
    } catch (err) {
      next(err);
    }
  }
);

// GET /:projectId — Get project detail + API keys
router.get(
  "/:projectId",
  requireAuth,
  requireOrgAccess("member"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.orgId;
      const { projectId } = req.params;

      const [project] = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, projectId), eq(projects.orgId, orgId)))
        .limit(1);

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

      res.json({ project: sanitizeProject(project), keys });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /:projectId — Update project
router.patch(
  "/:projectId",
  requireAuth,
  requireOrgAccess("admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.orgId;
      const { projectId } = req.params;
      const {
        name, slug, coreApiUrl, siteUrl, experimentsEnabled,
        optimizationGoal, llmProvider, llmBaseUrl, llmModel, llmApiKey,
      } = req.body;

      // Verify project belongs to org
      const [existing] = await db
        .select({ id: projects.id })
        .from(projects)
        .where(and(eq(projects.id, projectId), eq(projects.orgId, orgId)))
        .limit(1);

      if (!existing) {
        res.status(404).json({ error: "Project not found" });
        return;
      }

      if (slug !== undefined) {
        const [slugTaken] = await db
          .select({ id: projects.id })
          .from(projects)
          .where(
            and(
              eq(projects.orgId, orgId),
              eq(projects.slug, slug)
            )
          )
          .limit(1);

        if (slugTaken && slugTaken.id !== projectId) {
          res.status(409).json({ error: "Slug already taken in this organization" });
          return;
        }
      }

      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (name !== undefined) updates.name = name;
      if (slug !== undefined) updates.slug = slug;
      if (coreApiUrl !== undefined) updates.coreApiUrl = coreApiUrl || null;
      if (siteUrl !== undefined) updates.siteUrl = siteUrl || null;
      if (experimentsEnabled !== undefined)
        updates.experimentsEnabled = Boolean(experimentsEnabled);

      // ── Goal-driven prompt steering ──
      if (optimizationGoal !== undefined)
        updates.optimizationGoal = optimizationGoal ? String(optimizationGoal).slice(0, 2000) : null;

      // ── Bring-your-own AI connection ──
      if (llmProvider !== undefined) updates.llmProvider = llmProvider || null;
      if (llmBaseUrl !== undefined) updates.llmBaseUrl = llmBaseUrl || null;
      if (llmModel !== undefined) updates.llmModel = llmModel || null;
      // llmApiKey: raw key from the client. "" clears it; a real value is
      // encrypted at rest and never echoed back.
      if (llmApiKey !== undefined) {
        if (llmApiKey) {
          updates.llmApiKeyEncrypted = encryptSecret(String(llmApiKey));
          updates.llmApiKeyLastFour = lastFour(String(llmApiKey));
        } else {
          updates.llmApiKeyEncrypted = null;
          updates.llmApiKeyLastFour = null;
        }
      }

      const [updated] = await db
        .update(projects)
        .set(updates)
        .where(eq(projects.id, projectId))
        .returning();

      res.json(sanitizeProject(updated));
    } catch (err) {
      next(err);
    }
  }
);

// POST /:projectId/llm-test — verify a BYO LLM connection with a tiny call.
// Body: { baseUrl, model, apiKey? }. If apiKey is omitted/empty and the
// project already has a stored key, the saved key is used (so users can
// re-test without re-entering it).
router.post(
  "/:projectId/llm-test",
  requireAuth,
  requireOrgAccess("admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.orgId;
      const { projectId } = req.params;
      const { baseUrl, model } = req.body;
      let apiKey: string | undefined = req.body.apiKey || undefined;

      const [project] = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, projectId), eq(projects.orgId, orgId)))
        .limit(1);
      if (!project) {
        res.status(404).json({ error: "Project not found" });
        return;
      }
      if (!apiKey && project.llmApiKeyEncrypted) {
        try { apiKey = decryptSecret(project.llmApiKeyEncrypted); } catch { /* ignore */ }
      }
      if (!baseUrl || !model) {
        res.status(400).json({ ok: false, error: "baseUrl and model are required" });
        return;
      }

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 15000);
      try {
        const r = await fetch(`${String(baseUrl).replace(/\/$/, "")}/chat/completions`, {
          method: "POST",
          headers,
          signal: ctrl.signal,
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: "Reply with the single word: ok" }],
            max_tokens: 5,
            temperature: 0,
          }),
        });
        clearTimeout(timer);
        if (!r.ok) {
          const body = (await r.text()).slice(0, 200);
          res.json({ ok: false, status: r.status, error: body || `HTTP ${r.status}` });
          return;
        }
        const j = (await r.json()) as { choices?: { message?: { content?: string } }[] };
        const reply = j.choices?.[0]?.message?.content?.trim() ?? "";
        res.json({ ok: true, model, sample: reply.slice(0, 60) });
      } catch (e) {
        clearTimeout(timer);
        res.json({ ok: false, error: (e as Error).name === "AbortError" ? "Timed out after 15s" : (e as Error).message });
      }
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /:projectId — Delete project
router.delete(
  "/:projectId",
  requireAuth,
  requireOrgAccess("admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.orgId;
      const { projectId } = req.params;

      const [existing] = await db
        .select({ id: projects.id })
        .from(projects)
        .where(and(eq(projects.id, projectId), eq(projects.orgId, orgId)))
        .limit(1);

      if (!existing) {
        res.status(404).json({ error: "Project not found" });
        return;
      }

      await db.delete(projects).where(eq(projects.id, projectId));

      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
