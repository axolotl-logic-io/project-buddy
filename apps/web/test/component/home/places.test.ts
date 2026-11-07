/// <reference types="vite/client" />
import { describe, expect, test } from "vitest";
import { placeOf } from "@/home/places.ts";

describe("the atlas map", () => {
  test("keeps spell pages under Workshop in the HUD", () => {
    expect(placeOf(["spellbook"])?.name).toBe("Workshop");
    expect(placeOf(["spellbook", "a-spell"])?.href).toBe("/workshop");
    expect(placeOf(["settings"])).toBeUndefined();
  });
});
