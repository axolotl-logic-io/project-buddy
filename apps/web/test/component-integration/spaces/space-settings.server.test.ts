import { expect, test, vi } from "vitest";
import { getConstruct } from "@/constructs/index.ts";
import { startQuest } from "@/conversations/start-quest.ts";
import { QUEST_NAME } from "@/quests/quest-name.ts";
import { saveSpaceAction } from "@/spaces/space-actions.ts";
import { listSpaces } from "@/spaces/space-store.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { formOf } from "../test-database/chat-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";

vi.mock("next/cache", () => ({ refresh: vi.fn() }));

test("use_case_set_up_space", async () => {
  const [owner, stranger] = await Promise.all([testUser(), testUser()]);
  const started = await startQuest(
    owner.id,
    QUEST_NAME.parse("Workshop"),
    getConstruct("vellum"),
  );
  if (started.kind !== "started") {
    throw new Error("The quest did not start");
  }
  const questId = started.chat.quest.id;
  await signIn(owner);
  const fields = {
    questId,
    name: "Plans",
    singular: "plan",
    plural: "plans",
    checkOff: "Finish",
    uncheck: "Resume",
    newType: "task",
  };

  const invalid = await saveSpaceAction({}, formOf({ ...fields, plural: " " }));
  expect(invalid.error).toContain("plural");
  const { name: draftName } = invalid.draft ?? {};
  expect(draftName).toBe("Plans");
  expect((await listSpaces(owner.id, questId)).map(({ name }) => name)).toEqual(
    ["Tasks", "Ideas"],
  );

  expect(await saveSpaceAction({}, formOf(fields))).toEqual({ saved: true });
  const spaces = await listSpaces(owner.id, questId);
  const added = spaces.at(-1);
  if (added === undefined) {
    throw new Error("The new space was not listed");
  }
  expect(spaces.map(({ name }) => name)).toEqual(["Tasks", "Ideas", "Plans"]);
  expect(added).toMatchObject({
    singular: "plan",
    plural: "plans",
    checkOff: "Finish",
    uncheck: "Resume",
    newType: "task",
  });

  const edit = formOf({
    ...fields,
    name: "Sketches",
    newType: "plain",
    spaceId: added.id,
  });
  expect(await saveSpaceAction({}, edit)).toEqual({ saved: true });
  expect((await listSpaces(owner.id, questId)).at(-1)).toMatchObject({
    id: added.id,
    name: "Sketches",
    newType: "plain",
  });

  await signIn(stranger);
  expect((await saveSpaceAction({}, edit)).error).toBe(
    "This space is unavailable.",
  );
  expect(await listSpaces(stranger.id, questId)).toEqual([]);
});
