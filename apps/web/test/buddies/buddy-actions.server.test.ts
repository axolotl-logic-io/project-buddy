// Her buddies, from the buddies pages' forms, in the test database with the
// mock tutor: what customizing, cloning, saving and resetting keep, and the
// built-in buddies that no form changes.
import { describe, expect, test } from "vitest";
import { saveUserName, type User } from "@/accounts/users-store.ts";
import {
  cloneBuddyAction,
  editBuiltInBuddyAction,
  resetBuddyPartAction,
  saveBuddyAction,
} from "@/app/(workspace)/buddies/actions.ts";
import {
  cloneBuddy,
  getUserBuddy,
  listBuddies as listOwnBuddies,
  type UserBuddy,
  updateBuddy,
} from "@/buddies/buddy-store.ts";
import {
  type BuddyParts,
  DEFAULT_BUDDY_ID,
  getBuddy,
} from "@/buddies/index.ts";
import { BUDDY_PART_KEYS } from "@/buddies/part-defaults.ts";
import { createChat } from "@/chats/new-chat-store.ts";
import { tutorPrompt } from "../test-database/chat-test-kit.ts";
import { testData } from "../test-database/data-test-kit.ts";
import {
  expectNotFound,
  expectRedirect,
} from "../test-database/navigation-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";
import { testUser } from "../test-database/user-test-kit.ts";

const MR_TEE: BuddyParts = getBuddy("mr-tee").parts;

// A form's fields, as the browser sends them.
function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    data.set(key, value);
  }
  return data;
}

// The buddy page's form: the buddy's id, its name and every part.
function buddyForm(buddyId: string, name: string, parts: BuddyParts): FormData {
  const data = form({ buddyId, name });
  for (const key of BUDDY_PART_KEYS) {
    data.set(key, parts[key]);
  }
  return data;
}

// A new user, signed in.
async function signedInUser(): Promise<User> {
  const user = await testUser();
  await signIn(user);
  return user;
}

// Her clone of the buddy with the id sourceId, made straight in the store.
async function cloneOf(user: User, sourceId: string): Promise<UserBuddy> {
  const clone = await cloneBuddy(user.id, sourceId);
  if (clone === undefined) {
    throw new Error(`${sourceId} could not be cloned`);
  }
  return clone;
}

// Her buddy with this id, as stored.
async function stored(user: User, buddyId: string): Promise<UserBuddy> {
  const buddy = await getUserBuddy(user.id, buddyId);
  if (buddy === undefined) {
    throw new Error(`Her buddy ${buddyId} is gone`);
  }
  return buddy;
}

// Customizes the built-in buddy with this id, from its Customize button;
// checks it opened the page of the clone it made, and returns the clone.
async function customize(user: User, buddyId: string): Promise<UserBuddy> {
  const customizing = editBuiltInBuddyAction(form({ buddyId }));
  await Promise.allSettled([customizing]);
  const clone = (await listOwnBuddies(user.id)).at(-1);
  if (clone === undefined) {
    throw new Error(`Customizing ${buddyId} made no clone`);
  }
  await expectRedirect(() => customizing, `/buddies/${clone.id}`);
  return clone;
}

// Resets one part of her buddy, from its reset button, and checks it
// showed the buddy's page again.
async function resetPart(buddyId: string, part: string): Promise<void> {
  await expectRedirect(
    () => resetBuddyPartAction(form({ buddyId, part })),
    `/buddies/${buddyId}`,
  );
}

describe("use_case_customize_buddy", () => {
  test("customizing a built-in buddy makes a copy of her own, and cloning a clone works", async () => {
    const user = await signedInUser();

    const copy = await customize(user, "hippy");
    expect(copy).toMatchObject({
      name: "Hippy (clone)",
      parts: getBuddy("hippy").parts,
    });

    await expectRedirect(
      () => cloneBuddyAction(form({ sourceId: copy.id })),
      "/buddies",
    );
    expect((await listOwnBuddies(user.id)).map(({ name }) => name)).toEqual([
      "Hippy (clone)",
      "Hippy (clone) (clone)",
    ]);
  });
});

describe("use_case_edit_buddy", () => {
  test("her edits to the name and parts are saved", async () => {
    const user = await signedInUser();
    const buddy = await cloneOf(user, "mr-tee");
    // A browser sends a textarea's line breaks as CRLF.
    const voice = "Pity the fool\r\nwho skips the manual.";

    await expectRedirect(
      () =>
        saveBuddyAction(
          buddyForm(buddy.id, "Mr. Tee, edited", { ...MR_TEE, voice }),
        ),
      `/buddies/${buddy.id}`,
    );

    expect(await stored(user, buddy.id)).toMatchObject({
      name: "Mr. Tee, edited",
      parts: { ...MR_TEE, voice: "Pity the fool\nwho skips the manual." },
    });
  });

  test("a voice that says {{name}} is kept as written and reaches her chat's prompt with her name", async () => {
    const user = await signedInUser();
    await saveUserName(user.id, "Mabel");
    const buddy = await cloneOf(user, "mr-tee");
    const voice = "Hi {{name}}, fool.";

    await expectRedirect(
      () =>
        saveBuddyAction(buddyForm(buddy.id, buddy.name, { ...MR_TEE, voice })),
      `/buddies/${buddy.id}`,
    );
    const saved = await stored(user, buddy.id);
    expect(saved.parts.voice).toBe(voice);

    const chat = await createChat(user.id, {
      projectId: (await testData(user).project()).id,
      buddy: { id: DEFAULT_BUDDY_ID, name: saved.name, parts: saved.parts },
    });
    const prompt = await tutorPrompt(chat.id);
    expect(prompt).toContain("Hi Mabel, fool.");
    expect(prompt).not.toContain("{{name}}");
  });
});

describe("use_case_reset_buddy_part", () => {
  test("a part goes back to the built-in buddy's, and a mechanics part to every buddy's", async () => {
    const user = await signedInUser();
    const buddy = await cloneOf(user, "mr-tee");
    await updateBuddy(user.id, buddy.id, {
      parts: { ...MR_TEE, voice: "Edited voice", citation: "Edited citations" },
    });

    await resetPart(buddy.id, "voice");
    expect((await stored(user, buddy.id)).parts).toEqual({
      ...MR_TEE,
      citation: "Edited citations",
    });

    await resetPart(buddy.id, "citation");
    expect((await stored(user, buddy.id)).parts).toEqual(MR_TEE);
  });

  test("a part of a clone of her own buddy goes back to Hippy's", async () => {
    const user = await signedInUser();
    const buddy = await cloneOf(user, (await cloneOf(user, "mr-tee")).id);

    await resetPart(buddy.id, "voice");

    expect((await stored(user, buddy.id)).parts.voice).toBe(
      getBuddy("hippy").parts.voice,
    );
  });
});

describe("use_case_customize_built_in_buddy", () => {
  test("a built-in buddy can't be saved or reset", async () => {
    const user = await signedInUser();
    const fjord = getBuddy("fjord-tines");
    const before = structuredClone(fjord);

    await expectNotFound(() =>
      saveBuddyAction(
        buddyForm(fjord.id, fjord.name, { ...fjord.parts, voice: "Edited" }),
      ),
    );
    await expectNotFound(() =>
      resetBuddyPartAction(form({ buddyId: fjord.id, part: "voice" })),
    );

    expect(getBuddy("fjord-tines")).toEqual(before);
    expect(await listOwnBuddies(user.id)).toEqual([]);
  });

  test("customizing it makes a copy of her own with its parts", async () => {
    const user = await signedInUser();
    const fjord = getBuddy("fjord-tines");

    expect(await customize(user, fjord.id)).toMatchObject({
      name: `${fjord.name} (clone)`,
      parts: fjord.parts,
    });
  });
});
