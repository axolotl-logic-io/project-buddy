// "use_case_quick_note" in Chromium and WebKit: quick capture's page and
// form. A note goes to the chosen project, dated with the browser's day; a
// saved note clears the text and keeps the project; a refused or failed one
// keeps both, and says why. Focus returns to the text after each save. What
// the action saves is actions.server.test.ts's.
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import type {
  QuickCaptureState,
  saveNoteAction,
} from "@/app/(workspace)/capture/actions.ts";
import QuickCapturePage from "@/app/(workspace)/capture/page.tsx";
import { userMessage } from "@/errors/app-error.ts";
import { dayOf } from "@/notes/note.ts";
import type { listProjects } from "@/projects/store.ts";
import { QUICK_CAPTURE_COPY } from "@/ui/copy/notes.ts";
import { projectIdFixture } from "../../../../support/id-fixtures.ts";
import {
  SIGNED_IN_USER,
  signInAs,
} from "../../../auth/current-user-test-kit.ts";
import { inWorkspace } from "../../workspace-test-kit.tsx";
import { FOX_PROJECT } from "../page-fixtures.ts";

const TURTLE_PROJECT = {
  id: projectIdFixture("2c3d4e5f-6a7b-4c8d-9e0f-1a2b3c4d5e6f"),
  name: "Sea turtle model",
  createdAt: new Date("2026-10-20T12:00:00Z"),
};

const NOTE = "try a subdivision cage on the shell";

const actions = vi.hoisted(() => ({
  saveNoteAction: vi.fn<typeof saveNoteAction>(),
}));
vi.mock("@/app/(workspace)/capture/actions.ts", () => actions);
vi.mock(
  "@/auth/current-user.ts",
  () => import("../../../auth/current-user-test-kit.ts"),
);
const stores = vi.hoisted(() => ({
  listProjects: vi.fn<typeof listProjects>(),
}));
vi.mock("@/projects/store.ts", () => stores);

async function renderCapture(projectId?: string): Promise<void> {
  const content = await QuickCapturePage({
    params: Promise.resolve({}),
    searchParams: Promise.resolve({ projectId }),
  });
  await render(inWorkspace(content));
}

function projectField(): ReturnType<typeof page.getByRole> {
  return page.getByRole("combobox", { name: QUICK_CAPTURE_COPY.projectLabel });
}

function noteField(): ReturnType<typeof page.getByRole> {
  return page.getByRole("textbox", { name: QUICK_CAPTURE_COPY.textLabel });
}

function saveButton(): ReturnType<typeof page.getByRole> {
  return page.getByRole("button", { name: QUICK_CAPTURE_COPY.save });
}

beforeEach(() => {
  signInAs(SIGNED_IN_USER);
  stores.listProjects.mockResolvedValue([TURTLE_PROJECT, FOX_PROJECT]);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("use_case_quick_note", () => {
  test("saves the note to the chosen project, dated today, then clears the text and keeps the project", async () => {
    const { promise, resolve } = Promise.withResolvers<QuickCaptureState>();
    actions.saveNoteAction.mockReturnValue(promise);
    await renderCapture(FOX_PROJECT.id);

    await expect.element(projectField()).toHaveValue(FOX_PROJECT.id);
    await projectField().selectOptions(TURTLE_PROJECT.name);
    await noteField().fill(NOTE);
    await saveButton().click();

    await expect.element(saveButton()).toBeDisabled();
    await expect
      .element(page.getByRole("status"))
      .toHaveTextContent(QUICK_CAPTURE_COPY.saving);
    const [, sent] = actions.saveNoteAction.mock.lastCall ?? [];
    expect(sent?.get("projectId")).toBe(TURTLE_PROJECT.id);
    expect(sent?.get("text")).toBe(NOTE);
    expect(sent?.get("day")).toBe(dayOf(new Date(), "local"));
    resolve({ kind: "saved", projectName: TURTLE_PROJECT.name });

    await expect
      .element(page.getByRole("status"))
      .toHaveTextContent(QUICK_CAPTURE_COPY.saved(TURTLE_PROJECT.name));
    await expect.element(noteField()).toHaveValue("");
    await expect.element(noteField()).toHaveFocus();
    await expect.element(projectField()).toHaveValue(TURTLE_PROJECT.id);
  });

  test("chooses the newest project when the link names none", async () => {
    await renderCapture();

    await expect.element(projectField()).toHaveValue(TURTLE_PROJECT.id);
  });

  test("an empty note is refused at the text, which keeps what was typed and takes the focus", async () => {
    actions.saveNoteAction.mockResolvedValue({
      kind: "invalid",
      message: QUICK_CAPTURE_COPY.empty,
      text: "   ",
      projectId: TURTLE_PROJECT.id,
    });
    await renderCapture();

    await noteField().fill("   ");
    await saveButton().click();

    await expect
      .element(page.getByRole("alert"))
      .toHaveTextContent(QUICK_CAPTURE_COPY.empty);
    await expect.element(noteField()).toHaveAttribute("aria-invalid", "true");
    await expect
      .element(noteField())
      .toHaveAccessibleDescription(
        expect.stringContaining(QUICK_CAPTURE_COPY.empty),
      );
    await expect.element(noteField()).toHaveFocus();
    await expect.element(noteField()).toHaveValue("   ");
  });

  test("a failed save says why and keeps the note's text and project", async () => {
    const message = userMessage("database-unreachable");
    actions.saveNoteAction.mockResolvedValue({
      kind: "failed",
      message,
      text: NOTE,
      projectId: FOX_PROJECT.id,
    });
    await renderCapture(FOX_PROJECT.id);

    await noteField().fill(NOTE);
    await saveButton().click();

    await expect.element(page.getByRole("alert")).toHaveTextContent(message);
    await expect.element(noteField()).toHaveValue(NOTE);
    await expect.element(projectField()).toHaveValue(FOX_PROJECT.id);
    await expect.element(saveButton()).toBeEnabled();
  });

  test("works from the keyboard alone", async () => {
    actions.saveNoteAction.mockResolvedValue({
      kind: "saved",
      projectName: TURTLE_PROJECT.name,
    });
    await renderCapture();

    noteField().element().focus();
    await userEvent.keyboard(NOTE);
    saveButton().element().focus();
    await userEvent.keyboard("{Enter}");

    await expect
      .element(page.getByRole("status"))
      .toHaveTextContent(QUICK_CAPTURE_COPY.saved(TURTLE_PROJECT.name));
    expect(actions.saveNoteAction.mock.lastCall?.[1].get("text")).toBe(NOTE);
  });

  test("with no projects, says a note needs one and links to the projects", async () => {
    stores.listProjects.mockResolvedValue([]);
    await renderCapture();

    await expect
      .element(page.getByText(QUICK_CAPTURE_COPY.noProjects))
      .toBeVisible();
    await expect
      .element(
        page.getByRole("link", { name: QUICK_CAPTURE_COPY.noProjectsLink }),
      )
      .toHaveAttribute("href", "/projects");
    expect(noteField().query()).toBeNull();
  });
});
