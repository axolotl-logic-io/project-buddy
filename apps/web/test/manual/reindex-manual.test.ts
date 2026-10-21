// @vitest-environment node
// What reindexManual tells the operator, and how it splits its inserts.
// update-manual.server.test.ts checks the index it leaves in Postgres.
import { afterEach, describe, expect, test, vi } from "vitest";
import {
  MANUAL_BRANCH,
  MANUAL_REPOSITORY_URL,
} from "@/manual/manual-source.ts";
import { reindexManual } from "@/manual/reindex-manual.ts";
import { FAKE_DATABASE_URL } from "../db/fake-neon-http.ts";
import { fakeGitHttp } from "./fake-git-http.ts";
import {
  fakeNeonWebSocket,
  type PostgresStatement,
} from "./fake-neon-websocket.ts";

// Columns the reindex writes per section: title, text, file path, URL and
// anchor.
const COLUMNS_PER_SECTION = 5;
const SECTION_COUNT = 2500;
const INSERT_STATEMENT = /^insert into "manual_sections"/u;

// A statement as a short line: inserts by the number of sections they hold,
// anything else by its SQL.
function summarize({ sql, params }: PostgresStatement): string {
  if (INSERT_STATEMENT.test(sql)) {
    return `insert ${params.length / COLUMNS_PER_SECTION} sections`;
  }
  return sql.trim();
}

async function serveManual(files: Readonly<Record<string, string>>): Promise<{
  readonly statements: readonly PostgresStatement[];
}> {
  const git = await fakeGitHttp(MANUAL_REPOSITORY_URL, {
    [MANUAL_BRANCH]: files,
  });
  vi.stubGlobal("fetch", git.fetch);
  const database = fakeNeonWebSocket();
  vi.stubGlobal("WebSocket", database.webSocket);
  return database;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("reindexManual", () => {
  test("tells the operator what it clones and how many sections it indexed", async () => {
    await serveManual({
      "manual/index.rst": "Home\n====\n\nWelcome.\n",
      "README.rst": "Readme\n======\n",
    });
    const lines: string[] = [];

    await reindexManual(FAKE_DATABASE_URL, (line) => {
      lines.push(line);
    });

    expect(lines).toEqual([
      `Cloning ${MANUAL_BRANCH} of ${MANUAL_REPOSITORY_URL}`,
      "Indexed 1 manual sections",
    ]);
  });

  test("inserts at most 1000 sections per statement", async () => {
    const headings = Array.from(
      { length: SECTION_COUNT },
      (_, index) => `Section ${index}\n==========\n`,
    );
    const database = await serveManual({
      "manual/index.rst": headings.join("\n"),
    });

    await reindexManual(FAKE_DATABASE_URL, () => undefined);

    expect(database.statements.map(summarize)).toEqual([
      "begin",
      'delete from "manual_sections"',
      "insert 1000 sections",
      "insert 1000 sections",
      "insert 500 sections",
      "commit",
    ]);
  });
});
