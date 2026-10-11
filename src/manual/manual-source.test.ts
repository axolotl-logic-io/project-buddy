import { describe, expect, test } from "vitest";
import { isManualPage, manualUrl } from "@/manual/manual-source.ts";

describe("isManualPage", () => {
  test("accepts the RST files under manual/, at any depth", () => {
    expect(isManualPage("manual/index.rst")).toBe(true);
    expect(isManualPage("manual/modeling/meshes/editing/edge/bevel.rst")).toBe(
      true,
    );
  });

  test("rejects other files under manual/ and RST files outside it", () => {
    expect(isManualPage("manual/conf.py")).toBe(false);
    expect(isManualPage("manual/index.rst.orig")).toBe(false);
    expect(isManualPage("README.rst")).toBe(false);
    expect(isManualPage("tools/manual/index.rst")).toBe(false);
  });
});

describe("manualUrl", () => {
  test("builds the latest manual URL for a page", () => {
    expect(
      manualUrl("manual/modeling/meshes/editing/edge/bevel.rst", "usage"),
    ).toBe(
      "https://docs.blender.org/manual/en/latest/modeling/meshes/editing/edge/bevel.html#usage",
    );
  });
});
