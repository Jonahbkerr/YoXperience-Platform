import { describe, it, expect, vi, beforeEach } from "vitest";

// Queue of results returned by successive awaited db query chains.
// The insights handler awaits, in order:
//   1. verifyProjectAccess select  → [project] | []
//   2. slot rollups                → array
//   3. latest recommendations     → array
//   4. totals                     → [totals]
const queryResults: unknown[] = [];

function chainable(): any {
  const target: any = () => chainable();
  return new Proxy(target, {
    get(_t, prop) {
      if (prop === "then") {
        const result = queryResults.shift() ?? [];
        return (resolve: (v: unknown) => void) => resolve(result);
      }
      return () => chainable();
    },
  });
}

vi.mock("../../src/db/client.js", () => ({
  db: {
    select: () => chainable(),
  },
}));

vi.mock("../../src/middleware/auth.js", () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.auth = { userId: "u1", email: "t@t.co", orgId: "o1", role: "owner" };
    next();
  },
}));

vi.mock("../../src/middleware/org-access.js", () => ({
  requireOrgAccess: () => (_req: any, _res: any, next: any) => next(),
}));

import express from "express";
import analyticsRouter from "../../src/routes/analytics.js";

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/projects/:projectId/analytics", analyticsRouter);
  return app;
}

async function get(app: express.Express, path: string) {
  const server = app.listen(0);
  const port = (server.address() as { port: number }).port;
  try {
    const res = await fetch(`http://127.0.0.1:${port}${path}`);
    return { status: res.status, body: await res.json() };
  } finally {
    server.close();
  }
}

describe("GET /api/projects/:projectId/analytics/insights", () => {
  beforeEach(() => {
    queryResults.length = 0;
  });

  it("returns 404 when project is not in the caller's org", async () => {
    queryResults.push([]); // verifyProjectAccess finds nothing
    const res = await get(createApp(), "/api/projects/p1/analytics/insights");
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Project not found");
  });

  it("returns totals, slot rollups, and parsed recommendations", async () => {
    queryResults.push(
      [{ id: "p1" }],
      [
        {
          slotKey: "hero-headline",
          resolvedVariant: "extension_first",
          users: 3,
          lastUpdated: "2026-07-03T02:26:33.792Z",
          withRationale: 3,
        },
      ],
      [
        {
          endUserId: "anon_1",
          slotKey: "hero-headline",
          resolvedVariant: "extension_first",
          // double-encoded, as stored by older scheduler builds
          variantWeights: JSON.stringify(JSON.stringify({ extension_first: 0.25, default: 0.375 })),
          rationale: "Most impressions.",
          updatedAt: "2026-07-03T02:26:33.792Z",
        },
      ],
      [{ analyzedUsers: 3, totalRecommendations: 4, llmRecommendations: 3 }]
    );

    const res = await get(createApp(), "/api/projects/p1/analytics/insights");
    expect(res.status).toBe(200);
    expect(res.body.totals.analyzedUsers).toBe(3);
    expect(res.body.slots).toHaveLength(1);
    expect(res.body.recommendations[0].rationale).toBe("Most impressions.");
    // double-encoded weights are unwrapped to a real object
    expect(res.body.recommendations[0].variantWeights).toEqual({
      extension_first: 0.25,
      default: 0.375,
    });
  });
});
