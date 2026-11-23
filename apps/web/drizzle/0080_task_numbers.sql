ALTER TABLE "quests" ADD COLUMN "next_task_number" integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
WITH latest AS (
  SELECT DISTINCT ON (quest_id) quest_id, tasks
  FROM tasks_versions
  ORDER BY quest_id, version DESC
)
UPDATE quests
SET next_task_number = greatest(quests.next_task_number, (latest.tasks->>'nextNumber')::integer)
FROM latest WHERE latest.quest_id = quests.id;
