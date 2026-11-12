// Her constructs, from the constructs pages' forms, in the test database with the
// mock construct: what customizing, crafting, cloning, saving and
// resetting keep, and the built-in constructs that no form changes.

import { and, eq } from "drizzle-orm";
import sharp from "sharp";
import { describe, expect, test, vi } from "vitest";
import { ownPromptOwnedBy } from "@/accounts/owner-scope.ts";
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
import { parseConstructDefinition } from "@/constructs/construct-definition.ts";
import {
  cloneConstruct,
  createConstruct,
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
import { getVisualAsset } from "@/constructs/visual-asset-store.ts";
import { generateConstructVisual } from "@/constructs/visual-generation.ts";
import { getDb } from "@/db/client.ts";
import { ownPrompts } from "@/db/tables/own-prompts.ts";
import {
  type GeneratedImage,
  type ImageProvider,
  imageProvider,
} from "@/images/image-provider.ts";
import { CONSTRUCTS_COPY } from "@/ui/copy/constructs.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import { goldSpent } from "../../support/test-database/gold-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { constructPrompt } from "../test-database/chat-test-kit.ts";
import {
  expectNotFound,
  expectRedirect,
} from "../test-database/navigation-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";

vi.mock("@/images/image-provider.ts", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/images/image-provider.ts")>();
  return { ...actual, imageProvider: vi.fn(actual.imageProvider) };
});

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const LUMEN: ConstructDefinition = getConstruct("lumen").definition;
const GENERATED_COST = 10_000;

async function testArtwork(): Promise<GeneratedImage> {
  return {
    bytes: await sharp({
      create: { width: 32, height: 32, channels: 3, background: "white" },
    })
      .png()
      .toBuffer(),
    mediaType: "image/png",
    costMicroUsd: GENERATED_COST,
  };
}

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

// Crafts a construct from the Craft construct button; checks it
// opened the page of the construct it made, and returns that construct.
async function writeNew(user: User): Promise<OwnConstruct> {
  const writing = newConstructAction();
  await Promise.allSettled([writing]);
  const construct = (await listOwnConstructs(user.id)).at(-1);
  if (construct === undefined) {
    throw new Error("Craft construct made no construct");
  }
  await expectRedirect(() => writing, `/constructs/${construct.id}`);
  return construct;
}

// Resets one part of her construct, from its reset button, and checks it
// showed the construct's page again.
async function resetPrompt(constructId: string): Promise<void> {
  await resetConstructPromptAction(form({ constructId }));
}

// Making a copy opens that new private definition in the editor.
async function copyOwn(user: User, sourceId: string): Promise<void> {
  const copying = cloneConstructAction(form({ sourceId }));
  await Promise.allSettled([copying]);
  const copy = (await listOwnConstructs(user.id)).at(-1);
  if (copy === undefined) {
    throw new Error("No copy was created");
  }
  await expectRedirect(() => copying, `/constructs/${copy.id}`);
}

describe("use_case_customize_construct", () => {
  test("customizing a built-in construct makes a copy of her own, and cloning a clone works", async () => {
    const user = await signedInUser();

    const copy = await customize(user, "vellum");
    expect(copy).toMatchObject({
      name: "Vellum (copy)",
      definition: getConstruct("vellum").definition,
    });

    await copyOwn(user, copy.id);
    expect((await listOwnConstructs(user.id)).map(({ name }) => name)).toEqual([
      "Vellum (copy)",
      "Vellum (copy) (copy)",
    ]);
  });
});

describe("use_case_new_construct", () => {
  test("a new construct starts with default instructions, and each Craft construct makes another", async () => {
    const user = await signedInUser();

    const construct = await writeNew(user);
    expect(construct).toMatchObject({
      name: CONSTRUCTS_COPY.newConstructName,
      definition: {
        prompt: getConstruct(DEFAULT_CONSTRUCT_ID).definition.prompt,
      },
      clonedFrom: undefined,
    });
    expect(construct.definition.visual).toBeUndefined();

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
      `/constructs/${construct.id}?saved=1`,
    );
    expect(await chosenConstruct(user.id, construct.id)).toEqual({
      id: construct.id,
      construct: { id: DEFAULT_CONSTRUCT_ID, name: "Pal", definition: parts },
    });
    await copyOwn(user, construct.id);
    expect((await listOwnConstructs(user.id)).at(-1)).toMatchObject({
      name: "Pal (copy)",
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
      `/constructs/${construct.id}?saved=1`,
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
      `/constructs/${construct.id}?saved=1`,
    );
    const saved = await stored(user, construct.id);
    expect(saved.definition.prompt).toBe(prompt);

    const chat = await createChat(user.id, {
      quest: await testData(user).quest(),
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
        ...construct.definition,
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
    `/constructs/${construct.id}?saved=1`,
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

test("Workshop save and reset keep unchanged prompts stored in current built-in wording", async () => {
  const user = await signedInUser();
  const construct = await cloneOf(user, "vellum");
  await expectRedirect(
    () =>
      saveConstructAction(
        constructForm(construct.id, construct.name, construct.definition),
      ),
    `/constructs/${construct.id}?saved=1`,
  );
  const [saved] = await getDb()
    .select({ parts: ownPrompts.parts })
    .from(ownPrompts)
    .where(and(ownPromptOwnedBy(user.id), eq(ownPrompts.id, construct.id)));
  expect(parseConstructDefinition(saved?.parts)?.prompt).toBe(
    getConstruct("vellum").definition.prompt,
  );
  await expectRedirect(
    () =>
      saveConstructAction(
        constructForm(construct.id, construct.name, {
          ...construct.definition,
          prompt: "Edited",
        }),
      ),
    `/constructs/${construct.id}?saved=1`,
  );
  await resetPrompt(construct.id);
  const [reset] = await getDb()
    .select({ parts: ownPrompts.parts })
    .from(ownPrompts)
    .where(and(ownPromptOwnedBy(user.id), eq(ownPrompts.id, construct.id)));
  expect(parseConstructDefinition(reset?.parts)?.prompt).toBe(
    getConstruct("vellum").definition.prompt,
  );
  expect((await stored(user, construct.id)).definition.visual).toEqual(
    construct.definition.visual,
  );
});

test("save and reset retain paid art even when a source lookup returns an older snapshot", async () => {
  const user = await signedInUser();
  const stale = await cloneOf(user, "lumen");
  const generated = await generateConstructVisual(
    user.id,
    {
      constructId: stale.id,
      requestId: crypto.randomUUID(),
      description: stale.definition.visual?.description ?? "",
    },
    {
      generate: async () => ({
        bytes: await sharp({
          create: { width: 32, height: 32, channels: 3, background: "white" },
        })
          .png()
          .toBuffer(),
        mediaType: "image/png",
        costMicroUsd: GENERATED_COST,
      }),
    },
  );
  const asset = generated.visual?.canonical;
  if (asset?.kind !== "generated") {
    throw new Error("No generated art");
  }
  const source = await import("@/constructs/construct-store.ts");
  const read = vi.spyOn(source, "getOwnConstruct").mockResolvedValue(stale);
  try {
    await expectRedirect(
      () =>
        saveConstructAction(
          constructForm(stale.id, stale.name, stale.definition),
        ),
      `/constructs/${stale.id}?saved=1`,
    );
    const reset = form({ constructId: stale.id });
    await resetConstructPromptAction(reset);
    expect(
      await getVisualAsset(
        user.id,
        { kind: "construct", id: stale.id },
        asset.assetId,
      ),
    ).toBeDefined();
  } finally {
    read.mockRestore();
  }
});

test("saving an edited Vellum description regenerates artwork from the saved appearance", async () => {
  const user = await signedInUser();
  const construct = await cloneOf(user, "vellum");
  const description =
    "A silver fox with a blue cloak instead of a brass cartographer.";
  const bytes = await sharp({
    create: { width: 32, height: 32, channels: 3, background: "white" },
  })
    .png()
    .toBuffer();
  const generate = vi.fn<ImageProvider["generate"]>().mockResolvedValue({
    bytes,
    mediaType: "image/png",
    costMicroUsd: GENERATED_COST,
  });
  const provider = vi.mocked(imageProvider).mockReturnValueOnce({ generate });
  try {
    const data = constructForm(
      construct.id,
      construct.name,
      construct.definition,
    );
    data.set("visualDescription", description);
    data.set("visualRequestId", crypto.randomUUID());
    await expectRedirect(
      () => saveConstructAction(data),
      `/constructs/${construct.id}?saved=1`,
    );
    const updated = await stored(user, construct.id);
    expect(updated.definition.visual?.description).toBe(description);
    expect(updated.definition.visual?.canonical?.kind).toBe("generated");
    expect(generate).toHaveBeenCalledTimes(1);
    expect(generate.mock.calls).toEqual([[description]]);
  } finally {
    provider.mockRestore();
  }
});

test.each(["prompt", "name", "unchanged", "normalized"] as const)(
  "a %s-only Save retains paid artwork without requesting or charging generation",
  async (change) => {
    const user = await signedInUser();
    const copy = await cloneOf(user, "vellum");
    const description = copy.definition.visual?.description ?? "";
    const generate = vi.fn<ImageProvider["generate"]>(testArtwork);
    const first = await generateConstructVisual(
      user.id,
      { constructId: copy.id, requestId: crypto.randomUUID(), description },
      { generate },
    );
    const before = await goldSpent(user);
    generate.mockClear();
    const provider = vi.mocked(imageProvider).mockReturnValue({ generate });
    try {
      let { name } = copy;
      let { prompt } = copy.definition;
      let editedDescription = description;
      if (change === "prompt") {
        prompt = "New conversational instructions.";
      }
      if (change === "name") {
        name = "Captain Quill";
      }
      if (change === "normalized") {
        editedDescription = `  ${description}\r\n`;
      }
      const data = constructForm(copy.id, name, { prompt });
      data.set("visualDescription", editedDescription);
      await expectRedirect(
        () => saveConstructAction(data),
        `/constructs/${copy.id}?saved=1`,
      );
      expect(generate).not.toHaveBeenCalled();
      expect(await goldSpent(user)).toBe(before);
      expect(await stored(user, copy.id)).toMatchObject({
        name,
        definition: { prompt, visual: first.visual },
      });
    } finally {
      provider.mockRestore();
    }
  },
);

test("adding a description generates once; unchanged Save is free and explicit Generate intentionally regenerates with replay protection", async () => {
  const user = await signedInUser();
  const copy = await createConstruct(user.id, {
    name: "Private name",
    definition: { prompt: "Private voice and habits." },
  });
  const description = "A silver fox.\nBlue cloak.";
  const generate = vi.fn<ImageProvider["generate"]>(testArtwork);
  const provider = vi.mocked(imageProvider).mockReturnValue({ generate });
  try {
    const data = constructForm(copy.id, copy.name, copy.definition);
    data.set("visualDescription", "  A silver fox.\r\nBlue cloak.  ");
    data.set("visualRequestId", crypto.randomUUID());
    await expectRedirect(
      () => saveConstructAction(data),
      `/constructs/${copy.id}?saved=1`,
    );
    const first = (await stored(user, copy.id)).definition.visual;
    expect(first?.description).toBe(description);
    expect(generate.mock.calls).toEqual([[description]]);
    const firstCost = await goldSpent(user);
    await expectRedirect(
      () => saveConstructAction(data),
      `/constructs/${copy.id}?saved=1`,
    );
    expect(generate).toHaveBeenCalledTimes(1);
    expect(await goldSpent(user)).toBe(firstCost);
    expect((await stored(user, copy.id)).definition.visual).toEqual(first);
    data.set("generateImages", "true");
    data.set("visualRequestId", crypto.randomUUID());
    await expectRedirect(
      () => saveConstructAction(data),
      `/constructs/${copy.id}?saved=1`,
    );
    const replacement = (await stored(user, copy.id)).definition.visual;
    expect(replacement?.canonical).not.toEqual(first?.canonical);
    expect(generate.mock.calls).toEqual([[description], [description]]);
    const replacementCost = await goldSpent(user);
    await expectRedirect(
      () => saveConstructAction(data),
      `/constructs/${copy.id}?saved=1`,
    );
    expect(generate).toHaveBeenCalledTimes(2);
    expect(await goldSpent(user)).toBe(replacementCost);
  } finally {
    provider.mockRestore();
  }
});

test("concurrent Saves of the same changed description generate and spend only once", async () => {
  const user = await signedInUser();
  const copy = await cloneOf(user, "vellum");
  const description = "A silver fox in a blue cloak";
  const generate = vi.fn<ImageProvider["generate"]>(testArtwork);
  const provider = vi.mocked(imageProvider).mockReturnValue({ generate });
  try {
    const forms = Array.from({ length: 2 }, () => {
      const data = constructForm(copy.id, copy.name, copy.definition);
      data.set("visualDescription", description);
      data.set("visualRequestId", crypto.randomUUID());
      return data;
    });
    await Promise.all(
      forms.map((data) =>
        expectRedirect(
          () => saveConstructAction(data),
          `/constructs/${copy.id}?saved=1`,
        ),
      ),
    );
    expect(generate.mock.calls).toEqual([[description]]);
    expect(await goldSpent(user)).toBe(GENERATED_COST);
  } finally {
    provider.mockRestore();
  }
});
