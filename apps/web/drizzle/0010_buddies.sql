-- Breaking rename, accepted in #117 as an exception to CONTRIBUTING's "a
-- migration must work with the build that is live": the personas table, its
-- key, foreign key and index, and the chats.persona_* columns take their
-- buddy names. Renames only, no DROP or CREATE, so every row and value stays.
-- The build before this one fails on buddy and chat queries once it runs.
ALTER TABLE "personas" RENAME TO "buddies";--> statement-breakpoint
ALTER TABLE "buddies" RENAME CONSTRAINT "personas_pkey" TO "buddies_pkey";--> statement-breakpoint
ALTER TABLE "buddies" RENAME CONSTRAINT "personas_user_id_users_id_fk" TO "buddies_user_id_users_id_fk";--> statement-breakpoint
ALTER INDEX "personas_user_id_idx" RENAME TO "buddies_user_id_idx";--> statement-breakpoint
ALTER TABLE "chats" RENAME COLUMN "persona_id" TO "buddy_id";--> statement-breakpoint
ALTER TABLE "chats" RENAME COLUMN "persona_name" TO "buddy_name";--> statement-breakpoint
ALTER TABLE "chats" RENAME COLUMN "persona_parts" TO "buddy_parts";
