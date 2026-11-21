-- Saved images are no longer served: drop image parts from messages, and the
-- messages that held nothing else.
UPDATE "messages" SET "parts" = (
  SELECT coalesce(jsonb_agg(part ORDER BY position), '[]'::jsonb)
  FROM jsonb_array_elements("parts") WITH ORDINALITY AS item(part, position)
  WHERE part->>'type' NOT IN ('file', 'tool-generate_image')
)
WHERE jsonb_path_exists("parts", '$[*] ? (@.type == "file" || @.type == "tool-generate_image")');--> statement-breakpoint
DELETE FROM "messages" WHERE "parts" = '[]'::jsonb;--> statement-breakpoint
DROP TABLE "battery_cash_events" CASCADE;--> statement-breakpoint
DROP TABLE "battery_purchases" CASCADE;--> statement-breakpoint
DROP TABLE "gold_balances" CASCADE;--> statement-breakpoint
DROP TABLE "gold_ledger" CASCADE;--> statement-breakpoint
DROP TABLE "image_generations" CASCADE;--> statement-breakpoint
DROP TABLE "images" CASCADE;--> statement-breakpoint
DROP TABLE "listings" CASCADE;--> statement-breakpoint
DROP TABLE "purchases" CASCADE;--> statement-breakpoint
DROP TABLE "manual_sections" CASCADE;--> statement-breakpoint
DROP TABLE "reply_usage" CASCADE;