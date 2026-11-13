-- Additive rollout: the previous build still uses activity storage and the
-- broader prompt-kind constraints while migrations run. Keep legacy tables,
-- definitions and listings until a later cleanup release after this build is live.
CREATE TABLE "spell_message_results" (
	"message_id" text PRIMARY KEY NOT NULL,
	"chat_id" uuid NOT NULL,
	"text" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chats" ADD COLUMN "spell" text;
--> statement-breakpoint
ALTER TABLE "spell_message_results" ADD CONSTRAINT "spell_message_results_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "spell_message_results" ADD CONSTRAINT "spell_message_results_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_spell_valid" CHECK ("chats"."spell" in ('plan', 'brainstorm'));
--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_spell_needs_quest" CHECK ("chats"."spell" is null or "chats"."quest_id" is not null);
