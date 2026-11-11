import { afterEach, describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { JournalChangePart } from "@/components/chat/journal-change-part.tsx";
import { SectionEditor } from "@/components/journal/section-controls.tsx";
import type { changeSectionAction } from "@/journal/journal-actions.ts";
import { JOURNAL_SECTIONS_COPY as COPY } from "@/ui/copy/journal.ts";
import { projectIdFixture } from "../../support/id-fixtures.ts";

const actions = vi.hoisted(() => ({
  change: vi.fn<typeof changeSectionAction>(),
}));
vi.mock("@/journal/journal-actions.ts", () => ({
  changeSectionAction: actions.change,
}));
const PROJECT = projectIdFixture();
afterEach(() => {
  vi.clearAllMocks();
});

describe("typed Journal controls", () => {
  test("edits the goal without a reply and keeps saved feedback", async () => {
    actions.change.mockResolvedValue({
      status: "changed",
      projectId: PROJECT,
      state: {
        version: 1,
        content: { kind: "goal", text: "Learn shading" },
        history: [],
      },
    });
    await render(
      <SectionEditor
        projectId={PROJECT}
        initial={{
          version: 0,
          content: { kind: "goal", text: "" },
          history: [],
        }}
      />,
    );
    await page.getByText(COPY.editGoal, { exact: true }).click();
    await page
      .getByRole("textbox", { name: COPY.goalText })
      .fill("Learn shading");
    await page.getByRole("button", { name: COPY.save, exact: true }).click();
    expect(actions.change).toHaveBeenCalledWith({
      projectId: PROJECT,
      kind: "goal",
      basedOn: 0,
      edit: { kind: "goal", text: "Learn shading" },
    });
    await expect
      .element(page.getByRole("status"))
      .toHaveTextContent(COPY.changed);
    await expect
      .element(page.getByText("Learn shading", { exact: true }))
      .toBeVisible();
  });
  test("preference removal names its stable number", async () => {
    actions.change.mockResolvedValue({
      status: "changed",
      projectId: PROJECT,
      state: {
        version: 2,
        content: { kind: "preferences", items: [], nextNumber: 2 },
        history: [],
      },
    });
    await render(
      <SectionEditor
        projectId={PROJECT}
        initial={{
          version: 1,
          content: {
            kind: "preferences",
            items: [{ number: 1, text: "Examples" }],
            nextNumber: 2,
          },
          history: [],
        }}
      />,
    );
    await page.getByText(COPY.editPreferences, { exact: true }).click();
    await page.getByRole("button", { name: COPY.remove, exact: true }).click();
    expect(actions.change).toHaveBeenCalledWith({
      projectId: PROJECT,
      kind: "preferences",
      basedOn: 1,
      edit: {
        kind: "preferences",
        operations: [{ op: "remove", preference: 1 }],
      },
    });
    await expect
      .element(page.getByRole("status"))
      .toHaveTextContent(COPY.changed);
  });
  test("a conversation change shows both values and an undo control", async () => {
    actions.change.mockResolvedValue({
      status: "not-changed",
      reason: "outdated",
    });
    await render(
      <JournalChangePart
        part={{
          result: {
            status: "changed",
            projectId: PROJECT,
            version: 2,
            content: { kind: "goal", text: "Make a teapot" },
            before: { kind: "goal", text: "Make a cup" },
          },
        }}
      />,
    );
    await expect
      .element(page.getByText("Make a cup", { exact: true }))
      .toBeVisible();
    await expect
      .element(page.getByText("Make a teapot", { exact: true }))
      .toBeVisible();
    await page.getByRole("button", { name: COPY.undo, exact: true }).click();
    expect(actions.change).toHaveBeenCalledWith({
      projectId: PROJECT,
      kind: "goal",
      undo: 2,
    });
    await expect
      .element(page.getByRole("status"))
      .toHaveTextContent(COPY.conflict);
  });
});
