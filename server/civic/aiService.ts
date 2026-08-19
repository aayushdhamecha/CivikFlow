import { z } from "zod";
import { categories, type Complaint } from "../../drizzle/schema";
import { findDuplicateCandidates, saveAiRecommendation } from "../db";
import { invokeLLM } from "../_core/llm";

type Candidate = Awaited<ReturnType<typeof findDuplicateCandidates>>[number];
type Category = typeof categories.$inferSelect;

export type CivicAnalysis = {
  available: boolean;
  model: string | null;
  classification: { categoryId: number | null; confidence: number; reason: string };
  priority: { level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"; confidence: number; reason: string };
  duplicate: { candidateId: number | null; likelihood: number; reason: string };
};

export interface CivicAiService {
  analyze(input: { complaint: Complaint; categories: Category[]; candidates: Candidate[] }): Promise<CivicAnalysis>;
}

const priorityLevels = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

export const buildFallbackAnalysis = (reason: string): CivicAnalysis => ({
  available: false,
  model: null,
  classification: { categoryId: null, confidence: 0, reason },
  priority: { level: "MEDIUM", confidence: 0, reason },
  duplicate: { candidateId: null, likelihood: 0, reason },
});

function buildSchema(categoryIds: number[]) {
  return z.object({
    classification: z.object({ categoryId: z.number().int().nullable(), confidence: z.number().min(0).max(1), reason: z.string().max(500) }),
    priority: z.object({ level: z.enum(priorityLevels), confidence: z.number().min(0).max(1), reason: z.string().max(500) }),
    duplicate: z.object({ candidateId: z.number().int().nullable(), likelihood: z.number().min(0).max(1), reason: z.string().max(500) }),
  }).superRefine((result, context) => {
    if (result.classification.categoryId !== null && !categoryIds.includes(result.classification.categoryId)) context.addIssue({ code: "custom", message: "Unknown category id" });
  });
}

class LlmCivicAiService implements CivicAiService {
  async analyze({ complaint, categories, candidates }: { complaint: Complaint; categories: Category[]; candidates: Candidate[] }): Promise<CivicAnalysis> {
    const categoryIds = categories.map(category => category.id);
    const response = await invokeLLM({
      maxTokens: 700,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "civic_issue_recommendation",
          strict: true,
          schema: {
            type: "object",
            properties: {
              classification: { type: "object", properties: { categoryId: { type: ["integer", "null"] }, confidence: { type: "number" }, reason: { type: "string" } }, required: ["categoryId", "confidence", "reason"], additionalProperties: false },
              priority: { type: "object", properties: { level: { type: "string", enum: priorityLevels }, confidence: { type: "number" }, reason: { type: "string" } }, required: ["level", "confidence", "reason"], additionalProperties: false },
              duplicate: { type: "object", properties: { candidateId: { type: ["integer", "null"] }, likelihood: { type: "number" }, reason: { type: "string" } }, required: ["candidateId", "likelihood", "reason"], additionalProperties: false },
            },
            required: ["classification", "priority", "duplicate"],
            additionalProperties: false,
          },
        },
      },
      messages: [
        { role: "system", content: "You assist civic-service staff. Produce recommendations, not verified facts. Do not invent evidence, injuries, traffic volume, or government action. Use only the submitted report and candidate list. Confidence and duplicate likelihood must be numbers from 0 to 1. If evidence is insufficient, use a cautious reason and lower confidence. A possible duplicate must be a candidate provided in the list; otherwise use null." },
        { role: "user", content: JSON.stringify({
          task: "Classify the civic issue, recommend priority, and assess possible duplicates.",
          validCategories: categories.map(category => ({ id: category.id, name: category.name, description: category.description })),
          report: { id: complaint.id, title: complaint.title, description: complaint.description, selectedCategoryId: complaint.categoryId, location: complaint.address, latitude: complaint.latitude, longitude: complaint.longitude, submittedAt: complaint.createdAt.toISOString() },
          candidates: candidates.map(candidate => ({ id: candidate.id, title: candidate.title, description: candidate.description, categoryId: candidate.categoryId, location: candidate.address, latitude: candidate.latitude, longitude: candidate.longitude, submittedAt: candidate.createdAt })),
        }) },
      ],
    });
    const content = response.choices[0]?.message.content;
    if (typeof content !== "string") throw new Error("LLM returned a non-text recommendation");
    const parsed = buildSchema(categoryIds).parse(JSON.parse(content));
    if (parsed.duplicate.candidateId !== null && !candidates.some(candidate => candidate.id === parsed.duplicate.candidateId)) throw new Error("LLM selected an unknown duplicate candidate");
    return { available: true, model: response.model, ...parsed };
  }
}

class DisabledCivicAiService implements CivicAiService {
  async analyze() { return buildFallbackAnalysis("AI assistance is currently unavailable; reviewers will assess this report manually."); }
}

export function getCivicAiService(): CivicAiService {
  return process.env.CIVICFLOW_AI_ENABLED === "false" ? new DisabledCivicAiService() : new LlmCivicAiService();
}

export async function analyzeAndPersistComplaint(complaint: Complaint, categories: Category[]) {
  let analysis: CivicAnalysis;
  try {
    const candidates = await findDuplicateCandidates({ id: complaint.id, categoryId: complaint.categoryId, latitude: complaint.latitude, longitude: complaint.longitude });
    analysis = await getCivicAiService().analyze({ complaint, categories, candidates });
  } catch (error) {
    console.warn("[CIVICFLOW AI] Analysis unavailable:", error instanceof Error ? error.message : error);
    analysis = buildFallbackAnalysis("AI assistance is unavailable right now; reviewers will assess this report manually.");
  }
  await Promise.all([
    saveAiRecommendation({ complaintId: complaint.id, kind: "CLASSIFICATION", confidence: analysis.available ? analysis.classification.confidence.toFixed(2) : null, recommendation: analysis.classification, model: analysis.model, available: analysis.available }),
    saveAiRecommendation({ complaintId: complaint.id, kind: "PRIORITY", confidence: analysis.available ? analysis.priority.confidence.toFixed(2) : null, recommendation: analysis.priority, model: analysis.model, available: analysis.available }),
    saveAiRecommendation({ complaintId: complaint.id, kind: "DUPLICATE", confidence: analysis.available ? analysis.duplicate.likelihood.toFixed(2) : null, recommendation: analysis.duplicate, model: analysis.model, available: analysis.available }),
  ]);
  return analysis;
}
