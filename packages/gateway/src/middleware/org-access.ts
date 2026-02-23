import type { Request, Response, NextFunction } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "../db/client.js";
import { orgMemberships } from "../db/schema.js";

const ROLE_HIERARCHY: Record<string, number> = {
  member: 0,
  admin: 1,
  owner: 2,
};

export function requireOrgAccess(minRole: "member" | "admin" | "owner") {
  return async (req: Request, res: Response, next: NextFunction) => {
    const auth = req.auth;
    if (!auth) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const orgId = req.params.orgId ?? auth.orgId;
    if (!orgId) {
      res.status(400).json({ error: "No organization context" });
      return;
    }

    try {
      const [membership] = await db
        .select()
        .from(orgMemberships)
        .where(
          and(
            eq(orgMemberships.userId, auth.userId),
            eq(orgMemberships.orgId, orgId)
          )
        )
        .limit(1);

      if (!membership) {
        res.status(403).json({ error: "Not a member of this organization" });
        return;
      }

      const userLevel = ROLE_HIERARCHY[membership.role] ?? -1;
      const requiredLevel = ROLE_HIERARCHY[minRole] ?? 0;

      if (userLevel < requiredLevel) {
        res.status(403).json({ error: "Insufficient permissions" });
        return;
      }

      (req as any).orgMembership = membership;
      next();
    } catch (err) {
      next(err);
    }
  };
}
