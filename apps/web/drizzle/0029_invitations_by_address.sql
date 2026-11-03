ALTER TABLE "project_invitations" ALTER COLUMN "invitee_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "project_invitations" ADD COLUMN "invitee_email" text;--> statement-breakpoint
CREATE UNIQUE INDEX "project_invitations_one_pending_email_idx" ON "project_invitations" USING btree ("project_id","invitee_email") WHERE "project_invitations"."state" = 'pending';--> statement-breakpoint
CREATE INDEX "project_invitations_invitee_email_idx" ON "project_invitations" USING btree ("invitee_email");--> statement-breakpoint
ALTER TABLE "project_invitations" ADD CONSTRAINT "project_invitations_one_invitee" CHECK (("project_invitations"."invitee_id" is null) <> ("project_invitations"."invitee_email" is null));