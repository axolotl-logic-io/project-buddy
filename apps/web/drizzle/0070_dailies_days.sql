CREATE TABLE "dailies_days" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quest_id" uuid NOT NULL,
	"local_date" date NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"steps" jsonb,
	"chat_id" uuid,
	"parked_chat_id" uuid,
	"parked_spell" text,
	"parked_spell_snapshot" jsonb,
	"tasks_version" integer,
	"removed_ideas" jsonb
);
--> statement-breakpoint
ALTER TABLE "dailies_days" ADD CONSTRAINT "dailies_days_quest_id_quests_id_fk" FOREIGN KEY ("quest_id") REFERENCES "public"."quests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dailies_days" ADD CONSTRAINT "dailies_days_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dailies_days" ADD CONSTRAINT "dailies_days_parked_chat_id_chats_id_fk" FOREIGN KEY ("parked_chat_id") REFERENCES "public"."chats"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dailies_days_quest_id_started_at_idx" ON "dailies_days" USING btree ("quest_id","started_at");