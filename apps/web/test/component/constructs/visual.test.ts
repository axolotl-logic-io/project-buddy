import { expect, test } from "vitest";
import { getActivity } from "@/activities/index.ts";
import { preparedOpening } from "@/activities/prepared-openings.ts";
import {
  parseConstructDefinition,
  storedConstructPrompt,
} from "@/constructs/construct-definition.ts";
import { getConstruct, snapshotOf } from "@/constructs/index.ts";
import {
  CONSTRUCT_VISUAL,
  constructVisualSource,
  resolveConstructVisual,
} from "@/constructs/visual.ts";
import {
  currentConstructText,
  earlierConstructText,
} from "@/prompts/earlier-built-in-texts.ts";

const GENERATED = {
  version: 1,
  description: "A paper bird with folded wings",
  canonical: {
    kind: "generated",
    assetId: "fd6f3060-f92a-447f-af44-a0fef80582a9",
  },
} as const;

test("own constructs with compatibility ids and built-in names keep their own identity", () => {
  const custom = {
    id: "vellum",
    name: "Vellum",
    definition: { prompt: "Own prompt" },
  };
  expect(resolveConstructVisual(custom, "avatar")).toMatchObject({
    asset: undefined,
    initials: "V",
  });
  expect(
    constructVisualSource(resolveConstructVisual(custom, "avatar").asset),
  ).toBeUndefined();
});

const MAX_FACE_FRACTION = 0.4;

test("built-in face framing differs from the complete portrait", () => {
  for (const id of ["lumen", "vellum"] as const) {
    const construct = getConstruct(id);
    const avatar = resolveConstructVisual(construct, "avatar");
    expect(avatar.frame.size).toBeLessThan(MAX_FACE_FRACTION);
    expect(resolveConstructVisual(construct, "portrait").frame.size).toBe(1);
    expect(resolveConstructVisual(construct, "working").asset).toEqual(
      avatar.asset,
    );
    expect(constructVisualSource(avatar.asset)).toBe(
      `/constructs/${id}-v1.png`,
    );
  }
});

test("visual edits survive storage compatibility without changing prepared openings", () => {
  const builtIn = getConstruct("lumen");
  const definition = { ...builtIn.definition, visual: GENERATED };
  const stored = storedConstructPrompt(earlierConstructText(definition));
  const parsed = parseConstructDefinition(JSON.parse(JSON.stringify(stored)));
  expect(parsed).toBeDefined();
  if (parsed === undefined) {
    throw new Error("Stored construct was lost");
  }
  const restored = currentConstructText(parsed);
  expect(restored).toEqual(definition);
  expect(preparedOpening(restored, getActivity("open-chat").definition)).toBe(
    preparedOpening(builtIn.definition, getActivity("open-chat").definition),
  );
  expect(
    snapshotOf({ name: "Bird", definition: restored }).definition.visual,
  ).toEqual(GENERATED);
});

test("unsafe or future visual metadata falls back without losing conversational text", () => {
  expect(
    CONSTRUCT_VISUAL.safeParse({
      ...GENERATED,
      canonical: {
        kind: "generated",
        assetId: "https://private.example/image",
      },
    }).success,
  ).toBe(false);
  expect(
    parseConstructDefinition({
      voice: "Hello",
      habits: "",
      visual: { version: 2 },
    }),
  ).toMatchObject({ prompt: "Hello", visual: undefined });
  expect(constructVisualSource(GENERATED.canonical)).toBeUndefined();
});

test("a working variant is optional and framing is bounded", () => {
  const working = { kind: "built-in", artwork: "lumen-v1" } as const;
  const construct = {
    name: "Paper Bird",
    definition: { prompt: "Bird", visual: { ...GENERATED, working } },
  };
  expect(resolveConstructVisual(construct, "working").asset).toEqual(working);
  expect(resolveConstructVisual(construct, "opening").asset).toEqual(
    GENERATED.canonical,
  );
  expect(
    CONSTRUCT_VISUAL.safeParse({
      ...GENERATED,
      frames: { avatar: { x: 2, y: 0, size: 0 } },
    }).success,
  ).toBe(false);
});

test("generated delivery URLs require an explicit valid destination", () => {
  const id = "7ba39f1d-8bdc-4bbb-9191-3f535fe6058e";
  expect(constructVisualSource(GENERATED.canonical)).toBeUndefined();
  expect(
    constructVisualSource(GENERATED.canonical, { kind: "adventure", id }),
  ).toBe(
    `/api/constructs/visuals/adventure/${id}/${GENERATED.canonical.assetId}`,
  );
  expect(
    constructVisualSource(GENERATED.canonical, {
      kind: "construct",
      id: "../../private",
    }),
  ).toBeUndefined();
});
