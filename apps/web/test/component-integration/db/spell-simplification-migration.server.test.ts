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

const BEFORE_SPELLS = 61;
const USER = "00000000-0000-4000-8000-000000000961";
const QUEST = "00000000-0000-4000-8000-000000000962";
const CHAT = "00000000-0000-4000-8000-000000000963";

test("spell simplification removes obsolete definitions and sessions, and keeps quest content", async () => {
  const database = scratchDatabase("_spells");
  const before = await copyMigrationsUpTo(BEFORE_SPELLS);
  const pool = openPool(database.url);
  try {
    await resetTestDatabase(database, before);
    await pool.query(
      "insert into users(id,email) values ($1,'spells@example.test')",
      [USER],
    );
    await pool.query(
      "insert into quests(id,user_id,name) values ($1,$2,'Fox')",
      [QUEST, USER],
    );
    await pool.query(
      "insert into chats(id,quest_id,construct_id,continuing) values ($1,$2,'vellum',true)",
      [CHAT, QUEST],
    );
    await pool.query(
      'insert into messages(id,chat_id,role,parts) values (\'idea\',$1,\'user\',\'[{"type":"text","text":"Try clay"}]\')',
      [CHAT],
    );
    await pool.query(
      "insert into activity_sessions(chat_id,activity_id,activity_name,activity_parts) values ($1,'brainstorming','Brainstorm','{}')",
      [CHAT],
    );
    await pool.query(
      "insert into activity_message_results(message_id,chat_id,text) values ('idea',$1,'Saved')",
      [CHAT],
    );
    await pool.query(
      "insert into own_prompts(user_id,kind,name,parts) values ($1,'construct','Guide','{}'),($1,'activity','Old activity','{}'),($1,'spell','Old spell','{}')",
      [USER],
    );
    await pool.query(
      "insert into listings(seller_id,source_id,kind,name,parts,description,price) select user_id,id,kind,name,parts,'Old listing',0 from own_prompts",
    );
    // Seed historical purchases before applying the cleanup. New purchases stay paused.
    await pool.query(
      "alter table purchases disable trigger marketplace_currency_guard",
    );
    await pool.query(
      "insert into purchases(listing_id,buyer_id,copy_id,price) select id,seller_id,source_id,0 from listings",
    );

    await pool.query(
      "alter table purchases enable trigger marketplace_currency_guard",
    );

    await migrateTestDatabase(database);
    const { rows } = await pool.query<{
      name: string;
      spell: string | null;
      text: string;
      kinds: string[];
      listings: string[];
      purchases: number;
      sessions: string | null;
    }>(`select
      q.name,c.spell,m.parts->0->>'text' as text,
      (select array_agg(kind) from own_prompts) as kinds,
      (select array_agg(kind) from listings) as listings,
      (select count(*)::int from purchases) as purchases,
      to_regclass('activity_sessions')::text as sessions
      from quests q join chats c on c.quest_id=q.id join messages m on m.chat_id=c.id`);
    expect(rows).toEqual([
      {
        name: "Fox",
        spell: null,
        text: "Try clay",
        kinds: ["construct"],
        listings: ["construct"],
        purchases: 1,
        sessions: null,
      },
    ]);
    await pool.query("update chats set spell='plan' where id=$1", [CHAT]);
    await expect(
      pool.query("update chats set spell='custom' where id=$1", [CHAT]),
    ).rejects.toMatchObject({ code: "23514" });
    await pool.query(
      "insert into spell_message_results(message_id,chat_id,text) values ('idea',$1,'Saved')",
      [CHAT],
    );
    await expect(
      pool.query("select * from activity_message_results"),
    ).rejects.toMatchObject({ code: "42P01" });
  } finally {
    await pool.end();
    await dropTestDatabase(database);
    await removeOldMigrations(before);
  }
});
