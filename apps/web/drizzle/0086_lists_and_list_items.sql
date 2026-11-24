-- Spaces become lists, murmlings become list items, conjurations become
-- performance messages, and a list's type replaces each item's own type.
--
-- The first of two steps. The old build stays live while this runs, so:
-- views under the old table names keep its reads and writes working;
-- spaces' singular and plural, and murmlings' type, stay as columns the
-- new build doesn't use, filled by defaults and triggers; and performances
-- keeps space_id beside list_id, the two kept equal by a trigger. A later
-- release drops the views, the triggers and those columns.

-- Lists.
ALTER TABLE "spaces" RENAME TO "lists";--> statement-breakpoint
ALTER TABLE "lists" RENAME COLUMN "new_type" TO "type";--> statement-breakpoint
ALTER TABLE "lists" RENAME CONSTRAINT "spaces_pkey" TO "lists_pkey";--> statement-breakpoint
ALTER TABLE "lists" RENAME CONSTRAINT "spaces_quest_id_id_key" TO "lists_quest_id_id_key";--> statement-breakpoint
ALTER TABLE "lists" RENAME CONSTRAINT "spaces_type_valid" TO "lists_type_valid";--> statement-breakpoint
ALTER TABLE "lists" RENAME CONSTRAINT "spaces_quest_id_quests_id_fk" TO "lists_quest_id_quests_id_fk";--> statement-breakpoint
ALTER INDEX "spaces_quest_position_idx" RENAME TO "lists_quest_position_idx";--> statement-breakpoint
ALTER TABLE "lists" ALTER COLUMN "singular" SET DEFAULT 'item';--> statement-breakpoint
ALTER TABLE "lists" ALTER COLUMN "plural" SET DEFAULT 'items';--> statement-breakpoint

-- List items. Every item now has its list's type, so the check that tied an
-- item's own type to its task number goes.
ALTER TABLE "murmlings" RENAME TO "list_items";--> statement-breakpoint
ALTER TABLE "list_items" RENAME COLUMN "space_id" TO "list_id";--> statement-breakpoint
ALTER TABLE "list_items" RENAME CONSTRAINT "murmlings_pkey" TO "list_items_pkey";--> statement-breakpoint
ALTER TABLE "list_items" RENAME CONSTRAINT "murmlings_quest_id_space_id_spaces_quest_id_id_fk" TO "list_items_quest_id_list_id_lists_quest_id_id_fk";--> statement-breakpoint
ALTER TABLE "list_items" DROP CONSTRAINT "murmlings_type_valid";--> statement-breakpoint
ALTER INDEX "murmlings_space_position_idx" RENAME TO "list_items_list_position_idx";--> statement-breakpoint
ALTER INDEX "murmlings_quest_task_number_idx" RENAME TO "list_items_quest_task_number_idx";--> statement-breakpoint

-- List changes.
ALTER TABLE "space_changes" RENAME TO "list_changes";--> statement-breakpoint
ALTER TABLE "list_changes" RENAME COLUMN "space_id" TO "list_id";--> statement-breakpoint
ALTER TABLE "list_changes" RENAME CONSTRAINT "space_changes_pkey" TO "list_changes_pkey";--> statement-breakpoint
ALTER TABLE "list_changes" RENAME CONSTRAINT "space_changes_version_key" TO "list_changes_version_key";--> statement-breakpoint
ALTER TABLE "list_changes" RENAME CONSTRAINT "space_changes_space_id_spaces_id_fk" TO "list_changes_list_id_lists_id_fk";--> statement-breakpoint

-- Performance messages.
ALTER TABLE "conjurations" RENAME TO "performance_messages";--> statement-breakpoint
ALTER TABLE "performance_messages" RENAME CONSTRAINT "conjurations_pkey" TO "performance_messages_pkey";--> statement-breakpoint
ALTER TABLE "performance_messages" RENAME CONSTRAINT "conjurations_performance_id_performances_id_fk" TO "performance_messages_performance_id_performances_id_fk";--> statement-breakpoint
ALTER TABLE "performance_messages" RENAME CONSTRAINT "conjurations_user_id_users_id_fk" TO "performance_messages_user_id_users_id_fk";--> statement-breakpoint
ALTER INDEX "conjurations_performance_position_idx" RENAME TO "performance_messages_performance_position_idx";--> statement-breakpoint

-- Performances: list_id beside space_id, each filled from the other.
ALTER TABLE "performances" ADD COLUMN "list_id" uuid;--> statement-breakpoint
UPDATE "performances" SET "list_id" = "space_id";--> statement-breakpoint
ALTER TABLE "performances" ALTER COLUMN "list_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "performances" ADD CONSTRAINT "performances_quest_id_list_id_lists_quest_id_id_fk" FOREIGN KEY ("quest_id","list_id") REFERENCES "public"."lists"("quest_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE FUNCTION "performances_sync_list_id"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.list_id := COALESCE(NEW.list_id, NEW.space_id);
    NEW.space_id := COALESCE(NEW.space_id, NEW.list_id);
  ELSIF NEW.list_id IS DISTINCT FROM OLD.list_id THEN
    NEW.space_id := NEW.list_id;
  ELSIF NEW.space_id IS DISTINCT FROM OLD.space_id THEN
    NEW.list_id := NEW.space_id;
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "performances_sync_list_id" BEFORE INSERT OR UPDATE OF "list_id", "space_id" ON "performances" FOR EACH ROW EXECUTE FUNCTION "performances_sync_list_id"();--> statement-breakpoint

-- An item's own type, for the old build: its list's type when added without
-- one or moved, and again whenever the list's type changes.
CREATE FUNCTION "list_items_fill_type"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.type IS NOT NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.list_id IS NOT DISTINCT FROM OLD.list_id THEN
    RETURN NEW;
  END IF;
  SELECT "lists"."type" INTO NEW.type FROM "lists" WHERE "lists"."id" = NEW.list_id;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "list_items_fill_type" BEFORE INSERT OR UPDATE OF "list_id" ON "list_items" FOR EACH ROW EXECUTE FUNCTION "list_items_fill_type"();--> statement-breakpoint
CREATE FUNCTION "lists_sync_item_type"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE "list_items" SET "type" = NEW.type WHERE "list_items"."list_id" = NEW.id;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "lists_sync_item_type" AFTER UPDATE OF "type" ON "lists" FOR EACH ROW WHEN (OLD.type IS DISTINCT FROM NEW.type) EXECUTE FUNCTION "lists_sync_item_type"();--> statement-breakpoint

-- The old names, for the old build.
CREATE VIEW "spaces" AS
  SELECT "id", "quest_id", "position", "name", "singular", "plural",
    "check_off", "uncheck", "type" AS "new_type", "version"
  FROM "lists";--> statement-breakpoint
CREATE VIEW "murmlings" AS
  SELECT "id", "quest_id", "list_id" AS "space_id", "position", "text",
    "type", "task_number", "checked_off", "recurring", "created_at"
  FROM "list_items";--> statement-breakpoint
CREATE VIEW "space_changes" AS
  SELECT "id", "list_id" AS "space_id", "version", "inverse"
  FROM "list_changes";--> statement-breakpoint
CREATE VIEW "conjurations" AS
  SELECT "id", "performance_id", "user_id", "author", "text", "reply",
    "added", "position", "created_at"
  FROM "performance_messages";--> statement-breakpoint

-- Saved undo data names an item's list listId, and an item no longer
-- changes type on its own.
UPDATE "list_changes" SET "inverse" = NULL WHERE "inverse"->>'kind' = 'type';--> statement-breakpoint
UPDATE "list_changes"
SET "inverse" = jsonb_set(
  "inverse", '{before}',
  ("inverse"->'before') - 'spaceId'
    || jsonb_build_object('listId', "inverse"->'before'->'spaceId'))
WHERE "inverse"->'before' ? 'spaceId';--> statement-breakpoint
UPDATE "list_changes"
SET "inverse" = jsonb_set(
  "inverse", '{after}',
  ("inverse"->'after') - 'spaceId'
    || jsonb_build_object('listId', "inverse"->'after'->'spaceId'))
WHERE "inverse"->'after' ? 'spaceId';--> statement-breakpoint
UPDATE "quest_days"
SET "undo" = jsonb_set("undo", '{removed}', (
  SELECT COALESCE(jsonb_agg(
    CASE
      WHEN "row" ? 'spaceId' THEN
        ("row" - 'spaceId') || jsonb_build_object('listId', "row"->'spaceId')
      ELSE "row"
    END
    ORDER BY "place"), '[]'::jsonb)
  FROM jsonb_array_elements("undo"->'removed') WITH ORDINALITY AS "removed"("row", "place")))
WHERE jsonb_typeof("undo"->'removed') = 'array';--> statement-breakpoint

-- Rite replies name the list as {list}, and lists no longer name their items.
UPDATE "rites"
SET "replies" = replace(replace(replace(replace("replies"::text,
  'Added a {singular} to {space}.', 'Added to {list}.'),
  '{space}', '{list}'), '{singular}', 'item'), '{plural}', 'items')::jsonb
WHERE "replies"::text ~ '\{(space|singular|plural)\}';--> statement-breakpoint
UPDATE "performances"
SET "rite_snapshot" = replace(replace(replace(replace("rite_snapshot"::text,
  'Added a {singular} to {space}.', 'Added to {list}.'),
  '{space}', '{list}'), '{singular}', 'item'), '{plural}', 'items')::jsonb
WHERE "rite_snapshot"::text ~ '\{(space|singular|plural)\}';
