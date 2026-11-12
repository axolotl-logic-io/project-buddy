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

const LAST_BEFORE_PLAN_ONLY = 58;
const LAST_BEFORE_ALIGNMENT = 55;
const OWNER = "00000000-0000-4000-8000-000000000911";
const QUEST = "00000000-0000-4000-8000-000000000912";
const CHAT = "00000000-0000-4000-8000-000000000913";
const OWN_ACTIVITY = "00000000-0000-4000-8000-000000000914";
const CURRENT_PROMPT =
  "My project uses create_quest and projectId as examples.";
const PROSE = "My project uses create_project and projectId as examples.";

// These are deliberately the pre-cutover wire format, not current contracts.
const OLD_PARTS: readonly unknown[] = [
  { type: "text", text: PROSE },
  {
    type: "tool-create_project",
    toolCallId: "offer",
    state: "output-available",
    input: { name: "My project", summary: PROSE },
    output: {
      status: "created",
      projectId: QUEST,
      interviewChatId: CHAT,
      name: "My project",
    },
  },
  {
    type: "dynamic-tool",
    toolName: "create_project",
    output: { status: "proposed", summary: PROSE },
  },
  {
    type: "data-journal-section",
    data: {
      projectId: QUEST,
      version: 1,
      command: "/goal",
      content: { text: PROSE },
      changed: true,
    },
  },
  {
    type: "tool-change_plan",
    output: { projectId: QUEST, status: "changed", lines: [] },
  },
  {
    type: "tool-select_activity",
    output: { status: "selected", activityId: "project-breakdown" },
  },
  { type: "tool-select_activity", output: { status: "needsProject" } },
];
const NEW_PARTS: readonly unknown[] = [
  OLD_PARTS[0],
  {
    type: "tool-create_quest",
    toolCallId: "offer",
    state: "output-available",
    input: { name: "My project", summary: PROSE },
    output: {
      status: "created",
      questId: QUEST,
      interviewChatId: CHAT,
      name: "My project",
    },
  },
  {
    type: "dynamic-tool",
    toolName: "create_quest",
    output: { status: "proposed", summary: PROSE },
  },
  {
    type: "data-journal-section",
    data: {
      questId: QUEST,
      version: 1,
      command: "/goal",
      content: { text: PROSE },
      changed: true,
    },
  },
  {
    type: "tool-change_plan",
    output: { questId: QUEST, status: "changed", lines: [] },
  },
  {
    type: "tool-select_activity",
    output: { status: "selected", activityId: "project-breakdown" },
  },
  { type: "tool-select_activity", output: { status: "needsQuest" } },
];

test("quest nomenclature transfers existing data and saved operations without rewriting user prose", async () => {
  const database = scratchDatabase("_quest_names");
  const before = await copyMigrationsUpTo(LAST_BEFORE_ALIGNMENT);
  const aligned = await copyMigrationsUpTo(LAST_BEFORE_PLAN_ONLY);
  const pool = openPool(database.url);
  try {
    await resetTestDatabase(database, before);
    await pool.query(
      "insert into users(id,email) values ($1,'quest-names@example.test')",
      [OWNER],
    );
    await pool.query(
      "insert into projects(id,user_id,name) values ($1,$2,'My project')",
      [QUEST, OWNER],
    );
    await pool.query(
      "insert into chats(id,project_id,buddy_id,continuing) values ($1,$2,'vellum',true)",
      [CHAT, QUEST],
    );
    await pool.query(
      "insert into messages(id,chat_id,role,parts) values ('saved-operations',$1,'assistant',$2)",
      [CHAT, JSON.stringify(OLD_PARTS)],
    );
    await pool.query(
      "insert into memory_versions(project_id,version,text,author,user_id) values ($1,1,$2,'user',$3)",
      [QUEST, PROSE, OWNER],
    );
    await pool.query(
      "insert into milestones(project_id,chat_id,text) values ($1,$2,$3)",
      [QUEST, CHAT, PROSE],
    );
    await pool.query(
      "insert into plan_versions(project_id,version,plan,lines,undo,author,user_id) values ($1,1,'[]','[]','[]','person',$2)",
      [QUEST, OWNER],
    );
    await pool.query(
      "insert into journal_versions(project_id,kind,version,content,before,author,user_id) values ($1,'goal',1,$2,'{}','person',$3)",
      [QUEST, JSON.stringify({ text: PROSE }), OWNER],
    );
    await pool.query(
      "insert into quest_status_approvals(project_id,chat_id,user_id,from_status,to_status,revision) values ($1,$2,$3,'active','completed',0)",
      [QUEST, CHAT, OWNER],
    );
    await pool.query(
      "insert into activity_sessions(chat_id,activity_id,activity_name,activity_parts) values ($1,'project-breakdown','Break Down a Project',$2)",
      [
        CHAT,
        JSON.stringify({
          instructions: "Use `create_project`.",
          openingKickoff: "break a project down",
        }),
      ],
    );
    await pool.query(
      "insert into buddies(id,user_id,kind,name,cloned_from,parts) values ($1,$2,'activity','My project','project-breakdown',$3)",
      [
        OWN_ACTIVITY,
        OWNER,
        JSON.stringify({ instructions: "Use `create_project`." }),
      ],
    );

    await pool.query(
      "update users set interview_buddy_id='lumen' where id=$1",
      [OWNER],
    );
    await pool.query(
      "update chats set buddy_name='My buddy', buddy_parts=$1 where id=$2",
      [JSON.stringify({ voice: PROSE, habits: "" }), CHAT],
    );
    await pool.query(
      "insert into memory_versions(project_id,version,text,author) values ($1,2,$2,'buddy')",
      [QUEST, PROSE],
    );
    await pool.query(
      "insert into buddies(user_id,kind,name,parts) values ($1,'buddy','My buddy',$2)",
      [OWNER, JSON.stringify({ voice: PROSE, habits: "" })],
    );

    await migrateTestDatabase(database, aligned);
    await migrateTestDatabase(database, aligned);

    const { rows: quests } = await pool.query(
      `select id,user_id as "userId",name from quests`,
    );
    expect(quests).toEqual([{ id: QUEST, userId: OWNER, name: "My project" }]);
    const { rows: messages } = await pool.query(
      "select parts from messages where id='saved-operations'",
    );
    expect(messages).toEqual([{ parts: NEW_PARTS }]);
    await Promise.all(
      [
        "chats",
        "memory_versions",
        "milestones",
        "plan_versions",
        "journal_versions",
        "quest_status_approvals",
      ].map(async (table) => {
        const { rows } = await pool.query(
          `select quest_id as "questId" from ${table}`,
        );
        let expected = [{ questId: QUEST }];
        if (table === "memory_versions") {
          expected = [{ questId: QUEST }, { questId: QUEST }];
        }
        expect(rows, table).toEqual(expected);
      }),
    );
    const { rows: notes } = await pool.query(
      "select text from memory_versions",
    );
    expect(notes).toEqual([{ text: PROSE }, { text: PROSE }]);
    const { rows: sessions } = await pool.query(
      `select activity_id as "activityId",activity_name as "activityName",activity_parts as "activityParts" from activity_sessions`,
    );
    expect(sessions).toEqual([
      {
        activityId: "project-breakdown",
        activityName: "Break Down a Project",
        activityParts: {
          instructions: "Use `create_quest`.",
          openingKickoff: "break a project down",
        },
      },
    ]);
    const { rows: own } = await pool.query(
      `select name,cloned_from as "clonedFrom",parts from own_prompts where id=$1`,
      [OWN_ACTIVITY],
    );
    expect(own).toEqual([
      {
        name: "My project",
        clonedFrom: "project-breakdown",
        parts: { instructions: "Use `create_quest`." },
      },
    ]);
    const { rows: construct } = await pool.query(
      "select kind,parts from own_prompts where name='My buddy'",
    );
    expect(construct).toEqual([
      { kind: "construct", parts: { voice: CURRENT_PROMPT, habits: "" } },
    ]);
    const { rows: authors } = await pool.query(
      "select author from memory_versions order by version",
    );
    expect(authors).toEqual([{ author: "user" }, { author: "construct" }]);
    const { rows: preference } = await pool.query(
      'select interview_construct_id as "constructId" from users where id=$1',
      [OWNER],
    );
    expect(preference).toEqual([{ constructId: "lumen" }]);
    const { rows: snapshot } = await pool.query(
      "select construct_name as name, construct_parts as parts from chats where id=$1",
      [CHAT],
    );
    expect(snapshot).toEqual([
      { name: "My buddy", parts: { voice: CURRENT_PROMPT, habits: "" } },
    ]);
    const { rows: kinds } = await pool.query(
      "select kind from own_prompts where id=$1",
      [OWN_ACTIVITY],
    );
    expect(kinds).toEqual([{ kind: "activity" }]);
    const { rows: oldConstructNames } =
      await pool.query(`select column_name from information_schema.columns where table_schema='public' and column_name like '%buddy%'
      union all select table_name from information_schema.tables where table_schema='public' and table_name='buddies'
      union all select indexname from pg_indexes where schemaname='public' and indexname like '%buddies%'
      union all select conname from pg_constraint where connamespace='public'::regnamespace and conname like '%buddies%'`);
    expect(oldConstructNames).toEqual([]);
    const { rows: oldNames } =
      await pool.query(`select table_name as name from information_schema.tables where table_schema='public' and table_name='projects'
      union all select column_name from information_schema.columns where table_schema='public' and column_name='project_id'
      union all select indexname from pg_indexes where schemaname='public' and indexname like '%project%'
      union all select conname from pg_constraint where connamespace='public'::regnamespace and conname like '%project%'`);
    expect(oldNames).toEqual([]);
    // Renamed foreign keys still cascade through the entire quest.
    await pool.query("delete from quests where id=$1", [QUEST]);
    const { rows: remaining } = await pool.query(
      "select id from chats union all select id from milestones union all select id from quest_status_approvals",
    );
    expect(remaining).toEqual([]);
  } finally {
    await pool.end();
    await dropTestDatabase(database);
    await removeOldMigrations(before);
    await removeOldMigrations(aligned);
  }
});
