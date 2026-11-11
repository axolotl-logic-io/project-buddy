// A project's progress timeline in Chromium and WebKit: its milestones,
// newest first, each with its day, and the forms that edit and delete
// one. What the actions save is actions.server.test.ts's, and which
// milestones the page lists is page.server.test.ts's.
import { afterEach, describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import type {
  deleteMilestoneAction,
  editMilestoneAction,
} from "@/app/(workspace)/projects/[projectId]/(overview)/actions.ts";
import { ProgressTimeline } from "@/app/(workspace)/projects/[projectId]/(overview)/progress-timeline.tsx";
import { PROGRESS_TIMELINE_COPY } from "@/ui/copy/milestones.ts";
import {
  paintOf,
  tokenColor,
} from "../../../../components/ui/button-fill-test-kit.ts";
import { applyTheme } from "../../../../themes/theme-test-kit.ts";
import {
  FOX_BODY_MILESTONE,
  FOX_MILESTONES,
  FOX_TAIL_MILESTONE,
} from "../../page-fixtures.ts";

const actions = vi.hoisted(() => ({
  editMilestoneAction: vi.fn<typeof editMilestoneAction>(),
  deleteMilestoneAction: vi.fn<typeof deleteMilestoneAction>(),
}));
vi.mock(
  "@/app/(workspace)/projects/[projectId]/(overview)/actions.ts",
  () => actions,
);

const NEWEST_TEXT: string = FOX_TAIL_MILESTONE.text;
const EDITED_TEXT: string = "Fixed the tail and the ears";

async function renderTimeline(): Promise<void> {
  await render(<ProgressTimeline milestones={FOX_MILESTONES} />);
}

function textField(): ReturnType<typeof page.getByRole> {
  return page.getByRole("textbox", { name: PROGRESS_TIMELINE_COPY.textLabel });
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("use_case_view_progress_timeline", () => {
  test("lists the milestones newest first, each with its day", async () => {
    await renderTimeline();

    const entries = page
      .getByRole("list", { name: PROGRESS_TIMELINE_COPY.heading })
      .getByRole("listitem");
    await expect.element(entries.nth(0)).toMatchTextContent(NEWEST_TEXT);
    await expect.element(entries.nth(0)).toMatchTextContent("Oct 13, 2026");
    await expect
      .element(entries.nth(1))
      .toMatchTextContent(FOX_BODY_MILESTONE.text);
    expect(entries.elements()).toHaveLength(FOX_MILESTONES.length);
  });

  test("with no milestones, says how they arrive", async () => {
    await render(<ProgressTimeline milestones={[]} />);

    await expect
      .element(page.getByText(PROGRESS_TIMELINE_COPY.none))
      .toBeVisible();
  });
});

describe("use_case_edit_milestone", () => {
  test("edits a milestone's text, keeping refused text on screen with the reason", async () => {
    applyTheme("parchment");
    actions.editMilestoneAction
      .mockResolvedValueOnce({
        kind: "invalid",
        message: PROGRESS_TIMELINE_COPY.needsText,
      })
      .mockResolvedValueOnce({ kind: "saved" });
    await renderTimeline();

    await page
      .getByRole("button", {
        name: PROGRESS_TIMELINE_COPY.editLabel(NEWEST_TEXT),
      })
      .click();
    await expect.element(textField()).toHaveValue(NEWEST_TEXT);
    await textField().fill(" ");
    await page
      .getByRole("button", { name: PROGRESS_TIMELINE_COPY.save })
      .click();

    await expect
      .element(page.getByRole("alert"))
      .toMatchTextContent(PROGRESS_TIMELINE_COPY.needsText);
    const error = page.getByRole("alert").element();
    expect(textField().element()).toHaveAttribute("aria-describedby", error.id);
    expect(error.id).not.toBe("");
    expect(Number.parseFloat(getComputedStyle(error).paddingTop)).toBe(0);
    expect(Number.parseFloat(getComputedStyle(error).borderTopWidth)).toBe(0);
    await expect.element(textField()).toHaveValue(" ");
    await textField().fill(EDITED_TEXT);
    await page
      .getByRole("button", { name: PROGRESS_TIMELINE_COPY.save })
      .click();

    await expect.element(textField()).not.toBeInTheDocument();
    const [, sent] = actions.editMilestoneAction.mock.lastCall ?? [];
    expect(sent?.get("milestoneId")).toBe(FOX_TAIL_MILESTONE.id);
    expect(sent?.get("text")).toBe(EDITED_TEXT);
  });

  test("cancelling an edit keeps the milestone as it was", async () => {
    await renderTimeline();

    await page
      .getByRole("button", {
        name: PROGRESS_TIMELINE_COPY.editLabel(NEWEST_TEXT),
      })
      .click();
    await textField().fill(EDITED_TEXT);
    await page
      .getByRole("button", { name: PROGRESS_TIMELINE_COPY.cancel })
      .click();

    await expect.element(page.getByText(NEWEST_TEXT)).toBeVisible();
    expect(actions.editMilestoneAction).not.toHaveBeenCalled();
  });

  test("closing the editor puts keyboard focus back on the milestone's Edit button, after Cancel and after Save", async () => {
    actions.editMilestoneAction.mockResolvedValue({ kind: "saved" });
    await renderTimeline();
    const editButton = page.getByRole("button", {
      name: PROGRESS_TIMELINE_COPY.editLabel(NEWEST_TEXT),
    });

    await editButton.click();
    await expect.element(textField()).toHaveFocus();
    await page
      .getByRole("button", { name: PROGRESS_TIMELINE_COPY.cancel })
      .click();
    await expect.element(editButton).toHaveFocus();
    await editButton.click();
    await textField().fill(EDITED_TEXT);
    await page
      .getByRole("button", { name: PROGRESS_TIMELINE_COPY.save })
      .click();

    await expect.element(editButton).toHaveFocus();
  });

  test("deletes a milestone only once she confirms", async () => {
    actions.deleteMilestoneAction.mockResolvedValue();
    applyTheme("parchment");
    await renderTimeline();
    const deleteButton = page.getByRole("button", {
      name: PROGRESS_TIMELINE_COPY.deleteLabel(NEWEST_TEXT),
    });

    await deleteButton.click();
    await page
      .getByRole("button", { name: PROGRESS_TIMELINE_COPY.deleteCancel })
      .click();
    expect(actions.deleteMilestoneAction).not.toHaveBeenCalled();
    await deleteButton.click();
    const confirm = page.getByRole("button", {
      name: PROGRESS_TIMELINE_COPY.deleteConfirm,
    });
    expect(paintOf(confirm.element()).fill).toBe(tokenColor("danger"));
    await confirm.click();

    await vi.waitFor(() => {
      expect(actions.deleteMilestoneAction).toHaveBeenCalledOnce();
    });
    const [sent] = actions.deleteMilestoneAction.mock.lastCall ?? [];
    expect(sent?.get("milestoneId")).toBe(FOX_TAIL_MILESTONE.id);
  });
});
