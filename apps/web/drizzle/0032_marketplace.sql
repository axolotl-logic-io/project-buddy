CREATE TABLE "listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seller_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"parts" jsonb NOT NULL,
	"description" text NOT NULL,
	"price" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"unlisted_at" timestamp with time zone,
	CONSTRAINT "listings_kind_known" CHECK ("listings"."kind" in ('buddy', 'activity', 'spell')),
	CONSTRAINT "listings_description_length" CHECK (char_length("listings"."description") <= 500),
	CONSTRAINT "listings_price_range" CHECK ("listings"."price" >= 0 and "listings"."price" <= 10000)
);
--> statement-breakpoint
CREATE TABLE "purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"buyer_id" uuid NOT NULL,
	"price" integer NOT NULL,
	"copy_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "buddies" ADD COLUMN "bought_from" uuid;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_copy_id_buddies_id_fk" FOREIGN KEY ("copy_id") REFERENCES "public"."buddies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "listings_source_id_idx" ON "listings" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "listings_seller_id_idx" ON "listings" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX "listings_listed_idx" ON "listings" USING btree ("created_at","id") WHERE "listings"."unlisted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "purchases_one_copy_idx" ON "purchases" USING btree ("listing_id","buyer_id") WHERE "purchases"."copy_id" is not null;--> statement-breakpoint
CREATE INDEX "purchases_buyer_id_idx" ON "purchases" USING btree ("buyer_id");--> statement-breakpoint
CREATE INDEX "purchases_copy_id_idx" ON "purchases" USING btree ("copy_id");