// @vitest-environment node
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, test } from "vitest";
import {
  chatOwnedBy,
  memoryVersionOwnedBy,
  messageOwnedBy,
  monthlySpendOwnedBy,
  ownsProject,
  projectOwnedBy,
} from "@/accounts/owner-scope.ts";
import { projectIdFixture, userIdFixture } from "@/id-fixtures.ts";

const OWNER = userIdFixture();
const PROJECT_ID = projectIdFixture();
const OWNED_PROJECTS = `(select "id" from "projects" where "projects"."user_id" = $1)`;

function render(predicate: SQL): { sql: string; params: unknown[] } {
  const { sql, params } = new PgDialect().sqlToQuery(predicate);
  return { sql, params };
}

describe("ownership predicates", () => {
  test("a project is its user's", () => {
    expect(render(projectOwnedBy(OWNER))).toEqual({
      sql: `"projects"."user_id" = $1`,
      params: [OWNER],
    });
  });

  test("a chat, a memory version and a message are their project's user's", () => {
    expect(render(chatOwnedBy(OWNER))).toEqual({
      sql: `"chats"."project_id" in ${OWNED_PROJECTS}`,
      params: [OWNER],
    });
    expect(render(memoryVersionOwnedBy(OWNER))).toEqual({
      sql: `"memory_versions"."project_id" in ${OWNED_PROJECTS}`,
      params: [OWNER],
    });
    expect(render(messageOwnedBy(OWNER))).toEqual({
      sql: `"messages"."chat_id" in (select "id" from "chats" where "chats"."project_id" in ${OWNED_PROJECTS})`,
      params: [OWNER],
    });
  });

  test("a month's spend is its user's", () => {
    expect(render(monthlySpendOwnedBy(OWNER))).toEqual({
      sql: `"monthly_spend"."user_id" = $1`,
      params: [OWNER],
    });
  });

  test("owning one project is a condition on no particular table", () => {
    expect(render(ownsProject(OWNER, PROJECT_ID))).toEqual({
      sql: `exists (select "id" from "projects" where ("projects"."id" = $1 and "projects"."user_id" = $2))`,
      params: [PROJECT_ID, OWNER],
    });
  });
});
