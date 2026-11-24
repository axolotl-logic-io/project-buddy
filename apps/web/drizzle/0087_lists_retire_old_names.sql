-- The second of two steps after 0086_lists_and_list_items. Run it only once
-- the build from that release is live, since it removes what the build
-- before it read and wrote: the views under the old table names, the
-- triggers that filled the retired columns, and those columns.

DROP VIEW "spaces";--> statement-breakpoint
DROP VIEW "murmlings";--> statement-breakpoint
DROP VIEW "space_changes";--> statement-breakpoint
DROP VIEW "conjurations";--> statement-breakpoint

DROP TRIGGER "performances_sync_list_id" ON "performances";--> statement-breakpoint
DROP FUNCTION "performances_sync_list_id"();--> statement-breakpoint
DROP TRIGGER "list_items_fill_type" ON "list_items";--> statement-breakpoint
DROP FUNCTION "list_items_fill_type"();--> statement-breakpoint
DROP TRIGGER "lists_sync_item_type" ON "lists";--> statement-breakpoint
DROP FUNCTION "lists_sync_item_type"();--> statement-breakpoint

ALTER TABLE "performances" DROP COLUMN "space_id";--> statement-breakpoint
ALTER TABLE "list_items" DROP COLUMN "type";--> statement-breakpoint
ALTER TABLE "lists" DROP COLUMN "singular";--> statement-breakpoint
ALTER TABLE "lists" DROP COLUMN "plural";
