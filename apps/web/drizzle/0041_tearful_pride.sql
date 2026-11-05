CREATE TABLE "construct_asset_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"construct_id" uuid,
	"adventure_id" uuid,
	"listing_id" uuid,
	CONSTRAINT "construct_grant_destination" CHECK (num_nonnulls("construct_asset_grants"."construct_id", "construct_asset_grants"."adventure_id", "construct_asset_grants"."listing_id") = 1)
);
--> statement-breakpoint
CREATE TABLE "construct_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"media_type" text NOT NULL,
	"data" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "construct_generations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"construct_id" uuid,
	"source_id" uuid NOT NULL,
	"request_id" uuid NOT NULL,
	"description" text NOT NULL,
	"source_parts" jsonb NOT NULL,
	"source_updated_at" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"visual" jsonb,
	"cost_micro_usd" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "construct_asset_grants" ADD CONSTRAINT "construct_asset_grants_asset_id_construct_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."construct_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "construct_asset_grants" ADD CONSTRAINT "construct_asset_grants_construct_id_buddies_id_fk" FOREIGN KEY ("construct_id") REFERENCES "public"."buddies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "construct_asset_grants" ADD CONSTRAINT "construct_asset_grants_adventure_id_chats_id_fk" FOREIGN KEY ("adventure_id") REFERENCES "public"."chats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "construct_asset_grants" ADD CONSTRAINT "construct_asset_grants_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "construct_generations" ADD CONSTRAINT "construct_generations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "construct_generations" ADD CONSTRAINT "construct_generations_construct_id_buddies_id_fk" FOREIGN KEY ("construct_id") REFERENCES "public"."buddies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "construct_grant_unique" ON "construct_asset_grants" USING btree ("asset_id","construct_id");--> statement-breakpoint
CREATE UNIQUE INDEX "adventure_grant_unique" ON "construct_asset_grants" USING btree ("asset_id","adventure_id");--> statement-breakpoint
CREATE UNIQUE INDEX "listing_grant_unique" ON "construct_asset_grants" USING btree ("asset_id","listing_id");--> statement-breakpoint
CREATE UNIQUE INDEX "construct_generation_replay" ON "construct_generations" USING btree ("user_id","request_id");