ALTER TABLE "monthly_spend" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "monthly_spend" CASCADE;--> statement-breakpoint
ALTER TABLE "image_generations" ALTER COLUMN "month" DROP NOT NULL;