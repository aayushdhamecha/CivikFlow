import {
  boolean,
  decimal,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const userRoles = ["citizen", "authority", "admin"] as const;
export const complaintStatuses = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "VERIFIED",
  "ASSIGNED",
  "IN_PROGRESS",
  "NEEDS_INFORMATION",
  "DUPLICATE",
  "REJECTED",
  "RESOLVED",
  "CLOSED",
] as const;
export const priorityLevels = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export const notificationTypes = [
  "COMPLAINT_CREATED",
  "COMPLAINT_VERIFIED",
  "COMPLAINT_ASSIGNED",
  "STATUS_CHANGED",
  "COMPLAINT_RESOLVED",
  "FEEDBACK_REQUESTED",
] as const;

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 32 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", userRoles).default("citizen").notNull(),
  departmentId: int("departmentId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
}, table => [index("users_role_idx").on(table.role), index("users_department_idx").on(table.departmentId)]);

export const departments = mysqlTable("departments", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 120 }).notNull().unique(),
  description: text("description"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 120 }).notNull().unique(),
  description: text("description"),
  departmentId: int("departmentId"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("categories_department_idx").on(table.departmentId)]);

export const complaints = mysqlTable("complaints", {
  id: int("id").autoincrement().primaryKey(),
  publicId: varchar("publicId", { length: 32 }).notNull().unique(),
  citizenId: int("citizenId").notNull(),
  categoryId: int("categoryId"),
  title: varchar("title", { length: 160 }).notNull(),
  description: text("description").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  address: varchar("address", { length: 500 }),
  priority: mysqlEnum("priority", priorityLevels).default("MEDIUM").notNull(),
  status: mysqlEnum("status", complaintStatuses).default("SUBMITTED").notNull(),
  assignedDepartmentId: int("assignedDepartmentId"),
  assignedUserId: int("assignedUserId"),
  resolvedAt: timestamp("resolvedAt"),
  resolutionSummary: text("resolutionSummary"),
  isDemo: boolean("isDemo").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  index("complaints_citizen_idx").on(table.citizenId),
  index("complaints_status_idx").on(table.status),
  index("complaints_priority_idx").on(table.priority),
  index("complaints_category_idx").on(table.categoryId),
  index("complaints_department_idx").on(table.assignedDepartmentId),
  index("complaints_created_idx").on(table.createdAt),
]);

export const complaintMedia = mysqlTable("complaintMedia", {
  id: int("id").autoincrement().primaryKey(),
  complaintId: int("complaintId").notNull(),
  storageKey: varchar("storageKey", { length: 512 }).notNull().unique(),
  url: varchar("url", { length: 1024 }).notNull(),
  mediaType: mysqlEnum("mediaType", ["EVIDENCE", "RESOLUTION"]).default("EVIDENCE").notNull(),
  mimeType: varchar("mimeType", { length: 120 }).notNull(),
  originalFilename: varchar("originalFilename", { length: 255 }).notNull(),
  sizeBytes: int("sizeBytes").notNull(),
  uploadedBy: int("uploadedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("complaint_media_complaint_idx").on(table.complaintId)]);

export const complaintStatusHistory = mysqlTable("complaintStatusHistory", {
  id: int("id").autoincrement().primaryKey(),
  complaintId: int("complaintId").notNull(),
  previousStatus: mysqlEnum("previousStatus", complaintStatuses),
  newStatus: mysqlEnum("newStatus", complaintStatuses).notNull(),
  changedBy: int("changedBy").notNull(),
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("status_history_complaint_idx").on(table.complaintId), index("status_history_created_idx").on(table.createdAt)]);

export const complaintAssignments = mysqlTable("complaintAssignments", {
  id: int("id").autoincrement().primaryKey(),
  complaintId: int("complaintId").notNull(),
  departmentId: int("departmentId"),
  assignedTo: int("assignedTo"),
  assignedBy: int("assignedBy").notNull(),
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("assignments_complaint_idx").on(table.complaintId), index("assignments_assignee_idx").on(table.assignedTo)]);

export const aiRecommendations = mysqlTable("aiRecommendations", {
  id: int("id").autoincrement().primaryKey(),
  complaintId: int("complaintId").notNull(),
  kind: mysqlEnum("kind", ["CLASSIFICATION", "PRIORITY", "DUPLICATE"]).notNull(),
  confidence: decimal("confidence", { precision: 5, scale: 2 }),
  recommendation: json("recommendation").notNull(),
  model: varchar("model", { length: 160 }),
  available: boolean("available").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("ai_recommendations_complaint_idx").on(table.complaintId), index("ai_recommendations_kind_idx").on(table.kind)]);

export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  complaintId: int("complaintId"),
  type: mysqlEnum("type", notificationTypes).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("notifications_user_idx").on(table.userId), index("notifications_unread_idx").on(table.userId, table.readAt)]);

export const feedback = mysqlTable("feedback", {
  id: int("id").autoincrement().primaryKey(),
  complaintId: int("complaintId").notNull(),
  citizenId: int("citizenId").notNull(),
  rating: int("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  uniqueIndex("feedback_complaint_citizen_unique").on(table.complaintId, table.citizenId),
  index("feedback_complaint_idx").on(table.complaintId),
]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Complaint = typeof complaints.$inferSelect;
export type ComplaintStatus = (typeof complaintStatuses)[number];
export type PriorityLevel = (typeof priorityLevels)[number];
export type UserRole = (typeof userRoles)[number];
