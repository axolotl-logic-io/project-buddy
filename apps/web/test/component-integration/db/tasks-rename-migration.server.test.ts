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

const BEFORE_TASKS = 67;
const OWNER = "00000000-0000-4000-8000-000000000981";
const QUEST = "00000000-0000-4000-8000-000000000982";
const CHAT = "00000000-0000-4000-8000-000000000983";
const TASKS = {
  steps: [{ number: 1, text: "Plan the garden", done: false }],
  nextNumber: 2,
};

test("Tasks rename preserves history and converts spell and message protocols", async () => {
  const database = scratchDatabase("_tasks_rename");
  const before = await copyMigrationsUpTo(BEFORE_TASKS);
  const pool = openPool(database.url);
  try {
    await resetTestDatabase(database, before);
    await pool.query(
      "insert into users(id,email) values ($1,'tasks-rename@example.test')",
      [OWNER],
    );
    await pool.query(
      "insert into quests(id,user_id,name) values ($1,$2,'Garden')",
      [QUEST, OWNER],
    );
    await pool.query(
      "insert into chats(id,quest_id,construct_id,spell,spell_snapshot) values ($1,$2,'vellum','plan',$3)",
      [
        CHAT,
        QUEST,
        JSON.stringify({
          id: "plan",
          name: "Plan",
          definition: { destination: "plan" },
        }),
      ],
    );
    await pool.query(
      "insert into own_prompts(user_id,kind,name,parts,cloned_from) values ($1,'spell','My garden',$2,'plan')",
      [
        OWNER,
        JSON.stringify({
          destination: "plan",
          savedReply: ["Plan the garden"],
        }),
      ],
    );
    await pool.query(
      "insert into plan_versions(quest_id,version,plan,lines,undo,author,user_id) values ($1,1,$2,'[]','[]','person',$3)",
      [QUEST, JSON.stringify(TASKS), OWNER],
    );
    await pool.query(
      "insert into messages(id,chat_id,role,parts) values ('rename-history',$1,'user',$2)",
      [
        CHAT,
        JSON.stringify([
          { type: "text", text: "Plan the garden" },
          { type: "data-plan-card", data: { command: "/plan" } },
          {
            type: "tool-change_plan",
            toolCallId: "saved",
            output: { status: "changed", plan: TASKS },
          },
        ]),
      ],
    );
    await migrateTestDatabase(database);
    expect(
      (await pool.query("select tasks,version from tasks_versions")).rows,
    ).toEqual([{ tasks: TASKS, version: 1 }]);
    expect(
      (
        await pool.query(
          'select spell,spell_snapshot as "spellSnapshot" from chats',
        )
      ).rows,
    ).toEqual([
      {
        spell: "tasks",
        spellSnapshot: {
          id: "tasks",
          name: "Tasks",
          definition: { destination: "tasks" },
        },
      },
    ]);
    expect(
      (
        await pool.query(
          'select name,parts,cloned_from as "clonedFrom" from own_prompts',
        )
      ).rows,
    ).toEqual([
      {
        name: "My garden",
        parts: { destination: "tasks", savedReply: ["Plan the garden"] },
        clonedFrom: "tasks",
      },
    ]);
    expect((await pool.query("select parts from messages")).rows).toEqual([
      {
        parts: [
          { type: "text", text: "Plan the garden" },
          { type: "data-tasks-card", data: { command: "/tasks" } },
          {
            type: "tool-change_tasks",
            toolCallId: "saved",
            output: { status: "changed", tasks: TASKS },
          },
        ],
      },
    ]);
    expect(
      (await pool.query("select to_regclass('plan_versions') as old")).rows,
    ).toEqual([{ old: null }]);
    await expect(
      pool.query("update chats set spell='plan'"),
    ).rejects.toMatchObject({ code: "23514" });
  } finally {
    await pool.end();
    await dropTestDatabase(database);
    await removeOldMigrations(before);
  }
});
