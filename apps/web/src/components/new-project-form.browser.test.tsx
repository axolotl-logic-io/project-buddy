// "use_case_new_project_without_name" in use-cases/projects.md, in Chromium
// and WebKit: the browser's own check of the required name keeps an empty
// name from reaching createProjectAction and takes her to the field. A name
// of spaces is new-project-form.test.tsx's to check.
import { afterEach, describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import type { createProjectAction } from "@/app/(workspace)/projects/actions.ts";
import { NewProjectForm } from "@/components/new-project-form.tsx";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";

const actions = vi.hoisted(() => ({
  createProjectAction: vi.fn<typeof createProjectAction>(),
}));
vi.mock("@/app/(workspace)/projects/actions.ts", () => actions);

afterEach(() => {
  vi.clearAllMocks();
});

describe("use_case_new_project_without_name", () => {
  test("an empty name sends nothing and takes her to the name field", async () => {
    await render(<NewProjectForm userBuddies={Promise.resolve([])} />);
    const nameField = page.getByRole("textbox", {
      name: PROJECTS_COPY.nameLabel,
    });

    await page.getByRole("button", { name: PROJECTS_COPY.create }).click();

    await expect.element(nameField).toHaveFocus();
    expect(actions.createProjectAction).not.toHaveBeenCalled();
  });
});
