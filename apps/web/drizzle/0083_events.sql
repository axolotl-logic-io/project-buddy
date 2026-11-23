CREATE TABLE "events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  "event" text NOT NULL,
  "quest_id" uuid REFERENCES "quests" ("id") ON DELETE SET NULL,
  "source" text NOT NULL,
  "gained_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "events_user_id_event_idx" ON "events" ("user_id", "event");
--> statement-breakpoint
CREATE INDEX "events_quest_id_event_source_idx" ON "events" ("quest_id", "event", "source");
--> statement-breakpoint
INSERT INTO events (id, user_id, event, quest_id, source, gained_at)
SELECT id, user_id,
       CASE ability
         WHEN 'adding-tasks' THEN 'adding'
         WHEN 'ideating' THEN 'adding'
         WHEN 'noting' THEN 'adding'
         WHEN 'completing-tasks' THEN 'checking-off'
         ELSE ability
       END,
       quest_id, source, gained_at
FROM ability_points;
