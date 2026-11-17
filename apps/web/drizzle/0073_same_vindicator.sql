CREATE TABLE "signed_in_days" (
	"user_id" uuid NOT NULL,
	"visited_on" date NOT NULL
);
--> statement-breakpoint
ALTER TABLE "signed_in_days" ADD CONSTRAINT "signed_in_days_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "signed_in_days_user_date_idx" ON "signed_in_days" USING btree ("user_id","visited_on");