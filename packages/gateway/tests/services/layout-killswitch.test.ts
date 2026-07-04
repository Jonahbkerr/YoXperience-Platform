import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { vi } from "vitest";

// Chainable db mock: each awaited query chain resolves to the next queued result.
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

import { resolveLayout } from "../../src/services/layout-resolver.js";

const SLOT = {
  slotKey: "hero",
  variants: JSON.stringify(["default", "spicy"]),
  defaultVariant: "default",
  mode: "auto",
  forcedVariant: null,
  trafficSplit: null,
};
const PREF = {
  slotKey: "hero",
  resolvedVariant: "spicy",
  variantWeights: JSON.stringify({ spicy: 0.9, default: 0.1 }),
};

function queue(project: unknown[], slots: unknown[], prefs: unknown[]) {
  queryResults.length = 0;
  queryResults.push(project, slots, prefs);
}

describe("resolveLayout kill switches", () => {
  const envBackup = process.env.EXPERIMENTS_ENABLED;
  beforeEach(() => {
    delete process.env.EXPERIMENTS_ENABLED;
  });
  afterEach(() => {
    if (envBackup === undefined) delete process.env.EXPERIMENTS_ENABLED;
    else process.env.EXPERIMENTS_ENABLED = envBackup;
  });

  it("serves the learned variant when experiments are on", async () => {
    queue([{ experimentsEnabled: true }], [SLOT], [PREF]);
    const layout = await resolveLayout("p1", "u1");
    expect(layout.experimentsEnabled).toBe(true);
    expect(layout.slots.hero.variant).toBe("spicy");
  });

  it("pins everyone to defaults when the project toggle is off", async () => {
    queue([{ experimentsEnabled: false }], [SLOT], [PREF]);
    const layout = await resolveLayout("p1", "u1");
    expect(layout.experimentsEnabled).toBe(false);
    expect(layout.slots.hero.variant).toBe("default");
  });

  it("pins everyone to defaults when the global env kill switch is set", async () => {
    process.env.EXPERIMENTS_ENABLED = "false";
    queue([{ experimentsEnabled: true }], [SLOT], [PREF]);
    const layout = await resolveLayout("p1", "u1");
    expect(layout.experimentsEnabled).toBe(false);
    expect(layout.slots.hero.variant).toBe("default");
  });

  it("kill switch overrides even forced mode", async () => {
    process.env.EXPERIMENTS_ENABLED = "false";
    queue(
      [{ experimentsEnabled: true }],
      [{ ...SLOT, mode: "forced", forcedVariant: "spicy" }],
      []
    );
    const layout = await resolveLayout("p1", "u1");
    expect(layout.slots.hero.variant).toBe("default");
  });

  it("treats a missing project row as experiments-on (fails open to normal behavior)", async () => {
    queue([], [SLOT], []);
    const layout = await resolveLayout("p1", "u1");
    expect(layout.experimentsEnabled).toBe(true);
    expect(layout.slots.hero.variant).toBe("default"); // no pref → default anyway
  });
});
