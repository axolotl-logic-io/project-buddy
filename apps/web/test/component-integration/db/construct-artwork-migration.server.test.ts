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

// The last migration before construct artwork became the built-in drawings.
const BEFORE_BUILT_IN_ARTWORK = 75;
const OWNER = "00000000-0000-4000-8000-000000000991";
const QUEST = "00000000-0000-4000-8000-000000000992";
const RASTER_CHAT = "00000000-0000-4000-8000-000000000993";
const DRAWN_CHAT = "00000000-0000-4000-8000-000000000994";
const GENERATED_CHAT = "00000000-0000-4000-8000-000000000995";
const OWN_CONSTRUCT = "00000000-0000-4000-8000-000000000996";
const ASSET = "00000000-0000-4000-8000-000000000997";

function snapshot(metadata: unknown): string {
  return JSON.stringify({ voice: "Hello", habits: "", visual: metadata });
}
function drawing(canonical: unknown, working?: unknown): unknown {
  return { version: 1, description: "A drawing", canonical, working };
}

test("saved construct snapshots name the built-in drawings and drop generated art", async () => {
  const database = scratchDatabase("_construct_artwork");
  const before = await copyMigrationsUpTo(BEFORE_BUILT_IN_ARTWORK);
  const pool = openPool(database.url);
  try {
    await resetTestDatabase(database, before);
    await pool.query(
      "insert into users(id,email) values ($1,'artwork@example.test')",
      [OWNER],
    );
    await pool.query(
      "insert into quests(id,user_id,name,status) values ($1,$2,'Pottery','active')",
      [QUEST, OWNER],
    );
    const chats: [string, string][] = [
      [
        RASTER_CHAT,
        snapshot(drawing({ kind: "built-in", artwork: "lumen-v1" })),
      ],
      [
        DRAWN_CHAT,
        snapshot(
          drawing(
            { kind: "built-in", artwork: "vellum-v2" },
            { kind: "built-in", artwork: "vellum-v1" },
          ),
        ),
      ],
      [
        GENERATED_CHAT,
        snapshot(
          drawing(
            { kind: "generated", assetId: ASSET },
            { kind: "generated", assetId: ASSET },
          ),
        ),
      ],
    ];
    await Promise.all(
      chats.map(([id, parts]) =>
        pool.query(
          "insert into chats(id,quest_id,construct_id,construct_parts) values ($1,$2,'lumen',$3)",
          [id, QUEST, parts],
        ),
      ),
    );
    await pool.query(
      "insert into own_prompts(id,user_id,kind,name,parts) values ($1,$2,'construct','Owl',$3)",
      [
        OWN_CONSTRUCT,
        OWNER,
        snapshot(drawing({ kind: "built-in", artwork: "lumen-v2" })),
      ],
    );
    await migrateTestDatabase(database);
    const { rows } = await pool.query(
      "select id, construct_parts->'visual' as visual from chats order by id",
    );
    const byId = new Map(rows.map((row) => [row.id, row.visual]));
    expect(byId.get(RASTER_CHAT).canonical).toEqual({
      kind: "built-in",
      artwork: "lumen",
    });
    expect(byId.get(DRAWN_CHAT)).toMatchObject({
      canonical: { kind: "built-in", artwork: "vellum" },
      working: { kind: "built-in", artwork: "vellum" },
    });
    expect(byId.get(GENERATED_CHAT)).toEqual({
      version: 1,
      description: "A drawing",
    });
    expect(
      (
        await pool.query(
          "select parts->'visual'->'canonical' as canonical from own_prompts where id = $1",
          [OWN_CONSTRUCT],
        )
      ).rows,
    ).toEqual([{ canonical: { kind: "built-in", artwork: "lumen" } }]);
  } finally {
    await pool.end();
    await dropTestDatabase(database);
    await removeOldMigrations(before);
  }
});
