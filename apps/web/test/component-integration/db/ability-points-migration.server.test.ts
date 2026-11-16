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

// The last migration before ability points.
const BEFORE_ABILITY_POINTS = 70;
const OWNER = "00000000-0000-4000-8000-000000000981";
const QUEST = "00000000-0000-4000-8000-000000000982";
const IDEA = "00000000-0000-4000-8000-000000000983";
const NOTE = "00000000-0000-4000-8000-000000000984";

test("each quest's owner starts with the points for what their quests hold", async () => {
  const database = scratchDatabase("_ability_points");
  const before = await copyMigrationsUpTo(BEFORE_ABILITY_POINTS);
  const pool = openPool(database.url);
  try {
    await resetTestDatabase(database, before);
    await pool.query(
      "insert into users(id,email) values ($1,'ability-points@example.test')",
      [OWNER],
    );
    await pool.query(
      "insert into quests(id,user_id,name,status) values ($1,$2,'Pottery','completed')",
      [QUEST, OWNER],
    );
    // Only the newest version counts: the first still had task 3, since
    // removed.
    await pool.query(
      "insert into tasks_versions(quest_id,version,tasks,lines,undo,author,user_id) values ($1,1,$2,'[]','[]','person',$3),($1,2,$4,'[]','[]','person',$3)",
      [
        QUEST,
        JSON.stringify({
          items: [
            { number: 1, text: "Wedge the clay", done: true },
            { number: 2, text: "Throw the bowl", done: false },
            { number: 3, text: "Fire the kiln", done: false },
          ],
          nextNumber: 4,
        }),
        OWNER,
        JSON.stringify({
          items: [
            { number: 1, text: "Wedge the clay", done: true },
            { number: 2, text: "Throw the bowl", done: false },
          ],
          nextNumber: 4,
        }),
      ],
    );
    await pool.query(
      "insert into quest_ideas(id,quest_id,text) values ($1,$2,'A lidded jar')",
      [IDEA, QUEST],
    );
    await pool.query(
      "insert into quest_notes(id,quest_id,text) values ($1,$2,'The kiln runs hot')",
      [NOTE, QUEST],
    );
    await migrateTestDatabase(database);
    expect(
      (
        await pool.query(
          'select user_id as "userId",ability,quest_id as "questId",source from ability_points order by ability,source',
        )
      ).rows,
    ).toEqual([
      { userId: OWNER, ability: "adding-tasks", questId: QUEST, source: "1" },
      { userId: OWNER, ability: "adding-tasks", questId: QUEST, source: "2" },
      {
        userId: OWNER,
        ability: "completing-quests",
        questId: QUEST,
        source: QUEST,
      },
      {
        userId: OWNER,
        ability: "completing-tasks",
        questId: QUEST,
        source: "1",
      },
      { userId: OWNER, ability: "ideating", questId: QUEST, source: IDEA },
      { userId: OWNER, ability: "noting", questId: QUEST, source: NOTE },
    ]);
  } finally {
    await pool.end();
    await dropTestDatabase(database);
    await removeOldMigrations(before);
  }
});
