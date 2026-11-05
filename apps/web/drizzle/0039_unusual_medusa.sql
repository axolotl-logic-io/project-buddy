CREATE TABLE "quest_status_approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"chat_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"from_status" text NOT NULL,
	"to_status" text NOT NULL,
	"revision" integer NOT NULL,
	"decision" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quest_status_approval_decision_valid" CHECK ("quest_status_approvals"."decision" in ('pending', 'approved', 'declined')),
	CONSTRAINT "quest_status_approval_from_valid" CHECK ("quest_status_approvals"."from_status" in ('active', 'completed', 'abandoned')),
	CONSTRAINT "quest_status_approval_to_valid" CHECK ("quest_status_approvals"."to_status" in ('active', 'completed', 'abandoned'))
);
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "status_revision" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "quest_status_approvals" ADD CONSTRAINT "quest_status_approvals_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quest_status_approvals" ADD CONSTRAINT "quest_status_approvals_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quest_status_approvals" ADD CONSTRAINT "quest_status_approvals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_status_valid" CHECK ("projects"."status" in ('active', 'completed', 'abandoned'));--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_status_revision_valid" CHECK ("projects"."status_revision" >= 0);