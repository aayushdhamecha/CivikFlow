import { describe, expect, it } from "vitest";
import { buildFallbackAnalysis } from "./aiService";

describe("CIVICFLOW AI fallback", () => {
  it("returns cautious, explicitly unavailable recommendations when AI is disabled or fails", () => {
    const analysis = buildFallbackAnalysis("Manual review required.");
    expect(analysis.available).toBe(false);
    expect(analysis.model).toBeNull();
    expect(analysis.classification.confidence).toBe(0);
    expect(analysis.priority.level).toBe("MEDIUM");
    expect(analysis.duplicate.candidateId).toBeNull();
    expect(analysis.priority.reason).toBe("Manual review required.");
  });
});

