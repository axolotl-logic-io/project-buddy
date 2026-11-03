-- Additive: per-user unread marks (#630). chats.unread stays, so the build
-- that is live while this runs keeps reading and writing it; the new build
-- reads only chat_unreads, and a later release drops chats.unread.
CREATE TABLE "chat_unreads" (
	"chat_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chat_unreads" ADD CONSTRAINT "chat_unreads_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_unreads" ADD CONSTRAINT "chat_unreads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "chat_unreads_chat_id_user_id_idx" ON "chat_unreads" USING btree ("chat_id","user_id");--> statement-breakpoint

-- Backfill: each chat unread now is unread for its owner, the project's
-- user or, for a standalone chat, the user it names.
INSERT INTO "chat_unreads" ("chat_id", "user_id")
SELECT "chats"."id", coalesce("chats"."user_id", "projects"."user_id")
FROM "chats"
LEFT JOIN "projects" ON "projects"."id" = "chats"."project_id"
WHERE "chats"."unread"
ON CONFLICT DO NOTHING;
