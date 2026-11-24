ALTER TABLE "list_items" ADD COLUMN "checked_off_on" date;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "time_zone" text DEFAULT 'UTC' NOT NULL;--> statement-breakpoint
-- Dates each checked-off task by its newest check-off, or by today when it
-- has none, in UTC, every user's time zone until they choose one.
UPDATE "list_items" SET "checked_off_on" = coalesce(
  (
    SELECT max("events"."gained_at" AT TIME ZONE 'UTC')::date
    FROM "events"
    WHERE "events"."quest_id" = "list_items"."quest_id"
      AND "events"."event" = 'checking-off'
      AND "events"."source" = "list_items"."task_number"::text
  ),
  (now() AT TIME ZONE 'UTC')::date
)
WHERE "checked_off";
