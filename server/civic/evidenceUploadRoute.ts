import type { Express } from "express";
import { sdk } from "../_core/sdk";
import { evidenceUploadSchema, uploadComplaintEvidence } from "./evidence";

export function registerEvidenceUploadRoute(app: Express) {
  app.post("/api/evidence-upload", async (req, res) => {
    let user;
    try { user = await sdk.authenticateRequest(req); } catch { user = null; }
    if (!user) return res.status(401).json({ message: "Sign in to upload evidence." });
    const parsed = evidenceUploadSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "The evidence upload request is not valid." });
    try {
      const result = await uploadComplaintEvidence(user, parsed.data);
      return res.status(201).json(result);
    } catch (error) {
      const code = typeof error === "object" && error && "code" in error ? String(error.code) : "INTERNAL_SERVER_ERROR";
      const message = error instanceof Error ? error.message : "Evidence could not be uploaded.";
      const status = code === "FORBIDDEN" ? 403 : code === "NOT_FOUND" ? 404 : code === "BAD_REQUEST" ? 400 : 500;
      return res.status(status).json({ message });
    }
  });
}
