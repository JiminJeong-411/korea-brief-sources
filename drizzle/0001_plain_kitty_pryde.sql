CREATE TABLE `kb_favorites` (
	`user_id` text NOT NULL,
	`report_id` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `report_id`)
);
