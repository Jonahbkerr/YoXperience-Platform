import { describe, it, expect } from "vitest";
import { describeError } from "../../src/lib/errors.js";

describe("describeError", () => {
  it("never returns an empty string for message-less errors", () => {
    const err = new TypeError("");
    const out = describeError(err);
    expect(out.length).toBeGreaterThan(0);
    expect(out).toContain("TypeError");
  });

  it("includes the cause when present", () => {
    const err = new Error("fetch failed", { cause: new Error("ECONNREFUSED 127.0.0.1:1234") });
    const out = describeError(err);
    expect(out).toContain("fetch failed");
    expect(out).toContain("ECONNREFUSED");
  });

  it("stringifies non-Error throws", () => {
    expect(describeError("boom")).toBe("boom");
    expect(describeError(42)).toBe("42");
  });
});
