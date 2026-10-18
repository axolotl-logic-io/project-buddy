ALTER TABLE "chats" ALTER COLUMN "project_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "chats" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "chats_user_id_idx" ON "chats" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_one_owner" CHECK (num_nonnulls("chats"."project_id", "chats"."user_id") = 1);