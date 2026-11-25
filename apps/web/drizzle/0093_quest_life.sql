-- Life: the one quest every user always has, for everyday tasks. Dailies
-- becomes Life, so each user's Dailies quest is adopted as their Life and
-- renamed: their Active quest marked by the retired dailies column, or else
-- their newest Active quest named Dailies. The site makes a Life for every user
-- who still has none when they open Quests.
--
-- Additive: the build that is live while this migrates never reads the
-- column, and sees an adopted quest as an ordinary one renamed Life.
ALTER TABLE "quests" ADD COLUMN "life" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "quests_life_user_idx" ON "quests" USING btree ("user_id") WHERE "quests"."life";--> statement-breakpoint
UPDATE "quests"
SET "life" = true, "name" = 'Life'
WHERE "id" IN (
	SELECT DISTINCT ON ("user_id") "id"
	FROM "quests"
	WHERE "status" = 'active' AND ("dailies" OR "name" = 'Dailies')
	ORDER BY "user_id", "dailies" DESC, "created_at" DESC, "id" DESC
);
