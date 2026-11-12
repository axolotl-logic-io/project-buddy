ALTER TABLE "projects" RENAME TO "quests";--> statement-breakpoint
ALTER TABLE "journal_versions" RENAME COLUMN "project_id" TO "quest_id";--> statement-breakpoint
ALTER TABLE "memory_versions" RENAME COLUMN "project_id" TO "quest_id";--> statement-breakpoint
ALTER TABLE "milestones" RENAME COLUMN "project_id" TO "quest_id";--> statement-breakpoint
ALTER TABLE "plan_versions" RENAME COLUMN "project_id" TO "quest_id";--> statement-breakpoint
ALTER TABLE "chats" RENAME COLUMN "project_id" TO "quest_id";--> statement-breakpoint
ALTER TABLE "quest_status_approvals" RENAME COLUMN "project_id" TO "quest_id";--> statement-breakpoint
ALTER TABLE "chats" DROP CONSTRAINT "chats_one_owner";--> statement-breakpoint
ALTER TABLE "quests" DROP CONSTRAINT "projects_status_valid";--> statement-breakpoint
ALTER TABLE "quests" DROP CONSTRAINT "projects_status_revision_valid";--> statement-breakpoint
ALTER TABLE "quests" DROP CONSTRAINT "projects_check_in_frequency_valid";--> statement-breakpoint
ALTER TABLE "journal_versions" DROP CONSTRAINT "journal_versions_project_id_projects_id_fk";
--> statement-breakpoint
ALTER TABLE "memory_versions" DROP CONSTRAINT "memory_versions_project_id_projects_id_fk";
--> statement-breakpoint
ALTER TABLE "milestones" DROP CONSTRAINT "milestones_project_id_projects_id_fk";
--> statement-breakpoint
ALTER TABLE "plan_versions" DROP CONSTRAINT "plan_versions_project_id_projects_id_fk";
--> statement-breakpoint
ALTER TABLE "chats" DROP CONSTRAINT "chats_project_id_projects_id_fk";
--> statement-breakpoint
ALTER TABLE "quests" DROP CONSTRAINT "projects_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "quest_status_approvals" DROP CONSTRAINT "quest_status_approvals_project_id_projects_id_fk";
--> statement-breakpoint
DROP INDEX "memory_versions_project_id_version_idx";--> statement-breakpoint
DROP INDEX "milestones_project_id_recorded_at_idx";--> statement-breakpoint
DROP INDEX "plan_versions_project_id_version_idx";--> statement-breakpoint
DROP INDEX "plan_versions_project_id_undoes_version_idx";--> statement-breakpoint
DROP INDEX "chats_project_id_idx";--> statement-breakpoint
DROP INDEX "chats_continuing_project_idx";--> statement-breakpoint
DROP INDEX "projects_user_id_idx";--> statement-breakpoint
DROP INDEX "projects_dailies_user_idx";--> statement-breakpoint
DROP INDEX "journal_versions_section_version_idx";--> statement-breakpoint
DROP INDEX "journal_versions_section_undo_idx";--> statement-breakpoint
ALTER TABLE "journal_versions" ADD CONSTRAINT "journal_versions_quest_id_quests_id_fk" FOREIGN KEY ("quest_id") REFERENCES "public"."quests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_versions" ADD CONSTRAINT "memory_versions_quest_id_quests_id_fk" FOREIGN KEY ("quest_id") REFERENCES "public"."quests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_quest_id_quests_id_fk" FOREIGN KEY ("quest_id") REFERENCES "public"."quests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_versions" ADD CONSTRAINT "plan_versions_quest_id_quests_id_fk" FOREIGN KEY ("quest_id") REFERENCES "public"."quests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_quest_id_quests_id_fk" FOREIGN KEY ("quest_id") REFERENCES "public"."quests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quests" ADD CONSTRAINT "quests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quest_status_approvals" ADD CONSTRAINT "quest_status_approvals_quest_id_quests_id_fk" FOREIGN KEY ("quest_id") REFERENCES "public"."quests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "memory_versions_quest_id_version_idx" ON "memory_versions" USING btree ("quest_id","version");--> statement-breakpoint
CREATE INDEX "milestones_quest_id_recorded_at_idx" ON "milestones" USING btree ("quest_id","recorded_at");--> statement-breakpoint
CREATE UNIQUE INDEX "plan_versions_quest_id_version_idx" ON "plan_versions" USING btree ("quest_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "plan_versions_quest_id_undoes_version_idx" ON "plan_versions" USING btree ("quest_id","undoes_version");--> statement-breakpoint
CREATE INDEX "chats_quest_id_idx" ON "chats" USING btree ("quest_id");--> statement-breakpoint
CREATE UNIQUE INDEX "chats_continuing_quest_idx" ON "chats" USING btree ("quest_id") WHERE "chats"."continuing" and "chats"."quest_id" is not null;--> statement-breakpoint
CREATE INDEX "quests_user_id_idx" ON "quests" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "quests_dailies_user_idx" ON "quests" USING btree ("user_id") WHERE "quests"."dailies";--> statement-breakpoint
CREATE UNIQUE INDEX "journal_versions_section_version_idx" ON "journal_versions" USING btree ("quest_id","kind","version");--> statement-breakpoint
CREATE UNIQUE INDEX "journal_versions_section_undo_idx" ON "journal_versions" USING btree ("quest_id","kind","undoes_version");--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_one_owner" CHECK (num_nonnulls("chats"."quest_id", "chats"."user_id") = 1);--> statement-breakpoint
ALTER TABLE "quests" ADD CONSTRAINT "quests_status_valid" CHECK ("quests"."status" in ('active', 'completed', 'abandoned'));--> statement-breakpoint
ALTER TABLE "quests" ADD CONSTRAINT "quests_status_revision_valid" CHECK ("quests"."status_revision" >= 0);--> statement-breakpoint
ALTER TABLE "quests" ADD CONSTRAINT "quests_check_in_frequency_valid" CHECK ("quests"."check_in_frequency" in ('off', 'daily', 'few-times-a-week', 'weekly'));--> statement-breakpoint
ALTER TABLE "quests" RENAME CONSTRAINT "projects_pkey" TO "quests_pkey";
--> statement-breakpoint
-- Transfer structured fields and executable prompt references, preserving prose.
CREATE FUNCTION migrate_quest_names(value jsonb) RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  result jsonb;
  field text;
  item jsonb;
  renamed text;
BEGIN
  IF jsonb_typeof(value) = 'array' THEN
    SELECT COALESCE(jsonb_agg(migrate_quest_names(element) ORDER BY position), '[]'::jsonb)
      INTO result FROM jsonb_array_elements(value) WITH ORDINALITY AS entries(element, position);
    RETURN result;
  ELSIF jsonb_typeof(value) = 'object' THEN
    result := '{}'::jsonb;
    FOR field, item IN SELECT key, val FROM jsonb_each(value) AS fields(key, val) LOOP
      renamed := CASE WHEN field = 'projectId' THEN 'questId' ELSE field END;
      IF field = 'type' AND item = '"tool-create_project"'::jsonb THEN
        item := '"tool-create_quest"'::jsonb;
      ELSIF field = 'toolName' AND item = '"create_project"'::jsonb THEN
        item := '"create_quest"'::jsonb;
      ELSIF field = 'status' AND item = '"needsProject"'::jsonb THEN
        item := '"needsQuest"'::jsonb;
      ELSIF field IN ('prompt', 'instructions', 'voice', 'habits', 'openingRequest', 'openingKickoff')
            AND jsonb_typeof(item) = 'string' THEN
        item := to_jsonb(replace(replace(item #>> '{}',
          'create_project', 'create_quest'), 'project_memory', 'quest_memory'));
      ELSE
        item := migrate_quest_names(item);
      END IF;
      result := result || jsonb_build_object(renamed, item);
    END LOOP;
    RETURN result;
  END IF;
  RETURN value;
END;
$$;
--> statement-breakpoint
UPDATE messages SET parts = migrate_quest_names(parts)
WHERE parts IS DISTINCT FROM migrate_quest_names(parts);
--> statement-breakpoint
UPDATE activity_sessions SET activity_parts = migrate_quest_names(activity_parts)
WHERE activity_parts IS DISTINCT FROM migrate_quest_names(activity_parts);
--> statement-breakpoint
UPDATE buddies SET parts = migrate_quest_names(parts)
WHERE parts IS DISTINCT FROM migrate_quest_names(parts);
--> statement-breakpoint
UPDATE chats SET buddy_parts = migrate_quest_names(buddy_parts)
WHERE buddy_parts IS DISTINCT FROM migrate_quest_names(buddy_parts);
--> statement-breakpoint
UPDATE listings SET parts = migrate_quest_names(parts)
WHERE parts IS DISTINCT FROM migrate_quest_names(parts);
--> statement-breakpoint
UPDATE construct_generations SET source_parts = migrate_quest_names(source_parts)
WHERE source_parts IS DISTINCT FROM migrate_quest_names(source_parts);
--> statement-breakpoint
DROP FUNCTION migrate_quest_names(jsonb);
