-- Owner-approved single-release exception to expand-then-contract:
-- the previous /chat code uses ON CONFLICT (user_id) and stops working
-- after this migration, until the new build is live. A rollback to that
-- build also breaks /chat. No chats, messages or buddy snapshots are changed.
DROP INDEX "chats_user_id_idx";--> statement-breakpoint
CREATE INDEX "chats_user_id_idx" ON "chats" USING btree ("user_id");