import { expect, test } from "vitest";
import { getConstruct } from "@/constructs/index.ts";
import { resolveConstructVisual } from "@/constructs/visual.ts";

const BUILT_IN = {
  version: 1,
  description: "A paper bird with folded wings",
  canonical: { kind: "built-in", artwork: "lumen" },
} as const;

test("built-in constructs use the complete inline drawing in every role", () => {
  for (const id of ["lumen", "vellum"] as const) {
    const construct = getConstruct(id);
    for (const role of ["avatar", "portrait", "opening", "working"] as const) {
      const visual = resolveConstructVisual(construct, role);
      expect(visual.asset).toEqual({ kind: "built-in", artwork: id });
      expect(visual.frame).toEqual({ x: 0.5, y: 0.5, size: 1 });
    }
  }
});

test("a frame applies to its role", () => {
  const frame = { x: 0.5, y: 0.45, size: 0.35 };
  const lumen = getConstruct("lumen");
  const construct = {
    ...lumen,
    definition: { visual: { ...BUILT_IN, frames: { avatar: frame } } },
  };
  expect(resolveConstructVisual(construct, "avatar").frame).toEqual(frame);
});

test("a working variant applies only to the working role", () => {
  const working = { kind: "built-in", artwork: "vellum" } as const;
  const construct = {
    ...getConstruct("lumen"),
    definition: { visual: { ...BUILT_IN, working } },
  };
  expect(resolveConstructVisual(construct, "working").asset).toEqual(working);
  expect(resolveConstructVisual(construct, "opening").asset).toEqual(
    BUILT_IN.canonical,
  );
});
