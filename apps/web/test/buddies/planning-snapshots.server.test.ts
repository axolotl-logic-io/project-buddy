import { expect, test } from "vitest";
import {
  resetBuddyPartAction,
  saveBuddyAction,
} from "@/app/(workspace)/buddies/actions.ts";
import {
  cloneBuddy,
  getUserBuddy,
  type UserBuddy,
} from "@/buddies/buddy-store.ts";
import { chosenBuddy } from "@/buddies/chosen-buddy.ts";
import { type BuddyParts, getBuddy } from "@/buddies/index.ts";
import { BUDDY_PART_KEYS } from "@/buddies/part-defaults.ts";
import type { NewChatBuddy } from "@/chats/new-chat-store.ts";
import { startChat } from "@/chats/start-chat.ts";
import { getChat } from "@/chats/store.ts";
import { DEFAULT_HIDDEN_FLAGS } from "@/flags/flags.ts";
import { saveHiddenFlagsAction } from "@/flags/save-hidden-flags-action.ts";
import type { ChatId, UserId } from "@/ids.ts";
import { tutorPrompt } from "../test-database/chat-test-kit.ts";
import { testData } from "../test-database/data-test-kit.ts";
import { expectRedirect } from "../test-database/navigation-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";
import { testUser } from "../test-database/user-test-kit.ts";

const SKILLS = [
  { key: "brainstorming", flag: "brainstorming" },
  { key: "projectBreakdown", flag: "project-breakdown" },
] as const;

const CUSTOM_PARTS: BuddyParts = {
  ...getBuddy("mr-tee").parts,
  brainstorming: "Custom exploration instructions.",
  projectBreakdown: "Custom milestone instructions.",
};

async function ownBuddy(owner: UserId, buddyId: string): Promise<UserBuddy> {
  const buddy = await getUserBuddy(owner, buddyId);
  if (buddy === undefined) {
    throw new Error("The saved buddy is missing");
  }
  return buddy;
}

async function clone(owner: UserId, source: string): Promise<UserBuddy> {
  const buddy = await cloneBuddy(owner, source);
  if (buddy === undefined) {
    throw new Error("Cloning did not make a buddy");
  }
  return buddy;
}

async function save(buddy: UserBuddy, parts: BuddyParts): Promise<void> {
  const form = new FormData();
  form.set("buddyId", buddy.id);
  form.set("name", buddy.name);
  for (const key of BUDDY_PART_KEYS) {
    form.set(key, parts[key]);
  }
  await expectRedirect(() => saveBuddyAction(form), `/buddies/${buddy.id}`);
}

async function openingBuddy(
  owner: UserId,
  buddyId: string,
): Promise<NewChatBuddy> {
  const chosen = await chosenBuddy(owner, buddyId);
  if (chosen === undefined) {
    throw new Error("The opening's buddy is missing");
  }
  return chosen.buddy;
}

async function snapshot(
  owner: UserId,
  chatId: ChatId,
): Promise<BuddyParts | undefined> {
  return (await getChat(owner, chatId))?.buddy.parts;
}

test.each(SKILLS)(
  "$key retains hidden edits and gates old and new snapshots independently",
  async ({ key, flag }) => {
    const user = await testUser();
    await signIn(user);
    const buddy = await clone(user.id, "mr-tee");
    await save(buddy, CUSTOM_PARTS);
    const project = await testData(user).project();
    const oldChat = await startChat(
      user.id,
      project,
      await openingBuddy(user.id, buddy.id),
    );
    if (oldChat.kind !== "started") {
      throw new Error("The original chat did not start");
    }

    await saveHiddenFlagsAction([...DEFAULT_HIDDEN_FLAGS, flag]);
    // An unrelated save submits the hidden field without replacing its text.
    const unrelatedEdit = { ...CUSTOM_PARTS, voice: "Edited voice." };
    await save(buddy, unrelatedEdit);
    expect((await ownBuddy(user.id, buddy.id)).parts).toEqual(unrelatedEdit);
    const edited = {
      ...unrelatedEdit,
      [key]: "New captured skill instructions.",
    };
    await save(buddy, edited);
    const newChat = await startChat(
      user.id,
      project,
      await openingBuddy(user.id, buddy.id),
    );
    if (newChat.kind !== "started") {
      throw new Error("The edited chat did not start");
    }

    expect(await snapshot(user.id, oldChat.chat.id)).toEqual(CUSTOM_PARTS);
    expect(await snapshot(user.id, newChat.chat.id)).toEqual(edited);
    const prompts = [
      await tutorPrompt(oldChat.chat.id),
      await tutorPrompt(newChat.chat.id),
    ];
    for (const prompt of prompts) {
      expect(prompt).not.toContain(CUSTOM_PARTS[key]);
      expect(prompt).not.toContain(edited[key]);
      for (const skill of SKILLS.filter((candidate) => candidate.key !== key)) {
        expect(prompt).toContain(CUSTOM_PARTS[skill.key]);
      }
    }

    await saveHiddenFlagsAction([...DEFAULT_HIDDEN_FLAGS]);
    expect(await tutorPrompt(oldChat.chat.id)).toContain(CUSTOM_PARTS[key]);
    expect(await tutorPrompt(newChat.chat.id)).toContain(edited[key]);
    expect(await snapshot(user.id, oldChat.chat.id)).toEqual(CUSTOM_PARTS);
    expect(await snapshot(user.id, newChat.chat.id)).toEqual(edited);
  },
);

test.each(SKILLS)(
  "resetting $key on an own-buddy clone changes only that part on that clone",
  async ({ key }) => {
    const user = await testUser();
    await signIn(user);
    const source = await clone(user.id, "mr-tee");
    await save(source, CUSTOM_PARTS);
    const copy = await clone(user.id, source.id);
    expect(copy.name).toBe(`${source.name} (clone)`);
    expect(copy.parts).toEqual(CUSTOM_PARTS);

    const edited = { ...CUSTOM_PARTS, [key]: "Edited clone skill." };
    await save(copy, edited);
    expect((await ownBuddy(user.id, source.id)).parts).toEqual(CUSTOM_PARTS);
    expect((await ownBuddy(user.id, copy.id)).parts).toEqual(edited);

    const form = new FormData();
    form.set("buddyId", copy.id);
    form.set("part", key);
    await expectRedirect(
      () => resetBuddyPartAction(form),
      `/buddies/${copy.id}`,
    );
    expect((await ownBuddy(user.id, copy.id)).parts).toEqual({
      ...CUSTOM_PARTS,
      [key]: getBuddy("hippy").parts[key],
    });
    expect((await ownBuddy(user.id, source.id)).parts).toEqual(CUSTOM_PARTS);
    expect(getBuddy("mr-tee").parts[key]).not.toBe(CUSTOM_PARTS[key]);
  },
);
