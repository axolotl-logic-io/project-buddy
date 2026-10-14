CREATE TABLE "memory_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"text" text NOT NULL,
	"author" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "memory_versions_version_positive" CHECK ("memory_versions"."version" > 0),
	CONSTRAINT "memory_versions_author_known" CHECK ("memory_versions"."author" in ('user', 'tutor'))
);
--> statement-breakpoint
ALTER TABLE "memory_versions" ADD CONSTRAINT "memory_versions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "memory_versions_project_id_version_idx" ON "memory_versions" USING btree ("project_id","version");