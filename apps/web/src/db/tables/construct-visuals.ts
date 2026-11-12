import { sql } from "drizzle-orm";
import {
  check,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { listings } from "./listings.ts";
import { ownPrompts } from "./own-prompts.ts";
import { chats } from "./quests-and-chats.ts";
import { users } from "./users.ts";

const constructAssets = pgTable("construct_assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  mediaType: text("media_type").notNull(),
  data: text("data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
const constructAssetGrants = pgTable(
  "construct_asset_grants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => constructAssets.id),
    constructId: uuid("construct_id").references(() => ownPrompts.id, {
      onDelete: "cascade",
    }),
    adventureId: uuid("adventure_id").references(() => chats.id, {
      onDelete: "cascade",
    }),
    listingId: uuid("listing_id").references(() => listings.id, {
      onDelete: "cascade",
    }),
  },
  (table) => [
    check(
      "construct_grant_destination",
      sql`num_nonnulls(${table.constructId}, ${table.adventureId}, ${table.listingId}) = 1`,
    ),
    uniqueIndex("construct_grant_unique").on(table.assetId, table.constructId),
    uniqueIndex("adventure_grant_unique").on(table.assetId, table.adventureId),
    uniqueIndex("listing_grant_unique").on(table.assetId, table.listingId),
  ],
);
const constructGenerations = pgTable(
  "construct_generations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    constructId: uuid("construct_id").references(() => ownPrompts.id, {
      onDelete: "set null",
    }),
    sourceId: uuid("source_id").notNull(),
    requestId: uuid("request_id").notNull(),
    description: text("description").notNull(),
    sourceParts: jsonb("source_parts").notNull(),
    sourceUpdatedAt: text("source_updated_at").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    status: text("status").notNull().default("pending"),
    visual: jsonb("visual"),
    costMicroUsd: integer("cost_micro_usd").notNull(),
  },
  (table) => [
    uniqueIndex("construct_generation_replay").on(
      table.userId,
      table.requestId,
    ),
  ],
);

export { constructAssetGrants, constructAssets, constructGenerations };
