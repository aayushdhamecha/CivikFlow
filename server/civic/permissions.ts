import { TRPCError } from "@trpc/server";
import type { Complaint, User } from "../../drizzle/schema";

export function assertCitizenOwnsComplaint(user: User, complaint: Complaint) {
  if (user.role !== "citizen" || complaint.citizenId !== user.id) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You can only access your own reports." });
  }
}

export function assertAuthorityCanAccessComplaint(user: User, complaint: Complaint) {
  if (user.role === "admin") return;
  if (user.role !== "authority") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Authority access is required." });
  }
  if (complaint.assignedDepartmentId && complaint.assignedDepartmentId !== user.departmentId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "This report is assigned outside your department." });
  }
}
