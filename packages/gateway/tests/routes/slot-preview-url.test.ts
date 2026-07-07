import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock db: PATCH /:slotId issues, in order:
//   1. verifyProjectAccess select → [project] | []
//   2. existing slot select        → [slot] | []
//   3. update().set().where().returning() → [updatedSlot]
// The chainable proxy resolves the next queued result on await; the update's
// .set() payload is captured so we can assert what the handler actually wrote.
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
import slotsRouter from "../../src/routes/slots.js";

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/projects/:projectId/slots", slotsRouter);
  return app;
}

async function patch(path: string, body: unknown) {
  const app = createApp();
  const server = app.listen(0);
  const port = (server.address() as { port: number }).port;
  try {
    const res = await fetch(`http://127.0.0.1:${port}${path}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return { status: res.status, body: await res.json() };
  } finally {
    server.close();
  }
}

const EXISTING_SLOT = {
  id: "slot-1",
  slotKey: "pricing-cta",
  variants: JSON.stringify(["default", "urgency"]),
  defaultVariant: "default",
  previewUrl: null,
};

describe("PATCH slot previewUrl", () => {
  beforeEach(() => {
    queryResults.length = 0;
    lastSet = null;
  });

  it("rejects a non-URL previewUrl with 400 and writes nothing", async () => {
    queryResults.push([{ id: "p1" }], [EXISTING_SLOT]);
    const res = await patch("/api/projects/p1/slots/slot-1", { previewUrl: "not a url" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/valid http/i);
    expect(lastSet).toBeNull(); // no update issued
  });

  it("rejects a non-http(s) protocol (javascript:) with 400", async () => {
    queryResults.push([{ id: "p1" }], [EXISTING_SLOT]);
    const res = await patch("/api/projects/p1/slots/slot-1", {
      previewUrl: "javascript:alert(1)",
    });
    expect(res.status).toBe(400);
    expect(lastSet).toBeNull();
  });

  it("stores a valid https deep-link URL", async () => {
    queryResults.push(
      [{ id: "p1" }],
      [EXISTING_SLOT],
      [{ ...EXISTING_SLOT, previewUrl: "https://bsmeter.ai/pricing" }],
    );
    const res = await patch("/api/projects/p1/slots/slot-1", {
      previewUrl: "https://bsmeter.ai/pricing",
    });
    expect(res.status).toBe(200);
    expect(lastSet?.previewUrl).toBe("https://bsmeter.ai/pricing");
    expect(res.body.slot.previewUrl).toBe("https://bsmeter.ai/pricing");
  });

  it("clears the previewUrl when given an empty string", async () => {
    queryResults.push(
      [{ id: "p1" }],
      [{ ...EXISTING_SLOT, previewUrl: "https://bsmeter.ai/pricing" }],
      [{ ...EXISTING_SLOT, previewUrl: null }],
    );
    const res = await patch("/api/projects/p1/slots/slot-1", { previewUrl: "" });
    expect(res.status).toBe(200);
    expect(lastSet?.previewUrl).toBeNull();
  });

  it("allows a localhost/staging URL (owner-side preview, no SSRF surface)", async () => {
    queryResults.push(
      [{ id: "p1" }],
      [EXISTING_SLOT],
      [{ ...EXISTING_SLOT, previewUrl: "http://localhost:5173/pricing" }],
    );
    const res = await patch("/api/projects/p1/slots/slot-1", {
      previewUrl: "http://localhost:5173/pricing",
    });
    expect(res.status).toBe(200);
    expect(lastSet?.previewUrl).toBe("http://localhost:5173/pricing");
  });
});
