-- Construct artwork is the built-in drawings only. Stored construct snapshots
-- name them "lumen" and "vellum" (they said "lumen-v1", "lumen-v2" and so on),
-- and lose any reference to a generated image. The generated-artwork tables
-- and the construct's previous_visual column go with them.
UPDATE "chats" SET "construct_parts" = regexp_replace("construct_parts"::text, '"artwork": "(lumen|vellum)-v[12]"', '"artwork": "\1"', 'g')::jsonb
WHERE "construct_parts"::text ~ '"artwork": "(lumen|vellum)-v[12]"';--> statement-breakpoint
UPDATE "chats" SET "construct_parts" = "construct_parts" #- '{visual,canonical}'
WHERE "construct_parts" #>> '{visual,canonical,kind}' = 'generated';--> statement-breakpoint
UPDATE "chats" SET "construct_parts" = "construct_parts" #- '{visual,working}'
WHERE "construct_parts" #>> '{visual,working,kind}' = 'generated';--> statement-breakpoint
UPDATE "own_prompts" SET "parts" = regexp_replace("parts"::text, '"artwork": "(lumen|vellum)-v[12]"', '"artwork": "\1"', 'g')::jsonb
WHERE "parts"::text ~ '"artwork": "(lumen|vellum)-v[12]"';--> statement-breakpoint
UPDATE "own_prompts" SET "parts" = "parts" #- '{visual,canonical}'
WHERE "parts" #>> '{visual,canonical,kind}' = 'generated';--> statement-breakpoint
UPDATE "own_prompts" SET "parts" = "parts" #- '{visual,working}'
WHERE "parts" #>> '{visual,working,kind}' = 'generated';--> statement-breakpoint
DROP TABLE "construct_asset_grants" CASCADE;--> statement-breakpoint
DROP TABLE "construct_assets" CASCADE;--> statement-breakpoint
DROP TABLE "construct_generations" CASCADE;--> statement-breakpoint
ALTER TABLE "own_prompts" DROP COLUMN "previous_visual";