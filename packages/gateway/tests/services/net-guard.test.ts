import { describe, it, expect } from "vitest";
import { publicUrlProblem } from "../../src/lib/net-guard.js";

describe("publicUrlProblem", () => {
  it("blocks LAN / private / loopback addresses", () => {
    for (const u of [
      "http://192.168.86.32:1234/v1", // the reported case
      "http://127.0.0.1:1234/v1",
      "http://localhost:1234/v1",
      "http://10.0.0.5:11434/v1",
      "http://172.16.4.4/v1",
      "http://169.254.169.254/latest/meta-data", // cloud metadata (SSRF)
      "http://0.0.0.0:1234",
      "https://ollama.local/v1",
      "http://[::1]:1234/v1",
    ]) {
      expect(publicUrlProblem(u), u).toBeTruthy();
    }
  });

  it("allows public https endpoints", () => {
    for (const u of [
      "https://api.openai.com/v1",
      "https://api.opensatan.com/lm-studio/v1",
      "https://random-words.trycloudflare.com/v1",
      "https://openrouter.ai/api/v1",
    ]) {
      expect(publicUrlProblem(u), u).toBeNull();
    }
  });

  it("rejects non-http protocols and garbage", () => {
    expect(publicUrlProblem("ftp://example.com")).toBeTruthy();
    expect(publicUrlProblem("not a url")).toBeTruthy();
  });
});
