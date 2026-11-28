-- Life: the site now makes it when its user signs up or signs in, rather
-- than when they open Quests, so that Quests only reads. This makes the
-- Life, with its starting Tasks and Ideas lists, of every signed-up user
-- who still has none.
--
-- Additive: the live build makes a missing Life on Quests the same way, and
-- the unique index keeps the two to one Life.
WITH "made" AS (
	INSERT INTO "quests" ("user_id", "name", "life")
	SELECT "users"."id", 'Life', true
	FROM "users"
	WHERE "users"."account_state" = 'signed_up'
	ON CONFLICT ("user_id") WHERE "life" DO NOTHING
	RETURNING "id"
)
INSERT INTO "lists" ("quest_id", "position", "name", "type")
SELECT "id", 0, 'Tasks', 'task' FROM "made"
UNION ALL
SELECT "id", 1, 'Ideas', 'plain' FROM "made";
