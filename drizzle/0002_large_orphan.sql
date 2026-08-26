CREATE TABLE `experimentProtocolRevisions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`experimentId` int NOT NULL,
	`version` int NOT NULL,
	`objective` text NOT NULL,
	`detectorContext` text NOT NULL,
	`evaluationPlan` text NOT NULL,
	`acceptanceCriteria` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `experimentProtocolRevisions_id` PRIMARY KEY(`id`),
	CONSTRAINT `experiment_protocol_version_unique` UNIQUE(`experimentId`,`version`)
);
