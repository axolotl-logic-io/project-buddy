CREATE TABLE "marketplace_cutover" (
	"id" integer PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orb_balances" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"orbs" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orb_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"orbs" integer NOT NULL,
	"reason" text NOT NULL,
	"transfer_id" uuid,
	"counterparty_id" uuid,
	"reference_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orb_ledger_reason_valid" CHECK ("orb_ledger"."reason" in ('starting-grant', 'marketplace-sale', 'marketplace-purchase'))
);
--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "currency" text DEFAULT 'gold' NOT NULL;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "currency" text DEFAULT 'gold' NOT NULL;--> statement-breakpoint
ALTER TABLE "orb_balances" ADD CONSTRAINT "orb_balances_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orb_ledger" ADD CONSTRAINT "orb_ledger_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orb_ledger" ADD CONSTRAINT "orb_ledger_counterparty_id_users_id_fk" FOREIGN KEY ("counterparty_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "orb_ledger_user_id_idx" ON "orb_ledger" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "orb_ledger_one_starting_grant_idx" ON "orb_ledger" USING btree ("user_id") WHERE "orb_ledger"."reason" = 'starting-grant';--> statement-breakpoint
CREATE UNIQUE INDEX "orb_ledger_one_per_reference_idx" ON "orb_ledger" USING btree ("user_id","reason","reference_id") WHERE "orb_ledger"."reference_id" is not null;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_currency_price" CHECK ("listings"."currency" = 'gold' or ("listings"."currency" = 'orbs' and "listings"."price" between 0 and 5));--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_currency_price" CHECK ("purchases"."currency" = 'gold' or ("purchases"."currency" = 'orbs' and "purchases"."price" between 0 and 5));
--> statement-breakpoint
-- The migration pauses sales before the old build can write another purchase.
-- Existing rows retain gold; no prices, ledger facts or copies are rewritten.
INSERT INTO marketplace_cutover (id, enabled) VALUES (1, false);
--> statement-breakpoint
CREATE FUNCTION guard_marketplace_currency() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE purchases_enabled boolean;
BEGIN
  SELECT enabled INTO purchases_enabled FROM marketplace_cutover WHERE id = 1 FOR SHARE;
  IF NEW.currency <> 'orbs' OR purchases_enabled IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Marketplace purchases are paused or require orbs';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER marketplace_currency_guard BEFORE INSERT ON purchases
FOR EACH ROW EXECUTE FUNCTION guard_marketplace_currency();
--> statement-breakpoint
CREATE FUNCTION grant_new_user_orbs() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO orb_balances (user_id, orbs) VALUES (NEW.id, 100) ON CONFLICT DO NOTHING;
  INSERT INTO orb_ledger (user_id, orbs, reason) VALUES (NEW.id, 100, 'starting-grant') ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER user_starting_orbs AFTER INSERT ON users
FOR EACH ROW EXECUTE FUNCTION grant_new_user_orbs();
--> statement-breakpoint
-- Backfill: rerunning grants only balances not yet provisioned, with their audit row.
WITH granted AS (
  INSERT INTO orb_balances (user_id, orbs)
  SELECT id, 100 FROM users ORDER BY id ON CONFLICT DO NOTHING RETURNING user_id
)
INSERT INTO orb_ledger (user_id, orbs, reason)
SELECT user_id, 100, 'starting-grant' FROM granted ON CONFLICT DO NOTHING;
