CREATE TABLE "battery_cash_events" (
	"event_id" text PRIMARY KEY NOT NULL,
	"purchase_id" uuid NOT NULL,
	"object_id" text NOT NULL,
	"kind" text NOT NULL,
	"event_type" text NOT NULL,
	"amount" bigint NOT NULL,
	"currency" text NOT NULL,
	"status" text NOT NULL,
	"observed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "battery_purchases" DROP CONSTRAINT "battery_purchases_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "battery_cash_events" ADD CONSTRAINT "battery_cash_events_purchase_id_battery_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."battery_purchases"("id") ON DELETE no action ON UPDATE no action;