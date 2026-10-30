// The release after #549 rewrites the values saved before it in their new
// forms, which #549's build reads in both forms. The test migrates a scratch
// database of its own up to #549's last migration, seeds it with the old
// forms, migrates it to the latest, and reads the rows back.
import { expect, test } from "vitest";
import { getActivity, INTERVIEW_ACTIVITY_ID } from "@/activities/index.ts";
import { openPool } from "@/db/client.ts";
import {
  copyMigrationsUpTo,
  removeOldMigrations,
} from "../../scripts/test-db/old-migrations.ts";
import {
  dropTestDatabase,
  migrateTestDatabase,
  resetTestDatabase,
} from "../../scripts/test-db/test-database.ts";
import { scratchDatabase } from "../test-database/scratch-database-test-kit.ts";

type Pool = ReturnType<typeof openPool>;

// #549's last migration (0015_prompt_kind_activity_sessions).
const LAST_INDEX_OF_549 = 15;
// A scratch database of this test's own, beside the run's.
const SCRATCH_SUFFIX = "_migration_0016";
// The check that the memory's author is a known one.
const AUTHOR_CHECK = /memory_versions_author_known/u;

const USER_ID = "00000000-0000-4000-8000-000000000011";
const PROJECT_ID = "00000000-0000-4000-8000-000000000012";
const INTERVIEW_CHAT_ID = "00000000-0000-4000-8000-000000000013";
const OTHER_CHAT_ID = "00000000-0000-4000-8000-000000000014";
const BUDDY_ID = "00000000-0000-4000-8000-000000000015";

// A buddy's parts as saved before #549: the whole old prompt, with the
// habits under teachingRules.
const OLD_PARTS: {
  readonly role: string;
  readonly citation: string;
  readonly voice: string;
  readonly teachingRules: string;
  readonly answerNow: string;
} = {
  role: "You are a Blender buddy.",
  citation: "Cite the manual.",
  voice: "Write as Captain Bevel.",
  teachingRules: "- Bevel everything.",
  answerNow: "Answer now.",
};
const NEW_PARTS: { readonly voice: string; readonly habits: string } = {
  voice: OLD_PARTS.voice,
  habits: OLD_PARTS.teachingRules,
};

// A reply as saved before #549, under the manual tools' old names.
const OLD_REPLY_PARTS = [
  { type: "step-start" },
  {
    type: "tool-search_manual",
    toolCallId: "call-search",
    state: "output-available",
    input: { query: "bevel" },
    output: { sections: [] },
  },
  {
    type: "tool-cite_manual",
    toolCallId: "call-cite",
    state: "output-available",
    input: { urls: [] },
    output: { citations: [] },
  },
  { type: "text", text: "Select the edges, then press Ctrl-B." },
];

// What the rewritten rows hold.
interface Rewritten {
  readonly hiddenExtras: unknown;
  readonly authors: readonly unknown[];
  readonly partTypes: unknown;
  readonly buddyParts: unknown;
  readonly chatBuddyParts: readonly unknown[];
  readonly sessions: readonly unknown[];
}

async function seedBefore(pool: Pool): Promise<void> {
  await pool.query(
    `insert into users (id, email, hidden_extras)
     values ($1, 'rewrite@example.com', $2)`,
    [USER_ID, ["brainstorming", "working-notes", "interview-persona"]],
  );
  await pool.query(
    "insert into projects (id, user_id, name) values ($1, $2, 'Ship')",
    [PROJECT_ID, USER_ID],
  );
  await Promise.all(
    [INTERVIEW_CHAT_ID, OTHER_CHAT_ID].map((chatId) =>
      pool.query(
        `insert into chats (id, project_id, buddy_id, buddy_name, buddy_parts)
         values ($1, $2, 'mr-tee', 'Captain Bevel', $3::jsonb)`,
        [chatId, PROJECT_ID, JSON.stringify(OLD_PARTS)],
      ),
    ),
  );
  await pool.query("update projects set interview_chat_id = $1", [
    INTERVIEW_CHAT_ID,
  ]);
  await pool.query(
    `insert into messages (id, chat_id, role, parts)
     values ('old-reply', $1, 'assistant', $2::jsonb)`,
    [OTHER_CHAT_ID, JSON.stringify(OLD_REPLY_PARTS)],
  );
  await pool.query(
    `insert into memory_versions (project_id, version, text, author)
     values ($1, 1, '- Goal: a ship', 'tutor')`,
    [PROJECT_ID],
  );
  await pool.query(
    `insert into buddies (id, user_id, name, parts)
     values ($1, $2, 'Captain Bevel', $3::jsonb)`,
    [BUDDY_ID, USER_ID, JSON.stringify(OLD_PARTS)],
  );
}

async function readRewritten(pool: Pool): Promise<Rewritten> {
  const [users, authors, parts, buddies, chats, sessions] = await Promise.all([
    pool.query("select hidden_extras as value from users where id = $1", [
      USER_ID,
    ]),
    pool.query("select author from memory_versions"),
    pool.query(
      `select jsonb_path_query_array(parts, '$[*].type') as value
       from messages`,
    ),
    pool.query("select parts as value from buddies"),
    pool.query("select buddy_parts as value from chats order by id"),
    pool.query(
      `select chat_id as "chatId", activity_id as "activityId",
         activity_name as name, activity_parts as parts,
         start_message_id as "startMessageId"
       from activity_sessions`,
    ),
  ]);
  return {
    hiddenExtras: users.rows[0]?.value,
    authors: authors.rows,
    partTypes: parts.rows[0]?.value,
    buddyParts: buddies.rows[0]?.value,
    chatBuddyParts: chats.rows.map(({ value }) => value),
    sessions: sessions.rows,
  };
}

test("the release after #549 rewrites the values saved before it", async () => {
  const database = scratchDatabase(SCRATCH_SUFFIX);
  const oldMigrations = await copyMigrationsUpTo(LAST_INDEX_OF_549);
  await dropTestDatabase(database);
  try {
    await resetTestDatabase(database, oldMigrations);
    const pool = openPool(database.url);
    try {
      await seedBefore(pool);
      await migrateTestDatabase(database);
      const interview = getActivity(INTERVIEW_ACTIVITY_ID);
      expect(await readRewritten(pool)).toEqual({
        hiddenExtras: ["working-notes"],
        authors: [{ author: "buddy" }],
        partTypes: [
          "step-start",
          "tool-search_blender_manual",
          "tool-cite_blender_manual",
          "text",
        ],
        buddyParts: NEW_PARTS,
        chatBuddyParts: [NEW_PARTS, NEW_PARTS],
        sessions: [
          {
            chatId: INTERVIEW_CHAT_ID,
            activityId: INTERVIEW_ACTIVITY_ID,
            name: interview.name,
            parts: interview.parts,
            startMessageId: null,
          },
        ],
      });
      await expect(
        pool.query(
          `insert into memory_versions (project_id, version, text, author)
           values ($1, 2, 'Again', 'tutor')`,
          [PROJECT_ID],
        ),
      ).rejects.toThrow(AUTHOR_CHECK);
    } finally {
      await pool.end();
    }
  } finally {
    await dropTestDatabase(database);
    await removeOldMigrations(oldMigrations);
  }
});
