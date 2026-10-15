// @vitest-environment node
import { neon } from "@neondatabase/serverless";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { describe, expect, test } from "vitest";
import { projectOwnedBy } from "@/accounts/owner-scope.ts";
import {
  exportCoverage,
  queriesNotOwnedBy,
} from "@/accounts/owner-scope-test-kit.ts";
import { DEFAULT_BUDDY_ID } from "@/buddies/index.ts";
import { FAKE_DATABASE_URL, type NeonHttpQuery } from "@/db/fake-neon-http.ts";
import { chats, projects } from "@/db/tables/projects-and-chats.ts";
import { projectIdFixture, userIdFixture } from "@/id-fixtures.ts";
import type { ProjectId, UserId } from "@/ids.ts";

const OWNER = userIdFixture();
const OTHER_USER = userIdFixture();
const PROJECT_ID = projectIdFixture();

// Builds queries as the driver sends them; it never connects.
const db = drizzle({ client: neon(FAKE_DATABASE_URL) });

function sent({
  sql,
  params,
}: {
  sql: string;
  params: readonly unknown[];
}): NeonHttpQuery {
  return { query: sql, params };
}

function projectInsert(userId: UserId): NeonHttpQuery {
  return sent(
    db
      .insert(projects)
      .values({ id: PROJECT_ID, userId, name: "Donut" })
      .toSQL(),
  );
}

function chatInsert(projectId: ProjectId): NeonHttpQuery {
  return sent(
    db.insert(chats).values({ projectId, buddyId: DEFAULT_BUDDY_ID }).toSQL(),
  );
}

describe("which of a call's queries are not the owner's", () => {
  test("a query holding an owner predicate is the owner's", () => {
    const query = sent(
      db.select().from(projects).where(projectOwnedBy(OWNER)).toSQL(),
    );

    expect(queriesNotOwnedBy(OWNER, [projectOwnedBy(OWNER)], [query])).toEqual(
      [],
    );
  });

  test("a query on the same rows without the predicate is not", () => {
    const query = sent(
      db.select().from(projects).where(eq(projects.id, PROJECT_ID)).toSQL(),
    );

    expect(queriesNotOwnedBy(OWNER, [projectOwnedBy(OWNER)], [query])).toEqual([
      query,
    ]);
  });

  test("a row inserted with the owner in its values is the owner's, and so is a row under it", () => {
    const queries = [projectInsert(OWNER), chatInsert(PROJECT_ID)];

    expect(queriesNotOwnedBy(OWNER, [], queries)).toEqual([]);
  });

  test("a row inserted for another user is not the owner's, nor a row under it", () => {
    const queries = [projectInsert(OTHER_USER), chatInsert(PROJECT_ID)];

    expect(queriesNotOwnedBy(OWNER, [], queries)).toEqual(queries);
  });

  test("a row under one the call did not insert is not the owner's", () => {
    const query = chatInsert(PROJECT_ID);

    expect(queriesNotOwnedBy(OWNER, [], [query])).toEqual([query]);
  });
});

describe("which exports are not checked once", () => {
  const exports = { listThings: (): void => undefined, limit: 3 };

  test("names an export that is neither checked nor allowed", () => {
    expect(exportCoverage(exports, ["listThings"], [])).toEqual({
      unchecked: ["limit"],
      twice: [],
      stale: [],
    });
  });

  test("names an export that is both, and entries that are no export", () => {
    expect(
      exportCoverage(
        exports,
        ["listThings", "removedThing"],
        [exports.listThings, exports.limit, "gone"],
      ),
    ).toEqual({
      unchecked: [],
      twice: ["listThings"],
      stale: ["removedThing", "allowed[2]"],
    });
  });
});
