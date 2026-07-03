import { describe, it, expect } from "vitest";
import { extractJsonObject } from "../../src/services/llm-analyzer.js";

const REC = '{"recommendations":[{"slotKey":"hero","recommendedVariant":"a"}]}';

describe("extractJsonObject", () => {
  it("extracts plain JSON", () => {
    expect(extractJsonObject(REC)).toBe(REC);
  });

  it("strips markdown fences", () => {
    expect(extractJsonObject("```json\n" + REC + "\n```")).toBe(REC);
  });

  it("finds JSON after a Gemma thought channel (the prod failure case)", () => {
    const raw = `<|channel>thought\nThe user clicked variant a more often, so I should recommend it.\n<|channel>final\n${REC}`;
    expect(extractJsonObject(raw)).toBe(REC);
  });

  it("finds JSON when only an unclosed thought tag precedes it", () => {
    const raw = `<|channel>thought\nReasoning here...\n\n${REC}`;
    expect(extractJsonObject(raw)).toBe(REC);
  });

  it("returns null when there is no JSON at all", () => {
    expect(extractJsonObject("<|channel>thought\njust musing, no output")).toBeNull();
  });
});
