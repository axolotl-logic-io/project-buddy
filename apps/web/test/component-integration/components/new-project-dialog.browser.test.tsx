import { afterEach, describe, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import type { createProjectAction } from "@/app/(workspace)/projects/actions.ts";
import { NewProjectDialog } from "@/components/new-project-dialog.tsx";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";
import { tabForward } from "./keyboard-test-kit.ts";

const actions = vi.hoisted(() => ({
  createProjectAction: vi.fn<typeof createProjectAction>(),
}));
vi.mock("@/app/(workspace)/projects/actions.ts", () => actions);

async function renderDialog(): Promise<void> {
  await render(<NewProjectDialog />);
}

function newProjectButton(): ReturnType<typeof page.getByRole> {
  return page.getByRole("button", {
    name: PROJECTS_COPY.newHeading,
    exact: true,
  });
}

function dialog(): ReturnType<typeof page.getByRole> {
  return page.getByRole("dialog", {
    name: PROJECTS_COPY.newHeading,
    exact: true,
  });
}

// Whether the focused element is inside the open dialog.
function focusInDialog(): boolean {
  return dialog().element().contains(document.activeElement);
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("use_case_view_projects", () => {
  test("the page shows a New project button, not the form", async () => {
    await renderDialog();

    await expect.element(newProjectButton()).toBeVisible();
    await expect
      .element(newProjectButton())
      .toHaveAttribute("aria-haspopup", "dialog");
    await expect.element(dialog()).not.toBeInTheDocument();
    await expect
      .element(
        dialog().getByRole("button", {
          name: PROJECTS_COPY.create,
          exact: true,
        }),
      )
      .not.toBeInTheDocument();
  });

  test("the button opens a named dialog with the Construct and Why fields", async () => {
    await renderDialog();

    await newProjectButton().click();

    await expect.element(dialog()).toBeVisible();
    expect(focusInDialog()).toBe(true);
    await expect
      .element(page.getByRole("group", { name: "Construct" }))
      .toBeVisible();
    await expect
      .element(page.getByRole("textbox", { name: PROJECTS_COPY.nameLabel }))
      .not.toBeInTheDocument();
    await expect
      .element(page.getByRole("textbox", { name: PROJECTS_COPY.whyLabel }))
      .toBeVisible();
    await expect
      .element(page.getByRole("button", { name: "Choose construct" }))
      .not.toBeInTheDocument();
    await expect
      .element(
        dialog().getByRole("button", {
          name: PROJECTS_COPY.create,
          exact: true,
        }),
      )
      .toBeVisible();
  });

  test("the keyboard stays in the dialog", async () => {
    await renderDialog();
    await newProjectButton().click();
    await expect.element(dialog()).toBeVisible();

    dialog()
      .getByRole("button", { name: PROJECTS_COPY.create, exact: true })
      .element()
      .focus();
    await tabForward();

    // Chromium wraps round to the first control; WebKit's Option+Tab keeps
    // focus where it was. Either way it stays in the dialog.
    expect(focusInDialog()).toBe(true);
  });

  test("Escape closes the dialog and gives focus back to the button", async () => {
    await renderDialog();
    await newProjectButton().click();
    await expect.element(dialog()).toBeVisible();

    await userEvent.keyboard("{Escape}");

    await expect.element(dialog()).not.toBeInTheDocument();
    await expect.element(newProjectButton()).toHaveFocus();
    expect(actions.createProjectAction).not.toHaveBeenCalled();
  });

  test("the close button closes the dialog and gives focus back to the button", async () => {
    await renderDialog();
    await newProjectButton().click();

    await page
      .getByRole("button", { name: PROJECTS_COPY.closeNewProject })
      .click();

    await expect.element(dialog()).not.toBeInTheDocument();
    await expect.element(newProjectButton()).toHaveFocus();
    expect(actions.createProjectAction).not.toHaveBeenCalled();
  });
});

test("Cancel closes without creating a quest", async () => {
  await renderDialog();
  await newProjectButton().click();
  await page.getByRole("button", { name: PROJECTS_COPY.cancel }).click();
  await expect.element(dialog()).not.toBeInTheDocument();
  await expect.element(newProjectButton()).toHaveFocus();
  expect(actions.createProjectAction).not.toHaveBeenCalled();
});
