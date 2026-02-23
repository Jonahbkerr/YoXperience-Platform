import { Router, type Request, type Response, type NextFunction } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "../db/client.js";
import { organizations, orgMemberships, users } from "../db/schema.js";
import { requireAuth } from "../middleware/auth.js";
import { requireOrgAccess } from "../middleware/org-access.js";

const router = Router();

// GET /:orgId — Get org details
router.get(
  "/:orgId",
  requireAuth,
  requireOrgAccess("member"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const [org] = await db
        .select({
          id: organizations.id,
          name: organizations.name,
          slug: organizations.slug,
          plan: organizations.plan,
          createdAt: organizations.createdAt,
          updatedAt: organizations.updatedAt,
        })
        .from(organizations)
        .where(eq(organizations.id, req.params.orgId))
        .limit(1);

      if (!org) {
        res.status(404).json({ error: "Organization not found" });
        return;
      }

      res.json(org);
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /:orgId — Update org
router.patch(
  "/:orgId",
  requireAuth,
  requireOrgAccess("admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, slug } = req.body;
      const orgId = req.params.orgId;

      if (name !== undefined && (typeof name !== "string" || name.length < 1 || name.length > 100)) {
        res.status(400).json({ error: "Name must be 1-100 characters" });
        return;
      }

      if (slug !== undefined) {
        if (typeof slug !== "string" || !/^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$/.test(slug)) {
          res.status(400).json({ error: "Slug must be 3-60 lowercase alphanumeric characters and hyphens" });
          return;
        }

        const [existing] = await db
          .select({ id: organizations.id })
          .from(organizations)
          .where(eq(organizations.slug, slug))
          .limit(1);

        if (existing && existing.id !== orgId) {
          res.status(409).json({ error: "Slug already taken" });
          return;
        }
      }

      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (name !== undefined) updates.name = name;
      if (slug !== undefined) updates.slug = slug;

      const [updated] = await db
        .update(organizations)
        .set(updates)
        .where(eq(organizations.id, orgId))
        .returning({
          id: organizations.id,
          name: organizations.name,
          slug: organizations.slug,
          plan: organizations.plan,
          createdAt: organizations.createdAt,
          updatedAt: organizations.updatedAt,
        });

      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);

// GET /:orgId/members — List members
router.get(
  "/:orgId/members",
  requireAuth,
  requireOrgAccess("member"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const members = await db
        .select({
          id: orgMemberships.id,
          userId: users.id,
          email: users.email,
          name: users.name,
          role: orgMemberships.role,
          createdAt: orgMemberships.createdAt,
        })
        .from(orgMemberships)
        .innerJoin(users, eq(orgMemberships.userId, users.id))
        .where(eq(orgMemberships.orgId, req.params.orgId));

      res.json({ members });
    } catch (err) {
      next(err);
    }
  }
);

// POST /:orgId/members/invite — Invite member by email
router.post(
  "/:orgId/members/invite",
  requireAuth,
  requireOrgAccess("admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, role = "member" } = req.body;
      const orgId = req.params.orgId;

      if (!email || typeof email !== "string") {
        res.status(400).json({ error: "Email is required" });
        return;
      }

      if (role === "owner") {
        res.status(400).json({ error: "Cannot invite as owner" });
        return;
      }

      const [user] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);

      if (!user) {
        res.status(404).json({ error: "User not found. They must sign up first." });
        return;
      }

      const [existing] = await db
        .select({ id: orgMemberships.id })
        .from(orgMemberships)
        .where(
          and(
            eq(orgMemberships.userId, user.id),
            eq(orgMemberships.orgId, orgId)
          )
        )
        .limit(1);

      if (existing) {
        res.status(409).json({ error: "User is already a member" });
        return;
      }

      const [membership] = await db
        .insert(orgMemberships)
        .values({ userId: user.id, orgId, role })
        .returning();

      res.status(201).json(membership);
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /:orgId/members/:memberId — Update member role
router.patch(
  "/:orgId/members/:memberId",
  requireAuth,
  requireOrgAccess("owner"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { role } = req.body;
      const { orgId, memberId } = req.params;

      if (!role || !["member", "admin"].includes(role)) {
        res.status(400).json({ error: "Role must be 'member' or 'admin'" });
        return;
      }

      const [target] = await db
        .select()
        .from(orgMemberships)
        .where(
          and(
            eq(orgMemberships.id, memberId),
            eq(orgMemberships.orgId, orgId)
          )
        )
        .limit(1);

      if (!target) {
        res.status(404).json({ error: "Membership not found" });
        return;
      }

      if (target.role === "owner") {
        res.status(403).json({ error: "Cannot change the owner's role" });
        return;
      }

      const [updated] = await db
        .update(orgMemberships)
        .set({ role })
        .where(eq(orgMemberships.id, memberId))
        .returning();

      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /:orgId/members/:memberId — Remove member
router.delete(
  "/:orgId/members/:memberId",
  requireAuth,
  requireOrgAccess("admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { orgId, memberId } = req.params;

      const [target] = await db
        .select()
        .from(orgMemberships)
        .where(
          and(
            eq(orgMemberships.id, memberId),
            eq(orgMemberships.orgId, orgId)
          )
        )
        .limit(1);

      if (!target) {
        res.status(404).json({ error: "Membership not found" });
        return;
      }

      if (target.role === "owner") {
        res.status(403).json({ error: "Cannot remove the organization owner" });
        return;
      }

      await db
        .delete(orgMemberships)
        .where(eq(orgMemberships.id, memberId));

      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
