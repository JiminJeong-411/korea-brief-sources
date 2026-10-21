CREATE TABLE `kb_admins` (
	`user_id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`role` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `kb_audit` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`action` text NOT NULL,
	`item_id` text,
	`actor` text NOT NULL,
	`at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `kb_config` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `kb_locks` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `kb_records` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`state` text DEFAULT 'private' NOT NULL,
	`title` text NOT NULL,
	`topic` text DEFAULT '' NOT NULL,
	`published_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`data` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `kb_record_type_state` ON `kb_records` (`type`,`state`);