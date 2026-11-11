// use_case_private_data for a quest's former member, against the test
// database: the owner reads and writes each kind of the quest's data, while
// a user who kept a membership and an accepted quest invitation from when
// quests could be shared sees nothing of it, exactly as of a quest that
// doesn't exist, and takes no writes.
import { describe, expect, test } from "vitest";
import { listMessages } from "@/chats/store.ts";
import { listGeneratedImages } from "@/images/generation-store.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import {
  ALL_TAKEN,
  deletesBy,
  formerMemberQuest,
  NONE_TAKEN,
  NOTHING,
  seenBy,
  writesBy,
} from "./former-member-quest-test-kit.ts";

// The messages the owner's exchange saved: theirs and the construct's reply.
const EXCHANGE_MESSAGES = 2;

describe("use_case_private_data", () => {
  test("the owner reads and writes every kind of the quest's data", async () => {
    const quest = await formerMemberQuest();

    expect(await seenBy(quest.owner, quest)).toMatchObject({
      project: quest.project.name,
      listed: true,
      chat: quest.chat.id,
      messages: EXCHANGE_MESSAGES,
      image: "image/png",
      generation: quest.generationId,
    });
    expect(await writesBy(quest.owner, quest)).toEqual(ALL_TAKEN);
    expect(await deletesBy(quest.owner, quest)).toBe("deleted");
    expect(await seenBy(quest.owner, quest)).toMatchObject({
      messages: EXCHANGE_MESSAGES + 1,
      notes: ["Paint the flippers"],
      milestones: ["Rigged the flippers"],
    });
  });

  test("a former member sees nothing of the quest and writes nothing to it", async () => {
    const quest = await formerMemberQuest();
    const before = await seenBy(quest.owner, quest);

    expect(await seenBy(quest.member, quest)).toEqual(NOTHING);
    expect(await writesBy(quest.member, quest)).toEqual(NONE_TAKEN);
    expect(await deletesBy(quest.member, quest)).not.toBe("deleted");
    expect(await listGeneratedImages(quest.member.id)).toEqual([]);
    expect(await seenBy(quest.owner, quest)).toEqual(before);
  });

  test("a former member and any other user see the quest alike", async () => {
    const [quest, outsider] = await Promise.all([
      formerMemberQuest(),
      testUser(),
    ]);

    expect(await seenBy(quest.member, quest)).toEqual(
      await seenBy(outsider, quest),
    );
    expect(await writesBy(outsider, quest)).toEqual(NONE_TAKEN);
    expect(await listMessages(quest.owner.id, quest.chat.id)).toHaveLength(
      EXCHANGE_MESSAGES,
    );
  });
});
