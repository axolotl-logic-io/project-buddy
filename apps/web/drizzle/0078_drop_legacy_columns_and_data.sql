UPDATE "chats" SET "construct_id" = 'vellum' WHERE "construct_id" NOT IN ('vellum', 'lumen');--> statement-breakpoint
DELETE FROM "chats" WHERE "quest_id" IS NOT NULL AND "continuing" = false;--> statement-breakpoint
DELETE FROM "chats" WHERE "user_id" IS NOT NULL AND "id" NOT IN (SELECT "parked_chat_id" FROM "dailies_days" WHERE "parked_chat_id" IS NOT NULL);--> statement-breakpoint
UPDATE "messages" m SET "user_id" = coalesce(q."user_id", c."user_id") FROM "chats" c LEFT JOIN "quests" q ON q."id" = c."quest_id" WHERE m."chat_id" = c."id" AND m."role" = 'user' AND m."user_id" IS NULL;--> statement-breakpoint
DELETE FROM "rate_limits" WHERE "key" LIKE 'listing-change:%' OR "key" LIKE 'purchase:%' OR ("key" LIKE 'address:%' AND length("key") <> 8 + 64);--> statement-breakpoint
UPDATE "quests" SET "name" = rtrim(CASE WHEN "name" ~ '[\U00010000-\U0010FFFF]' THEN left("name", 40) ELSE left("name", 80) END) WHERE char_length("name") + char_length(regexp_replace("name", '[^\U00010000-\U0010FFFF]', '', 'g')) > 80;--> statement-breakpoint
CREATE FUNCTION pg_temp.spell_replies(replies jsonb, fallback text) RETURNS jsonb LANGUAGE sql IMMUTABLE AS $$ SELECT CASE jsonb_typeof(replies) WHEN 'array' THEN replies WHEN 'string' THEN jsonb_build_array(replies) ELSE jsonb_build_array(fallback) END $$;--> statement-breakpoint
CREATE FUNCTION pg_temp.spell_definition(definition jsonb) RETURNS jsonb LANGUAGE sql IMMUTABLE AS $$ SELECT jsonb_build_object('destination', definition->'destination', 'castReply', pg_temp.spell_replies(definition->'castReply', 'Cast {{spell}}. Subsequent messages go into {{bucket}}. Stop the spell when you’re finished.'), 'savedReply', pg_temp.spell_replies(definition->'savedReply', 'Saved to {{bucket}}.'), 'stopReply', pg_temp.spell_replies(definition->'stopReply', 'Spell stopped.'), 'invalidReply', pg_temp.spell_replies(definition->'invalidReply', 'Use 1 to 200 characters for each idea or task.')) $$;--> statement-breakpoint
DELETE FROM "own_prompts" WHERE "kind" <> 'spell';--> statement-breakpoint
UPDATE "own_prompts" SET "parts" = pg_temp.spell_definition("parts");--> statement-breakpoint
UPDATE "chats" SET "spell" = NULL, "spell_started_at" = NULL WHERE "spell" IS NOT NULL AND "spell_snapshot" IS NULL;--> statement-breakpoint
UPDATE "chats" SET "spell_snapshot" = jsonb_set("spell_snapshot", '{definition}', pg_temp.spell_definition("spell_snapshot"->'definition')) WHERE "spell_snapshot" IS NOT NULL;--> statement-breakpoint
UPDATE "dailies_days" SET "parked_spell_snapshot" = jsonb_set("parked_spell_snapshot", '{definition}', pg_temp.spell_definition("parked_spell_snapshot"->'definition')) WHERE "parked_spell_snapshot" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "own_prompts" DROP CONSTRAINT "own_prompts_kind_known";--> statement-breakpoint
ALTER TABLE "quests" DROP CONSTRAINT "quests_check_in_frequency_valid";--> statement-breakpoint
DROP INDEX "chats_continuing_user_idx";--> statement-breakpoint
ALTER TABLE "own_prompts" DROP COLUMN "kind";--> statement-breakpoint
ALTER TABLE "own_prompts" DROP COLUMN "cloned_from";--> statement-breakpoint
ALTER TABLE "own_prompts" DROP COLUMN "bought_from";--> statement-breakpoint
ALTER TABLE "chats" DROP COLUMN "construct_name";--> statement-breakpoint
ALTER TABLE "chats" DROP COLUMN "construct_parts";--> statement-breakpoint
ALTER TABLE "chats" DROP COLUMN "name";--> statement-breakpoint
ALTER TABLE "chats" DROP COLUMN "renamed_by_hand";--> statement-breakpoint
ALTER TABLE "quests" DROP COLUMN "check_in_frequency";--> statement-breakpoint
ALTER TABLE "quests" DROP COLUMN "last_check_in_at";--> statement-breakpoint
ALTER TABLE "reply_runs" DROP COLUMN "accounting_complete";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "hidden_extras";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "interview_construct_id";--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_construct_id_known" CHECK ("chats"."construct_id" in ('vellum', 'lumen'));--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_user_has_author" CHECK ("messages"."role" <> 'user' or "messages"."user_id" is not null);