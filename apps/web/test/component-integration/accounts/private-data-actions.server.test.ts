// use_case_private_data in the quests' Server Actions, with two users
// side by side: the other user, signed in as their own account, sends a
// form that names her quest. Each action answers exactly as for an
// unknown quest, and writes nothing of hers or theirs.
// private-data-chats.server.test.ts covers renaming a chat.

import { describe, expect, test } from "vitest";
import {
  readQuestConversation,
  startQuestConversation,
} from "@/conversations/start-quest.ts";
import { questIdFixture } from "../../support/id-fixtures.ts";
import { twoUsers } from "../test-database/two-users-test-kit.ts";

describe("use_case_private_data", () => {
  test("starting the conversation of another user's quest answers as for an unknown quest, and starts none", async () => {
    const { her, herData, other } = await twoUsers();
    const hers = await herData.quest();

    const unknown = await startQuestConversation(other.id, questIdFixture());

    expect(unknown).toEqual({ kind: "notFound" });
    expect(await startQuestConversation(other.id, hers.id)).toEqual(unknown);
    expect(await readQuestConversation(her.id, hers.id)).toBeUndefined();
  });
});
