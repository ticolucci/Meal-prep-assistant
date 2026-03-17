CREATE TABLE `prep_session_tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` integer NOT NULL,
	`name` text NOT NULL,
	`prep` text NOT NULL,
	`total_amount` real,
	`unit` text,
	`unit_mismatch` integer DEFAULT 0 NOT NULL,
	`prep_safe` integer DEFAULT 0 NOT NULL,
	`recipe_count` integer DEFAULT 0 NOT NULL,
	`recipe_ids` text DEFAULT '[]' NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `prep_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `prep_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`label` text DEFAULT 'Prep Session' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
