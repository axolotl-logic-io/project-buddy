import { describe, expect, it } from "vitest";
import { splitRstSections } from "@/manual/split-rst";

const bevelPage = `.. _bpy.ops.mesh.bevel:
.. _tool-mesh-bevel:
.. This page is copied into another page.

*****
Bevel
*****

The *Bevel* tool smooths out corners and edges.


Usage
=====

Press :kbd:\`Ctrl-B\`.

.. _bpy.ops.mesh.bevel.width:

Width Type :kbd:\`M\`
   The meaning of the *Width* setting.
`;

describe("splitRstSections", () => {
  it("starts a section at every heading, with or without an overline", () => {
    expect(splitRstSections(bevelPage)).toEqual([
      {
        title: "Bevel",
        anchor: "bevel",
        text: "The *Bevel* tool smooths out corners and edges.",
      },
      {
        title: "Usage",
        anchor: "usage",
        text: "Press :kbd:`Ctrl-B`.\n\nWidth Type :kbd:`M`\n   The meaning of the *Width* setting.",
      },
    ]);
  });

  it("derives the anchor from the heading's plain text", () => {
    const [section] = splitRstSections(
      "Thin Film :guilabel:`Cycles Only`\n=================================\n\nText.\n",
    );

    expect(section).toMatchObject({
      title: "Thin Film Cycles Only",
      anchor: "thin-film-cycles-only",
    });
  });

  it("anchors a repeated heading at its label when it has one", () => {
    const rst = [
      "Page",
      "====",
      "",
      "Options",
      "-------",
      "",
      "First.",
      "",
      ".. _second-options:",
      ".. index:: Options",
      "",
      "Options",
      "-------",
      "",
      "Second.",
      "",
      ".. _figure-label:",
      "",
      ".. figure:: /images/third.png",
      "",
      "   A caption.",
      "",
      "Options",
      "-------",
      "",
    ].join("\n");

    expect(splitRstSections(rst).map((section) => section.anchor)).toEqual([
      "page",
      "options",
      "second-options",
      "page",
    ]);
  });

  // Sphinx numbers such sections id1, id2, ... from a counter shared with
  // other generated ids, so the number cannot be predicted from the heading.
  it("anchors a repeated heading without a label at its parent heading", () => {
    const rst = [
      "Page",
      "====",
      "",
      "Options",
      "-------",
      "",
      "Smart Project",
      "=============",
      "",
      "Options",
      "-------",
      "",
      "Detail",
      "^^^^^^",
      "",
      "Options",
      "~~~~~~~",
      "",
    ].join("\n");

    expect(splitRstSections(rst).map((section) => section.anchor)).toEqual([
      "page",
      "options",
      "smart-project",
      "smart-project",
      "detail",
      "detail",
    ]);
  });

  it("drops the text of icon roles from headings", () => {
    const [section] = splitRstSections(
      ":bl-icon:`shading_wire` -- Wireframe\n====================================\n",
    );

    expect(section?.anchor).toBe("wireframe");
  });

  it("ignores underline-like lines in tables, transitions and indented blocks", () => {
    const rst = [
      "Title",
      "=====",
      "",
      "+-----+-----+",
      "| A   | B   |",
      "+=====+=====+",
      "",
      "=====  =====",
      "Key    Value",
      "=====  =====",
      "",
      "----------",
      "",
      ".. code-block:: rst",
      "",
      "   Example",
      "   =======",
      "",
      "Too short",
      "===",
      "",
    ].join("\n");

    expect(splitRstSections(rst).map((section) => section.title)).toEqual([
      "Title",
    ]);
  });

  it("returns no sections for a file without headings", () => {
    expect(splitRstSections(":orphan:\n\nJust text.\n")).toEqual([]);
  });
});
