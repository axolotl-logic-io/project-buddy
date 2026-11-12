ALTER TABLE "chats" RENAME COLUMN "buddy_id" TO "construct_id";--> statement-breakpoint
ALTER TABLE "chats" RENAME COLUMN "buddy_name" TO "construct_name";--> statement-breakpoint
ALTER TABLE "chats" RENAME COLUMN "buddy_parts" TO "construct_parts";--> statement-breakpoint
ALTER TABLE "users" RENAME COLUMN "interview_buddy_id" TO "interview_construct_id";--> statement-breakpoint
ALTER TABLE "own_prompts" DROP CONSTRAINT "own_prompts_kind_known";--> statement-breakpoint
ALTER TABLE "own_prompts" ALTER COLUMN "kind" SET DEFAULT 'construct';--> statement-breakpoint
UPDATE own_prompts SET kind='construct' WHERE kind='buddy';
--> statement-breakpoint
ALTER TABLE "own_prompts" ADD CONSTRAINT "own_prompts_kind_known" CHECK ("own_prompts"."kind" in ('construct', 'activity', 'spell'));