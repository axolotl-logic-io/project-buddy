ALTER TABLE "ability_points" RENAME TO "events";--> statement-breakpoint
ALTER TABLE "events" RENAME COLUMN "ability" TO "event";--> statement-breakpoint
ALTER TABLE "events" DROP CONSTRAINT "ability_points_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "events" DROP CONSTRAINT "ability_points_quest_id_quests_id_fk";
--> statement-breakpoint
DROP INDEX "ability_points_user_id_ability_idx";--> statement-breakpoint
DROP INDEX "ability_points_quest_id_ability_source_idx";--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_quest_id_quests_id_fk" FOREIGN KEY ("quest_id") REFERENCES "public"."quests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "events_user_id_event_idx" ON "events" USING btree ("user_id","event");--> statement-breakpoint
CREATE INDEX "events_quest_id_event_source_idx" ON "events" USING btree ("quest_id","event","source");
--> statement-breakpoint
UPDATE events SET event = 'adding' WHERE event IN ('adding-tasks', 'ideating', 'noting');
--> statement-breakpoint
UPDATE events SET event = 'checking-off' WHERE event = 'completing-tasks';
