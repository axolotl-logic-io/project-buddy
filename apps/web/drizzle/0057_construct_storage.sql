ALTER TABLE "buddies" RENAME TO "own_prompts";--> statement-breakpoint
ALTER TABLE "listings" DROP CONSTRAINT "listings_kind_known";--> statement-breakpoint
ALTER TABLE "memory_versions" DROP CONSTRAINT "memory_versions_author_known";--> statement-breakpoint
ALTER TABLE "own_prompts" DROP CONSTRAINT "buddies_kind_known";--> statement-breakpoint
ALTER TABLE "construct_asset_grants" DROP CONSTRAINT "construct_asset_grants_construct_id_buddies_id_fk";
--> statement-breakpoint
ALTER TABLE "construct_generations" DROP CONSTRAINT "construct_generations_construct_id_buddies_id_fk";
--> statement-breakpoint
ALTER TABLE "purchases" DROP CONSTRAINT "purchases_copy_id_buddies_id_fk";
--> statement-breakpoint
ALTER TABLE "own_prompts" DROP CONSTRAINT "buddies_user_id_users_id_fk";
--> statement-breakpoint
DROP INDEX "buddies_user_id_idx";--> statement-breakpoint
ALTER TABLE "construct_asset_grants" ADD CONSTRAINT "construct_asset_grants_construct_id_own_prompts_id_fk" FOREIGN KEY ("construct_id") REFERENCES "public"."own_prompts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "construct_generations" ADD CONSTRAINT "construct_generations_construct_id_own_prompts_id_fk" FOREIGN KEY ("construct_id") REFERENCES "public"."own_prompts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_copy_id_own_prompts_id_fk" FOREIGN KEY ("copy_id") REFERENCES "public"."own_prompts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "own_prompts" ADD CONSTRAINT "own_prompts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "own_prompts_user_id_idx" ON "own_prompts" USING btree ("user_id");--> statement-breakpoint
UPDATE listings SET kind = 'construct' WHERE kind = 'buddy';
--> statement-breakpoint
UPDATE memory_versions SET author = 'construct' WHERE author = 'buddy';
--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_kind_known" CHECK ("listings"."kind" in ('construct', 'activity', 'spell'));--> statement-breakpoint
ALTER TABLE "memory_versions" ADD CONSTRAINT "memory_versions_author_known" CHECK ("memory_versions"."author" in ('user', 'construct'));--> statement-breakpoint
ALTER TABLE "own_prompts" ADD CONSTRAINT "own_prompts_kind_known" CHECK ("own_prompts"."kind" in ('buddy', 'activity', 'spell'));
--> statement-breakpoint
ALTER TABLE "own_prompts" RENAME CONSTRAINT "buddies_pkey" TO "own_prompts_pkey";
