// @vitest-environment node
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, test } from "vitest";
import {
  buddyOwnedBy,
  chatOwnedBy,
  memoryVersionOwnedBy,
  messageOwnedBy,
  monthlySpendOwnedBy,
  ownsProject,
  projectOwnedBy,
} from "@/accounts/owner-scope.ts";
import { projectIdFixture, userIdFixture } from "../id-fixtures.ts";

const OWNER = userIdFixture();
const PROJECT_ID = projectIdFixture();
const OWNED_PROJECTS = `(select "id" from "projects" where "projects"."user_id" = $1)`;
const OWNED_CHATS = `("chats"."user_id" = $1 or "chats"."project_id" in (select "id" from "projects" where "projects"."user_id" = $2))`;

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

  test("a chat and its messages are the user it names, or its project's user's", () => {
    expect(render(chatOwnedBy(OWNER))).toEqual({
      sql: OWNED_CHATS,
      params: [OWNER, OWNER],
    });
    expect(render(messageOwnedBy(OWNER))).toEqual({
      sql: `"messages"."chat_id" in (select "id" from "chats" where ${OWNED_CHATS})`,
      params: [OWNER, OWNER],
    });
  });

  test("a memory version is its project's user's", () => {
    expect(render(memoryVersionOwnedBy(OWNER))).toEqual({
      sql: `"memory_versions"."project_id" in ${OWNED_PROJECTS}`,
      params: [OWNER],
    });
  });

  test("a month's spend is its user's", () => {
    expect(render(monthlySpendOwnedBy(OWNER))).toEqual({
      sql: `"monthly_spend"."user_id" = $1`,
      params: [OWNER],
    });
  });

  test("a buddy is its user's", () => {
    expect(render(buddyOwnedBy(OWNER))).toEqual({
      sql: `"buddies"."user_id" = $1`,
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
