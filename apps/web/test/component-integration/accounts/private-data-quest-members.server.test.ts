// use_case_quest_member_access against the test database: an accepted
// member reads and writes every kind of the quest's data as its owner does,
// while a pending invitee, a removed member and a stranger see nothing of
// it, exactly as of a quest that doesn't exist, and take no writes. What
// the removed member wrote stays, with them as its author.

import { describe, expect, test, vi } from "vitest";
import { listMessages } from "@/chats/store.ts";
import { removeFromQuest } from "@/quests/membership-store.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import {
  addInvitee,
  addMember,
  addRemovedMember,
} from "../quests/quest-members-test-kit.ts";
import type { SendEmail } from "../test-database/sign-in-link-test-kit.ts";
import {
  ALL_TAKEN,
  formerMemberQuest,
  NONE_TAKEN,
  NOTHING,
  seenBy,
  writesBy,
} from "./former-member-quest-test-kit.ts";

const sent = vi.hoisted(() => ({ sendEmail: vi.fn<SendEmail>() }));
vi.mock("@/email/send-email.ts", () => sent);

// The messages the owner's exchange saved: theirs and the construct's reply.
const EXCHANGE_MESSAGES = 2;

describe("use_case_quest_member_access", () => {
  test("an accepted member reads and writes every kind of the quest's data", async () => {
    const quest = await formerMemberQuest();
    await addMember(quest.owner, quest.quest.id, quest.member);

    expect(await seenBy(quest.member, quest)).toMatchObject({
      quest: quest.quest.name,
      listed: true,
      conversation: quest.chat.id,
      chat: quest.chat.id,
      messages: EXCHANGE_MESSAGES,
      image: "image/png",
      generation: quest.generationId,
      spell: "tasks",
    });
    expect(await writesBy(quest.member, quest)).toEqual(ALL_TAKEN);
    expect(await seenBy(quest.owner, quest)).toMatchObject({
      messages: EXCHANGE_MESSAGES + 1,
      milestones: ["Rigged the flippers", "Edited"],
    });
  });

  test("a pending invitee, a removed member and a stranger see and write nothing", async () => {
    const quest = await formerMemberQuest();
    const [invitee, removed, stranger] = await Promise.all([
      testUser(),
      testUser(),
      testUser(),
    ]);
    await addInvitee(quest.owner, quest.quest.id, invitee);
    await addRemovedMember(quest.owner, quest.quest.id, removed);
    const before = await seenBy(quest.owner, quest);

    const outsiders = [invitee, removed, stranger];
    expect(
      await Promise.all(outsiders.map((user) => seenBy(user, quest))),
    ).toEqual([NOTHING, NOTHING, NOTHING]);
    expect(
      await Promise.all(outsiders.map((user) => writesBy(user, quest))),
    ).toEqual([NONE_TAKEN, NONE_TAKEN, NONE_TAKEN]);
    expect(await seenBy(quest.owner, quest)).toEqual(before);
  });

  test("a removed member's messages stay, with them as author", async () => {
    const quest = await formerMemberQuest();
    await addMember(quest.owner, quest.quest.id, quest.member);
    const { message } = await writesBy(quest.member, quest);
    expect(message).toBe("inserted");
    await removeFromQuest(quest.owner.id, {
      questId: quest.quest.id,
      person: quest.member.id,
    });

    const authors = (await listMessages(quest.owner.id, quest.chat.id)).map(
      ({ metadata }) => metadata?.author?.id,
    );
    expect(authors).toContain(quest.member.id);
    expect(await seenBy(quest.member, quest)).toEqual(NOTHING);
  });
});
