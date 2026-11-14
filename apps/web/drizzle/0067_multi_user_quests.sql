-- Additive: multi-user quests (#980). New tables and a defaulted column only.
-- The live build neither reads nor writes them, and every account it creates
-- is signed_up by default, so it keeps working while this schema is live.
CREATE TABLE "quest_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quest_id" uuid NOT NULL,
	"invitee_id" uuid NOT NULL,
	"inviter_id" uuid,
	"token_hash" text,
	"link_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quest_invitations_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "quest_invitations_link_complete" CHECK (("quest_invitations"."token_hash" is null) = ("quest_invitations"."link_expires_at" is null))
);
--> statement-breakpoint
CREATE TABLE "quest_members" (
	"quest_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "account_state" text DEFAULT 'signed_up' NOT NULL;--> statement-breakpoint
ALTER TABLE "quest_invitations" ADD CONSTRAINT "quest_invitations_quest_id_quests_id_fk" FOREIGN KEY ("quest_id") REFERENCES "public"."quests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quest_invitations" ADD CONSTRAINT "quest_invitations_invitee_id_users_id_fk" FOREIGN KEY ("invitee_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quest_invitations" ADD CONSTRAINT "quest_invitations_inviter_id_users_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quest_members" ADD CONSTRAINT "quest_members_quest_id_quests_id_fk" FOREIGN KEY ("quest_id") REFERENCES "public"."quests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quest_members" ADD CONSTRAINT "quest_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "quest_invitations_quest_invitee_idx" ON "quest_invitations" USING btree ("quest_id","invitee_id");--> statement-breakpoint
CREATE INDEX "quest_invitations_invitee_id_idx" ON "quest_invitations" USING btree ("invitee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "quest_members_quest_user_idx" ON "quest_members" USING btree ("quest_id","user_id");--> statement-breakpoint
CREATE INDEX "quest_members_user_id_idx" ON "quest_members" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_account_state_valid" CHECK ("users"."account_state" in ('invited', 'signed_up'));