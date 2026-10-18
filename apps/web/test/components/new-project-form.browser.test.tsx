// The New Project form in Chromium and WebKit. "use_case_new_project" in
// use-cases/projects.md: a name typed as soon as the form shows is the name
// sent. "use_case_new_project_without_name": the browser's own check of the
// required name keeps an empty name from reaching createProjectAction and
// takes her to the field. A name of spaces is new-project-form.test.tsx's to
// check.
import { afterEach, describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import type {
  CreateProjectState,
  createProjectAction,
} from "@/app/(workspace)/projects/actions.ts";
import { NewProjectForm } from "@/components/new-project-form.tsx";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";

const actions = vi.hoisted(() => ({
  createProjectAction: vi.fn<typeof createProjectAction>(),
}));
vi.mock("@/app/(workspace)/projects/actions.ts", () => actions);

// The action's answer, so the form shows when it has sent the name.
const NEEDS_NAME: CreateProjectState = {
  kind: "invalid",
  message: PROJECTS_COPY.needsName,
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("use_case_new_project", () => {
  test("a name typed as soon as the form shows is the name sent", async () => {
    actions.createProjectAction.mockResolvedValue(NEEDS_NAME);
    await render(<NewProjectForm userBuddies={Promise.resolve([])} />);

    await page
      .getByRole("textbox", { name: PROJECTS_COPY.nameLabel })
      .fill("Low-poly fox");
    await page.getByRole("button", { name: PROJECTS_COPY.create }).click();

    await expect
      .element(page.getByRole("alert"))
      .toHaveTextContent(PROJECTS_COPY.needsName);
    const [, sent] = actions.createProjectAction.mock.lastCall ?? [];
    expect(sent?.get("name")).toBe("Low-poly fox");
  });
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
