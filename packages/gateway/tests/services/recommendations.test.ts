import { describe, it, expect } from "vitest";
import {
  computeSlotRecommendation,
  MIN_TOTAL_IMPRESSIONS,
  type SlotInput,
  type VariantStat,
} from "../../src/lib/recommendations.js";

const slot = (over: Partial<SlotInput> = {}): SlotInput => ({
  slotKey: "hero",
  variants: ["a", "b"],
  defaultVariant: "a",
  mode: "auto",
  forcedVariant: null,
  ...over,
});

describe("computeSlotRecommendation", () => {
  it("reports 'gathering' when total impressions are below the gate", () => {
    const stats: VariantStat[] = [
      { variant: "a", impressions: 10, engagements: 5, dismisses: 0 },
      { variant: "b", impressions: 10, engagements: 1, dismisses: 0 },
    ];
    const r = computeSlotRecommendation(slot(), stats);
    expect(r.status).toBe("gathering");
    expect(r.winner).toBeNull();
    expect(r.confidence).toBe("none");
    expect(r.reason).toContain("more impressions");
  });

  it("reports 'gathering' when impressions are plentiful but engagement is sparse (BSmeter's real state)", () => {
    // Mirrors production: hundreds of impressions, ~zero clicks on all but one variant
    const stats: VariantStat[] = [
      { variant: "a", impressions: 380, engagements: 9, dismisses: 0 },
      { variant: "b", impressions: 95, engagements: 0, dismisses: 0 },
    ];
    const r = computeSlotRecommendation(slot(), stats);
    expect(r.totalImpressions).toBeGreaterThan(MIN_TOTAL_IMPRESSIONS);
    expect(r.status).toBe("gathering");
    expect(r.reason).toContain("engagement events");
  });

  it("recommends the higher-engagement variant when data is sufficient", () => {
    const stats: VariantStat[] = [
      { variant: "a", impressions: 500, engagements: 25, dismisses: 0 }, // 5%
      { variant: "b", impressions: 500, engagements: 50, dismisses: 0 }, // 10%
    ];
    const r = computeSlotRecommendation(slot(), stats);
    expect(r.status).toBe("recommend");
    expect(r.winner).toBe("b");
    expect(r.liftPct).toBeCloseTo(100, 0); // 10% vs 5% = +100%
    expect(r.confidence).toBe("high");
  });

  it("says 'keep' when the current default is already the top performer", () => {
    const stats: VariantStat[] = [
      { variant: "a", impressions: 500, engagements: 60, dismisses: 0 }, // 12%
      { variant: "b", impressions: 500, engagements: 30, dismisses: 0 }, // 6%
    ];
    const r = computeSlotRecommendation(slot(), stats);
    expect(r.status).toBe("keep");
    expect(r.winner).toBe("a");
    expect(r.liftPct).toBeNull();
  });

  it("ignores under-sampled variants when picking a winner", () => {
    const stats: VariantStat[] = [
      { variant: "a", impressions: 500, engagements: 25, dismisses: 0 }, // 5%, eligible
      { variant: "b", impressions: 5, engagements: 5, dismisses: 0 }, // 100% but tiny — ineligible
    ];
    const r = computeSlotRecommendation(slot(), stats);
    // b has a higher rate but too few impressions to be eligible; only 1 eligible variant → gathering
    expect(r.variants.find((v) => v.variant === "b")!.eligible).toBe(false);
    expect(r.status).toBe("gathering");
  });

  it("fills in zero rows for defined variants with no telemetry", () => {
    const r = computeSlotRecommendation(slot({ variants: ["a", "b", "c"] }), [
      { variant: "a", impressions: 50, engagements: 5, dismisses: 0 },
    ]);
    expect(r.variants).toHaveLength(3);
    expect(r.variants.find((v) => v.variant === "c")!.impressions).toBe(0);
  });
});
