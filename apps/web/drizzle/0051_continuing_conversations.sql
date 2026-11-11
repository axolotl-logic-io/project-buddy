ALTER TABLE "milestones" DROP CONSTRAINT "milestones_chat_id_chats_id_fk";
--> statement-breakpoint
ALTER TABLE "milestones" ALTER COLUMN "chat_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "chats" ADD COLUMN "continuing" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "premade" text;--> statement-breakpoint
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "chats_continuing_project_idx" ON "chats" USING btree ("project_id") WHERE "chats"."continuing" and "chats"."project_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "chats_continuing_user_idx" ON "chats" USING btree ("user_id") WHERE "chats"."continuing" and "chats"."user_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "projects_dailies_user_idx" ON "projects" USING btree ("user_id") WHERE "projects"."premade" = 'dailies';--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_premade_valid" CHECK ("projects"."premade" in ('dailies', 'learn', 'make', 'do'));