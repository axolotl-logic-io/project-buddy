ALTER TABLE "performance_messages" ADD COLUMN "reply_index" integer;--> statement-breakpoint
ALTER TABLE "rites" ADD COLUMN "reply_order" text DEFAULT 'random' NOT NULL;--> statement-breakpoint
ALTER TABLE "rites" ADD COLUMN "loop" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "rites" ADD COLUMN "final_reply" text DEFAULT '' NOT NULL;