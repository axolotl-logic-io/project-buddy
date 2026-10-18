import { describe, expect, test } from "vitest";
import { makeSphinxId, rstInlineToText } from "@/manual/sphinx-id.ts";

describe("makeSphinxId", () => {
  test("lowercases words and joins them with hyphens", () => {
    expect(makeSphinxId("Width Type")).toBe("width-type");
  });

  test("turns label punctuation into hyphens", () => {
    expect(makeSphinxId("bpy.ops.mesh.bevel")).toBe("bpy-ops-mesh-bevel");
    expect(makeSphinxId("Zoom Camera 1:1")).toBe("zoom-camera-1-1");
  });

  test("strips leading digits and hyphens and trailing hyphens", () => {
    expect(makeSphinxId("5 Series | 2025 -- 2027")).toBe("series-2025-2027");
    expect(makeSphinxId("Should I Translate... ?")).toBe("should-i-translate");
  });

  test("transliterates accented letters and digraphs like docutils", () => {
    expect(makeSphinxId("Ångström Øresund")).toBe("angstrom-oresund");
    expect(makeSphinxId("Straße Æther")).toBe("strasze-aether");
  });

  test("returns an empty id when nothing usable is left", () => {
    expect(makeSphinxId("2.80")).toBe("");
  });
});

describe("plain text of inline RST markup", () => {
  test("keeps the text of roles, literals and interpreted text", () => {
    expect(rstInlineToText("Thin Film :guilabel:`Cycles Only`")).toBe(
      "Thin Film Cycles Only",
    );
    expect(rstInlineToText("Subcommand: ``validate``")).toBe(
      "Subcommand: validate",
    );
    expect(
      rstInlineToText("Asset System Files (`.asset.blend` Extension)"),
    ).toBe("Asset System Files (.asset.blend Extension)");
  });

  test("keeps the explicit title of references", () => {
    expect(rstInlineToText("See :doc:`Bevel </modeling/bevel>`")).toBe(
      "See Bevel",
    );
    expect(rstInlineToText("`Blender <https://www.blender.org>`_")).toBe(
      "Blender",
    );
  });

  test("removes emphasis markers and backslash escapes", () => {
    expect(rstInlineToText("**Strong** and *emphasis*")).toBe(
      "Strong and emphasis",
    );
    expect(rstInlineToText("Should I Translate\\.\\.\\. ?")).toBe(
      "Should I Translate... ?",
    );
  });
});
