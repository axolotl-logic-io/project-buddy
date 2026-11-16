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

// The last migration that saved a quest's Tasks as steps.
const BEFORE_TASK_ITEMS = 69;
const OWNER = "00000000-0000-4000-8000-000000000991";
const QUEST = "00000000-0000-4000-8000-000000000992";
const CHAT = "00000000-0000-4000-8000-000000000993";
// Task text that names steps stays as the user wrote it.
const SHELL = {
  number: 1,
  text: "Shape the step: a step at a time",
  done: true,
};
const BASE = { number: 2, text: "Glaze the base", done: false };

test("Tasks saved as steps become tasks, keeping their text", async () => {
  const database = scratchDatabase("_task_items");
  const before = await copyMigrationsUpTo(BEFORE_TASK_ITEMS);
  const pool = openPool(database.url);
  try {
    await resetTestDatabase(database, before);
    await pool.query(
      "insert into users(id,email) values ($1,'task-items@example.test')",
      [OWNER],
    );
    await pool.query(
      "insert into quests(id,user_id,name) values ($1,$2,'Pottery')",
      [QUEST, OWNER],
    );
    await pool.query(
      "insert into chats(id,quest_id,construct_id) values ($1,$2,'vellum')",
      [CHAT, QUEST],
    );
    await pool.query(
      "insert into tasks_versions(quest_id,version,tasks,lines,undo,author,user_id) values ($1,1,$2,$3,$4,'person',$5)",
      [
        QUEST,
        JSON.stringify({ steps: [SHELL, BASE], nextNumber: 3 }),
        JSON.stringify([{ kind: "remove", text: "Fire the kiln" }]),
        JSON.stringify([
          {
            op: "restore",
            step: { number: 3, text: "Fire the kiln", done: false },
          },
          { op: "reopen", step: 1 },
        ]),
        OWNER,
      ],
    );
    await pool.query(
      "insert into messages(id,chat_id,role,parts) values ('task-call',$1,'assistant',$2),('other',$1,'user',$3)",
      [
        CHAT,
        JSON.stringify([
          { type: "text", text: "One step done." },
          {
            type: "tool-change_tasks",
            toolCallId: "done",
            input: { operations: [{ op: "complete", step: 1 }] },
            output: {
              status: "not-changed",
              reason: "missing-step",
              tasks: { steps: [SHELL], nextNumber: 2 },
            },
          },
        ]),
        JSON.stringify([{ type: "data-other", data: { step: 1 } }]),
      ],
    );
    await migrateTestDatabase(database);
    expect(
      (await pool.query("select tasks,undo from tasks_versions")).rows,
    ).toEqual([
      {
        tasks: { items: [SHELL, BASE], nextNumber: 3 },
        undo: [
          {
            op: "restore",
            task: { number: 3, text: "Fire the kiln", done: false },
          },
          { op: "reopen", task: 1 },
        ],
      },
    ]);
    expect(
      (await pool.query("select id,parts from messages order by id")).rows,
    ).toEqual([
      { id: "other", parts: [{ type: "data-other", data: { step: 1 } }] },
      {
        id: "task-call",
        parts: [
          { type: "text", text: "One step done." },
          {
            type: "tool-change_tasks",
            toolCallId: "done",
            input: { operations: [{ op: "complete", task: 1 }] },
            output: {
              status: "not-changed",
              reason: "missing-task",
              tasks: { items: [SHELL], nextNumber: 2 },
            },
          },
        ],
      },
    ]);
  } finally {
    await pool.end();
    await dropTestDatabase(database);
    await removeOldMigrations(before);
  }
});
