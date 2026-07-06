import { describe, it, expect, vi, beforeEach } from "vitest";

// Successive awaited db query chains in GET /recommendations:
//   1. verifyProjectAccess select → [project] | []
//   2. slot definitions select    → slots[]
//   3. telemetry rollup select     → perf rows[]
//   4..N. per-winner rationale     → [row] | []
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

vi.mock("../../src/db/client.js", () => ({ db: { select: () => chainable() } }));
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

describe("GET /api/projects/:id/analytics/recommendations", () => {
  beforeEach(() => {
    queryResults.length = 0;
  });

  it("404s when the project is not in the caller's org", async () => {
    queryResults.push([]);
    const res = await get(createApp(), "/api/projects/p1/analytics/recommendations");
    expect(res.status).toBe(404);
  });

  it("returns a recommendation per slot with a summary", async () => {
    queryResults.push(
      [{ id: "p1" }], // project access
      [
        {
          id: "slot-1",
          slotKey: "hero",
          variants: JSON.stringify(["a", "b"]),
          defaultVariant: "a",
          mode: "auto",
          forcedVariant: null,
        },
      ],
      [
        { slotKey: "hero", variant: "a", impressions: 500, engagements: 25, dismisses: 0 },
        { slotKey: "hero", variant: "b", impressions: 500, engagements: 60, dismisses: 0 },
      ],
      [{ rationale: "b converts better." }], // rationale for winner b
    );

    const res = await get(createApp(), "/api/projects/p1/analytics/recommendations");
    expect(res.status).toBe(200);
    expect(res.body.recommendations).toHaveLength(1);
    const rec = res.body.recommendations[0];
    expect(rec.slotKey).toBe("hero");
    expect(rec.slotId).toBe("slot-1");
    expect(rec.status).toBe("recommend");
    expect(rec.winner).toBe("b");
    expect(rec.aiRationale).toBe("b converts better.");
    expect(res.body.summary.actionable).toBe(1);
  });
});
