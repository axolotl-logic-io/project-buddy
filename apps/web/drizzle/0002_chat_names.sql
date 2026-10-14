ALTER TABLE "chats" ADD COLUMN "name" text;--> statement-breakpoint
ALTER TABLE "chats" ADD COLUMN "renamed_by_hand" boolean DEFAULT false NOT NULL;