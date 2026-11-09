import { beforeEach, describe, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import {
  answerQuestStatusAction,
  changeQuestStatusAction,
  readQuestStatusApprovalAction,
} from "@/app/(workspace)/projects/status-actions.ts";
import { QuestStatusPart } from "@/components/chat/quest-status-part.tsx";
import { QuestStatusControls } from "@/components/quest-status-controls.tsx";
import { QuestStatusTabs } from "@/components/quest-status-tabs.tsx";
import {
  STATUS_APPROVAL_ID,
  type StatusActionState,
  type StatusApproval,
} from "@/projects/quest-status.ts";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";
import { QUEST_STATUS_COPY } from "@/ui/copy/quest-status.ts";
import { FOX_PROJECT } from "../app/(workspace)/page-fixtures.ts";
import { applyTheme } from "../themes/theme-test-kit.ts";
import {
  measureTargets,
  pageScrollWidth,
  smallTargets,
} from "../touch-targets-test-kit.ts";
import {
  NARROWEST_VIEWPORT,
  PHONE_VIEWPORT,
  setViewport,
} from "../viewports-test-kit.ts";

const PROPOSAL: StatusApproval = {
  id: STATUS_APPROVAL_ID.parse("6f1c2a8e-3b4d-4e5f-8a9b-0c1d2e3f4a5b"),
  projectId: FOX_PROJECT.id,
  name: FOX_PROJECT.name,
  fromStatus: "active",
  toStatus: "abandoned",
  revision: 0,
  decision: "pending",
};
const PART: { result: unknown } = {
  result: { status: "awaiting-approval", approval: PROPOSAL },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("quest status actions", () => {
  test("submits with the keyboard, disables pending actions and offers Undo", async () => {
    const saved = Promise.withResolvers<StatusActionState>();
    vi.mocked(changeQuestStatusAction).mockReturnValue(saved.promise);
    const result: StatusActionState = {
      kind: "saved",
      message: "Quest completed.",
      change: {
        projectId: FOX_PROJECT.id,
        fromStatus: "active",
        toStatus: "completed",
        revision: 1,
      },
    };
    await render(<QuestStatusControls project={FOX_PROJECT} />);
    page
      .getByRole("button", { name: "Complete", exact: true })
      .element()
      .focus();
    await userEvent.keyboard("{Enter}");
    await expect
      .element(page.getByRole("button", { name: "Complete", exact: true }))
      .toBeDisabled();
    await expect
      .element(page.getByRole("button", { name: "Abandon", exact: true }))
      .toBeDisabled();
    expect(changeQuestStatusAction).toHaveBeenCalledTimes(1);
    saved.resolve(result);
    await expect
      .element(page.getByRole("button", { name: "Undo" }))
      .toBeVisible();
    await expect.element(page.getByRole("status")).toHaveFocus();
    expect(changeQuestStatusAction).toHaveBeenCalledTimes(1);
    const [, sent] = vi.mocked(changeQuestStatusAction).mock.lastCall ?? [];
    expect(sent?.get("toStatus")).toBe("completed");
    expect(sent?.get("revision")).toBe("0");
    vi.mocked(changeQuestStatusAction).mockResolvedValue({
      kind: "saved",
      message: "Quest restored.",
    });
    page.getByRole("button", { name: "Undo" }).element().focus();
    await userEvent.keyboard("{Enter}");
    await expect
      .element(page.getByRole("status"))
      .toHaveTextContent("Quest restored.");
    await expect.element(page.getByRole("status")).toHaveFocus();
    await expect
      .element(page.getByText("Quest completed.", { exact: true }))
      .not.toBeInTheDocument();
    expect(changeQuestStatusAction).toHaveBeenCalledTimes(2);
    const [, undone] = vi.mocked(changeQuestStatusAction).mock.lastCall ?? [];
    expect(undone?.get("toStatus")).toBe("active");
    expect(undone?.get("revision")).toBe("1");
  });
  test("members have no status action", async () => {
    await render(
      <QuestStatusControls project={{ ...FOX_PROJECT, role: "member" }} />,
    );
    await expect
      .element(page.getByRole("button", { name: "Complete", exact: true }))
      .not.toBeInTheDocument();
  });
});

describe("quest approval card", () => {
  test("shows the exact change, waits for approval, and disables answered controls", async () => {
    vi.mocked(readQuestStatusApprovalAction).mockResolvedValue(PROPOSAL);
    vi.mocked(answerQuestStatusAction).mockResolvedValue({
      kind: "saved",
      approval: { ...PROPOSAL, decision: "approved" },
    });
    await render(<QuestStatusPart part={PART} />);
    await expect.element(page.getByText("Active → Abandoned")).toBeVisible();
    await expect
      .element(page.getByRole("button", { name: "Confirm abandoned" }))
      .toBeVisible();
    expect(answerQuestStatusAction).not.toHaveBeenCalled();
    await page.getByRole("button", { name: "Confirm abandoned" }).click();
    await expect
      .element(page.getByText("Approved", { exact: true }))
      .toBeVisible();
    await expect
      .element(page.getByRole("button", { name: "Confirm abandoned" }))
      .not.toBeInTheDocument();
    const [, sent] = vi.mocked(answerQuestStatusAction).mock.lastCall ?? [];
    expect(sent?.get("decision")).toBe("approve");
    expect(sent?.get("id")).toBe(PROPOSAL.id);
  });
  test.each(["declined", "outdated"] as const)(
    "reloading a %s proposal does not offer approval",
    async (decision) => {
      vi.mocked(readQuestStatusApprovalAction).mockResolvedValue({
        ...PROPOSAL,
        decision,
      });
      await render(<QuestStatusPart part={PART} />);
      await expect
        .element(page.getByText(QUEST_STATUS_COPY.decisions[decision]))
        .toBeVisible();
      await expect
        .element(page.getByRole("button", { name: "Confirm abandoned" }))
        .not.toBeInTheDocument();
      expect(answerQuestStatusAction).not.toHaveBeenCalled();
    },
  );
  test("can decline without executing a change", async () => {
    vi.mocked(readQuestStatusApprovalAction).mockResolvedValue(PROPOSAL);
    vi.mocked(answerQuestStatusAction).mockResolvedValue({
      kind: "saved",
      approval: { ...PROPOSAL, decision: "declined" },
    });
    await render(<QuestStatusPart part={PART} />);
    await page.getByRole("button", { name: "Keep current status" }).click();
    await expect
      .element(page.getByText("Declined. Quest status kept."))
      .toBeVisible();
    const [, sent] = vi.mocked(answerQuestStatusAction).mock.lastCall ?? [];
    expect(sent?.get("decision")).toBe("decline");
  });
});

describe("quest status tabs", () => {
  test("filters quests by status and supports keyboard navigation", async () => {
    await render(
      <QuestStatusTabs projects={[{ ...FOX_PROJECT, status: "completed" }]} />,
    );
    await expect
      .element(page.getByText("No quests with this status."))
      .toBeVisible();
    await page.getByRole("tab", { name: "Active", exact: true }).click();
    await userEvent.keyboard("{ArrowRight}");
    await expect
      .element(page.getByRole("tab", { name: "Completed", exact: true }))
      .toHaveAttribute("aria-selected", "true");
    await expect
      .element(page.getByRole("link", { name: FOX_PROJECT.name }))
      .toBeVisible();
    await expect
      .element(page.getByRole("button", { name: "Restore quest" }))
      .toBeVisible();
  });
  test("restoring from a list keeps Undo available outside the card", async () => {
    vi.mocked(changeQuestStatusAction).mockResolvedValue({
      kind: "saved",
      message: "Quest restored.",
      change: {
        projectId: FOX_PROJECT.id,
        fromStatus: "completed",
        toStatus: "active",
        revision: 2,
      },
    });
    const view = await render(
      <QuestStatusTabs
        initialStatus="completed"
        projects={[{ ...FOX_PROJECT, status: "completed", statusRevision: 1 }]}
      />,
    );
    page.getByRole("button", { name: "Restore quest" }).element().focus();
    await userEvent.keyboard("{Enter}");
    await expect
      .element(page.getByRole("button", { name: "Undo" }))
      .toBeVisible();
    await view.rerender(
      <QuestStatusTabs
        initialStatus="completed"
        projects={[{ ...FOX_PROJECT, status: "active", statusRevision: 2 }]}
      />,
    );
    await expect
      .element(page.getByRole("link", { name: FOX_PROJECT.name }))
      .not.toBeInTheDocument();
    await expect.element(page.getByRole("status")).toHaveFocus();
    expect(changeQuestStatusAction).toHaveBeenCalledTimes(1);
    await expect
      .element(page.getByRole("button", { name: "Undo" }))
      .toBeVisible();
  });
});

describe("quest status on phones", () => {
  for (const viewport of [NARROWEST_VIEWPORT, PHONE_VIEWPORT]) {
    for (const mode of ["light", "dark"]) {
      test(`approval and restoration fit ${viewport.width} px in ${mode}`, async () => {
        applyTheme("parchment", mode);
        await setViewport(viewport);
        vi.mocked(readQuestStatusApprovalAction).mockResolvedValue(PROPOSAL);
        const view = await render(<QuestStatusPart part={PART} />);
        await expect
          .element(page.getByRole("button", { name: "Confirm abandoned" }))
          .toBeVisible();
        expect(pageScrollWidth()).toBeLessThanOrEqual(viewport.width);
        expect(smallTargets(await measureTargets())).toEqual([]);
        await view.rerender(
          <QuestStatusTabs
            initialStatus="completed"
            projects={[{ ...FOX_PROJECT, status: "completed" }]}
          />,
        );
        expect(pageScrollWidth()).toBeLessThanOrEqual(viewport.width);
        expect(smallTargets(await measureTargets())).toEqual([]);
      });
    }
  }
});

test("no quests gives first-quest guidance while an empty status tab keeps filter guidance", async () => {
  const screen = await render(<QuestStatusTabs projects={[]} />);
  await expect.element(page.getByText(PROJECTS_COPY.none)).toBeVisible();
  await screen.unmount();
  await render(
    <QuestStatusTabs projects={[FOX_PROJECT]} initialStatus="completed" />,
  );
  await expect.element(page.getByText(QUEST_STATUS_COPY.empty)).toBeVisible();
  await expect
    .element(page.getByText(PROJECTS_COPY.none))
    .not.toBeInTheDocument();
});
