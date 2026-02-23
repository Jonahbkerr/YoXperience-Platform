import type { Request, Response, NextFunction } from "express";
import crypto from "node:crypto";
import { eq, and } from "drizzle-orm";
import { db } from "../db/client.js";
import { apiKeys, projects } from "../db/schema.js";

declare global {
  namespace Express {
    interface Request {
      apiKey?: {
        projectId: string;
        orgId: string;
        keyType: string;
      };
    }
  }
}

export function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const key =
    req.headers["x-api-key"] as string | undefined ??
    (req.headers.authorization?.startsWith("Bearer yxp_")
      ? req.headers.authorization.slice(7)
      : undefined);

  if (!key) {
    res.status(401).json({ error: "Missing API key" });
    return;
  }

  const keyHash = crypto.createHash("sha256").update(key).digest("hex");

  db.select({
    id: apiKeys.id,
    projectId: apiKeys.projectId,
    type: apiKeys.type,
    orgId: projects.orgId,
  })
    .from(apiKeys)
    .innerJoin(projects, eq(apiKeys.projectId, projects.id))
    .where(and(eq(apiKeys.keyHash, keyHash), eq(apiKeys.isActive, true)))
    .limit(1)
    .then(([row]) => {
      if (!row) {
        res.status(401).json({ error: "Invalid or revoked API key" });
        return;
      }

      req.apiKey = {
        projectId: row.projectId,
        orgId: row.orgId,
        keyType: row.type,
      };

      // Update lastUsedAt (fire-and-forget)
      db.update(apiKeys)
        .set({ lastUsedAt: new Date() })
        .where(eq(apiKeys.id, row.id))
        .catch(() => {});

      next();
    })
    .catch(next);
}
