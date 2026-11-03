ALTER TABLE "push_subscriptions" ADD COLUMN "device" text;--> statement-breakpoint
CREATE INDEX "push_subscriptions_device_idx" ON "push_subscriptions" USING btree ("device");