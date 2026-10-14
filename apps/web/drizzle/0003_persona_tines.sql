-- Three personas were renamed (persona-spoof-names, 2026-10-12). Saved chats
-- move to the new ids so they keep their character. One statement, so the
-- three moves apply together. Other ids are left as they are.
UPDATE "chats"
SET "persona_id" = CASE "persona_id"
  WHEN 'stan-spines' THEN 'span-tines'
  WHEN 'fjord-pines' THEN 'fjord-tines'
  WHEN 'egon-spangler' THEN 'argon-sprangler'
END
WHERE "persona_id" IN ('stan-spines', 'fjord-pines', 'egon-spangler');
