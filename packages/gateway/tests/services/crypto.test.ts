import { describe, it, expect } from "vitest";
import { encryptSecret, decryptSecret, lastFour } from "../../src/lib/crypto.js";

describe("crypto (LLM key encryption)", () => {
  it("round-trips a secret", () => {
    const key = "sk-proj-abc123XYZ789verylongtoken";
    const blob = encryptSecret(key);
    expect(blob).not.toContain(key); // ciphertext, not plaintext
    expect(decryptSecret(blob)).toBe(key);
  });

  it("produces a different blob each time (random IV)", () => {
    const a = encryptSecret("same-secret");
    const b = encryptSecret("same-secret");
    expect(a).not.toBe(b);
    expect(decryptSecret(a)).toBe("same-secret");
    expect(decryptSecret(b)).toBe("same-secret");
  });

  it("fails to decrypt a tampered blob (auth tag)", () => {
    const blob = encryptSecret("secret");
    const buf = Buffer.from(blob, "base64");
    buf[buf.length - 1] ^= 0xff; // flip a ciphertext byte
    expect(() => decryptSecret(buf.toString("base64"))).toThrow();
  });

  it("lastFour returns the trailing 4 chars", () => {
    expect(lastFour("sk-abcd1234")).toBe("1234");
  });
});
