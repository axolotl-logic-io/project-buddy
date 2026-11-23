import { parse } from "culori";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import {
  changeQuestStatusAction,
} from "@/app/(workspace)/quests/status-actions.ts";

import { QuestStatusControls } from "@/components/quest-status-controls.tsx";
import { QuestStatusTabs } from "@/components/quest-status-tabs.tsx";
import type { AnswerInvitation } from "@/quests/membership.ts";
import {
  type StatusActionState,
} from "@/quests/quest-status.ts";
import { THEME_MODES } from "@/themes/themes.ts";
import { PENDING_COPY } from "@/ui/copy/quest-members.ts";
import { QUEST_STATUS_COPY } from "@/ui/copy/quest-status.ts";
import { QUESTS_COPY } from "@/ui/copy/quests.ts";
import { FOX_QUEST } from "../app/(workspace)/page-fixtures.ts";
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


const TAB_TARGET_PX = 44;

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



describe("quest status tabs", () => {
  test("filters quests by status and supports keyboard navigation", async () => {
    await render(
      <QuestStatusTabs quests={[{ ...FOX_QUEST, status: "completed" }]} />,
    );
    await expect.element(page.getByText(QUEST_STATUS_COPY.empty)).toBeVisible();
    await page
      .getByRole("tab", { name: QUEST_STATUS_COPY.labels.active, exact: true })
      .click();
    await userEvent.keyboard("{ArrowRight}");
    await expect
      .element(
        page.getByRole("tab", {
          name: QUEST_STATUS_COPY.labels.completed,
          exact: true,
        }),
      )
      .toHaveAttribute("aria-selected", "true");
    await expect
      .element(page.getByRole("link", { name: FOX_QUEST.name }))
      .toBeVisible();
    await expect
      .element(page.getByRole("button", { name: QUEST_STATUS_COPY.restore }))
      .toBeVisible();
    expect(new URL(globalThis.location.href).searchParams.get("status")).toBe(
      "completed",
    );
  });
  test("restoring from a list keeps Undo available outside the card", async () => {
    vi.mocked(changeQuestStatusAction).mockResolvedValue({
      kind: "saved",
      message: "Quest restored.",
      change: {
        questId: FOX_QUEST.id,
        fromStatus: "completed",
        toStatus: "active",
        revision: 2,
      },
    });
    const view = await render(
      <QuestStatusTabs
        initialStatus="completed"
        quests={[{ ...FOX_QUEST, status: "completed", statusRevision: 1 }]}
      />,
    );
    page
      .getByRole("button", { name: QUEST_STATUS_COPY.restore })
      .element()
      .focus();
    await userEvent.keyboard("{Enter}");
    await expect
      .element(page.getByRole("button", { name: QUEST_STATUS_COPY.undo }))
      .toBeVisible();
    await view.rerender(
      <QuestStatusTabs
        initialStatus="completed"
        quests={[{ ...FOX_QUEST, status: "active", statusRevision: 2 }]}
      />,
    );
    await expect
      .element(page.getByRole("link", { name: FOX_QUEST.name }))
      .not.toBeInTheDocument();
    await expect.element(page.getByRole("status")).toHaveFocus();

    expect(changeQuestStatusAction).toHaveBeenCalledTimes(1);
    await expect
      .element(page.getByRole("button", { name: QUEST_STATUS_COPY.undo }))
      .toBeVisible();
  });
});

describe("quest status on phones", () => {
  for (const viewport of [NARROWEST_VIEWPORT, PHONE_VIEWPORT]) {
    for (const mode of THEME_MODES) {
      test(`all categories and a shared quest fit ${viewport.width} px in ${mode}`, async () => {
        applyTheme("parchment", mode);
        await setViewport(viewport);
        const answer = vi.fn<AnswerInvitation>();
        const name = "One layer up: interface, associativity explorer";
        await render(
          <QuestStatusTabs
            quests={[{ ...FOX_QUEST, name, sharing: { kind: "shared" } }]}
            pending={{ quests: [], answer }}
          />,
        );
        const active = page.getByRole("tab", {
          name: QUEST_STATUS_COPY.labels.active,
          exact: true,
        });
        const completed = page.getByRole("tab", {
          name: QUEST_STATUS_COPY.labels.completed,
          exact: true,
        });
        const panel = page.getByRole("tabpanel", {
          name: QUEST_STATUS_COPY.labels.active,
        });
        await expect.element(panel.getByRole("listitem")).toBeVisible();
        await expect
          .element(panel.getByText("Shared", { exact: true }))
          .toBeVisible();
        await expect.element(panel.getByRole("link", { name })).toBeVisible();
        await expect
          .element(active.getByText("1", { exact: true }))
          .toBeVisible();
        for (const tab of page.getByRole("tab").elements()) {
          const box = tab.getBoundingClientRect();
          expect(box.left).toBeGreaterThanOrEqual(0);
          expect(box.right).toBeLessThanOrEqual(viewport.width);
          expect(box.height).toBeGreaterThanOrEqual(TAB_TARGET_PX);
        }
        expect(getComputedStyle(active.element()).backgroundColor).not.toBe(
          getComputedStyle(completed.element()).backgroundColor,
        );
        expect(pageScrollWidth()).toBeLessThanOrEqual(viewport.width);
        expect(smallTargets(await measureTargets())).toEqual([]);

        active.element().focus();
        await userEvent.keyboard("{ArrowRight}");
        await expect.element(completed).toHaveFocus();
        await expect
          .element(completed)
          .toHaveAttribute("aria-selected", "true");
        expect(getComputedStyle(completed.element()).outlineStyle).toBe(
          "solid",
        );
        await expect
          .element(
            page.getByRole("tabpanel", {
              name: QUEST_STATUS_COPY.labels.completed,
            }),
          )
          .toHaveTextContent(QUEST_STATUS_COPY.empty);
        await userEvent.keyboard("{End}");
        await expect
          .element(page.getByRole("tab", { name: PENDING_COPY.tabLabel(0) }))
          .toHaveFocus();
        await expect
          .element(
            page
              .getByRole("tabpanel", { name: PENDING_COPY.tabLabel(0) })
              .getByText(PENDING_COPY.none, { exact: true }),
          )
          .toBeVisible();
      });

      
    }
  }
});

test("no quests gives first-quest guidance while an empty status tab keeps filter guidance", async () => {
  const screen = await render(<QuestStatusTabs quests={[]} />);
  await expect.element(page.getByText(QUESTS_COPY.none)).toBeVisible();
  await screen.unmount();
  await render(
    <QuestStatusTabs quests={[FOX_QUEST]} initialStatus="completed" />,
  );
  await expect.element(page.getByText(QUEST_STATUS_COPY.empty)).toBeVisible();
  await expect
    .element(page.getByText(QUESTS_COPY.none))
    .not.toBeInTheDocument();
});

for (const mode of THEME_MODES) {
  test(`inactive folder surfaces reveal the page while selected tabs remain distinct in ${mode}`, async () => {
    applyTheme("parchment", mode);
    await setViewport({ width: 1280, height: 800 });
    await render(<QuestStatusTabs quests={[FOX_QUEST]} />);
    const active = page.getByRole("tab", {
      name: QUEST_STATUS_COPY.labels.active,
      exact: true,
    });
    const completed = page.getByRole("tab", {
      name: QUEST_STATUS_COPY.labels.completed,
      exact: true,
    });
    await completed.hover();
    // Leave the inactive tab before measuring its resting surface.
    await active.hover();
    const selectedPaint = getComputedStyle(active.element());
    const inactivePaint = getComputedStyle(completed.element());
    // Inactive fills let the page's texture show through; the selected tab
    // shares the list's slightly translucent surface, more solid than they
    // are.
    const inactiveAlpha = parse(inactivePaint.backgroundColor)?.alpha ?? 1;
    const selectedAlpha = parse(selectedPaint.backgroundColor)?.alpha ?? 1;
    expect(inactiveAlpha, "an inactive tab's fill is see-through").toBeLessThan(
      selectedAlpha,
    );
    expect(selectedAlpha, "the selected tab is translucent").toBeLessThan(1);
    expect(inactivePaint.borderTopStyle).toBe("solid");
    expect(Number.parseFloat(inactivePaint.borderTopWidth)).toBeGreaterThan(0);
    expect(
      Number.parseFloat(inactivePaint.borderTopLeftRadius),
    ).toBeGreaterThan(0);
    await completed.click();
    await userEvent.keyboard("{ArrowLeft}");
    await expect.element(active).toHaveFocus();
    expect(getComputedStyle(active.element()).outlineStyle).toBe("solid");
  });
}
