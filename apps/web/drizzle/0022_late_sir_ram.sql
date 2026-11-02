ALTER TABLE "chats" ADD COLUMN "unread" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "check_in_frequency" text DEFAULT 'off' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "last_check_in_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_check_in_frequency_valid" CHECK ("projects"."check_in_frequency" in ('off', 'daily', 'few-times-a-week', 'weekly'));