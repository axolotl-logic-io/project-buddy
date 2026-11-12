import { expect, test } from "vitest";
import { openPool } from "@/db/client.ts";
import {
  copyMigrationsUpTo,
  removeOldMigrations,
} from "../../../scripts/test-db/old-migrations.ts";
import {
  dropTestDatabase,
  migrateTestDatabase,
  resetTestDatabase,
} from "../../../scripts/test-db/test-database.ts";
import { scratchDatabase } from "../test-database/scratch-database-test-kit.ts";

const LAST_WITH_JOURNAL = 58;
const OWNER = "00000000-0000-4000-8000-000000000921";
const QUEST = "00000000-0000-4000-8000-000000000922";
const CHAT = "00000000-0000-4000-8000-000000000923";
const PLAN = {
  steps: [{ number: 1, text: "Shape the shell", done: false }],
  nextNumber: 2,
};

test("Plan-only migration removes Journal storage and records without changing the Plan", async () => {
  const database = scratchDatabase("_plan_only");
  const before = await copyMigrationsUpTo(LAST_WITH_JOURNAL);
  const pool = openPool(database.url);
  try {
    await resetTestDatabase(database, before);
    await pool.query(
      "insert into users(id,email) values ($1,'plan-only@example.test')",
      [OWNER],
    );
    await pool.query(
      "insert into quests(id,user_id,name) values ($1,$2,'Turtle')",
      [QUEST, OWNER],
    );
    await pool.query(
      "insert into chats(id,quest_id,construct_id,continuing) values ($1,$2,'vellum',true)",
      [CHAT, QUEST],
    );
    await pool.query(
      "insert into plan_versions(quest_id,version,plan,lines,undo,author,user_id) values ($1,1,$2,'[]','[]','person',$3)",
      [QUEST, JSON.stringify(PLAN), OWNER],
    );
    await pool.query(
      "insert into memory_versions(quest_id,version,text,author) values ($1,1,'Retired notes','construct')",
      [QUEST],
    );
    await pool.query(
      "insert into journal_versions(quest_id,kind,version,content,before,author) values ($1,'goal',1,'{}','{}','construct')",
      [QUEST],
    );
    await pool.query(
      "insert into messages(id,chat_id,role,parts) values ('old-section',$1,'user',$2),('old-reply',$1,'assistant',$3),('keep-plan',$1,'user',$4)",
      [
        CHAT,
        JSON.stringify([
          { type: "data-journal-section", data: { version: 1 } },
        ]),
        JSON.stringify([
          { type: "text", text: "Hello" },
          { type: "tool-update_memory", output: { status: "updated" } },
          { type: "tool-set_goal", output: {} },
          { type: "tool-change_preferences", output: {} },
        ]),
        JSON.stringify([
          { type: "data-plan-card", data: { command: "/plan" } },
        ]),
      ],
    );
    await migrateTestDatabase(database);
    const { rows: removed } = await pool.query(
      "select table_name from information_schema.tables where table_schema='public' and table_name in ('memory_versions','journal_versions')",
    );
    expect(removed).toEqual([]);
    const { rows: plans } = await pool.query(
      "select plan from plan_versions where quest_id=$1",
      [QUEST],
    );
    expect(plans).toEqual([{ plan: PLAN }]);
    const { rows: messages } = await pool.query(
      "select id,parts from messages order by id",
    );
    expect(messages).toEqual([
      {
        id: "keep-plan",
        parts: [{ type: "data-plan-card", data: { command: "/plan" } }],
      },
      { id: "old-reply", parts: [{ type: "text", text: "Hello" }] },
    ]);
  } finally {
    await pool.end();
    await dropTestDatabase(database);
    await removeOldMigrations(before);
  }
});
