// Her buddies, from the buddies pages' forms, in the test database with the
// mock buddy: what customizing, writing from scratch, cloning, saving and
// resetting keep, and the built-in buddies that no form changes.
import { describe, expect, test, vi } from "vitest";
import { saveUserName, type User } from "@/accounts/users-store.ts";
import {
  cloneBuddyAction,
  editBuiltInBuddyAction,
  newBuddyAction,
  resetBuddyPromptAction,
  saveBuddyAction,
} from "@/app/(workspace)/buddies/actions.ts";
import {
  cloneBuddy,
  getOwnBuddy,
  listBuddies as listOwnBuddies,
  type OwnBuddy,
  updateBuddy,
} from "@/buddies/buddy-store.ts";
import { chosenBuddy } from "@/buddies/chosen-buddy.ts";
import {
  type BuddyDefinition,
  DEFAULT_BUDDY_ID,
  getBuddy,
} from "@/buddies/index.ts";
import { createChat } from "@/chats/new-chat-store.ts";
import { BUDDIES_COPY } from "@/ui/copy/buddies.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { buddyPrompt } from "../test-database/chat-test-kit.ts";
import {
  expectNotFound,
  expectRedirect,
} from "../test-database/navigation-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const LUMEN: BuddyDefinition = getBuddy("lumen").definition;

// A form's fields, as the browser sends them.
function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    data.set(key, value);
  }
  return data;
}

// The buddy page's form: the buddy's id, its name and every part.
function buddyForm(
  buddyId: string,
  name: string,
  parts: BuddyDefinition,
): FormData {
  const data = form({ buddyId, name });
  data.set("prompt", parts.prompt);
  return data;
}

// A new user, signed in.
async function signedInUser(): Promise<User> {
  const user = await testUser();
  await signIn(user);
  return user;
}

// Her clone of the buddy with the id sourceId, made straight in the store.
async function cloneOf(user: User, sourceId: string): Promise<OwnBuddy> {
  const clone = await cloneBuddy(user.id, sourceId);
  if (clone === undefined) {
    throw new Error(`${sourceId} could not be cloned`);
  }
  return clone;
}

// Her buddy with this id, as stored.
async function stored(user: User, buddyId: string): Promise<OwnBuddy> {
  const buddy = await getOwnBuddy(user.id, buddyId);
  if (buddy === undefined) {
    throw new Error(`Her buddy ${buddyId} is gone`);
  }
  return buddy;
}

// Customizes the built-in buddy with this id, from its Customize button;
// checks it opened the page of the clone it made, and returns the clone.
async function customize(user: User, buddyId: string): Promise<OwnBuddy> {
  const customizing = editBuiltInBuddyAction(form({ buddyId }));
  await Promise.allSettled([customizing]);
  const clone = (await listOwnBuddies(user.id)).at(-1);
  if (clone === undefined) {
    throw new Error(`Customizing ${buddyId} made no clone`);
  }
  await expectRedirect(() => customizing, `/buddies/${clone.id}`);
  return clone;
}

// Writes a new buddy from scratch, from the New buddy button; checks it
// opened the page of the buddy it made, and returns that buddy.
async function writeNew(user: User): Promise<OwnBuddy> {
  const writing = newBuddyAction();
  await Promise.allSettled([writing]);
  const buddy = (await listOwnBuddies(user.id)).at(-1);
  if (buddy === undefined) {
    throw new Error("New buddy made no buddy");
  }
  await expectRedirect(() => writing, `/buddies/${buddy.id}`);
  return buddy;
}

// Resets one part of her buddy, from its reset button, and checks it
// showed the buddy's page again.
async function resetPrompt(buddyId: string): Promise<void> {
  await resetBuddyPromptAction(form({ buddyId }));
}

describe("use_case_customize_buddy", () => {
  test("customizing a built-in buddy makes a copy of her own, and cloning a clone works", async () => {
    const user = await signedInUser();

    const copy = await customize(user, "vellum");
    expect(copy).toMatchObject({
      name: "Vellum (clone)",
      definition: getBuddy("vellum").definition,
    });

    await expectRedirect(
      () => cloneBuddyAction(form({ sourceId: copy.id })),
      "/buddies",
    );
    expect((await listOwnBuddies(user.id)).map(({ name }) => name)).toEqual([
      "Vellum (clone)",
      "Vellum (clone) (clone)",
    ]);
  });
});

describe("use_case_new_buddy", () => {
  test("a new buddy starts with default instructions, and each New buddy makes another", async () => {
    const user = await signedInUser();

    const buddy = await writeNew(user);
    expect(buddy).toMatchObject({
      name: BUDDIES_COPY.newBuddyName,
      definition: getBuddy(DEFAULT_BUDDY_ID).definition,
      clonedFrom: undefined,
    });

    const edited = {
      prompt: ["Edited voice", "## Habits", "- Edited habits"].join("\n\n"),
    };
    expect(
      (await updateBuddy(user.id, buddy.id, { definition: edited }))
        ?.definition,
    ).toEqual(edited);
    await resetPrompt(buddy.id);
    await resetPrompt(buddy.id);
    expect((await stored(user, buddy.id)).definition).toEqual(buddy.definition);

    await writeNew(user);
    expect((await listOwnBuddies(user.id)).map(({ name }) => name)).toEqual([
      BUDDIES_COPY.newBuddyName,
      BUDDIES_COPY.newBuddyName,
    ]);
  });

  test("her new buddy can be named, written, chosen for a chat and cloned, and is hers alone", async () => {
    const user = await signedInUser();
    const buddy = await writeNew(user);
    const parts = {
      prompt: ["Kind and brief.", "## Habits", "- Asks first."].join("\n\n"),
    };

    await expectRedirect(
      () => saveBuddyAction(buddyForm(buddy.id, "Pal", parts)),
      `/buddies/${buddy.id}`,
    );
    expect(await chosenBuddy(user.id, buddy.id)).toEqual({
      id: buddy.id,
      buddy: { id: DEFAULT_BUDDY_ID, name: "Pal", definition: parts },
    });
    await expectRedirect(
      () => cloneBuddyAction(form({ sourceId: buddy.id })),
      "/buddies",
    );
    expect((await listOwnBuddies(user.id)).at(-1)).toMatchObject({
      name: "Pal (clone)",
      definition: parts,
    });

    const other = await signedInUser();
    await expectNotFound(() =>
      saveBuddyAction(buddyForm(buddy.id, "Taken", parts)),
    );
    expect(await chosenBuddy(other.id, buddy.id)).toBeUndefined();
    expect(await listOwnBuddies(other.id)).toEqual([]);
    expect((await stored(user, buddy.id)).name).toBe("Pal");
  });
});

describe("use_case_edit_buddy", () => {
  test("her edits to the name and parts are saved", async () => {
    const user = await signedInUser();
    const buddy = await cloneOf(user, "lumen");
    // A browser sends a textarea's line breaks as CRLF.
    const prompt = "Pity the fool\r\nwho skips the manual.";

    await expectRedirect(
      () =>
        saveBuddyAction(
          buddyForm(buddy.id, " Lumen, edited ", { ...LUMEN, prompt }),
        ),
      `/buddies/${buddy.id}`,
    );

    expect(await stored(user, buddy.id)).toMatchObject({
      name: "Lumen, edited",
      definition: {
        ...LUMEN,
        prompt: "Pity the fool\nwho skips the manual.",
      },
    });
  });

  test("a voice that says {{name}} is kept as written and reaches her chat's prompt with her name", async () => {
    const user = await signedInUser();
    await saveUserName(user.id, "Mabel");
    const buddy = await cloneOf(user, "lumen");
    const prompt = "Hi {{name}}, fool.";

    await expectRedirect(
      () =>
        saveBuddyAction(buddyForm(buddy.id, buddy.name, { ...LUMEN, prompt })),
      `/buddies/${buddy.id}`,
    );
    const saved = await stored(user, buddy.id);
    expect(saved.definition.prompt).toBe(prompt);

    const chat = await createChat(user.id, {
      project: await testData(user).project(),
      buddy: {
        id: DEFAULT_BUDDY_ID,
        name: saved.name,
        definition: saved.definition,
      },
    });
    const rendered = await buddyPrompt(chat.id);
    expect(rendered).toContain("Hi Mabel, fool.");
    expect(rendered).not.toContain("{{name}}");
  });
});

describe("use_case_reset_buddy_part", () => {
  test("reset restores the whole built-in buddy prompt", async () => {
    const user = await signedInUser();
    const buddy = await cloneOf(user, "lumen");
    await updateBuddy(user.id, buddy.id, {
      definition: {
        prompt: ["Edited voice", "## Habits", "- Edited habits"].join("\n\n"),
      },
    });

    await resetPrompt(buddy.id);
    expect((await stored(user, buddy.id)).definition).toEqual(LUMEN);

    await resetPrompt(buddy.id);
    expect((await stored(user, buddy.id)).definition).toEqual(LUMEN);
  });

  test("the prompt of a clone of her own buddy goes back to Vellum's", async () => {
    const user = await signedInUser();
    const buddy = await cloneOf(user, (await cloneOf(user, "lumen")).id);

    await resetPrompt(buddy.id);

    expect((await stored(user, buddy.id)).definition.prompt).toBe(
      getBuddy("vellum").definition.prompt,
    );
  });
});

describe("use_case_customize_built_in_buddy", () => {
  test("a built-in buddy can't be saved or reset", async () => {
    const user = await signedInUser();
    const lumen = getBuddy("lumen");

    await expectNotFound(() =>
      saveBuddyAction(
        buddyForm(lumen.id, lumen.name, {
          ...lumen.definition,
          prompt: "Edited",
        }),
      ),
    );
    await expectNotFound(() =>
      resetBuddyPromptAction(form({ buddyId: lumen.id, part: "voice" })),
    );

    expect(await listOwnBuddies(user.id)).toEqual([]);
  });
});
