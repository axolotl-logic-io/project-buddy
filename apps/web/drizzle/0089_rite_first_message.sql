-- Gives every rite and rite snapshot a first message. Existing ones get the
-- line the site wrote before rites had their own, such as "Brainstorm
-- begins on Ideas."
--
-- The build that is live while this migrates knows nothing of first
-- messages, so until the next release: the column's default fills in the
-- rites it creates, and a trigger fills in the rite snapshots of the
-- performances it starts. The next release drops both.
ALTER TABLE "rites" ADD COLUMN "first_message" text NOT NULL DEFAULT '{rite} begins on {list}.';--> statement-breakpoint
UPDATE "performances"
SET "rite_snapshot" = "rite_snapshot" || jsonb_build_object('firstMessage', '{rite} begins on {list}.')
WHERE NOT ("rite_snapshot" ? 'firstMessage');--> statement-breakpoint
CREATE FUNCTION "rite_snapshot_first_message"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT (NEW."rite_snapshot" ? 'firstMessage') THEN
    NEW."rite_snapshot" := NEW."rite_snapshot" || jsonb_build_object('firstMessage', '{rite} begins on {list}.');
  END IF;
  RETURN NEW;
END
$$;--> statement-breakpoint
CREATE TRIGGER "performances_rite_snapshot_first_message"
BEFORE INSERT ON "performances"
FOR EACH ROW EXECUTE FUNCTION "rite_snapshot_first_message"();
