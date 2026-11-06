// The New Project form in Chromium and WebKit. "use_case_new_project" in
// use-cases/projects.md: a name typed as soon as the form shows is the name
// sent. "use_case_new_project_without_name": the browser's own check of the
// required name keeps an empty name from reaching createProjectAction and
// takes her to the field. "use_case_new_project_name_too_long": the field
// takes no more than the limit, and a name the action refuses as too long is
// explained at the field. A name of spaces is new-project-form.test.tsx's to
// check.
import { afterEach, describe, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import type {
  CreateProjectState,
  createProjectAction,
} from "@/app/(workspace)/projects/actions.ts";
import { NewProjectForm } from "@/components/new-project-form.tsx";
import { PROJECT_NAME_MAX_LENGTH } from "@/projects/project-name.ts";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";

const actions = vi.hoisted(() => ({
  createProjectAction: vi.fn<typeof createProjectAction>(),
}));
vi.mock("@/app/(workspace)/projects/actions.ts", () => actions);

// The action's answer, so the form shows when it has sent the name.
const NEEDS_NAME: CreateProjectState = {
  kind: "invalidName",
  message: PROJECTS_COPY.needsName,
  name: "Low-poly fox",
  motivation: "",
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("use_case_new_project", () => {
  test("a name typed as soon as the form shows is the name sent", async () => {
    actions.createProjectAction.mockResolvedValue(NEEDS_NAME);
    await render(<NewProjectForm />);

    const nameField = page.getByRole("textbox", {
      name: PROJECTS_COPY.nameLabel,
    });
    await nameField.fill("Low-poly fox");
    await page
      .getByRole("textbox", { name: PROJECTS_COPY.motivationLabel })
      .fill("Make a gift for a friend");
    await page.getByRole("button", { name: PROJECTS_COPY.create }).click();

    await expect
      .element(nameField)
      .toHaveAccessibleDescription(PROJECTS_COPY.needsName);
    const [, sent] = actions.createProjectAction.mock.lastCall ?? [];
    expect(sent?.get("name")).toBe("Low-poly fox");
    expect(sent?.get("motivation")).toBe("Make a gift for a friend");
    expect(sent?.has("constructId")).toBe(false);
  });
});

describe("use_case_new_project_without_name", () => {
  test("an empty name sends nothing and takes her to the name field", async () => {
    await render(<NewProjectForm />);
    const nameField = page.getByRole("textbox", {
      name: PROJECTS_COPY.nameLabel,
    });

    await page.getByRole("button", { name: PROJECTS_COPY.create }).click();

    await expect.element(nameField).toHaveFocus();
    expect(actions.createProjectAction).not.toHaveBeenCalled();
  });
});

describe("use_case_new_project_name_too_long", () => {
  test("the name field takes no more than the limit", async () => {
    await render(<NewProjectForm />);
    const nameField = page.getByRole("textbox", {
      name: PROJECTS_COPY.nameLabel,
    });

    await userEvent.type(nameField, "f".repeat(PROJECT_NAME_MAX_LENGTH + 1));

    await expect
      .element(nameField)
      .toHaveValue("f".repeat(PROJECT_NAME_MAX_LENGTH));
  });

  test("a name refused as too long is explained at the name field, which keeps it", async () => {
    const name = "f".repeat(PROJECT_NAME_MAX_LENGTH + 1);
    const tooLong = PROJECTS_COPY.nameTooLong(PROJECT_NAME_MAX_LENGTH);
    actions.createProjectAction.mockResolvedValue({
      kind: "invalidName",
      message: tooLong,
      name,
      motivation: "",
    });
    await render(<NewProjectForm />);
    const nameField = page.getByRole("textbox", {
      name: PROJECTS_COPY.nameLabel,
    });

    await nameField.fill("Low-poly fox");
    await page.getByRole("button", { name: PROJECTS_COPY.create }).click();

    await expect.element(nameField).toHaveAccessibleDescription(tooLong);
    await expect.element(nameField).toHaveAttribute("aria-invalid", "true");
    await expect.element(nameField).toHaveValue(name);
  });
});

test("an out-of-gold refusal preserves the quest name and motivation", async () => {
  actions.createProjectAction.mockImplementation(async (_previous, form) => ({
    kind: "outOfGold",
    message: "You're out of gold.",
    name: String(form.get("name")),
    motivation: String(form.get("motivation")),
  }));
  await render(<NewProjectForm />);
  const name = page.getByRole("textbox", { name: PROJECTS_COPY.nameLabel });
  const motivation = page.getByRole("textbox", {
    name: PROJECTS_COPY.motivationLabel,
  });
  await name.fill("Birdhouse");
  await motivation.fill("A gift for a friend");
  await page.getByRole("button", { name: PROJECTS_COPY.create }).click();
  await expect
    .element(page.getByText("You're out of gold.", { exact: true }))
    .toBeVisible();
  await expect.element(name).toHaveValue("Birdhouse");
  await expect.element(motivation).toHaveValue("A gift for a friend");
});
