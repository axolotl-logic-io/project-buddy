import { beforeEach, describe, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { changeQuestStatusAction } from "@/app/(site)/(workspace)/quests/status-actions.ts";

import { QuestStatusControls } from "@/components/quest-status-controls.tsx";
import type { StatusActionState } from "@/quests/quest-status.ts";
import { QUEST_STATUS_COPY } from "@/ui/copy/quest-status.ts";
import { FOX_QUEST } from "../app/(workspace)/page-fixtures.ts";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("quest status actions", () => {
  test.each([
    ["Complete", "completed"],
    ["Abandon", "abandoned"],
  ] as const)(
    "%s changes the active quest and offers Undo",
    async (label, status) => {
      const saved = Promise.withResolvers<StatusActionState>();
      vi.mocked(changeQuestStatusAction).mockReturnValue(saved.promise);
      await render(<QuestStatusControls quest={FOX_QUEST} />);
      await page.getByRole("button", { name: label, exact: true }).click();
      await expect
        .element(
          page.getByRole("button", {
            name: QUEST_STATUS_COPY.complete,
            exact: true,
          }),
        )
        .toBeDisabled();
      await expect
        .element(
          page.getByRole("button", {
            name: QUEST_STATUS_COPY.abandon,
            exact: true,
          }),
        )
        .toBeDisabled();
      const [, sent] = vi.mocked(changeQuestStatusAction).mock.lastCall ?? [];
      expect(sent?.get("questId")).toBe(FOX_QUEST.id);
      expect(sent?.get("fromStatus")).toBe("active");
      expect(sent?.get("toStatus")).toBe(status);
      expect(sent?.get("revision")).toBe("0");
      saved.resolve({
        kind: "saved",
        message: QUEST_STATUS_COPY.saved[status],
        change: {
          questId: FOX_QUEST.id,
          fromStatus: "active",
          toStatus: status,
          revision: 1,
        },
      });
      await expect
        .element(page.getByRole("status"))
        .toHaveTextContent(QUEST_STATUS_COPY.saved[status]);
      await expect
        .element(page.getByRole("button", { name: QUEST_STATUS_COPY.undo }))
        .toBeVisible();
    },
  );
  test("submits with the keyboard, disables pending actions and offers Undo", async () => {
    const saved = Promise.withResolvers<StatusActionState>();
    vi.mocked(changeQuestStatusAction).mockReturnValue(saved.promise);
    const result: StatusActionState = {
      kind: "saved",
      message: "Quest restored.",
      change: {
        questId: FOX_QUEST.id,
        fromStatus: "completed",
        toStatus: "active",
        revision: 1,
      },
    };
    await render(
      <QuestStatusControls quest={{ ...FOX_QUEST, status: "completed" }} />,
    );
    const restore = page.getByRole("button", {
      name: QUEST_STATUS_COPY.restore,
    });
    restore.element().focus();
    await userEvent.keyboard("{Enter}");
    await expect.element(restore).toBeDisabled();
    expect(changeQuestStatusAction).toHaveBeenCalledTimes(1);
    saved.resolve(result);
    await expect
      .element(page.getByRole("button", { name: QUEST_STATUS_COPY.undo }))
      .toBeVisible();
    await expect.element(page.getByRole("status")).toHaveFocus();
    expect(changeQuestStatusAction).toHaveBeenCalledTimes(1);
    const [, sent] = vi.mocked(changeQuestStatusAction).mock.lastCall ?? [];
    expect(sent?.get("toStatus")).toBe("active");
    expect(sent?.get("revision")).toBe("0");
    vi.mocked(changeQuestStatusAction).mockResolvedValue({
      kind: "saved",
      message: "Quest completed.",
    });
    page
      .getByRole("button", { name: QUEST_STATUS_COPY.undo })
      .element()
      .focus();
    await userEvent.keyboard("{Enter}");
    await expect
      .element(page.getByRole("status"))
      .toHaveTextContent(QUEST_STATUS_COPY.saved.completed);
    await expect.element(page.getByRole("status")).toHaveFocus();
    await expect
      .element(page.getByText(QUEST_STATUS_COPY.saved.active, { exact: true }))
      .not.toBeInTheDocument();
    expect(changeQuestStatusAction).toHaveBeenCalledTimes(2);
    const [, undone] = vi.mocked(changeQuestStatusAction).mock.lastCall ?? [];
    expect(undone?.get("toStatus")).toBe("completed");
    expect(undone?.get("revision")).toBe("1");
  });
});
