// The Projects page's "New project" dialog in Chromium and WebKit.
// "use_case_view_projects" in use-cases/projects.md: the page shows a "New
// project" button rather than the form; the button opens a modal dialog,
// named "New project", that takes focus and keeps it, holds the
// new-quest form with name and motivation fields, and closes with Escape or its close
// button, giving focus back to the button. Opening and closing it sends nothing.
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
  return page.getByRole("button", { name: PROJECTS_COPY.newHeading });
}

function dialog(): ReturnType<typeof page.getByRole> {
  return page.getByRole("dialog", { name: PROJECTS_COPY.newHeading });
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
      .element(page.getByRole("button", { name: PROJECTS_COPY.create }))
      .not.toBeInTheDocument();
  });

  test("the button opens a named dialog with the name and motivation fields", async () => {
    await renderDialog();

    await newProjectButton().click();

    await expect.element(dialog()).toBeVisible();
    expect(focusInDialog()).toBe(true);
    await expect
      .element(page.getByRole("textbox", { name: PROJECTS_COPY.nameLabel }))
      .toBeVisible();
    await expect
      .element(
        page.getByRole("textbox", { name: PROJECTS_COPY.motivationLabel }),
      )
      .toBeVisible();
    await expect
      .element(page.getByRole("button", { name: "Choose buddy" }))
      .not.toBeInTheDocument();
    await expect
      .element(page.getByRole("button", { name: PROJECTS_COPY.create }))
      .toBeVisible();
  });

  test("the keyboard stays in the dialog", async () => {
    await renderDialog();
    await newProjectButton().click();
    await expect.element(dialog()).toBeVisible();

    page.getByRole("button", { name: PROJECTS_COPY.create }).element().focus();
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
