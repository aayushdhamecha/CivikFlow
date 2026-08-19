CREATE TABLE `aiRecommendations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`complaintId` int NOT NULL,
	`kind` enum('CLASSIFICATION','PRIORITY','DUPLICATE') NOT NULL,
	`confidence` decimal(5,2),
	`recommendation` json NOT NULL,
	`model` varchar(160),
	`available` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `aiRecommendations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`description` text,
	`departmentId` int,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `categories_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `complaintAssignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`complaintId` int NOT NULL,
	`departmentId` int,
	`assignedTo` int,
	`assignedBy` int NOT NULL,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `complaintAssignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `complaintMedia` (
	`id` int AUTO_INCREMENT NOT NULL,
	`complaintId` int NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`url` varchar(1024) NOT NULL,
	`mediaType` enum('EVIDENCE','RESOLUTION') NOT NULL DEFAULT 'EVIDENCE',
	`mimeType` varchar(120) NOT NULL,
	`originalFilename` varchar(255) NOT NULL,
	`sizeBytes` int NOT NULL,
	`uploadedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `complaintMedia_id` PRIMARY KEY(`id`),
	CONSTRAINT `complaintMedia_storageKey_unique` UNIQUE(`storageKey`)
);
--> statement-breakpoint
CREATE TABLE `complaintStatusHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`complaintId` int NOT NULL,
	`previousStatus` enum('SUBMITTED','UNDER_REVIEW','VERIFIED','ASSIGNED','IN_PROGRESS','NEEDS_INFORMATION','DUPLICATE','REJECTED','RESOLVED','CLOSED'),
	`newStatus` enum('SUBMITTED','UNDER_REVIEW','VERIFIED','ASSIGNED','IN_PROGRESS','NEEDS_INFORMATION','DUPLICATE','REJECTED','RESOLVED','CLOSED') NOT NULL,
	`changedBy` int NOT NULL,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `complaintStatusHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `complaints` (
	`id` int AUTO_INCREMENT NOT NULL,
	`publicId` varchar(32) NOT NULL,
	`citizenId` int NOT NULL,
	`categoryId` int,
	`title` varchar(160) NOT NULL,
	`description` text NOT NULL,
	`latitude` decimal(10,7),
	`longitude` decimal(10,7),
	`address` varchar(500),
	`priority` enum('LOW','MEDIUM','HIGH','CRITICAL') NOT NULL DEFAULT 'MEDIUM',
	`status` enum('SUBMITTED','UNDER_REVIEW','VERIFIED','ASSIGNED','IN_PROGRESS','NEEDS_INFORMATION','DUPLICATE','REJECTED','RESOLVED','CLOSED') NOT NULL DEFAULT 'SUBMITTED',
	`assignedDepartmentId` int,
	`assignedUserId` int,
	`resolvedAt` timestamp,
	`resolutionSummary` text,
	`isDemo` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `complaints_id` PRIMARY KEY(`id`),
	CONSTRAINT `complaints_publicId_unique` UNIQUE(`publicId`)
);
--> statement-breakpoint
CREATE TABLE `departments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`description` text,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `departments_id` PRIMARY KEY(`id`),
	CONSTRAINT `departments_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `feedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`complaintId` int NOT NULL,
	`citizenId` int NOT NULL,
	`rating` int NOT NULL,
	`comment` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `feedback_id` PRIMARY KEY(`id`),
	CONSTRAINT `feedback_complaint_citizen_unique` UNIQUE(`complaintId`,`citizenId`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`complaintId` int,
	`type` enum('COMPLAINT_CREATED','COMPLAINT_VERIFIED','COMPLAINT_ASSIGNED','STATUS_CHANGED','COMPLAINT_RESOLVED','FEEDBACK_REQUESTED') NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('citizen','authority','admin') NOT NULL DEFAULT 'citizen';--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(32);--> statement-breakpoint
ALTER TABLE `users` ADD `departmentId` int;--> statement-breakpoint
CREATE INDEX `ai_recommendations_complaint_idx` ON `aiRecommendations` (`complaintId`);--> statement-breakpoint
CREATE INDEX `ai_recommendations_kind_idx` ON `aiRecommendations` (`kind`);--> statement-breakpoint
CREATE INDEX `categories_department_idx` ON `categories` (`departmentId`);--> statement-breakpoint
CREATE INDEX `assignments_complaint_idx` ON `complaintAssignments` (`complaintId`);--> statement-breakpoint
CREATE INDEX `assignments_assignee_idx` ON `complaintAssignments` (`assignedTo`);--> statement-breakpoint
CREATE INDEX `complaint_media_complaint_idx` ON `complaintMedia` (`complaintId`);--> statement-breakpoint
CREATE INDEX `status_history_complaint_idx` ON `complaintStatusHistory` (`complaintId`);--> statement-breakpoint
CREATE INDEX `status_history_created_idx` ON `complaintStatusHistory` (`createdAt`);--> statement-breakpoint
CREATE INDEX `complaints_citizen_idx` ON `complaints` (`citizenId`);--> statement-breakpoint
CREATE INDEX `complaints_status_idx` ON `complaints` (`status`);--> statement-breakpoint
CREATE INDEX `complaints_priority_idx` ON `complaints` (`priority`);--> statement-breakpoint
CREATE INDEX `complaints_category_idx` ON `complaints` (`categoryId`);--> statement-breakpoint
CREATE INDEX `complaints_department_idx` ON `complaints` (`assignedDepartmentId`);--> statement-breakpoint
CREATE INDEX `complaints_created_idx` ON `complaints` (`createdAt`);--> statement-breakpoint
CREATE INDEX `feedback_complaint_idx` ON `feedback` (`complaintId`);--> statement-breakpoint
CREATE INDEX `notifications_user_idx` ON `notifications` (`userId`);--> statement-breakpoint
CREATE INDEX `notifications_unread_idx` ON `notifications` (`userId`,`readAt`);--> statement-breakpoint
CREATE INDEX `users_role_idx` ON `users` (`role`);--> statement-breakpoint
CREATE INDEX `users_department_idx` ON `users` (`departmentId`);