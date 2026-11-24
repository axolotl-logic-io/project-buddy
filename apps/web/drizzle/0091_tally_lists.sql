-- Tally lists: a new list type whose items count something each day, and
-- the table of their totals by date. Additive: the live build never reads
-- the new table, and makes no list of the new type.
CREATE TABLE "tally_days" (
	"quest_id" uuid NOT NULL,
	"list_item_id" uuid NOT NULL,
	"local_date" date NOT NULL,
	"total" numeric(18, 6) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lists" DROP CONSTRAINT "lists_type_valid";--> statement-breakpoint
ALTER TABLE "tally_days" ADD CONSTRAINT "tally_days_quest_id_quests_id_fk" FOREIGN KEY ("quest_id") REFERENCES "public"."quests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "tally_days_item_date_idx" ON "tally_days" USING btree ("list_item_id","local_date");--> statement-breakpoint
ALTER TABLE "lists" ADD CONSTRAINT "lists_type_valid" CHECK ("lists"."type" in ('plain', 'task', 'quick-note', 'tally'));