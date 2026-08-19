import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  aiRecommendations,
  categories,
  complaintAssignments,
  complaintMedia,
  complaints,
  complaintStatusHistory,
  departments,
  feedback,
  type ComplaintStatus,
  type InsertUser,
  type PriorityLevel,
  type UserRole,
  notificationTypes,
  notifications,
  type User,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId, lastSignedIn: user.lastSignedIn ?? new Date() };
  const updateSet: Record<string, unknown> = { lastSignedIn: values.lastSignedIn };
  for (const field of ["name", "email", "phone", "loginMethod"] as const) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (user.departmentId !== undefined) {
    values.departmentId = user.departmentId ?? null;
    updateSet.departmentId = user.departmentId ?? null;
  }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function listUsersByRole(role: UserRole) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).where(eq(users.role, role)).orderBy(users.name);
}

export async function listUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(users.name);
}

export async function updateUserAdministration(input: { id: number; role: UserRole; departmentId?: number | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(users).set({ role: input.role, departmentId: input.role === "authority" ? input.departmentId ?? null : null }).where(eq(users.id, input.id));
}

export async function listDepartments() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(departments).where(eq(departments.active, true)).orderBy(departments.name);
}

export async function listAllDepartments() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(departments).orderBy(departments.name);
}

export async function createDepartment(input: { name: string; description?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(departments).values({ name: input.name, description: input.description ?? null, active: true });
}

export async function updateDepartmentActive(id: number, active: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(departments).set({ active }).where(eq(departments.id, id));
}

export async function listCategories() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(categories).where(eq(categories.active, true)).orderBy(categories.name);
}

export async function listAllCategories() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(categories).orderBy(categories.name);
}

export async function createCategory(input: { name: string; description?: string | null; departmentId?: number | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(categories).values({ name: input.name, description: input.description ?? null, departmentId: input.departmentId ?? null, active: true });
}

export async function updateCategoryActive(id: number, active: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(categories).set({ active }).where(eq(categories.id, id));
}

export async function seedDemoData() {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const existing = await db.select({ id: complaints.id }).from(complaints).where(eq(complaints.isDemo, true)).limit(1);
  if (existing.length) return { created: false, message: "Demo data already exists." };

  await db.transaction(async tx => {
    const departmentSeeds = [
      { name: "Roads & Transport", description: "Road safety and surface maintenance" },
      { name: "Sanitation Services", description: "Waste collection and public cleanliness" },
      { name: "Public Lighting", description: "Streetlight and public electrical maintenance" },
    ];
    for (const department of departmentSeeds) await tx.insert(departments).values({ ...department, active: true }).onDuplicateKeyUpdate({ set: { description: department.description, active: true } });
    const departmentRows = await tx.select().from(departments);
    const departmentByName = new Map(departmentRows.map(row => [row.name, row]));

    const categorySeeds = [
      { name: "Road Infrastructure", description: "Potholes, damaged roads, and unsafe road surfaces", departmentId: departmentByName.get("Roads & Transport")?.id ?? null },
      { name: "Waste & Sanitation", description: "Garbage accumulation and public cleanliness", departmentId: departmentByName.get("Sanitation Services")?.id ?? null },
      { name: "Street Lighting", description: "Broken or unsafe streetlights", departmentId: departmentByName.get("Public Lighting")?.id ?? null },
    ];
    for (const category of categorySeeds) await tx.insert(categories).values({ ...category, active: true }).onDuplicateKeyUpdate({ set: { description: category.description, departmentId: category.departmentId, active: true } });
    const categoryRows = await tx.select().from(categories);
    const categoryByName = new Map(categoryRows.map(row => [row.name, row]));

    await tx.insert(users).values({ openId: "civicflow-demo-citizen", name: "Demo Citizen", email: "demo.citizen@civicflow.invalid", loginMethod: "seed", role: "citizen" }).onDuplicateKeyUpdate({ set: { name: "Demo Citizen", role: "citizen" } });
    await tx.insert(users).values({ openId: "civicflow-demo-authority", name: "Demo Roads Officer", email: "demo.authority@civicflow.invalid", loginMethod: "seed", role: "authority", departmentId: departmentByName.get("Roads & Transport")?.id ?? null }).onDuplicateKeyUpdate({ set: { name: "Demo Roads Officer", role: "authority", departmentId: departmentByName.get("Roads & Transport")?.id ?? null } });
    const actorRows = await tx.select().from(users);
    const citizen = actorRows.find(row => row.openId === "civicflow-demo-citizen");
    const officer = actorRows.find(row => row.openId === "civicflow-demo-authority");
    if (!citizen || !officer) throw new Error("Demo actors could not be prepared.");

    const demoReports = [
      { publicId: "CF-DEMO-1001", title: "Deep pothole near the bus stop", description: "Clearly marked demo report: a large pothole is reported on the lane approaching the bus stop. It may affect two-wheelers.", category: "Road Infrastructure", department: "Roads & Transport", status: "IN_PROGRESS" as const, priority: "HIGH" as const, address: "Demo Ward 7, Main Road", latitude: "28.6139000", longitude: "77.2090000", note: "Repair crew scheduled for the next maintenance run." },
      { publicId: "CF-DEMO-1002", title: "Garbage accumulation beside community park", description: "Clearly marked demo report: waste collection is needed near the park entrance.", category: "Waste & Sanitation", department: "Sanitation Services", status: "VERIFIED" as const, priority: "MEDIUM" as const, address: "Demo Ward 7, Community Park", latitude: "28.6162000", longitude: "77.2142000", note: "Location and issue category verified." },
      { publicId: "CF-DEMO-1003", title: "Streetlight not working on pedestrian crossing", description: "Clearly marked demo report: the crossing is reported as poorly lit after dusk.", category: "Street Lighting", department: "Public Lighting", status: "RESOLVED" as const, priority: "HIGH" as const, address: "Demo Ward 3, Pedestrian Crossing", latitude: "28.6045000", longitude: "77.2251000", note: "Lighting unit was inspected and restored.", resolutionSummary: "Demo resolution: the reported lighting unit was restored and the immediate area was checked." },
      { publicId: "CF-DEMO-1004", title: "Loose paving stones on market footpath", description: "Clearly marked demo report: uneven paving is reported at a busy market footpath.", category: "Road Infrastructure", department: "Roads & Transport", status: "SUBMITTED" as const, priority: "LOW" as const, address: "Demo Ward 2, Market Footpath", latitude: "28.6201000", longitude: "77.2014000", note: "Initial report received." },
    ];
    for (const report of demoReports) {
      const inserted = await tx.insert(complaints).values({ publicId: report.publicId, citizenId: citizen.id, categoryId: categoryByName.get(report.category)?.id ?? null, title: report.title, description: report.description, latitude: report.latitude, longitude: report.longitude, address: report.address, priority: report.priority, status: report.status, assignedDepartmentId: report.status === "SUBMITTED" ? null : departmentByName.get(report.department)?.id ?? null, assignedUserId: report.status === "SUBMITTED" ? null : officer.id, isDemo: true, resolvedAt: report.status === "RESOLVED" ? new Date() : null, resolutionSummary: report.resolutionSummary ?? null }).$returningId();
      const complaintId = inserted[0]!.id;
      await tx.insert(complaintStatusHistory).values({ complaintId, previousStatus: null, newStatus: "SUBMITTED", changedBy: citizen.id, note: "Demo report submitted." });
      if (report.status !== "SUBMITTED") await tx.insert(complaintStatusHistory).values({ complaintId, previousStatus: "SUBMITTED", newStatus: report.status, changedBy: officer.id, note: report.note });
      if (report.status !== "SUBMITTED") await tx.insert(complaintAssignments).values({ complaintId, departmentId: departmentByName.get(report.department)?.id ?? null, assignedTo: officer.id, assignedBy: officer.id, note: "Demo assignment for operational walkthrough." });
    }
  });
  return { created: true, message: "Clearly labeled demo reports and actors were created." };
}

export async function createComplaint(input: {
  publicId: string;
  citizenId: number;
  title: string;
  description: string;
  categoryId?: number | null;
  latitude?: string | null;
  longitude?: string | null;
  address?: string | null;
  priority?: PriorityLevel;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.transaction(async tx => {
    const inserted = await tx.insert(complaints).values({
      ...input,
      status: "SUBMITTED",
      priority: input.priority ?? "MEDIUM",
    }).$returningId();
    const complaintId = inserted[0]!.id;
    await tx.insert(complaintStatusHistory).values({
      complaintId,
      previousStatus: null,
      newStatus: "SUBMITTED",
      changedBy: input.citizenId,
      note: "Report submitted by citizen.",
    });
    return complaintId;
  });
}

export async function getComplaintById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(complaints).where(eq(complaints.id, id)).limit(1);
  return result[0];
}

export async function getComplaintByPublicId(publicId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(complaints).where(eq(complaints.publicId, publicId)).limit(1);
  return result[0];
}

export async function getComplaintDetail(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const complaint = await getComplaintById(id);
  if (!complaint) return undefined;
  const [category, department, assignee, citizen, media, history, recommendations, citizenFeedback] = await Promise.all([
    complaint.categoryId ? db.select().from(categories).where(eq(categories.id, complaint.categoryId)).limit(1) : [],
    complaint.assignedDepartmentId ? db.select().from(departments).where(eq(departments.id, complaint.assignedDepartmentId)).limit(1) : [],
    complaint.assignedUserId ? db.select().from(users).where(eq(users.id, complaint.assignedUserId)).limit(1) : [],
    db.select().from(users).where(eq(users.id, complaint.citizenId)).limit(1),
    db.select().from(complaintMedia).where(eq(complaintMedia.complaintId, id)).orderBy(desc(complaintMedia.createdAt)),
    db.select().from(complaintStatusHistory).where(eq(complaintStatusHistory.complaintId, id)).orderBy(complaintStatusHistory.createdAt),
    db.select().from(aiRecommendations).where(eq(aiRecommendations.complaintId, id)).orderBy(desc(aiRecommendations.createdAt)),
    db.select().from(feedback).where(eq(feedback.complaintId, id)).orderBy(desc(feedback.createdAt)),
  ]);
  return {
    complaint,
    category: category[0] ?? null,
    department: department[0] ?? null,
    assignee: assignee[0] ?? null,
    citizen: citizen[0] ?? null,
    media: media.map(({ url: _url, ...item }) => item),
    history,
    recommendations,
    feedback: citizenFeedback,
  };
}

export async function listCitizenComplaints(citizenId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(complaints).where(eq(complaints.citizenId, citizenId)).orderBy(desc(complaints.updatedAt));
}

export async function listAuthorityComplaints(filters?: {
  status?: ComplaintStatus;
  priority?: PriorityLevel;
  categoryId?: number;
  departmentId?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [
    filters?.status ? eq(complaints.status, filters.status) : undefined,
    filters?.priority ? eq(complaints.priority, filters.priority) : undefined,
    filters?.categoryId ? eq(complaints.categoryId, filters.categoryId) : undefined,
    filters?.departmentId ? eq(complaints.assignedDepartmentId, filters.departmentId) : undefined,
  ].filter(Boolean) as ReturnType<typeof eq>[];
  return db.select().from(complaints).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(complaints.updatedAt));
}

export async function addComplaintMedia(input: {
  complaintId: number;
  storageKey: string;
  url: string;
  mediaType: "EVIDENCE" | "RESOLUTION";
  mimeType: string;
  originalFilename: string;
  sizeBytes: number;
  uploadedBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const inserted = await db.insert(complaintMedia).values(input).$returningId();
  return inserted[0]!.id;
}

export async function getComplaintMediaById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(complaintMedia).where(eq(complaintMedia.id, id)).limit(1);
  return result[0];
}

export async function updateComplaintStatus(input: {
  complaintId: number;
  previousStatus: ComplaintStatus;
  status: ComplaintStatus;
  changedBy: number;
  note?: string | null;
  resolutionSummary?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.transaction(async tx => {
    await tx.update(complaints).set({
      status: input.status,
      resolutionSummary: input.resolutionSummary ?? undefined,
      resolvedAt: input.status === "RESOLVED" ? new Date() : undefined,
    }).where(eq(complaints.id, input.complaintId));
    await tx.insert(complaintStatusHistory).values({
      complaintId: input.complaintId,
      previousStatus: input.previousStatus,
      newStatus: input.status,
      changedBy: input.changedBy,
      note: input.note ?? null,
    });
  });
}

export async function assignComplaint(input: {
  complaintId: number;
  departmentId?: number | null;
  assignedTo?: number | null;
  assignedBy: number;
  note?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.transaction(async tx => {
    await tx.update(complaints).set({
      assignedDepartmentId: input.departmentId ?? null,
      assignedUserId: input.assignedTo ?? null,
      status: "ASSIGNED",
    }).where(eq(complaints.id, input.complaintId));
    await tx.insert(complaintAssignments).values(input);
  });
}

export async function updateComplaintPriority(complaintId: number, priority: PriorityLevel) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(complaints).set({ priority }).where(eq(complaints.id, complaintId));
}

export async function saveAiRecommendation(input: {
  complaintId: number;
  kind: "CLASSIFICATION" | "PRIORITY" | "DUPLICATE";
  confidence?: string | null;
  recommendation: Record<string, unknown>;
  model?: string | null;
  available?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(aiRecommendations).values({ ...input, available: input.available ?? true });
}

export async function findDuplicateCandidates(input: {
  id: number;
  categoryId: number | null;
  latitude: string | null;
  longitude: string | null;
}) {
  const db = await getDb();
  if (!db) return [];
  const recent = await db.select().from(complaints).orderBy(desc(complaints.createdAt)).limit(20);
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  return recent.filter(candidate => candidate.id !== input.id && candidate.createdAt.getTime() >= cutoff && (!input.categoryId || candidate.categoryId === input.categoryId)).map(candidate => ({
    id: candidate.id,
    publicId: candidate.publicId,
    title: candidate.title,
    description: candidate.description.slice(0, 650),
    categoryId: candidate.categoryId,
    address: candidate.address,
    createdAt: candidate.createdAt.toISOString(),
    latitude: candidate.latitude,
    longitude: candidate.longitude,
  }));
}

export async function createNotification(input: {
  userId: number;
  complaintId?: number | null;
  type: (typeof notificationTypes)[number];
  title: string;
  message: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(notifications).values(input);
}

export async function listNotifications(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
}

export async function markNotificationRead(notificationId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
}

export async function submitFeedback(input: { complaintId: number; citizenId: number; rating: number; comment?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(feedback).values(input);
}

export async function dashboardMetrics() {
  const db = await getDb();
  if (!db) return { total: 0, byStatus: {}, byPriority: {}, byCategory: [], averageResolutionHours: null };
  const [records, categoryRows] = await Promise.all([
    db.select().from(complaints),
    db.select().from(categories),
  ]);
  const byStatus: Record<string, number> = {};
  const byPriority: Record<string, number> = {};
  const byCategoryCount: Record<number, number> = {};
  let resolutionHoursTotal = 0;
  let resolvedCount = 0;
  for (const record of records) {
    byStatus[record.status] = (byStatus[record.status] ?? 0) + 1;
    byPriority[record.priority] = (byPriority[record.priority] ?? 0) + 1;
    if (record.categoryId) byCategoryCount[record.categoryId] = (byCategoryCount[record.categoryId] ?? 0) + 1;
    if (record.resolvedAt) {
      resolutionHoursTotal += (record.resolvedAt.getTime() - record.createdAt.getTime()) / 3_600_000;
      resolvedCount += 1;
    }
  }
  return {
    total: records.length,
    byStatus,
    byPriority,
    byCategory: categoryRows.map(category => ({ name: category.name, value: byCategoryCount[category.id] ?? 0 })),
    averageResolutionHours: resolvedCount ? Math.round((resolutionHoursTotal / resolvedCount) * 10) / 10 : null,
  };
}

export async function getNearbyComplaintCandidates(categoryId: number | null, createdAfter: Date) {
  const db = await getDb();
  if (!db) return [];
  if (categoryId) {
    return db.select().from(complaints).where(and(eq(complaints.categoryId, categoryId), sql`${complaints.createdAt} >= ${createdAfter}`)).orderBy(desc(complaints.createdAt));
  }
  return db.select().from(complaints).where(sql`${complaints.createdAt} >= ${createdAfter}`).orderBy(desc(complaints.createdAt));
}
