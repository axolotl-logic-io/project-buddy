import { describe, expect, test } from "vitest";
import { applySectionEdit, EDIT, emptySection } from "@/journal/journal.ts";
import { preferenceCommand } from "@/journal/preference-commands.ts";

function edit(input: unknown): ReturnType<typeof EDIT.parse> {
  return EDIT.parse(input);
}

describe("typed Journal editing", () => {
  test("adds, changes, reorders and removes by stable preference number", () => {
    const added = applySectionEdit(
      emptySection("preferences"),
      edit({
        kind: "preferences",
        operations: [
          { op: "add", text: "Keyboard" },
          { op: "add", text: "Examples" },
        ],
      }),
    );
    expect(added).toBeDefined();
    if (added === undefined) {
      throw new Error("No preferences");
    }
    const changed = applySectionEdit(
      added,
      edit({
        kind: "preferences",
        operations: [
          { op: "change", preference: 1, text: "Shortcuts" },
          { op: "move", preference: 2, before: 1 },
        ],
      }),
    );
    expect(changed).toEqual({
      kind: "preferences",
      items: [
        { number: 2, text: "Examples" },
        { number: 1, text: "Shortcuts" },
      ],
      nextNumber: 3,
    });
    expect(
      applySectionEdit(
        added,
        edit({
          kind: "preferences",
          operations: [
            { op: "remove", preference: 1 },
            { op: "add", text: "Brief replies" },
          ],
        }),
      ),
    ).toEqual({
      kind: "preferences",
      items: [
        { number: 2, text: "Examples" },
        { number: 3, text: "Brief replies" },
      ],
      nextNumber: 4,
    });
  });
  test("rejects the whole batch when a named preference is missing", () => {
    const empty = emptySection("preferences");
    expect(
      applySectionEdit(
        empty,
        edit({
          kind: "preferences",
          operations: [
            { op: "add", text: "Examples" },
            { op: "remove", preference: 9 },
          ],
        }),
      ),
    ).toBeUndefined();
    expect(empty).toEqual({ kind: "preferences", items: [], nextNumber: 1 });
  });
  test("validates goal and preference limits at the shared boundary", () => {
    expect(
      EDIT.safeParse({
        kind: "preferences",
        operations: [{ op: "add", text: "\n" }],
      }).success,
    ).toBe(false);
    expect(
      applySectionEdit(
        emptySection("goal"),
        edit({ kind: "goal", text: "  Learn shading  " }),
      ),
    ).toEqual({ kind: "goal", text: "Learn shading" });
  });
  test("preference commands preserve text and reject malformed destinations", () => {
    expect(preferenceCommand("/prefer Keyboard shortcuts")).toMatchObject({
      kind: "edit",
      edit: { operations: [{ op: "add", text: "Keyboard shortcuts" }] },
    });
    expect(preferenceCommand("/move-preference 1 nonsense")).toEqual({
      kind: "invalid",
    });
    expect(preferenceCommand("/preferences")).toEqual({ kind: "show" });
    expect(preferenceCommand("/plan")).toBeUndefined();
  });
});
