import { describe, it, expect } from "vitest";

describe("YoXperience SDK", () => {
  it("produces a valid JS bundle", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const dist = path.resolve(__dirname, "../dist/yoxperience.js");
    const exists = fs.existsSync(dist);
    expect(exists).toBe(true);
    const code = fs.readFileSync(dist, "utf-8");
    expect(code.length).toBeGreaterThan(100);
    expect(code).toContain("YoXperience");
  });

  it("full version has readable source", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const full = path.resolve(__dirname, "../dist/yoxperience.full.js");
    const code = fs.readFileSync(full, "utf-8");
    expect(code.length).toBeGreaterThan(5000);
    expect(code).toContain("function init");
  });

  it("minified version is smaller than full", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const dist = path.resolve(__dirname, "../dist");
    const min = fs.readFileSync(path.join(dist, "yoxperience.js"), "utf-8");
    const full = fs.readFileSync(path.join(dist, "yoxperience.full.js"), "utf-8");
    expect(min.length).toBeLessThan(full.length);
  });
});
