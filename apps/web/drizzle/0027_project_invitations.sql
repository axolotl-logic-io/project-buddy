CREATE TABLE "project_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"invitee_id" uuid NOT NULL,
	"inviter_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"state" text DEFAULT 'pending' NOT NULL,
	CONSTRAINT "project_invitations_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "project_invitations_state_valid" CHECK ("project_invitations"."state" in ('pending', 'accepted', 'declined', 'revoked'))
);
--> statement-breakpoint
ALTER TABLE "project_invitations" ADD CONSTRAINT "project_invitations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_invitations" ADD CONSTRAINT "project_invitations_invitee_id_users_id_fk" FOREIGN KEY ("invitee_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_invitations" ADD CONSTRAINT "project_invitations_inviter_id_users_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "project_invitations_one_pending_idx" ON "project_invitations" USING btree ("project_id","invitee_id") WHERE "project_invitations"."state" = 'pending';--> statement-breakpoint
CREATE INDEX "project_invitations_invitee_id_idx" ON "project_invitations" USING btree ("invitee_id");