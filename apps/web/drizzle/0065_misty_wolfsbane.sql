ALTER TABLE "listings" DROP CONSTRAINT "listings_kind_known";--> statement-breakpoint
ALTER TABLE "own_prompts" DROP CONSTRAINT "own_prompts_kind_known";--> statement-breakpoint
ALTER TABLE "chats" ADD COLUMN "spell_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_kind_known" CHECK ("listings"."kind" in ('construct', 'spell'));--> statement-breakpoint
ALTER TABLE "own_prompts" ADD CONSTRAINT "own_prompts_kind_known" CHECK ("own_prompts"."kind" in ('construct', 'spell'));