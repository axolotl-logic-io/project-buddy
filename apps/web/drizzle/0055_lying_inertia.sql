CREATE TABLE "journal_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"version" integer NOT NULL,
	"content" jsonb NOT NULL,
	"before" jsonb NOT NULL,
	"author" text NOT NULL,
	"user_id" uuid,
	"undoes_version" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "journal_versions_kind_valid" CHECK ("journal_versions"."kind" in ('goal', 'preferences')),
	CONSTRAINT "journal_versions_author_valid" CHECK ("journal_versions"."author" in ('person', 'construct')),
	CONSTRAINT "journal_versions_version_positive" CHECK ("journal_versions"."version" > 0)
);
--> statement-breakpoint
ALTER TABLE "journal_versions" ADD CONSTRAINT "journal_versions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_versions" ADD CONSTRAINT "journal_versions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "journal_versions_section_version_idx" ON "journal_versions" USING btree ("project_id","kind","version");--> statement-breakpoint
CREATE UNIQUE INDEX "journal_versions_section_undo_idx" ON "journal_versions" USING btree ("project_id","kind","undoes_version");