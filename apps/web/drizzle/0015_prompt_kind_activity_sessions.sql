CREATE TABLE "activity_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chat_id" uuid NOT NULL,
	"activity_id" text NOT NULL,
	"activity_name" text NOT NULL,
	"activity_parts" jsonb NOT NULL,
	"start_message_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "buddies" ADD COLUMN "kind" text DEFAULT 'buddy' NOT NULL;--> statement-breakpoint
ALTER TABLE "activity_sessions" ADD CONSTRAINT "activity_sessions_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_sessions_chat_id_idx" ON "activity_sessions" USING btree ("chat_id","created_at");--> statement-breakpoint
ALTER TABLE "buddies" ADD CONSTRAINT "buddies_kind_known" CHECK ("buddies"."kind" in ('buddy', 'activity'));