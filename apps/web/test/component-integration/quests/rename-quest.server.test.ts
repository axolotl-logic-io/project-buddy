import { refresh } from "next/cache";
import { describe, expect, test, vi } from "vitest";
import { QUEST_NAME_MAX_LENGTH } from "@/quests/quest-name.ts";
import { renameQuestAction } from "@/quests/rename-quest-action.ts";
import { getQuest } from "@/quests/store.ts";
import { expectNotFound } from "../test-database/navigation-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";
import { twoUsers } from "../test-database/two-users-test-kit.ts";

vi.mock("next/cache", () => ({ refresh: vi.fn() }));

function form(questId: string, name: string): FormData {
  const data = new FormData();
  data.set("questId", questId);
  data.set("name", name);
  return data;
}

describe("use_case_rename_quest", () => {
  test("the owner saves a trimmed name", async () => {
    const { her, herData } = await twoUsers();
    const quest = await herData.quest();
    expect(
      await renameQuestAction({ kind: "idle" }, form(quest.id, "  Fox den  ")),
    ).toEqual({ kind: "saved", name: "Fox den" });
    expect((await getQuest(her.id, quest.id))?.name).toBe("Fox den");
    expect(refresh).toHaveBeenCalled();
  });
  test.each(["", "   ", "x".repeat(QUEST_NAME_MAX_LENGTH + 1)])(
    "refuses an invalid name %s",
    async (name) => {
      const { her, herData } = await twoUsers();
      const quest = await herData.quest();
      expect(
        await renameQuestAction({ kind: "idle" }, form(quest.id, name)),
      ).toMatchObject({ kind: "invalid" });
      expect((await getQuest(her.id, quest.id))?.name).toBe(quest.name);
    },
  );
  test("former members and outsiders cannot rename a quest", async () => {
    const { her, herData, other, otherData } = await twoUsers();
    const quest = await herData.quest();
    const foreign = await otherData.quest();
    await expectNotFound(() =>
      renameQuestAction({ kind: "idle" }, form(foreign.id, "Stolen")),
    );
    await signIn(other);
    await expectNotFound(() =>
      renameQuestAction(
        { kind: "idle" },
        form(quest.id, "Changed by former member"),
      ),
    );
    expect((await getQuest(her.id, quest.id))?.name).toBe(quest.name);
    expect((await getQuest(other.id, foreign.id))?.name).toBe(foreign.name);
  });
});
