import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock db chain: each awaited query resolves the next queued result; update
// .set() payloads are captured for assertions.
const queryResults: unknown[] = [];
let lastSet: Record<string, unknown> | null = null;

function chainable(): any {
  const target: any = () => chainable();
  return new Proxy(target, {
    get(_t, prop) {
      if (prop === "then") {
        const result = queryResults.shift() ?? [];
        return (resolve: (v: unknown) => void) => resolve(result);
      }
      if (prop === "set") {
        return (payload: Record<string, unknown>) => {
          lastSet = payload;
          return chainable();
        };
      }
      return () => chainable();
    },
  });
}

vi.mock("../../src/db/client.js", () => ({
  db: { select: () => chainable(), update: () => chainable() },
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
import projectsRouter from "../../src/routes/projects.js";

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/projects", projectsRouter);
  return app;
}

async function call(method: string, path: string, body?: unknown) {
  const app = createApp();
  const server = app.listen(0);
  const port = (server.address() as { port: number }).port;
  try {
    const res = await fetch(`http://127.0.0.1:${port}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, body: await res.json() };
  } finally {
    server.close();
  }
}

describe("AI analysis control", () => {
  beforeEach(() => {
    queryResults.length = 0;
    lastSet = null;
  });

  describe("PATCH /:projectId aiAnalysisMode", () => {
    it("accepts 'manual'", async () => {
      queryResults.push(
        [{ id: "p1" }], // org access check
        [{ id: "p1", aiAnalysisMode: "manual" }], // update().returning()
      );
      const res = await call("PATCH", "/api/projects/p1", { aiAnalysisMode: "manual" });
      expect(res.status).toBe(200);
      expect(lastSet?.aiAnalysisMode).toBe("manual");
    });

    it("accepts 'auto'", async () => {
      queryResults.push([{ id: "p1" }], [{ id: "p1", aiAnalysisMode: "auto" }]);
      const res = await call("PATCH", "/api/projects/p1", { aiAnalysisMode: "auto" });
      expect(res.status).toBe(200);
      expect(lastSet?.aiAnalysisMode).toBe("auto");
    });

    it("rejects an invalid mode with 400 and writes nothing", async () => {
      queryResults.push([{ id: "p1" }]);
      const res = await call("PATCH", "/api/projects/p1", { aiAnalysisMode: "sometimes" });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/auto.*manual|manual.*auto/i);
      expect(lastSet).toBeNull();
    });
  });

  describe("POST /:projectId/analyze-now", () => {
    it("404s when the project is not in the caller's org", async () => {
      queryResults.push([]); // access check returns nothing
      const res = await call("POST", "/api/projects/p1/analyze-now");
      expect(res.status).toBe(404);
      expect(lastSet).toBeNull();
    });

    it("queues a run by setting analysisRequestedAt", async () => {
      queryResults.push(
        [{ id: "p1", analysisRequestedAt: null }], // access check
        [], // update
      );
      const res = await call("POST", "/api/projects/p1/analyze-now");
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.alreadyPending).toBe(false);
      expect(lastSet?.analysisRequestedAt).toBeInstanceOf(Date);
    });

    it("reports alreadyPending when a run is queued", async () => {
      queryResults.push(
        [{ id: "p1", analysisRequestedAt: new Date("2026-07-08T00:00:00Z") }],
        [],
      );
      const res = await call("POST", "/api/projects/p1/analyze-now");
      expect(res.status).toBe(200);
      expect(res.body.alreadyPending).toBe(true);
      expect(lastSet?.analysisRequestedAt).toBeInstanceOf(Date); // refreshed
    });
  });
});
