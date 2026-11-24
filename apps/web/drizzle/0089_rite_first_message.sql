-- Gives every rite and rite snapshot a first message. Existing ones get the
-- line the site wrote before rites had their own, such as "Brainstorm
-- begins on Ideas."
ALTER TABLE "rites" ADD COLUMN "first_message" text NOT NULL DEFAULT '{rite} begins on {list}.';--> statement-breakpoint
ALTER TABLE "rites" ALTER COLUMN "first_message" DROP DEFAULT;--> statement-breakpoint
UPDATE "performances"
SET "rite_snapshot" = "rite_snapshot" || jsonb_build_object('firstMessage', '{rite} begins on {list}.')
WHERE NOT ("rite_snapshot" ? 'firstMessage');
