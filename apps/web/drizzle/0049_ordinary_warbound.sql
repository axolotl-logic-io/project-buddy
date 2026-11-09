CREATE TABLE "battery_purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"package_id" text NOT NULL,
	"price_id" text NOT NULL,
	"batteries" bigint NOT NULL,
	"amount" bigint NOT NULL,
	"currency" text NOT NULL,
	"session_id" text,
	"payment_id" text,
	"event_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"fulfilled_at" timestamp with time zone,
	CONSTRAINT "battery_purchases_session_id_unique" UNIQUE("session_id"),
	CONSTRAINT "battery_purchases_payment_id_unique" UNIQUE("payment_id")
);
--> statement-breakpoint
ALTER TABLE "battery_purchases" ADD CONSTRAINT "battery_purchases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;