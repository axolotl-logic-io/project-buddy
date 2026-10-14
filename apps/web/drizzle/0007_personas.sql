CREATE TABLE "personas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"parts" jsonb NOT NULL,
	"cloned_from" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chats" ADD COLUMN "persona_name" text;--> statement-breakpoint
ALTER TABLE "chats" ADD COLUMN "persona_parts" jsonb;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "interview_chat_id" uuid;--> statement-breakpoint
ALTER TABLE "personas" ADD CONSTRAINT "personas_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "personas_user_id_idx" ON "personas" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_interview_chat_id_chats_id_fk" FOREIGN KEY ("interview_chat_id") REFERENCES "public"."chats"("id") ON DELETE set null ON UPDATE no action;