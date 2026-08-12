CREATE TABLE `datasets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`experimentId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`format` enum('csv','json','hdf5') NOT NULL,
	`fileKey` varchar(512) NOT NULL,
	`fileUrl` varchar(1024) NOT NULL,
	`byteSize` int NOT NULL,
	`preview` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `datasets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `experimentRuns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`experimentId` int NOT NULL,
	`datasetId` int NOT NULL,
	`modelConfigurationId` int NOT NULL,
	`runType` enum('training','inference') NOT NULL,
	`status` enum('queued','running','completed','failed') NOT NULL DEFAULT 'queued',
	`huggingFaceJobId` varchar(128),
	`modelArtifactKey` varchar(512),
	`modelArtifactUrl` varchar(1024),
	`errorMessage` text,
	`queuedAt` timestamp NOT NULL DEFAULT (now()),
	`startedAt` timestamp,
	`completedAt` timestamp,
	CONSTRAINT `experimentRuns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `experiments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `experiments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `modelConfigurations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`experimentId` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`huggingFaceModelId` varchar(255) NOT NULL,
	`hyperparameters` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `modelConfigurations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reportExports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`experimentId` int NOT NULL,
	`findingId` int,
	`format` enum('markdown','pdf') NOT NULL,
	`fileKey` varchar(512) NOT NULL,
	`fileUrl` varchar(1024) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reportExports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `researchFindings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`experimentId` int NOT NULL,
	`title` varchar(220) NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `researchFindings_id` PRIMARY KEY(`id`),
	CONSTRAINT `researchFindings_experimentId_unique` UNIQUE(`experimentId`)
);
--> statement-breakpoint
CREATE TABLE `runMetrics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`runId` int NOT NULL,
	`accuracy` decimal(8,5),
	`efficiency` decimal(8,5),
	`fakeRate` decimal(8,5),
	`metricPayload` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `runMetrics_id` PRIMARY KEY(`id`),
	CONSTRAINT `runMetrics_runId_unique` UNIQUE(`runId`)
);
--> statement-breakpoint
CREATE TABLE `trackPoints` (
	`id` int AUTO_INCREMENT NOT NULL,
	`runId` int NOT NULL,
	`trackId` varchar(120) NOT NULL,
	`pointOrder` int NOT NULL,
	`x` decimal(15,7) NOT NULL,
	`y` decimal(15,7) NOT NULL,
	`z` decimal(15,7) NOT NULL,
	CONSTRAINT `trackPoints_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','researcher','admin') NOT NULL DEFAULT 'user';