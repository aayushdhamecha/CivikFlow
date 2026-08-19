import { describe, expect, it } from "vitest";
import { evidenceUploadSchema, validateEvidencePayload } from "./evidence";

describe("CIVICFLOW evidence validation", () => {
  const validInput = { complaintId: 42, filename: "road-photo.png", mimeType: "image/png", base64Data: "aGVsbG8=" };

  it("accepts the supported report evidence envelope", () => {
    expect(evidenceUploadSchema.safeParse(validInput).success).toBe(true);
    expect(validateEvidencePayload(validInput).toString()).toBe("hello");
  });

  it("rejects invalid report inputs before any storage activity", () => {
    expect(evidenceUploadSchema.safeParse({ ...validInput, complaintId: 0 }).success).toBe(false);
    expect(evidenceUploadSchema.safeParse({ ...validInput, filename: "" }).success).toBe(false);
    expect(() => validateEvidencePayload({ ...validInput, mimeType: "application/pdf" })).toThrow("JPG, PNG, or WebP");
    expect(() => validateEvidencePayload({ ...validInput, base64Data: "not base64!" })).toThrow("not valid");
  });
});

