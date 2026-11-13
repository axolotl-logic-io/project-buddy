CREATE TABLE "signup_links" (
	"email" text PRIMARY KEY NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "signup_links_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "signup_links_email_normalized" CHECK ("signup_links"."email" = lower(btrim("signup_links"."email")) and "signup_links"."email" <> '')
);
--> statement-breakpoint
DROP TABLE "active_invitations" CASCADE;--> statement-breakpoint
DROP TABLE "invitations" CASCADE;