// Her constructs, from the constructs pages' forms, in the test database with the
// mock construct: what customizing, crafting, cloning, saving and
// resetting keep, and the built-in constructs that no form changes.

import sharp from "sharp";
import { expect, test, vi } from "vitest";
import type { User } from "@/accounts/users-store.ts";
import {
  cloneConstructAction,
  editBuiltInConstructAction,
  newConstructAction,
  saveConstructAction,
} from "@/app/(workspace)/constructs/actions.ts";
import {
  cloneConstruct,
  createConstruct,
  getOwnConstruct,
  listConstructs as listOwnConstructs,
  type OwnConstruct,
} from "@/constructs/construct-store.ts";
import { type ConstructDefinition, getConstruct } from "@/constructs/index.ts";
import { getVisualAsset } from "@/constructs/visual-asset-store.ts";
import { generateConstructVisual } from "@/constructs/visual-generation.ts";
import {
  type GeneratedImage,
  type ImageProvider,
  imageProvider,
} from "@/images/image-provider.ts";
import { CONSTRUCTS_COPY } from "@/ui/copy/constructs.ts";
import { goldSpent } from "../../support/test-database/gold-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
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
const TOO_LONG_VISUAL_DESCRIPTION = 4001;
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

test("use_case_customize_construct", async () => {
  const user = await signedInUser();
  const copy = await customize(user, "lumen");
  expect(copy.name).toContain(getConstruct("lumen").name);
  expect(copy.definition.visual).toEqual(LUMEN.visual);
  await copyOwn(user, copy.id);
  expect(await listOwnConstructs(user.id)).toHaveLength(2);
});

test("use_case_new_construct", async () => {
  const user = await signedInUser();
  const first = await writeNew(user);
  const second = await writeNew(user);
  expect(first.id).not.toBe(second.id);
  expect(first.name).toBe(CONSTRUCTS_COPY.newConstructName);
  expect(first.definition.visual).toBeUndefined();
});

test("use_case_edit_construct", async () => {
  const user = await signedInUser();
  const copy = await cloneOf(user, "lumen");
  const data = form({
    constructId: copy.id,
    name: "My light",
    visualDescription: "A blue lantern.",
  });
  data.set("prompt", "Forged instructions must not be saved.");
  await expectRedirect(
    () => saveConstructAction(data),
    `/constructs/${copy.id}?saved=1`,
  );
  const edited = await stored(user, copy.id);
  expect(edited.name).toBe("My light");
  expect(edited.definition.visual?.description).toBe("A blue lantern.");
  expect(edited.definition.prompt).toBe(copy.definition.prompt);
  const other = await signedInUser();
  await expectNotFound(() => saveConstructAction(data));
  expect(await getOwnConstruct(other.id, copy.id)).toBeUndefined();
});

test("use_case_customize_built_in_construct", async () => {
  await signedInUser();
  await expectNotFound(() =>
    saveConstructAction(
      form({
        constructId: "lumen",
        name: "Changed",
        visualDescription: "A lantern.",
      }),
    ),
  );
  expect(getConstruct("lumen").name).toBe("Lumen");
});

test("saving a Visual description retains trusted art, ignores submitted assets and preserves visuals", async () => {
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
  expect((await stored(user, construct.id)).definition.visual).toEqual(
    expected,
  );
  data.set("visualDescription", "x".repeat(TOO_LONG_VISUAL_DESCRIPTION));
  await expectNotFound(() => saveConstructAction(data));
  expect((await stored(user, construct.id)).definition.visual).toEqual(
    expected,
  );
});

test("saving retains paid art even when a source lookup returns an older snapshot", async () => {
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

test("saving a visual description keeps artwork and spends no batteries", async () => {
  const user = await signedInUser();
  const construct = await cloneOf(user, "vellum");
  const before = await goldSpent(user);
  const description = "A silver fox with a blue cloak.";
  const generate = vi.fn<ImageProvider["generate"]>(testArtwork);
  const provider = vi.mocked(imageProvider).mockReturnValue({ generate });
  try {
    const data = constructForm(
      construct.id,
      construct.name,
      construct.definition,
    );
    data.set("visualDescription", description);
    // Older clients cannot request generation through Save either.
    data.set("generateImages", "true");
    data.set("visualRequestId", crypto.randomUUID());
    await expectRedirect(
      () => saveConstructAction(data),
      `/constructs/${construct.id}?saved=1`,
    );
    const updated = await stored(user, construct.id);
    expect(updated.definition.visual?.description).toBe(description);
    expect(updated.definition.visual?.canonical).toEqual(
      construct.definition.visual?.canonical,
    );
    expect(generate).not.toHaveBeenCalled();
    expect(await goldSpent(user)).toBe(before);
  } finally {
    provider.mockRestore();
  }
});

test.each(["name", "unchanged", "normalized"] as const)(
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
      const { prompt } = copy.definition;
      let editedDescription = description;
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

test("adding a first visual description saves text without generating artwork", async () => {
  const user = await signedInUser();
  const copy = await createConstruct(user.id, {
    name: "Private name",
    definition: { prompt: "Private voice and habits." },
  });
  const before = await goldSpent(user);
  const data = constructForm(copy.id, copy.name, copy.definition);
  data.set("visualDescription", "  A silver fox.\r\nBlue cloak.  ");
  await expectRedirect(
    () => saveConstructAction(data),
    `/constructs/${copy.id}?saved=1`,
  );
  expect((await stored(user, copy.id)).definition.visual).toEqual({
    version: 1,
    description: "A silver fox.\nBlue cloak.",
  });
  expect(await goldSpent(user)).toBe(before);
});
