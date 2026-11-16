-- Breaking rename: a quest's Tasks hold tasks, not steps. Deploy with the
-- build that reads "items" and "task"; old builds cannot read this data.
-- Rewrites the saved Tasks, their undo operations and the construct's saved
-- change_tasks calls, keeping every task's text as it is.
CREATE FUNCTION pg_temp.task_keys(value jsonb) RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE result jsonb; item record; new_key text; new_value jsonb;
BEGIN
  IF jsonb_typeof(value) = 'array' THEN
    SELECT coalesce(jsonb_agg(pg_temp.task_keys(element) ORDER BY ordinal), '[]'::jsonb)
      INTO result FROM jsonb_array_elements(value) WITH ORDINALITY AS entries(element, ordinal);
    RETURN result;
  ELSIF jsonb_typeof(value) = 'object' THEN
    result := '{}'::jsonb;
    FOR item IN SELECT key, val FROM jsonb_each(value) AS entries(key, val) LOOP
      new_key := CASE item.key WHEN 'steps' THEN 'items' WHEN 'step' THEN 'task' ELSE item.key END;
      new_value := pg_temp.task_keys(item.val);
      IF item.key = 'reason' AND item.val = '"missing-step"'::jsonb THEN
        new_value := '"missing-task"'::jsonb;
      END IF;
      result := result || jsonb_build_object(new_key, new_value);
    END LOOP;
    RETURN result;
  END IF;
  RETURN value;
END;
$$;
--> statement-breakpoint
UPDATE tasks_versions SET tasks = pg_temp.task_keys(tasks), undo = pg_temp.task_keys(undo);
--> statement-breakpoint
UPDATE messages SET parts = (
  SELECT jsonb_agg(
    CASE WHEN part->>'type' = 'tool-change_tasks' THEN pg_temp.task_keys(part) ELSE part END
    ORDER BY ordinal
  )
  FROM jsonb_array_elements(parts) WITH ORDINALITY AS entries(part, ordinal)
)
WHERE parts @> '[{"type": "tool-change_tasks"}]'::jsonb;
