CREATE TABLE "activity_message_results" (
	"message_id" text PRIMARY KEY NOT NULL,
	"chat_id" uuid NOT NULL,
	"text" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity_message_results" ADD CONSTRAINT "activity_message_results_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_message_results" ADD CONSTRAINT "activity_message_results_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE cascade ON UPDATE no action;