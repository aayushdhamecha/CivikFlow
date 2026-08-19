import type { ComplaintStatus, UserRole } from "../../drizzle/schema";
import { TRPCError } from "@trpc/server";

const citizenTransitions: Partial<Record<ComplaintStatus, ComplaintStatus[]>> = {
  NEEDS_INFORMATION: ["SUBMITTED"],
};

const authorityTransitions: Partial<Record<ComplaintStatus, ComplaintStatus[]>> = {
  SUBMITTED: ["UNDER_REVIEW", "DUPLICATE", "REJECTED", "NEEDS_INFORMATION"],
  UNDER_REVIEW: ["VERIFIED", "DUPLICATE", "REJECTED", "NEEDS_INFORMATION"],
  VERIFIED: ["ASSIGNED", "IN_PROGRESS", "NEEDS_INFORMATION", "REJECTED"],
  ASSIGNED: ["IN_PROGRESS", "NEEDS_INFORMATION", "REJECTED"],
  IN_PROGRESS: ["RESOLVED", "NEEDS_INFORMATION"],
  NEEDS_INFORMATION: ["UNDER_REVIEW", "VERIFIED", "REJECTED"],
  DUPLICATE: ["UNDER_REVIEW", "CLOSED"],
  REJECTED: ["UNDER_REVIEW", "CLOSED"],
  RESOLVED: ["CLOSED", "IN_PROGRESS"],
};

export function getAuthorityTransitions(currentStatus: ComplaintStatus): ComplaintStatus[] {
  return authorityTransitions[currentStatus] ?? [];
}

export function validateStatusTransition(
  role: UserRole,
  currentStatus: ComplaintStatus,
  nextStatus: ComplaintStatus,
) {
  if (currentStatus === nextStatus) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "The complaint is already in this status." });
  }

  const permitted = role === "citizen" ? citizenTransitions[currentStatus] : authorityTransitions[currentStatus];
  if (!permitted?.includes(nextStatus)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `A ${role} cannot move a complaint from ${currentStatus} to ${nextStatus}.`,
    });
  }
}

export function statusLabel(status: ComplaintStatus) {
  return status.toLowerCase().split("_").map(word => word[0]?.toUpperCase() + word.slice(1)).join(" ");
}
