-- The data half of the release after #549, which follows #549 once it is
-- live. #549's build reads both the old and the new form of each value, so
-- it keeps working while this runs. projects.interview_chat_id stays for
-- that build to read; a later release drops it.

-- Memory versions saved by the buddy before #549 name it "tutor".
UPDATE "memory_versions" SET "author" = 'buddy' WHERE "author" = 'tutor';
--> statement-breakpoint

-- Saved messages name the Blender manual lookup's tools as before #549:
-- search_manual and cite_manual.
UPDATE "messages"
SET "parts" = (
  SELECT jsonb_agg(
    CASE "item"."part"->>'type'
      WHEN 'tool-search_manual'
        THEN jsonb_set("item"."part", '{type}', '"tool-search_blender_manual"')
      WHEN 'tool-cite_manual'
        THEN jsonb_set("item"."part", '{type}', '"tool-cite_blender_manual"')
      ELSE "item"."part"
    END
    ORDER BY "item"."position"
  )
  FROM jsonb_array_elements("messages"."parts")
    WITH ORDINALITY AS "item"("part", "position")
)
WHERE jsonb_typeof("parts") = 'array'
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements("messages"."parts") AS "old"("part")
    WHERE "old"."part"->>'type' IN ('tool-search_manual', 'tool-cite_manual')
  );
--> statement-breakpoint

-- Own buddies and chats' buddy snapshots saved before #549 hold every part
-- of the old buddy prompt, with the habits under teachingRules. They keep
-- their voice and habits; the rest is the global prompt's now.
UPDATE "buddies"
SET "parts" = jsonb_build_object(
  'voice', "parts"->'voice',
  'habits', "parts"->'teachingRules'
)
WHERE "kind" = 'buddy'
  AND "parts"->'voice' IS NOT NULL
  AND "parts"->'teachingRules' IS NOT NULL
  AND "parts"->'habits' IS NULL;
--> statement-breakpoint

UPDATE "chats"
SET "buddy_parts" = jsonb_build_object(
  'voice', "buddy_parts"->'voice',
  'habits', "buddy_parts"->'teachingRules'
)
WHERE "buddy_parts"->'voice' IS NOT NULL
  AND "buddy_parts"->'teachingRules' IS NOT NULL
  AND "buddy_parts"->'habits' IS NULL;
--> statement-breakpoint

-- The extras #549 removed, which accounts may still have switched.
UPDATE "users"
SET "hidden_extras" = array_remove(
  array_remove(
    array_remove(
      array_remove("hidden_extras", 'brainstorming'),
      'project-breakdown'
    ),
    'persona-mechanics'
  ),
  'interview-persona'
)
WHERE "hidden_extras" && ARRAY[
  'brainstorming', 'project-breakdown', 'persona-mechanics', 'interview-persona'
]::text[];
--> statement-breakpoint

-- Each project's interview chat from before #549 has no activity session,
-- so only interview_chat_id says it is in the interview. It enters the
-- interview from its start, as the built-in interview was at #549. Every
-- other chat with no session is in the open chat.
INSERT INTO "activity_sessions" (
  "chat_id", "activity_id", "activity_name", "activity_parts",
  "start_message_id", "created_at"
)
SELECT
  "chats"."id",
  'interview',
  'Project interview',
  '{"instructions": "# Activity: Project interview\nBefore you help with the work, the project''s memory should hold four things:\n- the user''s goal: what they want to make or learn;\n- what they already know about it;\n- what the result is for;\n- a path of milestones, each a small step they can take.\nWhile the memory lacks any of them, carry on the interview in this chat. Judge what is missing from the memory''s text, which the user may have written or edited themselves. The buddy you play sets your voice, not what you ask.\n- Ask one question at a time, about the goal first, then what they already know, then what the result is for, and ask a follow-up question where an answer is unclear. If the user asks something first, answer it briefly, then carry on.\n- After every answer that tells you something new about their goal, what they already know or what the result is for, save it with `update_memory` before you ask your next question. While the memory is empty, give an empty oldText and the Markdown in newText. Once it holds something, either copy the exact text you are changing into oldText, with its new version in newText, or give an empty oldText to add a new paragraph at the end.\n- Once the memory holds all three, write the path of milestones, save it the same way, and tell the user the first milestone.\nOnce the memory holds all four, don''t interview: help from it.\nIf this chat belongs to no project, it has no memory to interview into: call `create_project` with a short name for the project, and the interview carries on in the new project''s chat.", "openingKickoff": "I have just started this project. Open the chat by asking me the first thing the project interview still needs."}'::jsonb,
  NULL,
  "chats"."created_at"
FROM "projects"
JOIN "chats" ON "chats"."id" = "projects"."interview_chat_id"
WHERE NOT EXISTS (
  SELECT 1 FROM "activity_sessions"
  WHERE "activity_sessions"."chat_id" = "chats"."id"
);
