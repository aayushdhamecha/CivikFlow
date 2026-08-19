import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { complaintStatuses, priorityLevels } from "../../drizzle/schema";
import {
  assignComplaint,
  createComplaint,
  createCategory,
  createDepartment,
  createNotification,
  getComplaintById,
  getComplaintDetail,
  getComplaintMediaById,
  getComplaintByPublicId,
  listAuthorityComplaints,
  listAllCategories,
  listAllDepartments,
  listCategories,
  listCitizenComplaints,
  listDepartments,
  listNotifications,
  listUsers,
  listUsersByRole,
  markNotificationRead,
  submitFeedback,
  seedDemoData,
  updateComplaintPriority,
  updateComplaintStatus,
  updateCategoryActive,
  updateDepartmentActive,
  updateUserAdministration,
} from "../db";
import { assertAuthorityCanAccessComplaint, assertCitizenOwnsComplaint } from "../civic/permissions";
import { getAuthorityTransitions, validateStatusTransition } from "../civic/workflow";
import { adminProcedure, authorityProcedure, protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { storageGetSignedUrl } from "../storage";
import { evidenceUploadSchema, uploadComplaintEvidence } from "../civic/evidence";
import { analyzeAndPersistComplaint } from "../civic/aiService";

export const complaintInput = z.object({
  title: z.string().trim().min(6, "Give the issue a clear title.").max(160),
  description: z.string().trim().min(12, "Please add a little more detail about the problem.").max(5_000),
  categoryId: z.number().int().positive("Choose an issue category."),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().trim().max(500).nullable().optional(),
});

function serializeCoordinate(value: number | null | undefined) {
  return value === null || value === undefined ? null : value.toFixed(7);
}

export const civicRouter = router({
  catalog: router({
    categories: publicProcedure.query(() => listCategories()),
    departments: publicProcedure.query(() => listDepartments()),
  }),

  complaints: router({
    create: protectedProcedure.input(complaintInput).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "citizen") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only citizen accounts can submit reports." });
      }
      const complaintId = await createComplaint({
        publicId: `CF-${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`,
        citizenId: ctx.user.id,
        title: input.title,
        description: input.description,
        categoryId: input.categoryId,
        latitude: serializeCoordinate(input.latitude),
        longitude: serializeCoordinate(input.longitude),
        address: input.address ?? null,
      });
      const complaint = await getComplaintById(complaintId);
      if (!complaint) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "We could not create your report." });
      await analyzeAndPersistComplaint(complaint, await listCategories());
      await createNotification({
        userId: ctx.user.id,
        complaintId,
        type: "COMPLAINT_CREATED",
        title: "Report received",
        message: `Your report ${complaint.publicId} has been submitted and is awaiting review.`,
      });
      return complaint;
    }),

    uploadEvidence: protectedProcedure.input(evidenceUploadSchema).mutation(({ ctx, input }) => uploadComplaintEvidence(ctx.user, input)),

    mine: protectedProcedure.query(({ ctx }) => {
      if (ctx.user.role !== "citizen") throw new TRPCError({ code: "FORBIDDEN", message: "Citizen access is required." });
      return listCitizenComplaints(ctx.user.id);
    }),

    mineDetail: protectedProcedure.input(z.object({ publicId: z.string().min(3).max(32) })).query(async ({ ctx, input }) => {
      if (ctx.user.role !== "citizen") throw new TRPCError({ code: "FORBIDDEN", message: "Citizen access is required." });
      const complaint = await getComplaintByPublicId(input.publicId);
      if (!complaint) throw new TRPCError({ code: "NOT_FOUND", message: "Report not found." });
      assertCitizenOwnsComplaint(ctx.user, complaint);
      return getComplaintDetail(complaint.id);
    }),

    mediaAccess: protectedProcedure.input(z.object({ mediaId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const media = await getComplaintMediaById(input.mediaId);
      if (!media) throw new TRPCError({ code: "NOT_FOUND", message: "Evidence not found." });
      const complaint = await getComplaintById(media.complaintId);
      if (!complaint) throw new TRPCError({ code: "NOT_FOUND", message: "Report not found." });
      if (ctx.user.role === "citizen") assertCitizenOwnsComplaint(ctx.user, complaint);
      else assertAuthorityCanAccessComplaint(ctx.user, complaint);
      return { url: await storageGetSignedUrl(media.storageKey) };
    }),

    addFeedback: protectedProcedure.input(z.object({
      publicId: z.string().min(3).max(32),
      rating: z.number().int().min(1).max(5),
      comment: z.string().trim().max(1_000).nullable().optional(),
    })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "citizen") throw new TRPCError({ code: "FORBIDDEN", message: "Citizen access is required." });
      const complaint = await getComplaintByPublicId(input.publicId);
      if (!complaint) throw new TRPCError({ code: "NOT_FOUND", message: "Report not found." });
      assertCitizenOwnsComplaint(ctx.user, complaint);
      if (complaint.status !== "RESOLVED" && complaint.status !== "CLOSED") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Feedback is available once a report is resolved." });
      }
      await submitFeedback({ complaintId: complaint.id, citizenId: ctx.user.id, rating: input.rating, comment: input.comment ?? null });
      return { success: true };
    }),
  }),

  notifications: router({
    list: protectedProcedure.query(({ ctx }) => listNotifications(ctx.user.id)),
    markRead: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      await markNotificationRead(input.id, ctx.user.id);
      return { success: true };
    }),
  }),

  authority: router({
    dashboard: authorityProcedure.query(async ({ ctx }) => {
      const [allRecords, categoryRows] = await Promise.all([listAuthorityComplaints(), listCategories()]);
      const records = ctx.user.role === "admin" ? allRecords : allRecords.filter(record => !record.assignedDepartmentId || record.assignedDepartmentId === ctx.user.departmentId);
      const byStatus: Record<string, number> = {};
      const byPriority: Record<string, number> = {};
      const byCategoryCount: Record<number, number> = {};
      let totalResolutionHours = 0;
      let resolvedCount = 0;
      records.forEach(record => {
        byStatus[record.status] = (byStatus[record.status] ?? 0) + 1;
        byPriority[record.priority] = (byPriority[record.priority] ?? 0) + 1;
        if (record.categoryId) byCategoryCount[record.categoryId] = (byCategoryCount[record.categoryId] ?? 0) + 1;
        if (record.resolvedAt) { totalResolutionHours += (record.resolvedAt.getTime() - record.createdAt.getTime()) / 3_600_000; resolvedCount += 1; }
      });
      return {
        total: records.length,
        byStatus,
        byPriority,
        byCategory: categoryRows.map(category => ({ name: category.name, value: byCategoryCount[category.id] ?? 0 })),
        averageResolutionHours: resolvedCount ? Math.round((totalResolutionHours / resolvedCount) * 10) / 10 : null,
        mapPoints: records.filter(record => record.latitude && record.longitude).map(record => ({ id: record.id, publicId: record.publicId, title: record.title, status: record.status, priority: record.priority, latitude: Number(record.latitude), longitude: Number(record.longitude) })),
      };
    }),

    teamMembers: authorityProcedure.query(async ({ ctx }) => {
      const members = await listUsersByRole("authority");
      return ctx.user.role === "admin" ? members : members.filter(member => member.departmentId === ctx.user.departmentId);
    }),

    complaints: authorityProcedure.input(z.object({
      status: z.enum(complaintStatuses).optional(),
      priority: z.enum(priorityLevels).optional(),
      categoryId: z.number().int().positive().optional(),
      departmentId: z.number().int().positive().optional(),
    }).optional()).query(async ({ ctx, input }) => {
      if (ctx.user.role === "authority" && input?.departmentId && input.departmentId !== ctx.user.departmentId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You can only filter to your department." });
      }
      const records = await listAuthorityComplaints(input);
      return ctx.user.role === "admin" ? records : records.filter(record => !record.assignedDepartmentId || record.assignedDepartmentId === ctx.user.departmentId);
    }),

    detail: authorityProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const complaint = await getComplaintById(input.id);
      if (!complaint) throw new TRPCError({ code: "NOT_FOUND", message: "Report not found." });
      assertAuthorityCanAccessComplaint(ctx.user, complaint);
      return getComplaintDetail(complaint.id);
    }),

    availableTransitions: authorityProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const complaint = await getComplaintById(input.id);
      if (!complaint) throw new TRPCError({ code: "NOT_FOUND", message: "Report not found." });
      assertAuthorityCanAccessComplaint(ctx.user, complaint);
      return getAuthorityTransitions(complaint.status);
    }),

    changeStatus: authorityProcedure.input(z.object({
      id: z.number().int().positive(),
      status: z.enum(complaintStatuses),
      note: z.string().trim().max(2_000).nullable().optional(),
      resolutionSummary: z.string().trim().max(3_000).nullable().optional(),
    })).mutation(async ({ ctx, input }) => {
      const complaint = await getComplaintById(input.id);
      if (!complaint) throw new TRPCError({ code: "NOT_FOUND", message: "Report not found." });
      assertAuthorityCanAccessComplaint(ctx.user, complaint);
      validateStatusTransition(ctx.user.role, complaint.status, input.status);
      if (input.status === "RESOLVED" && !input.resolutionSummary) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Add a resolution summary before resolving a report." });
      }
      await updateComplaintStatus({
        complaintId: complaint.id,
        previousStatus: complaint.status,
        status: input.status,
        changedBy: ctx.user.id,
        note: input.note,
        resolutionSummary: input.resolutionSummary,
      });
      await createNotification({
        userId: complaint.citizenId,
        complaintId: complaint.id,
        type: input.status === "RESOLVED" ? "COMPLAINT_RESOLVED" : input.status === "VERIFIED" ? "COMPLAINT_VERIFIED" : "STATUS_CHANGED",
        title: input.status === "RESOLVED" ? "Your issue has been resolved" : input.status === "VERIFIED" ? "Your report has been verified" : "Your report has been updated",
        message: `${complaint.publicId} is now ${input.status.toLowerCase().replaceAll("_", " ")}.`,
      });
      if (input.status === "RESOLVED") {
        await createNotification({
          userId: complaint.citizenId,
          complaintId: complaint.id,
          type: "FEEDBACK_REQUESTED",
          title: "How was the resolution?",
          message: `Share feedback about the resolution of ${complaint.publicId}.`,
        });
      }
      return { success: true };
    }),

    assign: authorityProcedure.input(z.object({
      id: z.number().int().positive(),
      departmentId: z.number().int().positive().nullable().optional(),
      assignedTo: z.number().int().positive().nullable().optional(),
      note: z.string().trim().max(2_000).nullable().optional(),
    })).mutation(async ({ ctx, input }) => {
      const complaint = await getComplaintById(input.id);
      if (!complaint) throw new TRPCError({ code: "NOT_FOUND", message: "Report not found." });
      assertAuthorityCanAccessComplaint(ctx.user, complaint);
      if (ctx.user.role === "authority" && input.departmentId && input.departmentId !== ctx.user.departmentId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You can only assign reports within your department." });
      }
      await assignComplaint({ complaintId: complaint.id, departmentId: input.departmentId, assignedTo: input.assignedTo, assignedBy: ctx.user.id, note: input.note });
      await updateComplaintStatus({ complaintId: complaint.id, previousStatus: complaint.status, status: "ASSIGNED", changedBy: ctx.user.id, note: input.note });
      await createNotification({
        userId: complaint.citizenId,
        complaintId: complaint.id,
        type: "COMPLAINT_ASSIGNED",
        title: "Your report has been assigned",
        message: `${complaint.publicId} has been assigned to the responsible team.`,
      });
      return { success: true };
    }),

    updatePriority: authorityProcedure.input(z.object({ id: z.number().int().positive(), priority: z.enum(priorityLevels) })).mutation(async ({ ctx, input }) => {
      const complaint = await getComplaintById(input.id);
      if (!complaint) throw new TRPCError({ code: "NOT_FOUND", message: "Report not found." });
      assertAuthorityCanAccessComplaint(ctx.user, complaint);
      await updateComplaintPriority(complaint.id, input.priority);
      return { success: true };
    }),

    rerunAnalysis: authorityProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const complaint = await getComplaintById(input.id);
      if (!complaint) throw new TRPCError({ code: "NOT_FOUND", message: "Report not found." });
      assertAuthorityCanAccessComplaint(ctx.user, complaint);
      return analyzeAndPersistComplaint(complaint, await listCategories());
    }),
  }),

  admin: router({
    users: adminProcedure.query(() => listUsers()),
    updateUser: adminProcedure.input(z.object({ id: z.number().int().positive(), role: z.enum(["citizen", "authority", "admin"]), departmentId: z.number().int().positive().nullable().optional() })).mutation(async ({ ctx, input }) => {
      if (input.id === ctx.user.id && input.role !== "admin") throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot remove your own administrator access." });
      await updateUserAdministration(input);
      return { success: true };
    }),
    departments: adminProcedure.query(() => listAllDepartments()),
    createDepartment: adminProcedure.input(z.object({ name: z.string().trim().min(2).max(120), description: z.string().trim().max(1_000).nullable().optional() })).mutation(async ({ input }) => {
      await createDepartment(input);
      return { success: true };
    }),
    setDepartmentActive: adminProcedure.input(z.object({ id: z.number().int().positive(), active: z.boolean() })).mutation(async ({ input }) => {
      await updateDepartmentActive(input.id, input.active);
      return { success: true };
    }),
    categories: adminProcedure.query(() => listAllCategories()),
    createCategory: adminProcedure.input(z.object({ name: z.string().trim().min(2).max(120), description: z.string().trim().max(1_000).nullable().optional(), departmentId: z.number().int().positive().nullable().optional() })).mutation(async ({ input }) => {
      await createCategory(input);
      return { success: true };
    }),
    setCategoryActive: adminProcedure.input(z.object({ id: z.number().int().positive(), active: z.boolean() })).mutation(async ({ input }) => {
      await updateCategoryActive(input.id, input.active);
      return { success: true };
    }),
    seedDemoData: adminProcedure.mutation(() => seedDemoData()),
  }),
});
