CREATE TABLE "quest_transfers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"source_chat_id" uuid NOT NULL,
	"source_message_id" text NOT NULL,
	"name" text NOT NULL,
	"summary" text NOT NULL,
	"motivation" text DEFAULT '' NOT NULL,
	"project_id" uuid,
	"target_chat_id" uuid
);
--> statement-breakpoint
CREATE TABLE "reply_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"cost_micro_usd" integer
);
--> statement-breakpoint
ALTER TABLE "reply_runs" ADD COLUMN "accounting_complete" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "quest_transfers" ADD CONSTRAINT "quest_transfers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quest_transfers" ADD CONSTRAINT "quest_transfers_source_chat_id_chats_id_fk" FOREIGN KEY ("source_chat_id") REFERENCES "public"."chats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quest_transfers" ADD CONSTRAINT "quest_transfers_source_message_id_messages_id_fk" FOREIGN KEY ("source_message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quest_transfers" ADD CONSTRAINT "quest_transfers_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quest_transfers" ADD CONSTRAINT "quest_transfers_target_chat_id_chats_id_fk" FOREIGN KEY ("target_chat_id") REFERENCES "public"."chats"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reply_usage" ADD CONSTRAINT "reply_usage_run_id_reply_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."reply_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reply_usage" ADD CONSTRAINT "reply_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "quest_transfer_one_per_message" ON "quest_transfers" USING btree ("user_id","source_message_id");