import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import type { User } from "../../drizzle/schema";
import { addComplaintMedia, getComplaintById } from "../db";
import { storagePut } from "../storage";
import { assertAuthorityCanAccessComplaint, assertCitizenOwnsComplaint } from "./permissions";

const allowedEvidenceTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const extensionByMime: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export const evidenceUploadSchema = z.object({
  complaintId: z.number().int().positive(),
  filename: z.string().trim().min(1).max(255),
  mimeType: z.string().trim(),
  base64Data: z.string().min(1).max(7_000_000),
  mediaType: z.enum(["EVIDENCE", "RESOLUTION"]).default("EVIDENCE"),
});

export function validateEvidencePayload(input: Pick<z.infer<typeof evidenceUploadSchema>, "mimeType" | "base64Data">) {
  if (!allowedEvidenceTypes.has(input.mimeType)) throw new TRPCError({ code: "BAD_REQUEST", message: "Use a JPG, PNG, or WebP image up to 5 MB." });
  if (!/^[A-Za-z0-9+/=]+$/.test(input.base64Data)) throw new TRPCError({ code: "BAD_REQUEST", message: "The selected image data is not valid." });
  const bytes = Buffer.from(input.base64Data, "base64");
  if (!bytes.length || bytes.length > 5 * 1024 * 1024) throw new TRPCError({ code: "BAD_REQUEST", message: "Images must be smaller than 5 MB." });
  return bytes;
}

export async function uploadComplaintEvidence(user: User, input: z.infer<typeof evidenceUploadSchema>) {
  const complaint = await getComplaintById(input.complaintId);
  if (!complaint) throw new TRPCError({ code: "NOT_FOUND", message: "Report not found." });
  if (input.mediaType === "EVIDENCE") assertCitizenOwnsComplaint(user, complaint);
  else assertAuthorityCanAccessComplaint(user, complaint);
  const bytes = validateEvidencePayload(input);
  const safeName = `${complaint.publicId.toLowerCase()}-${nanoid(12)}.${extensionByMime[input.mimeType]!}`;
  const { key, url } = await storagePut(`complaints/${complaint.id}/${input.mediaType.toLowerCase()}/${safeName}`, bytes, input.mimeType);
  await addComplaintMedia({
    complaintId: complaint.id,
    storageKey: key,
    url,
    mediaType: input.mediaType,
    mimeType: input.mimeType,
    originalFilename: input.filename.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_").slice(0, 255),
    sizeBytes: bytes.length,
    uploadedBy: user.id,
  });
  return { storageKey: key };
}
