import { describe, expect, it } from "vitest";
import { makeSphinxId, rstInlineToText } from "@/manual/sphinx-id";

describe("makeSphinxId", () => {
  it("lowercases words and joins them with hyphens", () => {
    expect(makeSphinxId("Width Type")).toBe("width-type");
  });

  it("turns label punctuation into hyphens", () => {
    expect(makeSphinxId("bpy.ops.mesh.bevel")).toBe("bpy-ops-mesh-bevel");
    expect(makeSphinxId("Zoom Camera 1:1")).toBe("zoom-camera-1-1");
  });

  it("strips leading digits and hyphens and trailing hyphens", () => {
    expect(makeSphinxId("5 Series | 2025 -- 2027")).toBe("series-2025-2027");
    expect(makeSphinxId("Should I Translate... ?")).toBe("should-i-translate");
  });

  it("transliterates accented letters and digraphs like docutils", () => {
    expect(makeSphinxId("Ångström Øresund")).toBe("angstrom-oresund");
    expect(makeSphinxId("Straße Æther")).toBe("strasze-aether");
  });

  it("returns an empty id when nothing usable is left", () => {
    expect(makeSphinxId("2.80")).toBe("");
  });
});

describe("rstInlineToText", () => {
  it("keeps the text of roles, literals and interpreted text", () => {
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

  it("keeps the explicit title of references", () => {
    expect(rstInlineToText("See :doc:`Bevel </modeling/bevel>`")).toBe(
      "See Bevel",
    );
    expect(rstInlineToText("`Blender <https://www.blender.org>`_")).toBe(
      "Blender",
    );
  });

  it("removes emphasis markers and backslash escapes", () => {
    expect(rstInlineToText("**Strong** and *emphasis*")).toBe(
      "Strong and emphasis",
    );
    expect(rstInlineToText("Should I Translate\\.\\.\\. ?")).toBe(
      "Should I Translate... ?",
    );
  });
});
