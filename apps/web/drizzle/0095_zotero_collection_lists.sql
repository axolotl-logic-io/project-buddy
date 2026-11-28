CREATE TABLE "zotero_authorizations" (
	"token" text PRIMARY KEY NOT NULL,
	"secret" text NOT NULL,
	"user_id" uuid NOT NULL,
	"return_to" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "zotero_connections" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"zotero_user_id" text NOT NULL,
	"username" text NOT NULL,
	"api_key" text NOT NULL,
	"write_access" boolean NOT NULL,
	"connected_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "zotero_lists" (
	"list_id" uuid PRIMARY KEY NOT NULL,
	"quest_id" uuid NOT NULL,
	"zotero_user_id" text NOT NULL,
	"collection_key" text NOT NULL,
	"collection_name" text NOT NULL,
	"custom_name" boolean DEFAULT false NOT NULL,
	"checkmark_tag" text,
	"tag_read" text,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sync_started_at" timestamp with time zone,
	"unavailable" text,
	"last_sync" jsonb NOT NULL,
	CONSTRAINT "zotero_lists_unavailable_valid" CHECK ("zotero_lists"."unavailable" in ('access-ended', 'collection-missing', 'other-account'))
);
--> statement-breakpoint
CREATE TABLE "zotero_references" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quest_id" uuid NOT NULL,
	"list_id" uuid NOT NULL,
	"item_key" text NOT NULL,
	"position" integer NOT NULL,
	"entry" jsonb NOT NULL,
	"search_text" text NOT NULL,
	"href" text,
	"checked" boolean,
	"pending" boolean,
	"mark_revision" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lists" DROP CONSTRAINT "lists_type_valid";--> statement-breakpoint
ALTER TABLE "zotero_authorizations" ADD CONSTRAINT "zotero_authorizations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zotero_connections" ADD CONSTRAINT "zotero_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zotero_lists" ADD CONSTRAINT "zotero_lists_quest_id_list_id_lists_quest_id_id_fk" FOREIGN KEY ("quest_id","list_id") REFERENCES "public"."lists"("quest_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zotero_references" ADD CONSTRAINT "zotero_references_list_id_zotero_lists_list_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."zotero_lists"("list_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "zotero_authorizations_user_idx" ON "zotero_authorizations" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "zotero_references_list_item_idx" ON "zotero_references" USING btree ("list_id","item_key");--> statement-breakpoint
CREATE INDEX "zotero_references_list_position_idx" ON "zotero_references" USING btree ("list_id","position");--> statement-breakpoint
ALTER TABLE "lists" ADD CONSTRAINT "lists_type_valid" CHECK ("lists"."type" in ('plain', 'task', 'quick-note', 'tally', 'zotero-collection'));