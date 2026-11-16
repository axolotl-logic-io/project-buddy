CREATE TABLE "ability_points" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"ability" text NOT NULL,
	"quest_id" uuid,
	"source" text NOT NULL,
	"gained_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ability_points" ADD CONSTRAINT "ability_points_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ability_points" ADD CONSTRAINT "ability_points_quest_id_quests_id_fk" FOREIGN KEY ("quest_id") REFERENCES "public"."quests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ability_points_user_id_ability_idx" ON "ability_points" USING btree ("user_id","ability");--> statement-breakpoint
CREATE INDEX "ability_points_quest_id_ability_source_idx" ON "ability_points" USING btree ("quest_id","ability","source");--> statement-breakpoint
-- Starts each quest's owner with the points for what the quest holds now:
-- its tasks, done tasks, ideas and Quick Notes, and its completion.
WITH latest AS (
  SELECT DISTINCT ON (quest_id) quest_id, tasks
  FROM tasks_versions
  ORDER BY quest_id, version DESC
), task AS (
  SELECT quests.user_id, quests.id AS quest_id, item
  FROM latest
  JOIN quests ON quests.id = latest.quest_id
  CROSS JOIN LATERAL jsonb_array_elements(latest.tasks->'items') AS item
)
INSERT INTO ability_points (user_id, ability, quest_id, source)
SELECT user_id, 'adding-tasks', quest_id, item->>'number' FROM task
UNION ALL
SELECT user_id, 'completing-tasks', quest_id, item->>'number' FROM task
  WHERE (item->>'done')::boolean
UNION ALL
SELECT quests.user_id, 'ideating', quests.id, quest_ideas.id::text
  FROM quest_ideas JOIN quests ON quests.id = quest_ideas.quest_id
UNION ALL
SELECT quests.user_id, 'noting', quests.id, quest_notes.id::text
  FROM quest_notes JOIN quests ON quests.id = quest_notes.quest_id
UNION ALL
SELECT user_id, 'completing-quests', id, id::text FROM quests
  WHERE status = 'completed';
