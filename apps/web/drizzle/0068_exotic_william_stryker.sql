ALTER TABLE "plan_versions" RENAME TO "tasks_versions";--> statement-breakpoint
ALTER TABLE "tasks_versions" RENAME CONSTRAINT "plan_versions_pkey" TO "tasks_versions_pkey";--> statement-breakpoint
ALTER TABLE "tasks_versions" RENAME COLUMN "plan" TO "tasks";--> statement-breakpoint
ALTER TABLE "chats" DROP CONSTRAINT "chats_spell_valid";--> statement-breakpoint
ALTER TABLE "tasks_versions" DROP CONSTRAINT "plan_versions_quest_id_quests_id_fk";
--> statement-breakpoint
ALTER TABLE "tasks_versions" DROP CONSTRAINT "plan_versions_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "tasks_versions" DROP CONSTRAINT "plan_versions_chat_id_chats_id_fk";
--> statement-breakpoint
DROP INDEX "plan_versions_quest_id_version_idx";--> statement-breakpoint
DROP INDEX "plan_versions_quest_id_undoes_version_idx";--> statement-breakpoint
DROP INDEX "plan_versions_chat_id_idx";--> statement-breakpoint
ALTER TABLE "tasks_versions" ADD CONSTRAINT "tasks_versions_quest_id_quests_id_fk" FOREIGN KEY ("quest_id") REFERENCES "public"."quests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks_versions" ADD CONSTRAINT "tasks_versions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks_versions" ADD CONSTRAINT "tasks_versions_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "tasks_versions_quest_id_version_idx" ON "tasks_versions" USING btree ("quest_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "tasks_versions_quest_id_undoes_version_idx" ON "tasks_versions" USING btree ("quest_id","undoes_version");--> statement-breakpoint
CREATE INDEX "tasks_versions_chat_id_idx" ON "tasks_versions" USING btree ("chat_id");--> statement-breakpoint
-- Breaking rename: deploy with the Tasks build; old builds cannot use this schema.
UPDATE chats SET spell = 'tasks' WHERE spell = 'plan';
--> statement-breakpoint
-- Rewrite protocol keys and identifiers, preserving user-authored prose and step text.
CREATE FUNCTION pg_temp.tasks_protocol(value jsonb) RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE result jsonb; item record; new_key text; new_value jsonb;
BEGIN
  IF jsonb_typeof(value) = 'array' THEN
    SELECT coalesce(jsonb_agg(pg_temp.tasks_protocol(element) ORDER BY ordinal), '[]'::jsonb)
      INTO result FROM jsonb_array_elements(value) WITH ORDINALITY AS entries(element, ordinal);
    RETURN result;
  ELSIF jsonb_typeof(value) = 'object' THEN
    result := '{}'::jsonb;
    FOR item IN SELECT key, val FROM jsonb_each(value) AS entries(key, val) LOOP
      new_key := item.key;
      IF new_key = 'plan' THEN new_key := 'tasks'; END IF;
      new_value := pg_temp.tasks_protocol(item.val);
      IF item.key IN ('destination', 'id', 'toolName') AND item.val = '"plan"'::jsonb THEN
        new_value := '"tasks"'::jsonb;
      ELSIF item.key = 'type' AND item.val IN ('"data-plan-card"'::jsonb, '"data-plan-change"'::jsonb, '"tool-change_plan"'::jsonb) THEN
        new_value := to_jsonb(replace(item.val #>> '{}', 'plan', 'tasks'));
      ELSIF item.key = 'toolName' AND item.val = '"change_plan"'::jsonb THEN
        new_value := '"change_tasks"'::jsonb;
      ELSIF item.key = 'command' AND item.val = '"/plan"'::jsonb THEN
        new_value := '"/tasks"'::jsonb;
      END IF;
      result := result || jsonb_build_object(new_key, new_value);
    END LOOP;
    RETURN result;
  END IF;
  RETURN value;
END;
$$;
--> statement-breakpoint
UPDATE messages SET parts = pg_temp.tasks_protocol(parts);
--> statement-breakpoint
UPDATE chats SET spell_snapshot = pg_temp.tasks_protocol(spell_snapshot)
WHERE spell_snapshot IS NOT NULL;
--> statement-breakpoint
UPDATE chats SET spell_snapshot = jsonb_set(spell_snapshot, '{name}', '"Tasks"'::jsonb)
WHERE spell_snapshot->>'id' = 'tasks' AND spell_snapshot->>'name' = 'Plan';
--> statement-breakpoint
UPDATE own_prompts SET parts = pg_temp.tasks_protocol(parts),
  cloned_from = CASE WHEN cloned_from = 'plan' THEN 'tasks' ELSE cloned_from END
WHERE kind = 'spell';
--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_spell_valid" CHECK ("chats"."spell" in ('tasks', 'brainstorm'));