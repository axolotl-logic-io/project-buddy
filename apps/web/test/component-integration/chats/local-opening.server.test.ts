import { expect, test } from "vitest";
import { listMessages } from "@/chats/store.ts";
import { getConstruct } from "@/constructs/index.ts";
import { startQuest } from "@/conversations/start-quest.ts";
import { QUEST_NAME } from "@/quests/quest-name.ts";
import { goldSpent } from "../../support/test-database/gold-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";

test("use_case_start_without_remote_models", async () => {
  const user = await testUser();
  const result = await startQuest(
    user.id,
    QUEST_NAME.parse("Fox"),
    getConstruct("vellum"),
  );
  expect(result.kind).toBe("started");
  if (result.kind !== "started") {
    throw new Error("Local opening failed");
  }
  expect(
    (await listMessages(user.id, result.chat.id)).map(({ role }) => role),
  ).toEqual(["assistant"]);
  expect(await goldSpent(user)).toBe(0);
});
