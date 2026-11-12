DROP TABLE "journal_versions" CASCADE;--> statement-breakpoint
DROP TABLE "memory_versions" CASCADE;
--> statement-breakpoint
DELETE FROM messages
WHERE role = 'user'
  AND jsonb_array_length(parts) > 0
  AND NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(parts) AS part
    WHERE part->>'type' IS DISTINCT FROM 'data-journal-section'
  );
--> statement-breakpoint
UPDATE messages SET parts = (
  SELECT COALESCE(jsonb_agg(part ORDER BY position), '[]'::jsonb)
  FROM jsonb_array_elements(messages.parts) WITH ORDINALITY AS entries(part, position)
  WHERE part->>'type' NOT IN ('data-journal-section', 'tool-update_memory', 'tool-set_goal', 'tool-change_preferences')
    AND NOT (part->>'type' = 'dynamic-tool' AND part->>'toolName' IN ('update_memory', 'set_goal', 'change_preferences'))
);
