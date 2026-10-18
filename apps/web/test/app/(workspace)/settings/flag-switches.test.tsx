import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { FlagSwitches } from "@/app/(workspace)/settings/flag-switches.tsx";
import { FLAGS } from "@/flags/flags.ts";
import type { saveHiddenFlagsAction } from "@/flags/save-hidden-flags-action.ts";
import { FLAG_COPY } from "@/ui/copy/settings.ts";

function flagSwitch(label: string): HTMLElement {
  return screen.getByRole("switch", { name: label });
}

function appliedHide(): string | null {
  return document.documentElement.getAttribute("data-hide");
}

const action = vi.hoisted(() => ({
  saveHiddenFlagsAction: vi.fn<typeof saveHiddenFlagsAction>(),
}));
vi.mock("@/flags/save-hidden-flags-action.ts", () => action);

beforeEach(() => {
  action.saveHiddenFlagsAction.mockResolvedValue();
});

afterEach(() => {
  document.documentElement.removeAttribute("data-hide");
  vi.clearAllMocks();
});

describe("FlagSwitches", () => {
  test("offers one switch per extra, labelled and described, in the registry's order", () => {
    render(<FlagSwitches />);

    expect(screen.getAllByRole("switch")).toHaveLength(FLAGS.length);
    for (const { copyKey } of FLAGS) {
      const { label, hint } = FLAG_COPY[copyKey];
      expect(flagSwitch(label)).toHaveAccessibleDescription(hint);
    }
    expect(screen.getAllByRole("switch")[0]).toHaveAccessibleName(
      FLAG_COPY.workingNotes.label,
    );
  });

  test("shows every extra as on until she hides one", () => {
    render(<FlagSwitches />);

    for (const element of screen.getAllByRole("switch")) {
      expect(element).toBeChecked();
    }
  });

  test("shows the extras the page hides as off", async () => {
    document.documentElement.setAttribute("data-hide", "tool-lines");

    render(<FlagSwitches />);

    await waitFor(() => {
      expect(flagSwitch(FLAG_COPY.toolLines.label)).not.toBeChecked();
    });
    expect(flagSwitch(FLAG_COPY.workingNotes.label)).toBeChecked();
  });

  test("hides an extra at once when she switches it off, and shows it when she switches it back on", async () => {
    render(<FlagSwitches />);
    const workingNotes = flagSwitch(FLAG_COPY.workingNotes.label);

    fireEvent.click(workingNotes);
    await waitFor(() => {
      expect(workingNotes).not.toBeChecked();
    });
    expect(appliedHide()).toBe("working-notes");

    fireEvent.click(workingNotes);
    await waitFor(() => {
      expect(workingNotes).toBeChecked();
    });
    expect(appliedHide()).toBe("");
  });

  test("switches when she clicks the label's words too", async () => {
    render(<FlagSwitches />);

    fireEvent.click(screen.getByText(FLAG_COPY.chatNames.hint));

    await waitFor(() => {
      expect(flagSwitch(FLAG_COPY.chatNames.label)).not.toBeChecked();
    });
    expect(appliedHide()).toBe("chat-names");
  });
});

describe("FlagSwitches saving", () => {
  test("saves each switch's choice to her account", async () => {
    render(<FlagSwitches />);
    const toolLines = flagSwitch(FLAG_COPY.toolLines.label);

    fireEvent.click(toolLines);
    await waitFor(() => {
      expect(action.saveHiddenFlagsAction).toHaveBeenLastCalledWith([
        "tool-lines",
      ]);
    });
    fireEvent.click(toolLines);
    await waitFor(() => {
      expect(action.saveHiddenFlagsAction).toHaveBeenLastCalledWith([]);
    });
  });
});
