CREATE TABLE "active_invitations" (
	"email" text PRIMARY KEY NOT NULL,
	"token_hash" text NOT NULL,
	CONSTRAINT "active_invitations_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "invitations_email_normalized" CHECK ("invitations"."email" = lower(btrim("invitations"."email")) and "invitations"."email" <> '')
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" text DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE "active_invitations" ADD CONSTRAINT "active_invitations_token_hash_invitations_token_hash_fk" FOREIGN KEY ("token_hash") REFERENCES "public"."invitations"("token_hash") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_valid" CHECK ("users"."role" in ('user', 'admin'));--> statement-breakpoint
INSERT INTO users (email, role) VALUES ('me@modestprogress.com', 'admin')
ON CONFLICT (email) DO UPDATE SET role = 'admin';
