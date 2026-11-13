-- Destructive simplification: obsolete activities and custom spells are removed.
DELETE FROM "listings" WHERE "kind" <> 'construct';--> statement-breakpoint
DELETE FROM "own_prompts" WHERE "kind" <> 'construct';--> statement-breakpoint
CREATE TABLE "spell_message_results" (
	"message_id" text PRIMARY KEY NOT NULL,
	"chat_id" uuid NOT NULL,
	"text" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity_message_results" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "activity_sessions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "activity_message_results" CASCADE;--> statement-breakpoint
DROP TABLE "activity_sessions" CASCADE;--> statement-breakpoint
ALTER TABLE "listings" DROP CONSTRAINT "listings_kind_known";--> statement-breakpoint
ALTER TABLE "own_prompts" DROP CONSTRAINT "own_prompts_kind_known";--> statement-breakpoint
ALTER TABLE "chats" ADD COLUMN "spell" text;--> statement-breakpoint
ALTER TABLE "spell_message_results" ADD CONSTRAINT "spell_message_results_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spell_message_results" ADD CONSTRAINT "spell_message_results_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_kind_known" CHECK ("listings"."kind" in ('construct'));--> statement-breakpoint
ALTER TABLE "own_prompts" ADD CONSTRAINT "own_prompts_kind_known" CHECK ("own_prompts"."kind" in ('construct'));--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_spell_valid" CHECK ("chats"."spell" in ('plan', 'brainstorm'));--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_spell_needs_quest" CHECK ("chats"."spell" is null or "chats"."quest_id" is not null);