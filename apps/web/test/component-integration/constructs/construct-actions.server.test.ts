// Her constructs, from the constructs pages' forms, in the test database with the
// mock construct: what customizing, writing from scratch, cloning, saving and
// resetting keep, and the built-in constructs that no form changes.
import { describe, expect, test, vi } from "vitest";
import { saveUserName, type User } from "@/accounts/users-store.ts";
import {
  cloneConstructAction,
  editBuiltInConstructAction,
  newConstructAction,
  resetConstructPromptAction,
  saveConstructAction,
} from "@/app/(workspace)/constructs/actions.ts";
import { createChat } from "@/chats/new-chat-store.ts";
import { chosenConstruct } from "@/constructs/chosen-construct.ts";
import {
  cloneConstruct,
  getOwnConstruct,
  listConstructs as listOwnConstructs,
  type OwnConstruct,
  updateConstruct,
} from "@/constructs/construct-store.ts";
import {
  type ConstructDefinition,
  DEFAULT_CONSTRUCT_ID,
  getConstruct,
} from "@/constructs/index.ts";
import { CONSTRUCTS_COPY } from "@/ui/copy/constructs.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { constructPrompt } from "../test-database/chat-test-kit.ts";
import {
  expectNotFound,
  expectRedirect,
} from "../test-database/navigation-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const LUMEN: ConstructDefinition = getConstruct("lumen").definition;

// A form's fields, as the browser sends them.
function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    data.set(key, value);
  }
  return data;
}

// The construct page's form: the construct's id, its name and every part.
function constructForm(
  constructId: string,
  name: string,
  parts: ConstructDefinition,
): FormData {
  const data = form({ constructId, name });
  data.set("prompt", parts.prompt);
  return data;
}

// A new user, signed in.
async function signedInUser(): Promise<User> {
  const user = await testUser();
  await signIn(user);
  return user;
}

// Her clone of the construct with the id sourceId, made straight in the store.
async function cloneOf(user: User, sourceId: string): Promise<OwnConstruct> {
  const clone = await cloneConstruct(user.id, sourceId);
  if (clone === undefined) {
    throw new Error(`${sourceId} could not be cloned`);
  }
  return clone;
}

// Her construct with this id, as stored.
async function stored(user: User, constructId: string): Promise<OwnConstruct> {
  const construct = await getOwnConstruct(user.id, constructId);
  if (construct === undefined) {
    throw new Error(`Her construct ${constructId} is gone`);
  }
  return construct;
}

// Customizes the built-in construct with this id, from its Customize button;
// checks it opened the page of the clone it made, and returns the clone.
async function customize(
  user: User,
  constructId: string,
): Promise<OwnConstruct> {
  const customizing = editBuiltInConstructAction(form({ constructId }));
  await Promise.allSettled([customizing]);
  const clone = (await listOwnConstructs(user.id)).at(-1);
  if (clone === undefined) {
    throw new Error(`Customizing ${constructId} made no clone`);
  }
  await expectRedirect(() => customizing, `/constructs/${clone.id}`);
  return clone;
}

// Writes a new construct from scratch, from the New construct button; checks it
// opened the page of the construct it made, and returns that construct.
async function writeNew(user: User): Promise<OwnConstruct> {
  const writing = newConstructAction();
  await Promise.allSettled([writing]);
  const construct = (await listOwnConstructs(user.id)).at(-1);
  if (construct === undefined) {
    throw new Error("New construct made no construct");
  }
  await expectRedirect(() => writing, `/constructs/${construct.id}`);
  return construct;
}

// Resets one part of her construct, from its reset button, and checks it
// showed the construct's page again.
async function resetPrompt(constructId: string): Promise<void> {
  await resetConstructPromptAction(form({ constructId }));
}

describe("use_case_customize_construct", () => {
  test("customizing a built-in construct makes a copy of her own, and cloning a clone works", async () => {
    const user = await signedInUser();

    const copy = await customize(user, "vellum");
    expect(copy).toMatchObject({
      name: "Vellum (clone)",
      definition: getConstruct("vellum").definition,
    });

    await expectRedirect(
      () => cloneConstructAction(form({ sourceId: copy.id })),
      "/constructs",
    );
    expect((await listOwnConstructs(user.id)).map(({ name }) => name)).toEqual([
      "Vellum (clone)",
      "Vellum (clone) (clone)",
    ]);
  });
});

describe("use_case_new_construct", () => {
  test("a new construct starts with default instructions, and each New construct makes another", async () => {
    const user = await signedInUser();

    const construct = await writeNew(user);
    expect(construct).toMatchObject({
      name: CONSTRUCTS_COPY.newConstructName,
      definition: getConstruct(DEFAULT_CONSTRUCT_ID).definition,
      clonedFrom: undefined,
    });

    const edited = {
      prompt: ["Edited voice", "## Habits", "- Edited habits"].join("\n\n"),
    };
    expect(
      (await updateConstruct(user.id, construct.id, { definition: edited }))
        ?.definition,
    ).toEqual(edited);
    await resetPrompt(construct.id);
    await resetPrompt(construct.id);
    expect((await stored(user, construct.id)).definition).toEqual(
      construct.definition,
    );

    await writeNew(user);
    expect((await listOwnConstructs(user.id)).map(({ name }) => name)).toEqual([
      CONSTRUCTS_COPY.newConstructName,
      CONSTRUCTS_COPY.newConstructName,
    ]);
  });

  test("her new construct can be named, written, chosen for a chat and cloned, and is hers alone", async () => {
    const user = await signedInUser();
    const construct = await writeNew(user);
    const parts = {
      prompt: ["Kind and brief.", "## Habits", "- Asks first."].join("\n\n"),
    };

    await expectRedirect(
      () => saveConstructAction(constructForm(construct.id, "Pal", parts)),
      `/constructs/${construct.id}`,
    );
    expect(await chosenConstruct(user.id, construct.id)).toEqual({
      id: construct.id,
      construct: { id: DEFAULT_CONSTRUCT_ID, name: "Pal", definition: parts },
    });
    await expectRedirect(
      () => cloneConstructAction(form({ sourceId: construct.id })),
      "/constructs",
    );
    expect((await listOwnConstructs(user.id)).at(-1)).toMatchObject({
      name: "Pal (clone)",
      definition: parts,
    });

    const other = await signedInUser();
    await expectNotFound(() =>
      saveConstructAction(constructForm(construct.id, "Taken", parts)),
    );
    expect(await chosenConstruct(other.id, construct.id)).toBeUndefined();
    expect(await listOwnConstructs(other.id)).toEqual([]);
    expect((await stored(user, construct.id)).name).toBe("Pal");
  });
});

describe("use_case_edit_construct", () => {
  test("her edits to the name and parts are saved", async () => {
    const user = await signedInUser();
    const construct = await cloneOf(user, "lumen");
    // A browser sends a textarea's line breaks as CRLF.
    const prompt = "Pity the fool\r\nwho skips the manual.";

    await expectRedirect(
      () =>
        saveConstructAction(
          constructForm(construct.id, " Lumen, edited ", { ...LUMEN, prompt }),
        ),
      `/constructs/${construct.id}`,
    );

    expect(await stored(user, construct.id)).toMatchObject({
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
    const construct = await cloneOf(user, "lumen");
    const prompt = "Hi {{name}}, fool.";

    await expectRedirect(
      () =>
        saveConstructAction(
          constructForm(construct.id, construct.name, { ...LUMEN, prompt }),
        ),
      `/constructs/${construct.id}`,
    );
    const saved = await stored(user, construct.id);
    expect(saved.definition.prompt).toBe(prompt);

    const chat = await createChat(user.id, {
      project: await testData(user).project(),
      construct: {
        id: DEFAULT_CONSTRUCT_ID,
        name: saved.name,
        definition: saved.definition,
      },
    });
    const rendered = await constructPrompt(chat.id);
    expect(rendered).toContain("Hi Mabel, fool.");
    expect(rendered).not.toContain("{{name}}");
  });
});

describe("use_case_reset_construct_part", () => {
  test("reset restores the whole built-in construct prompt", async () => {
    const user = await signedInUser();
    const construct = await cloneOf(user, "lumen");
    await updateConstruct(user.id, construct.id, {
      definition: {
        prompt: ["Edited voice", "## Habits", "- Edited habits"].join("\n\n"),
      },
    });

    await resetPrompt(construct.id);
    expect((await stored(user, construct.id)).definition).toEqual(LUMEN);

    await resetPrompt(construct.id);
    expect((await stored(user, construct.id)).definition).toEqual(LUMEN);
  });

  test("the prompt of a clone of her own construct goes back to Vellum's", async () => {
    const user = await signedInUser();
    const construct = await cloneOf(user, (await cloneOf(user, "lumen")).id);

    await resetPrompt(construct.id);

    expect((await stored(user, construct.id)).definition.prompt).toBe(
      getConstruct("vellum").definition.prompt,
    );
  });
});

describe("use_case_customize_built_in_construct", () => {
  test("a built-in construct can't be saved or reset", async () => {
    const user = await signedInUser();
    const lumen = getConstruct("lumen");

    await expectNotFound(() =>
      saveConstructAction(
        constructForm(lumen.id, lumen.name, {
          ...lumen.definition,
          prompt: "Edited",
        }),
      ),
    );
    await expectNotFound(() =>
      resetConstructPromptAction(
        form({ constructId: lumen.id, part: "voice" }),
      ),
    );

    expect(await listOwnConstructs(user.id)).toEqual([]);
  });
});

const TOO_LONG_VISUAL_DESCRIPTION = 4001;

test("saving a Visual description retains trusted art, ignores submitted assets and reset preserves visuals", async () => {
  const user = await signedInUser();
  const construct = await cloneOf(user, "lumen");
  const data = constructForm(
    construct.id,
    construct.name,
    construct.definition,
  );
  data.set("visualDescription", "A smiling light with orbiting rune rings.");
  data.set(
    "visual",
    JSON.stringify({
      version: 1,
      description: "Forged",
      canonical: { kind: "generated", assetId: crypto.randomUUID() },
    }),
  );
  await expectRedirect(
    () => saveConstructAction(data),
    `/constructs/${construct.id}`,
  );
  const expected = {
    ...LUMEN.visual,
    description: "A smiling light with orbiting rune rings.",
  };
  expect((await stored(user, construct.id)).definition.visual).toEqual(
    expected,
  );
  await resetPrompt(construct.id);
  expect((await stored(user, construct.id)).definition.visual).toEqual(
    expected,
  );
  data.set("visualDescription", "x".repeat(TOO_LONG_VISUAL_DESCRIPTION));
  await expectNotFound(() => saveConstructAction(data));
  expect((await stored(user, construct.id)).definition.visual).toEqual(
    expected,
  );
});
