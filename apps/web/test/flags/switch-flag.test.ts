import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { saveHiddenFlagsAction } from "@/flags/save-hidden-flags-action.ts";
import { switchFlag } from "@/flags/switch-flag.ts";

const action = vi.hoisted(() => ({
  saveHiddenFlagsAction: vi.fn<typeof saveHiddenFlagsAction>(),
}));
vi.mock("@/flags/save-hidden-flags-action.ts", () => action);

function appliedHide(): string | null {
  return document.documentElement.getAttribute("data-hide");
}

beforeEach(() => {
  document.documentElement.setAttribute("data-hide", "");
  action.saveHiddenFlagsAction.mockResolvedValue();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("switchFlag", () => {
  test("hides an extra at once and saves the whole choice, in the registry's order", () => {
    switchFlag("tool-lines", false);
    switchFlag("working-notes", false);

    expect(appliedHide()).toBe("working-notes tool-lines");
    expect(action.saveHiddenFlagsAction.mock.calls).toEqual([
      [["tool-lines"]],
      [["working-notes", "tool-lines"]],
    ]);
  });

  test("shows a hidden extra again, and saves that too", () => {
    switchFlag("chat-names", false);

    switchFlag("chat-names", true);
    switchFlag("chat-names", true);

    expect(appliedHide()).toBe("");
    expect(action.saveHiddenFlagsAction).toHaveBeenLastCalledWith([]);
  });

  test("still applies when the choice can't be saved", async () => {
    action.saveHiddenFlagsAction.mockRejectedValue(new Error("offline"));

    switchFlag("page-decorations", false);
    await Promise.resolve();

    expect(action.saveHiddenFlagsAction).toHaveBeenCalled();
    expect(appliedHide()).toBe("page-decorations");
  });
});
