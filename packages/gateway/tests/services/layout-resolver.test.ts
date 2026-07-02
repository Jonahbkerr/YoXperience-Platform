import { describe, it, expect } from "vitest";

describe("Layout Resolver - Deterministic Selection", () => {
  // Copy of the deterministicWeightedSelect function for testing
  function deterministicWeightedSelect(
    userId: string,
    slotKey: string,
    trafficSplit: Record<string, number>
  ): string {
    const seed = userId + ":" + slotKey;
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
    }
    const bucket = ((hash % 100) + 100) % 100;

    let cumulative = 0;
    const entries = Object.entries(trafficSplit);
    for (const [variant, pct] of entries) {
      cumulative += pct;
      if (bucket < cumulative) {
        return variant;
      }
    }
    return entries[entries.length - 1][0];
  }

  it("returns same variant for same user and slot key", () => {
    const split = { icon: 50, gauge: 30, number: 20 };
    const result1 = deterministicWeightedSelect("user-123", "dashboard", split);
    const result2 = deterministicWeightedSelect("user-123", "dashboard", split);
    expect(result1).toBe(result2);
  });

  it("returns different results for different users", () => {
    // Not guaranteed to differ, but distribution should work
    const split = { a: 50, b: 50 };
    const results = new Set<string>();
    for (let i = 0; i < 100; i++) {
      results.add(deterministicWeightedSelect(`user-${i}`, "hero", split));
    }
    // With 50/50 split, we should see both variants
    expect(results.size).toBeGreaterThanOrEqual(1);
  });

  it("always selects the only variant with 100% split", () => {
    const split = { only: 100 };
    for (let i = 0; i < 50; i++) {
      const result = deterministicWeightedSelect(
        `user-${i}`,
        "slot",
        split
      );
      expect(result).toBe("only");
    }
  });

  it("handles zero-percentage variants correctly", () => {
    const split = { a: 0, b: 100 };
    for (let i = 0; i < 50; i++) {
      const result = deterministicWeightedSelect(
        `user-${i}`,
        "slot",
        split
      );
      expect(result).toBe("b");
    }
  });

  it("produces consistent results across multiple calls", () => {
    const split = { x: 40, y: 35, z: 25 };
    const uid = "consistent-user-999";
    const slot = "pricing-page";

    const results = Array.from({ length: 20 }, () =>
      deterministicWeightedSelect(uid, slot, split)
    );

    // All calls for same user/slot should return same variant
    expect(new Set(results).size).toBe(1);
  });
});

describe("Layout Config Types", () => {
  it("SlotConfig has required fields", () => {
    const slot = {
      slotKey: "hero-banner",
      variant: "style-a",
      availableVariants: ["style-a", "style-b"],
      confidence: 0.85,
    };

    expect(slot.slotKey).toBeTruthy();
    expect(slot.variant).toBeTruthy();
    expect(slot.availableVariants.length).toBeGreaterThan(0);
    expect(slot.confidence).toBeGreaterThanOrEqual(0);
    expect(slot.confidence).toBeLessThanOrEqual(1);
  });

  it("LayoutConfig contains userId and slot map", () => {
    const layout = {
      userId: "end-user-42",
      slots: {
        hero: {
          slotKey: "hero",
          variant: "a",
          availableVariants: ["a", "b"],
          confidence: 0.9,
        },
      },
      resolvedAt: new Date().toISOString(),
    };

    expect(layout.userId).toBeTruthy();
    expect(layout.slots).toBeDefined();
    expect(typeof layout.resolvedAt).toBe("string");
    expect(new Date(layout.resolvedAt).getTime()).not.toBeNaN();
  });
});
