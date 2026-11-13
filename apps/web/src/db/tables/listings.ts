import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
// Relative imports: drizzle-kit loads this file without the @/ alias.
import { STORED_PROMPT_KIND_LIST } from "../../prompts/prompt.ts";
import { ownPrompts } from "./own-prompts.ts";
import { users } from "./users.ts";

// The kinds a listing may be: every kind of prompt as stored, as SQL literals.
const KIND_LITERALS = sql.raw(
  STORED_PROMPT_KIND_LIST.map((kind) => `'${kind}'`).join(", "),
);

export const listings = pgTable(
  "listings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sellerId: uuid("seller_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sourceId: uuid("source_id").notNull(),
    kind: text("kind").notNull(),
    name: text("name").notNull(),
    parts: jsonb("parts").notNull(),
    description: text("description").notNull(),
    currency: text("currency").notNull().default("gold"),
    price: integer("price").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    unlistedAt: timestamp("unlisted_at", { withTimezone: true }),
  },
  (table) => [
    check(
      "listings_currency_price",
      sql`${table.currency} = 'gold' or (${table.currency} = 'orbs' and ${table.price} between 0 and 5)`,
    ),
    uniqueIndex("listings_source_id_idx").on(table.sourceId),
    index("listings_seller_id_idx").on(table.sellerId),
    index("listings_listed_idx")
      .on(table.createdAt, table.id)
      .where(sql`${table.unlistedAt} is null`),
    check("listings_kind_known", sql`${table.kind} in (${KIND_LITERALS})`),
    check(
      "listings_description_length",
      sql`char_length(${table.description}) <= 500`,
    ),
    check(
      "listings_price_range",
      sql`${table.price} >= 0 and ${table.price} <= 10000`,
    ),
  ],
);

// Each row is one time a buyer bought a listing (src/marketplace/
// buy-listing.ts), at the price paid in whole gold. copy_id is the own
// prompt the buyer got, and becomes null once they delete it. A buyer holds
// at most one copy of a listing: the unique index charges a double submit
// or a race once, and buying again is allowed once the copy is deleted.
// Rows go with the listing or the buyer's user.
export const purchases = pgTable(
  "purchases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    buyerId: uuid("buyer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    currency: text("currency").notNull().default("gold"),
    price: integer("price").notNull(),
    copyId: uuid("copy_id").references(() => ownPrompts.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "purchases_currency_price",
      sql`${table.currency} = 'gold' or (${table.currency} = 'orbs' and ${table.price} between 0 and 5)`,
    ),
    uniqueIndex("purchases_one_copy_idx")
      .on(table.listingId, table.buyerId)
      .where(sql`${table.copyId} is not null`),
    index("purchases_buyer_id_idx").on(table.buyerId),
    index("purchases_copy_id_idx").on(table.copyId),
  ],
);
