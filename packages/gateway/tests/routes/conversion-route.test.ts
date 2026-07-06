import { describe, it, expect, vi, beforeEach } from "vitest";

// Successive awaited chains in POST /v1/conversion:
//   1. exposures selectDistinct  → [{slotKey,variant}...]
//   2. already-credited select   → [{slotKey,variant}...]
//   3. writeTelemetryEvents insert (mocked separately)
const queryResults: unknown[] = [];
let insertedRows: any[] = [];

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
    selectDistinct: () => chainable(),
    insert: () => ({
      values: (rows: any[]) => {
        insertedRows.push(...rows);
        return Promise.resolve();
      },
    }),
  },
}));

vi.mock("../../src/middleware/api-key-auth.js", () => ({
  requireApiKey: (req: any, _res: any, next: any) => {
    req.apiKey = { projectId: "proj-1" };
    next();
  },
}));

vi.mock("../../src/services/layout-resolver.js", () => ({ resolveLayout: vi.fn() }));

import express from "express";
import sdkRouter from "../../src/routes/sdk.js";

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/v1", sdkRouter);
  return app;
}

async function post(app: express.Express, path: string, body: unknown) {
  const server = app.listen(0);
  const port = (server.address() as { port: number }).port;
  try {
    const res = await fetch(`http://127.0.0.1:${port}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return { status: res.status, body: await res.json() };
  } finally {
    server.close();
  }
}

describe("POST /v1/conversion", () => {
  beforeEach(() => {
    queryResults.length = 0;
    insertedRows = [];
  });

  it("400s without a userId", async () => {
    const res = await post(createApp(), "/v1/conversion", { conversionType: "subscribe" });
    expect(res.status).toBe(400);
  });

  it("credits each exposed variant the user has not been credited for", async () => {
    queryResults.push(
      // exposures: user saw 3 slot-variants
      [
        { slotKey: "hero", variant: "a" },
        { slotKey: "score", variant: "gauge" },
        { slotKey: "pricing", variant: "urgency" },
      ],
      // already credited: hero/a
      [{ slotKey: "hero", variant: "a" }],
    );
    const res = await post(createApp(), "/v1/conversion", {
      userId: "u1",
      conversionType: "subscribe",
    });
    expect(res.status).toBe(202);
    expect(res.body.credited).toBe(2); // score + pricing, not hero (already)
    expect(insertedRows.map((r) => r.slotKey).sort()).toEqual(["pricing", "score"]);
    expect(insertedRows.every((r) => r.eventType === "conversion")).toBe(true);
  });

  it("credits 0 when the user has no exposures", async () => {
    queryResults.push([]); // no exposures
    const res = await post(createApp(), "/v1/conversion", {
      userId: "ghost",
      conversionType: "subscribe",
    });
    expect(res.status).toBe(202);
    expect(res.body.credited).toBe(0);
  });
});
