CREATE TABLE "murmlings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quest_id" uuid NOT NULL,
	"space_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"text" text NOT NULL,
	"type" text NOT NULL,
	"task_number" integer,
	"checked_off" boolean DEFAULT false NOT NULL,
	"recurring" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "murmlings_type_valid" CHECK (("murmlings"."type" = 'task' and "murmlings"."task_number" > 0 and "murmlings"."task_number" is not null)
        or ("murmlings"."type" in ('plain', 'quick-note') and "murmlings"."task_number" is null
          and not "murmlings"."checked_off" and not "murmlings"."recurring"))
);
--> statement-breakpoint
CREATE TABLE "spaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quest_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"name" text NOT NULL,
	"singular" text NOT NULL,
	"plural" text NOT NULL,
	"check_off" text NOT NULL,
	"uncheck" text NOT NULL,
	"new_type" text NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "spaces_quest_id_id_key" UNIQUE("quest_id","id"),
	CONSTRAINT "spaces_type_valid" CHECK ("spaces"."new_type" in ('plain', 'task', 'quick-note'))
);
--> statement-breakpoint
ALTER TABLE "murmlings" ADD CONSTRAINT "murmlings_quest_id_space_id_spaces_quest_id_id_fk" FOREIGN KEY ("quest_id","space_id") REFERENCES "public"."spaces"("quest_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spaces" ADD CONSTRAINT "spaces_quest_id_quests_id_fk" FOREIGN KEY ("quest_id") REFERENCES "public"."quests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "murmlings_space_position_idx" ON "murmlings" USING btree ("space_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "murmlings_quest_task_number_idx" ON "murmlings" USING btree ("quest_id","task_number");--> statement-breakpoint
CREATE UNIQUE INDEX "spaces_quest_position_idx" ON "spaces" USING btree ("quest_id","position");
--> statement-breakpoint
INSERT INTO spaces (quest_id, position, name, singular, plural, check_off, uncheck, new_type)
SELECT quests.id, defaults.*
FROM quests CROSS JOIN (VALUES
  (0, 'Tasks', 'task', 'tasks', 'Complete', 'Reopen', 'task'),
  (1, 'Ideas', 'idea', 'ideas', 'Complete', 'Reopen', 'plain')
) AS defaults(position, name, singular, plural, check_off, uncheck, new_type);
--> statement-breakpoint
WITH latest AS (
  SELECT DISTINCT ON (quest_id) quest_id, tasks, created_at
  FROM tasks_versions
  ORDER BY quest_id, version DESC
)
INSERT INTO murmlings (quest_id, space_id, position, text, type, task_number, checked_off, recurring, created_at)
SELECT latest.quest_id, spaces.id, ordinal - 1, item->>'text', 'task',
       (item->>'number')::integer, (item->>'done')::boolean,
       coalesce((item->>'recurring')::boolean, false), latest.created_at
FROM latest
JOIN spaces ON spaces.quest_id = latest.quest_id AND spaces.position = 0
CROSS JOIN LATERAL jsonb_array_elements(latest.tasks->'items') WITH ORDINALITY AS entries(item, ordinal);
--> statement-breakpoint
INSERT INTO murmlings (id, quest_id, space_id, position, text, type, created_at)
SELECT quest_ideas.id, quest_ideas.quest_id, spaces.id,
       row_number() OVER (PARTITION BY quest_ideas.quest_id ORDER BY quest_ideas.position, quest_ideas.created_at, quest_ideas.id) - 1,
       quest_ideas.text, 'plain', quest_ideas.created_at
FROM quest_ideas
JOIN spaces ON spaces.quest_id = quest_ideas.quest_id AND spaces.position = 1;
--> statement-breakpoint
INSERT INTO murmlings (id, quest_id, space_id, position, text, type, created_at)
SELECT quest_notes.id, quest_notes.quest_id, spaces.id,
       -row_number() OVER (PARTITION BY quest_notes.quest_id ORDER BY quest_notes.created_at, quest_notes.id),
       quest_notes.text, 'quick-note', quest_notes.created_at
FROM quest_notes
JOIN spaces ON spaces.quest_id = quest_notes.quest_id AND spaces.position = 1;
