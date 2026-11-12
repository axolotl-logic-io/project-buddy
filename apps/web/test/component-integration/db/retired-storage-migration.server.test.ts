import { drizzle } from "drizzle-orm/neon-serverless";
import { expect, test } from "vitest";
import { openPool } from "@/db/client.ts";
import { users } from "@/db/tables/users.ts";
import { USER_ID, type UserId } from "@/ids.ts";
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
const CONTINUING_MIGRATION = 51;
const ADVENTURE_DELETION = 52;

const OWNER = USER_ID.parse("00000000-0000-4000-8000-000000000901");
const MEMBER = USER_ID.parse("00000000-0000-4000-8000-000000000902");
const QUEST = "00000000-0000-4000-8000-000000000903";
const CHAT = "00000000-0000-4000-8000-000000000904";
const PROMPT = "00000000-0000-4000-8000-000000000905";
const LISTING = "00000000-0000-4000-8000-000000000906";
const ASSET = "00000000-0000-4000-8000-000000000907";
const REMOVED = [
  "chat_unreads",
  "marketplace_cutover",
  "orb_balances",
  "orb_ledger",
  "project_invitations",
  "project_members",
  "push_subscriptions",
  "quest_transfers",
];

async function visibleData(
  pool: ReturnType<typeof openPool>,
  owner: UserId,
): Promise<unknown[]> {
  const statements = [
    "select id from quests where user_id=$1",
    "select id from chats where user_id=$1 or quest_id in (select id from quests where user_id=$1)",
    "select id from images where chat_id in (select id from chats where user_id=$1 or quest_id in (select id from quests where user_id=$1))",
    "select id from memory_versions where quest_id in (select id from quests where user_id=$1)",
    "select id from plan_versions where quest_id in (select id from quests where user_id=$1)",
    "select id from milestones where quest_id in (select id from quests where user_id=$1)",
    "select id from own_prompts where user_id=$1",
  ];
  return await Promise.all(
    statements.map(async (statement) => {
      const { rows } = await pool.query(statement, [owner]);
      return rows;
    }),
  );
}

// Before the rename, read the historical schema directly; current predicates
// below exercise owner isolation through the renamed schema.
function visibleBefore(
  pool: ReturnType<typeof openPool>,
  owner: UserId,
): Promise<unknown[]> {
  const statements = [
    "select id from projects where user_id = $1",
    "select id from chats where user_id = $1 or project_id in (select id from projects where user_id = $1)",
    "select id from images where chat_id in (select id from chats where user_id = $1 or project_id in (select id from projects where user_id = $1))",
    "select id from memory_versions where project_id in (select id from projects where user_id = $1)",
    "select id from plan_versions where project_id in (select id from projects where user_id = $1)",
    "select id from milestones where project_id in (select id from projects where user_id = $1)",
    "select id from buddies where user_id = $1",
  ];
  return Promise.all(
    statements.map(async (statement) => {
      const { rows } = await pool.query(statement, [owner]);
      return rows;
    }),
  );
}

// Capture every retained row, including artwork bytes, purchase provenance,
// balances and approval revisions, rather than just the existence of a quest.
async function retainedData(
  pool: ReturnType<typeof openPool>,
  beforeRename = false,
): Promise<unknown[]> {
  let promptTable = "own_prompts";
  let preference = "interview_construct_id";
  let constructId = "construct_id";
  let constructName = "construct_name";
  let constructParts = "construct_parts";
  let questTable = "quests";
  let questColumn = "quest_id";
  if (beforeRename) {
    promptTable = "buddies";
    preference = "interview_buddy_id";
    constructId = "buddy_id";
    constructName = "buddy_name";
    constructParts = "buddy_parts";
    questTable = "projects";
    questColumn = "project_id";
  }
  const { rows } = await pool.query(`select
    (select jsonb_agg(to_jsonb(t) - '${preference}' || jsonb_build_object('interview_construct_id', t.${preference})) from users t) as accounts,
    (select jsonb_agg(to_jsonb(t)) from gold_balances t) as balances,
    (select jsonb_agg(to_jsonb(t)) from gold_ledger t) as ledger,
    (select jsonb_agg(to_jsonb(t)) from purchases t) as purchases,
    (select jsonb_agg(to_jsonb(t) || jsonb_build_object('kind', case when t.kind='buddy' then 'construct' else t.kind end)) from listings t) as listings,
    (select jsonb_agg(to_jsonb(t)) from construct_assets t) as artwork,
    (select jsonb_agg(to_jsonb(t)) from construct_asset_grants t) as grants,
    (select jsonb_agg(to_jsonb(t) - '${questColumn}' || jsonb_build_object('quest_id', t.${questColumn})) from quest_status_approvals t) as approvals,
    (select jsonb_agg(to_jsonb(t)) from ${questTable} t) as quests,
    (select jsonb_agg(to_jsonb(t) - '${questColumn}' - '${constructId}' - '${constructName}' - '${constructParts}' || jsonb_build_object('quest_id', t.${questColumn}, 'construct_id', t.${constructId}, 'construct_name', t.${constructName}, 'construct_parts', t.${constructParts})) from chats t) as chats,
    (select jsonb_agg(to_jsonb(t)) from images t) as images,
    (select jsonb_agg(to_jsonb(t) - '${questColumn}' || jsonb_build_object('quest_id', t.${questColumn})) from memory_versions t) as memory,
    (select jsonb_agg(to_jsonb(t) - '${questColumn}' || jsonb_build_object('quest_id', t.${questColumn})) from plan_versions t) as plans,
    (select jsonb_agg(to_jsonb(t) - '${questColumn}' || jsonb_build_object('quest_id', t.${questColumn})) from milestones t) as milestones,
    (select jsonb_agg(to_jsonb(t) || jsonb_build_object('kind', case when t.kind='buddy' then 'construct' else t.kind end)) from ${promptTable} t) as definitions`);
  return rows;
}

test("retired storage removal preserves continuing data and denies a former member before and after the transition", async () => {
  const database = scratchDatabase("_retired_storage");
  const before = await copyMigrationsUpTo(CONTINUING_MIGRATION);
  const throughConstruct = await copyMigrationsUpTo(LAST_BEFORE_PLAN_ONLY);
  const pool = openPool(database.url);
  try {
    await resetTestDatabase(database, before);
    await pool.query(
      "insert into users(id,email) values ($1,'owner@example.test'),($2,'member@example.test')",
      [OWNER, MEMBER],
    );
    await pool.query(
      "insert into gold_balances(user_id,micro_usd) values ($1,4200000)",
      [OWNER],
    );
    await pool.query(
      "insert into gold_ledger(user_id,micro_usd,reason) values ($1,4200000,'starting-grant')",
      [OWNER],
    );
    await pool.query(
      "insert into projects(id,user_id,name) values ($1,$2,'Turtle')",
      [QUEST, OWNER],
    );
    await pool.query(
      "insert into chats(id,project_id,buddy_id,continuing) values ($1,$2,'vellum',true)",
      [CHAT, QUEST],
    );
    await pool.query(
      "insert into chats(user_id,buddy_id,continuing) values ($1,'vellum',false)",
      [OWNER],
    );
    await pool.query(
      "insert into messages(id,chat_id,role,parts,user_id) values ('historical-message',$1,'user','[]',$2)",
      [CHAT, MEMBER],
    );
    await pool.query(
      "insert into project_members(project_id,user_id) values ($1,$2)",
      [QUEST, MEMBER],
    );
    await pool.query(
      "insert into project_invitations(project_id,invitee_id,inviter_id,token_hash,state) values ($1,$2,$3,'old-token','accepted')",
      [QUEST, MEMBER, OWNER],
    );
    await pool.query(
      "insert into chat_unreads(chat_id,user_id) values ($1,$2)",
      [CHAT, OWNER],
    );
    await pool.query(
      "insert into push_subscriptions(endpoint,user_id,p256dh,auth) values ('https://example.test/push',$1,'old-key','old-auth')",
      [OWNER],
    );
    await pool.query(
      "insert into quest_transfers(user_id,source_chat_id,source_message_id,name,summary,project_id,target_chat_id) values ($1,$2,'historical-message','Old transfer','Old summary',$3,$2)",
      [OWNER, CHAT, QUEST],
    );
    await pool.query(
      "insert into memory_versions(project_id,version,text,author,user_id) values ($1,1,'Journal with former author','user',$2)",
      [QUEST, MEMBER],
    );
    await pool.query(
      "insert into plan_versions(project_id,version,plan,lines,undo,author,user_id,chat_id) values ($1,1,'[]','[]','[]','person',$2,$3)",
      [QUEST, MEMBER, CHAT],
    );
    await pool.query(
      "insert into milestones(project_id,chat_id,text) values ($1,$2,'Made shell')",
      [QUEST, CHAT],
    );
    await pool.query(
      "insert into images(chat_id,media_type,data) values ($1,'image/png','AA==')",
      [CHAT],
    );
    await pool.query(
      "insert into listings(id,seller_id,source_id,kind,name,parts,description,price) values ($1,$2,gen_random_uuid(),'buddy','Bought original','{}','',99)",
      [LISTING, MEMBER],
    );
    await pool.query(
      "insert into buddies(id,user_id,name,parts,bought_from) values ($1,$2,'Private bought copy','{}',$3)",
      [PROMPT, OWNER, LISTING],
    );
    await pool.query(
      "alter table purchases disable trigger marketplace_currency_guard",
    );
    await pool.query(
      "insert into purchases(listing_id,buyer_id,copy_id,price) values ($1,$2,$3,99)",
      [LISTING, OWNER, PROMPT],
    );
    await pool.query(
      "alter table purchases enable trigger marketplace_currency_guard",
    );
    await pool.query(
      "insert into construct_assets(id,media_type,data) values ($1,'image/png','art-bytes')",
      [ASSET],
    );
    await pool.query(
      "insert into construct_asset_grants(asset_id,construct_id) values ($1,$2)",
      [ASSET, PROMPT],
    );
    await pool.query(
      "insert into construct_asset_grants(asset_id,adventure_id) values ($1,$2)",
      [ASSET, CHAT],
    );
    await pool.query(
      "insert into construct_asset_grants(asset_id,listing_id) values ($1,$2)",
      [ASSET, LISTING],
    );
    await pool.query(
      "insert into quest_status_approvals(project_id,chat_id,user_id,from_status,to_status,revision) values ($1,$2,$3,'active','completed',0)",
      [QUEST, CHAT, OWNER],
    );
    // Apply #898 first: only continuing records enter the cleanup comparison.
    const predecessor = await copyMigrationsUpTo(ADVENTURE_DELETION);
    try {
      await migrateTestDatabase(database, predecessor);
    } finally {
      await removeOldMigrations(predecessor);
    }
    const owned = await visibleBefore(pool, OWNER);
    const retained = await retainedData(pool, true);
    expect(owned).toEqual(Array.from({ length: 7 }, () => [expect.anything()]));
    expect(await visibleBefore(pool, MEMBER)).toEqual(
      Array.from({ length: 7 }, () => []),
    );
    await migrateTestDatabase(database, throughConstruct);
    expect(await visibleData(pool, OWNER)).toEqual(owned);
    expect(await visibleData(pool, MEMBER)).toEqual(
      Array.from({ length: 7 }, () => []),
    );
    expect(await retainedData(pool)).toEqual(retained);
    const { rows: removed } = await pool.query(
      `select tablename from pg_tables
       where schemaname = 'public' and tablename = any($1)`,
      [REMOVED],
    );
    expect(removed).toEqual([]);
    const { rows: authors } = await pool.query(
      `select user_id as "userId" from messages where id='historical-message'`,
    );
    expect(authors).toEqual([{ userId: MEMBER }]);
    // A retained guard must reject writes without touching marketplace_cutover.
    await expect(
      pool.query(
        "insert into purchases(listing_id,buyer_id,price) values ($1,$2,0)",
        [LISTING, OWNER],
      ),
    ).rejects.toThrow("Marketplace purchases are paused");
    // ORM-generated INSERT and RETURNING still work after the trigger removal.
    const added = await drizzle(pool)
      .insert(users)
      .values({ email: "new-after-cleanup@example.test" })
      .returning();
    expect(added).toEqual([
      expect.objectContaining({ email: "new-after-cleanup@example.test" }),
    ]);
  } finally {
    await pool.end();
    await dropTestDatabase(database);
    await removeOldMigrations(before);
    await removeOldMigrations(throughConstruct);
  }
});

test("a fresh migration supports new accounts without retired currency triggers", async () => {
  const database = scratchDatabase("_retired_fresh");
  const pool = openPool(database.url);
  try {
    await resetTestDatabase(database);
    await drizzle(pool).insert(users).values({ email: "fresh@example.test" });
    const { rows } = await pool.query(
      "select email from users where email = 'fresh@example.test'",
    );
    expect(rows).toEqual([{ email: "fresh@example.test" }]);
    const { rows: triggers } = await pool.query(
      "select tgname from pg_trigger where tgrelid='users'::regclass and tgname='user_starting_orbs'",
    );
    expect(triggers).toEqual([]);
  } finally {
    await pool.end();
    await dropTestDatabase(database);
  }
});
