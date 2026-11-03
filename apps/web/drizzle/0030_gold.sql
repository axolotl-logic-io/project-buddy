-- Additive: gold (#639) replaces the monthly quota. monthly_spend stays, so
-- the build that is live while this runs keeps reading and writing it; the
-- new build reads only gold_balances, and a later release drops
-- monthly_spend.
CREATE TABLE "gold_balances" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"micro_usd" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gold_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"micro_usd" bigint NOT NULL,
	"reason" text NOT NULL,
	"transfer_id" uuid,
	"counterparty_id" uuid,
	"reference_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gold_ledger_reason_valid" CHECK ("gold_ledger"."reason" in ('starting-grant', 'marketplace-sale', 'marketplace-purchase'))
);
--> statement-breakpoint
ALTER TABLE "gold_balances" ADD CONSTRAINT "gold_balances_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gold_ledger" ADD CONSTRAINT "gold_ledger_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gold_ledger" ADD CONSTRAINT "gold_ledger_counterparty_id_users_id_fk" FOREIGN KEY ("counterparty_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "gold_ledger_user_id_idx" ON "gold_ledger" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "gold_ledger_one_starting_grant_idx" ON "gold_ledger" USING btree ("user_id") WHERE "gold_ledger"."reason" = 'starting-grant';--> statement-breakpoint
CREATE UNIQUE INDEX "gold_ledger_one_per_reference_idx" ON "gold_ledger" USING btree ("user_id","reason","reference_id") WHERE "gold_ledger"."reference_id" is not null;--> statement-breakpoint

-- Backfill: every existing user is given the starting 100 gold
-- (1,000,000 micro-USD) once, whatever they spent before. Each insert
-- skips a user who already has it, so a re-run grants nothing twice.
INSERT INTO "gold_balances" ("user_id", "micro_usd")
SELECT "id", 1000000 FROM "users"
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "gold_ledger" ("user_id", "micro_usd", "reason")
SELECT "id", 1000000, 'starting-grant' FROM "users"
ON CONFLICT DO NOTHING;
