CREATE TABLE "zotero_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quest_id" uuid NOT NULL,
	"list_id" uuid NOT NULL,
	"item_key" text NOT NULL,
	"note_key" text,
	"version" integer,
	"position" integer NOT NULL,
	"text" text NOT NULL,
	"plain" boolean NOT NULL,
	"pending" text,
	"revision" integer DEFAULT 0 NOT NULL,
	"written_by" uuid
);
--> statement-breakpoint
ALTER TABLE "zotero_notes" ADD CONSTRAINT "zotero_notes_list_id_zotero_lists_list_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."zotero_lists"("list_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zotero_notes" ADD CONSTRAINT "zotero_notes_written_by_users_id_fk" FOREIGN KEY ("written_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "zotero_notes_list_note_idx" ON "zotero_notes" USING btree ("list_id","note_key");--> statement-breakpoint
CREATE INDEX "zotero_notes_list_item_idx" ON "zotero_notes" USING btree ("list_id","item_key","position");