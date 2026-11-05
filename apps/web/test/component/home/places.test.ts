/// <reference types="vite/client" />
// The map's trails are drawn from each place's point in places.ts, and
// page-roles.css sets each marker at a point of its own. They must agree, or
// the trails miss the markers.
import { describe, expect, test } from "vitest";
import { ATLAS_PLACES, placeOf } from "@/home/places.ts";

const { "./page-roles.css": ROLES = "" } = import.meta.glob<string>(
  "./page-roles.css",
  { base: "/src/app", query: "?raw", import: "default", eager: true },
);

function markerPoint(id: string): { x: number; y: number } | undefined {
  const rule = new RegExp(
    `\\.atlas-place\\[data-place="${id}"\\] \\{\\s*inset-inline-start: (?<x>[\\d.]+)%;\\s*inset-block-start: (?<y>[\\d.]+)%;`,
    "u",
  ).exec(ROLES);
  if (rule?.groups === undefined) {
    return undefined;
  }
  const { x, y } = rule.groups;
  return { x: Number(x), y: Number(y) };
}

describe("the atlas map", () => {
  test("keeps spell pages under Workshop in the HUD", () => {
    expect(placeOf(["spellbook"])?.name).toBe("Workshop");
    expect(placeOf(["spellbook", "a-spell"])?.href).toBe("/workshop");
    expect(placeOf(["settings"])).toBeUndefined();
  });

  test.each(ATLAS_PLACES)(
    "places $name's marker where its trails meet",
    ({ id, at }) => {
      expect(markerPoint(id)).toEqual(at);
    },
  );
});
