// `mise run deploy` releases a migration on its own only when the live build can
// run on the schema it leaves (scripts/ops/release-migrations.ts).
import { expect, test } from "vitest";
import { classifyMigrations } from "../../../../../../scripts/ops/release-migrations.ts";

const BREAK = "--> statement-breakpoint\n";

test("nullable and defaulted columns are additive", () => {
  const [migration] = classifyMigrations([
    {
      name: "0094_rite_reply_order",
      sql: [
        'ALTER TABLE "performance_messages" ADD COLUMN "reply_index" integer;',
        `ALTER TABLE "rites" ADD COLUMN "loop" boolean DEFAULT true NOT NULL;`,
      ].join(BREAK),
    },
  ]);
  expect(migration?.needsReview).toEqual([]);
  expect(migration?.additive).toEqual([
    "adds the nullable column `performance_messages.reply_index`",
    "adds the defaulted column `rites.loop`",
  ]);
});

test("a new table may take unique indexes and foreign keys", () => {
  const statements = [
    'CREATE TABLE "notes" (\n\t"id" text PRIMARY KEY NOT NULL\n);',
    'CREATE UNIQUE INDEX "notes_id" ON "notes" USING btree ("id");',
    'ALTER TABLE "notes" ADD CONSTRAINT "notes_quest_fk" FOREIGN KEY ("quest_id") REFERENCES "public"."quests"("id");',
    `ALTER TYPE "public"."status" ADD VALUE 'paused';`,
  ];
  const [migration] = classifyMigrations([
    { name: "0095_notes", sql: statements.join(BREAK) },
  ]);
  expect(migration?.needsReview).toEqual([]);
  expect(migration?.additive).toHaveLength(statements.length);
});

test("statements the live build might not run with need review", () => {
  const statements = [
    'ALTER TABLE "quests" DROP COLUMN "life";',
    'ALTER TABLE "quests" RENAME COLUMN "name" TO "title";',
    'ALTER TABLE "quests" ALTER COLUMN "life" SET NOT NULL;',
    'ALTER TABLE "quests" ADD COLUMN "owner" text NOT NULL;',
    'CREATE UNIQUE INDEX "quests_name" ON "quests" USING btree ("name");',
    'ALTER TABLE "quests" ADD CONSTRAINT "quests_life_fk" FOREIGN KEY ("life") REFERENCES "public"."lives"("id");',
    'DROP TABLE "notes";',
  ];
  const [migration] = classifyMigrations([
    { name: "0096_breaking", sql: statements.join(BREAK) },
  ]);
  expect(migration?.additive).toEqual([]);
  expect(migration?.needsReview).toHaveLength(statements.length);
});
