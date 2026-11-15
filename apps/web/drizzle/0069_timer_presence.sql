CREATE TABLE "timer_presence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"work_minutes" integer NOT NULL,
	"break_minutes" integer NOT NULL,
	"start_ms" bigint NOT NULL,
	"reported_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "timer_presence" ADD CONSTRAINT "timer_presence_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "timer_presence_user_schedule_idx" ON "timer_presence" USING btree ("user_id","work_minutes","break_minutes","start_ms");--> statement-breakpoint
CREATE INDEX "timer_presence_schedule_idx" ON "timer_presence" USING btree ("work_minutes","break_minutes","start_ms","reported_at");--> statement-breakpoint
CREATE INDEX "timer_presence_reported_at_idx" ON "timer_presence" USING btree ("reported_at");