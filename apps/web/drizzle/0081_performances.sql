CREATE TABLE "conjurations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"performance_id" uuid NOT NULL,
	"user_id" uuid,
	"author" text NOT NULL,
	"text" text NOT NULL,
	"reply" text NOT NULL,
	"added" integer NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "performances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quest_id" uuid NOT NULL,
	"space_id" uuid NOT NULL,
	"rite_snapshot" jsonb NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"closing" text,
	"added" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"replies" jsonb NOT NULL,
	"forgotten_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "conjurations" ADD CONSTRAINT "conjurations_performance_id_performances_id_fk" FOREIGN KEY ("performance_id") REFERENCES "public"."performances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conjurations" ADD CONSTRAINT "conjurations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performances" ADD CONSTRAINT "performances_quest_id_space_id_spaces_quest_id_id_fk" FOREIGN KEY ("quest_id","space_id") REFERENCES "public"."spaces"("quest_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rites" ADD CONSTRAINT "rites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "conjurations_performance_position_idx" ON "conjurations" USING btree ("performance_id","position");--> statement-breakpoint
CREATE INDEX "performances_quest_started_idx" ON "performances" USING btree ("quest_id","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "performances_active_quest_idx" ON "performances" USING btree ("quest_id") WHERE "performances"."ended_at" is null;--> statement-breakpoint
CREATE INDEX "rites_user_idx" ON "rites" USING btree ("user_id");