CREATE TABLE "quest_days" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quest_id" uuid NOT NULL,
	"local_date" date NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"tasks" jsonb,
	"undo" jsonb
);
--> statement-breakpoint
CREATE TABLE "space_changes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"inverse" jsonb,
	CONSTRAINT "space_changes_version_key" UNIQUE("space_id","version")
);
--> statement-breakpoint
ALTER TABLE "quests" ADD COLUMN "construct_id" text DEFAULT 'vellum' NOT NULL;--> statement-breakpoint
ALTER TABLE "quest_days" ADD CONSTRAINT "quest_days_quest_id_quests_id_fk" FOREIGN KEY ("quest_id") REFERENCES "public"."quests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "space_changes" ADD CONSTRAINT "space_changes_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "quest_days_order_idx" ON "quest_days" USING btree ("quest_id","started_at");
--> statement-breakpoint
UPDATE quests SET construct_id = chats.construct_id
FROM chats WHERE chats.quest_id = quests.id AND chats.continuing;
--> statement-breakpoint
INSERT INTO quest_days (id, quest_id, local_date, started_at, tasks)
SELECT id, quest_id, local_date, started_at, steps FROM dailies_days;
