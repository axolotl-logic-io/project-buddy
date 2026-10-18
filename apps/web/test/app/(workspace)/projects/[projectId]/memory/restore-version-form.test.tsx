import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { restoreMemoryAction } from "@/app/(workspace)/projects/[projectId]/memory/actions.ts";
import { RestoreVersionForm } from "@/app/(workspace)/projects/[projectId]/memory/restore-version-form.tsx";
import { MEMORY_VERSION_NUMBER } from "@/memory/memory.ts";
import { MEMORY_COPY } from "@/ui/copy/memory.ts";
import { FOX_PROJECT } from "../../../page-fixtures.ts";

const actions = vi.hoisted(() => ({
  restoreMemoryAction: vi.fn<typeof restoreMemoryAction>(),
}));
vi.mock(
  "@/app/(workspace)/projects/[projectId]/memory/actions.ts",
  () => actions,
);

const FIRST_VERSION = 1;
const THIRD_VERSION = 3;
const FIRST = MEMORY_VERSION_NUMBER.parse(FIRST_VERSION);
const THIRD = MEMORY_VERSION_NUMBER.parse(THIRD_VERSION);

function renderForm(): void {
  render(
    <RestoreVersionForm
      basedOn={THIRD}
      projectId={FOX_PROJECT.id}
      version={FIRST}
    />,
  );
}

// Presses the version's restore button, which asks before restoring.
function askToRestore(): HTMLElement {
  fireEvent.click(
    screen.getByRole("button", { name: MEMORY_COPY.restore(FIRST) }),
  );
  return screen.getByRole("alertdialog", {
    name: MEMORY_COPY.restoreTitle(FIRST),
  });
}

function confirm(dialog: HTMLElement): void {
  fireEvent.click(
    within(dialog).getByRole("button", { name: MEMORY_COPY.restore(FIRST) }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  actions.restoreMemoryAction.mockResolvedValue({ kind: "saved" });
});

describe("use_case_undo_memory_change", () => {
  test("restores the version once she confirms, based on the newest", async () => {
    renderForm();

    confirm(askToRestore());

    await vi.waitFor(() => {
      expect(actions.restoreMemoryAction).toHaveBeenCalledTimes(1);
    });
    const [, sent] = actions.restoreMemoryAction.mock.lastCall ?? [];
    expect(Object.fromEntries(sent ?? new FormData())).toEqual({
      projectId: FOX_PROJECT.id,
      version: String(FIRST),
      basedOn: String(THIRD),
    });
  });

  test("restores nothing when she cancels", () => {
    renderForm();
    askToRestore();

    fireEvent.click(
      screen.getByRole("button", { name: MEMORY_COPY.restoreCancel }),
    );

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(actions.restoreMemoryAction).not.toHaveBeenCalled();
  });

  test("says when a newer version refused the restore", async () => {
    actions.restoreMemoryAction.mockResolvedValue({ kind: "outdated" });
    renderForm();

    confirm(askToRestore());

    expect(await screen.findByRole("alert")).toHaveTextContent(
      MEMORY_COPY.restoreOutdated,
    );
  });
});
