import { describe, expect, it } from "vitest";
import { complaintInput } from "../routers/civic";

describe("CIVICFLOW report creation validation", () => {
  const validReport = {
    title: "Large pothole near the crossing",
    description: "A deep pothole near the crossing is forcing vehicles into oncoming traffic.",
    categoryId: 3,
    latitude: 19.076,
    longitude: 72.8777,
    address: "Sample Road, Mumbai",
  };

  it("accepts a complete citizen report with a confirmed category and location", () => {
    expect(complaintInput.safeParse(validReport).success).toBe(true);
  });

  it("rejects missing or invalid critical report fields before persistence", () => {
    expect(complaintInput.safeParse({ ...validReport, title: "Road" }).success).toBe(false);
    expect(complaintInput.safeParse({ ...validReport, description: "Too brief" }).success).toBe(false);
    expect(complaintInput.safeParse({ ...validReport, categoryId: undefined }).success).toBe(false);
    expect(complaintInput.safeParse({ ...validReport, latitude: 91 }).success).toBe(false);
    expect(complaintInput.safeParse({ ...validReport, longitude: undefined }).success).toBe(false);
  });
});

