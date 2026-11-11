-- Destructive follow-up: release #926 must be live and #898 must precede it.
-- Remove procedural dependencies before their tables. Batteries use gold_*,
-- not orb_*, and account creation no longer grants the retired currency.
DROP TRIGGER user_starting_orbs ON users;
--> statement-breakpoint
DROP FUNCTION grant_new_user_orbs();
--> statement-breakpoint
-- Preserve the pause on new purchases without reading the retired cutover.
-- Historical purchases and their listings remain immutable audit records.
CREATE OR REPLACE FUNCTION guard_marketplace_currency() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Marketplace purchases are paused or require orbs';
END;
$$;
--> statement-breakpoint
DROP TABLE "chat_unreads";--> statement-breakpoint
DROP TABLE "marketplace_cutover";--> statement-breakpoint
DROP TABLE "orb_balances";--> statement-breakpoint
DROP TABLE "orb_ledger";--> statement-breakpoint
DROP TABLE "project_invitations";--> statement-breakpoint
DROP TABLE "project_members";--> statement-breakpoint
DROP TABLE "push_subscriptions";--> statement-breakpoint
DROP TABLE "quest_transfers";
