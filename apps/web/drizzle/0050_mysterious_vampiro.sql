CREATE TABLE "plan_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"plan" jsonb NOT NULL,
	"lines" jsonb NOT NULL,
	"undo" jsonb NOT NULL,
	"undoes_version" integer,
	"author" text NOT NULL,
	"user_id" uuid,
	"chat_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "plan_versions" ADD CONSTRAINT "plan_versions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_versions" ADD CONSTRAINT "plan_versions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_versions" ADD CONSTRAINT "plan_versions_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "plan_versions_project_id_version_idx" ON "plan_versions" USING btree ("project_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "plan_versions_project_id_undoes_version_idx" ON "plan_versions" USING btree ("project_id","undoes_version");--> statement-breakpoint
CREATE INDEX "plan_versions_chat_id_idx" ON "plan_versions" USING btree ("chat_id");