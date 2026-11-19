import { expect, test } from "vitest";
import { parseConstructDefinition } from "@/constructs/construct-definition.ts";
import { getConstruct, snapshotOf } from "@/constructs/index.ts";
import {
  CONSTRUCT_VISUAL,
  constructVisualSource,
  resolveConstructVisual,
} from "@/constructs/visual.ts";

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

test("new snapshots use the complete inline drawing in every role", () => {
  for (const id of ["lumen", "vellum"] as const) {
    const construct = snapshotOf(getConstruct(id));
    for (const role of ["avatar", "portrait", "opening", "working"] as const) {
      const visual = resolveConstructVisual(construct, role);
      expect(visual.asset).toEqual({ kind: "built-in", artwork: `${id}-v2` });
      expect(visual.frame).toEqual({ x: 0.5, y: 0.5, size: 1 });
      expect(constructVisualSource(visual.asset)).toBeUndefined();
    }
  }
});

test("saved raster artwork keeps its source and face frame", () => {
  const frame = { x: 0.5, y: 0.45, size: 0.35 };
  const snapshot = {
    name: "Lumen",
    definition: parseConstructDefinition({
      prompt: "An earlier conversation",
      visual: {
        version: 1,
        description: "An arcane light",
        canonical: { kind: "built-in", artwork: "lumen-v1" },
        frames: { avatar: frame },
      },
    }) ?? { prompt: "" },
  };
  const visual = resolveConstructVisual(snapshot, "avatar");
  expect(visual.frame).toEqual(frame);
  expect(constructVisualSource(visual.asset)).toBe("/constructs/lumen-v1.png");
});

test("unsafe or future visual metadata falls back without losing conversational text", () => {
  expect(
    CONSTRUCT_VISUAL.safeParse({ ...GENERATED, description: "" }).success,
  ).toBe(false);
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
