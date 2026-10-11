import { describe, expect, test } from "vitest";
import { applyMemoryEdit } from "@/memory/memory-edit.ts";

const MEMORY = "# Goals\n\n- Model a fox\n- Rig it\n";

describe("applyMemoryEdit", () => {
  test("replaces the one occurrence of oldText with newText", () => {
    expect(
      applyMemoryEdit(MEMORY, {
        oldText: "- Model a fox",
        newText: "- Model a fox (done)",
      }),
    ).toEqual({
      kind: "edited",
      text: "# Goals\n\n- Model a fox (done)\n- Rig it\n",
    });
  });

  test("inserts newText literally, with no replacement patterns", () => {
    expect(
      applyMemoryEdit("cost: 5", { oldText: "5", newText: "$& and $1" }),
    ).toEqual({ kind: "edited", text: "cost: $& and $1" });
  });

  test("deletes oldText when newText is empty", () => {
    expect(
      applyMemoryEdit(MEMORY, { oldText: "- Rig it\n", newText: "" }),
    ).toEqual({ kind: "edited", text: "# Goals\n\n- Model a fox\n" });
  });

  test("adds newText as a new paragraph when oldText is empty", () => {
    expect(
      applyMemoryEdit(MEMORY, { oldText: "", newText: "Prefers shortcuts." }),
    ).toEqual({
      kind: "edited",
      text: "# Goals\n\n- Model a fox\n- Rig it\n\nPrefers shortcuts.",
    });
  });

  test("makes newText the whole text of an empty memory", () => {
    expect(applyMemoryEdit("", { oldText: "", newText: "# Goals" })).toEqual({
      kind: "edited",
      text: "# Goals",
    });
  });

  test("fails when oldText is missing or occurs more than once", () => {
    expect(
      applyMemoryEdit(MEMORY, { oldText: "Texture it", newText: "x" }),
    ).toEqual({ kind: "failed", reason: "missing" });
    expect(applyMemoryEdit(MEMORY, { oldText: "- ", newText: "* " })).toEqual({
      kind: "failed",
      reason: "ambiguous",
    });
  });

  test("fails when the edit would change nothing", () => {
    expect(
      applyMemoryEdit(MEMORY, { oldText: "Rig it", newText: "Rig it" }),
    ).toEqual({ kind: "failed", reason: "unchanged" });
    expect(applyMemoryEdit(MEMORY, { oldText: "", newText: "" })).toEqual({
      kind: "failed",
      reason: "unchanged",
    });
  });
});
