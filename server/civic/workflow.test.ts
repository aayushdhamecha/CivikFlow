import { describe, expect, it } from "vitest";
import { getAuthorityTransitions, validateStatusTransition } from "./workflow";

describe("CIVICFLOW complaint lifecycle", () => {
  it("exposes only server-defined authority transitions", () => {
    expect(getAuthorityTransitions("SUBMITTED")).toEqual(["UNDER_REVIEW", "DUPLICATE", "REJECTED", "NEEDS_INFORMATION"]);
    expect(getAuthorityTransitions("CLOSED")).toEqual([]);
  });

  it("rejects status jumps that are outside the operational workflow", () => {
    expect(() => validateStatusTransition("authority", "SUBMITTED", "RESOLVED")).toThrow("cannot move a complaint");
    expect(() => validateStatusTransition("authority", "IN_PROGRESS", "RESOLVED")).not.toThrow();
  });
});
