import { beforeEach, describe, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import QuestLayout from "@/app/(workspace)/quests/[questId]/(overview)/layout.tsx";
import QuestPage from "@/app/(workspace)/quests/[questId]/(overview)/page.tsx";
import { changeQuestStatusAction } from "@/app/(workspace)/quests/status-actions.ts";
import { listMessages } from "@/chats/store.ts";
import { findConversation } from "@/conversations/conversation-store.ts";
import { changeDayAction } from "@/dailies/day-actions.ts";
import { readDailiesRecord } from "@/dailies/day-store.ts";
import { getQuest } from "@/quests/store.ts";
import { changeQuestSpellAction } from "@/spells/quest-spell-action.ts";
import { getSpell } from "@/spells/spell.ts";
import { CHAT_COPY } from "@/ui/copy/chat.ts";
import { QUEST_CONVERSATION_COPY } from "@/ui/copy/conversation.ts";
import { QUEST_OVERVIEW_COPY } from "@/ui/copy/quest-overview.ts";
import { QUEST_SIDEBAR_COPY } from "@/ui/copy/quest-sidebar.ts";
import { QUEST_STATUS_COPY } from "@/ui/copy/quest-status.ts";
import { SPELL_MODE_COPY, SPELLBOOK_COPY } from "@/ui/copy/spells.ts";
import { TASKS_COPY } from "@/ui/copy/tasks.ts";
import { TIMER_COPY } from "@/ui/copy/timer.ts";
import {
  SIGNED_IN_USER,
  signInAs,
} from "../../../../auth/current-user-test-kit.ts";
import { changeTasksAction } from "../../../../tasks/tasks-actions-test-kit.ts";
import { applyTheme } from "../../../../themes/theme-test-kit.ts";
import {
  LAPTOP_VIEWPORT,
  NARROWEST_VIEWPORT,
  setViewport,
} from "../../../../viewports-test-kit.ts";
import { inWorkspace } from "../../../workspace-test-kit.tsx";
import { FOX_CONVERSATION, FOX_QUEST } from "../../page-fixtures.ts";

vi.mock(
  "@/auth/current-user.ts",
  () => import("../../../../auth/current-user-test-kit.ts"),
);
vi.mock("@/quests/store.ts", () => ({ getQuest: vi.fn() }));
vi.mock("@/chats/store.ts", () => ({
  listMessages: vi.fn(),
  readStoppedReply: vi.fn(),
}));
vi.mock("@/ideas/idea-store.ts", () => ({
  listIdeas: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/milestones/milestone-store.ts", () => ({
  listMilestones: vi.fn().mockResolvedValue([]),
}));
vi.mock(
  "@/tasks/tasks-actions.ts",
  () => import("../../../../tasks/tasks-actions-test-kit.ts"),
);
vi.mock(
  "@/tasks/tasks-store.ts",
  () => import("../../../../tasks/tasks-store-test-kit.ts"),
);
vi.mock(
  "@/dailies/day-store.ts",
  () => import("../../../../dailies/day-store-test-kit.ts"),
);
vi.mock(
  "next/navigation",
  () => import("../../../../components/router-test-kit.ts"),
);

const PATH = `/quests/${FOX_QUEST.id}`;
const PARAMS = Promise.resolve({ questId: FOX_QUEST.id });

async function questPage(section?: string): Promise<React.JSX.Element> {
  const content = await QuestPage({
    params: PARAMS,
    searchParams: Promise.resolve({ section }),
  });
  return inWorkspace(<QuestLayout params={PARAMS}>{content}</QuestLayout>);
}

function composer(): ReturnType<typeof page.getByRole> {
  return page.getByRole("textbox", { name: CHAT_COPY.messageLabel });
}

beforeEach(() => {
  vi.clearAllMocks();
  signInAs(SIGNED_IN_USER);
  vi.mocked(getQuest).mockResolvedValue(FOX_QUEST);
  vi.mocked(findConversation).mockResolvedValue(undefined);
  vi.mocked(listMessages).mockResolvedValue([]);
  vi.mocked(readDailiesRecord).mockResolvedValue({ days: [], undoable: false });
});

describe("use_case_open_quest", () => {
  test("opens on an overview with section links and no conversation entry point", async () => {
    await render(await questPage());
    await expect
      .element(page.getByRole("heading", { name: FOX_QUEST.name }))
      .toBeVisible();
    await expect
      .element(page.getByRole("heading", { name: QUEST_SIDEBAR_COPY.nextTask }))
      .toBeVisible();
    const links = page
      .getByRole("navigation", { name: QUEST_OVERVIEW_COPY.sections })
      .getByRole("link")
      .all();
    expect(links.map((link) => link.element().getAttribute("href"))).toEqual(
      ["tasks", "ideas", "notes", "progress", "spells", "members"].map(
        (section) => `${PATH}?section=${section}`,
      ),
    );
    await expect.element(composer()).not.toBeInTheDocument();
    expect(listMessages).not.toHaveBeenCalled();
  });

  test("use_case_tasks_panel", async () => {
    changeTasksAction.mockResolvedValue({
      kind: "changed",
      version: 4,
      lines: [],
      state: {
        version: 4,
        tasks: {
          items: [{ number: 1, text: "Make a sketch", done: false }],
          nextNumber: 2,
        },
        undone: [],
      },
    });
    await render(await questPage("tasks"));
    await expect
      .element(page.getByRole("link", { name: QUEST_OVERVIEW_COPY.back }))
      .toHaveAttribute("href", PATH);
    await page.getByRole("button", { name: TASKS_COPY.addPlaceholder }).click();
    await page
      .getByRole("textbox", { name: TASKS_COPY.addLabel })
      .fill("Make a sketch");
    await userEvent.keyboard("{Enter}");
    await expect.element(page.getByText("Make a sketch")).toBeVisible();
    expect(changeTasksAction).toHaveBeenCalledWith(
      expect.objectContaining({ questId: FOX_QUEST.id, chatId: undefined }),
    );
    await expect.element(composer()).not.toBeInTheDocument();
  });

  test("status actions work with an active spell", async () => {
    vi.mocked(findConversation).mockResolvedValue({
      ...FOX_CONVERSATION,
      spellStartedAt: "2026-11-18T12:00:00Z",
      activeSpell: getSpell("tasks"),
    });
    vi.mocked(changeQuestStatusAction).mockResolvedValue({
      kind: "saved",
      message: QUEST_STATUS_COPY.saved.completed,
    });
    await render(await questPage("spells"));
    await page
      .getByRole("button", { name: QUEST_STATUS_COPY.complete, exact: true })
      .click();
    await expect
      .element(page.getByText(QUEST_STATUS_COPY.saved.completed))
      .toBeVisible();
    await expect.element(composer()).toBeVisible();
  });
});

describe("use_case_dailies", () => {
  test("offers Day grid and runs Start Day and Undo from the overview", async () => {
    vi.mocked(getQuest).mockResolvedValue({ ...FOX_QUEST, dailies: true });
    vi.mocked(findConversation).mockResolvedValue(FOX_CONVERSATION);
    vi.mocked(changeDayAction).mockResolvedValue({ kind: "saved" });
    const view = await render(await questPage());
    await expect
      .element(page.getByRole("link", { name: QUEST_SIDEBAR_COPY.dayGrid }))
      .toHaveAttribute("href", `${PATH}?section=days`);
    await expect
      .element(page.getByRole("heading", { name: QUEST_SIDEBAR_COPY.nextTask }))
      .not.toBeInTheDocument();
    await page
      .getByRole("button", { name: QUEST_CONVERSATION_COPY.startDay })
      .click();
    const dialog = page.getByRole("dialog", {
      name: QUEST_CONVERSATION_COPY.startDay,
    });
    await dialog
      .getByRole("checkbox", { name: QUEST_CONVERSATION_COPY.clearIdeas })
      .click();
    await dialog
      .getByRole("button", { name: QUEST_CONVERSATION_COPY.startDay })
      .click();
    await expect.element(dialog).not.toBeInTheDocument();
    expect(changeDayAction).toHaveBeenCalledWith(
      expect.objectContaining({
        op: "start",
        questId: FOX_QUEST.id,
        clearIdeas: true,
        clearTasks: false,
      }),
    );

    vi.mocked(readDailiesRecord).mockResolvedValue({
      days: [],
      undoable: true,
    });
    await view.rerender(await questPage());
    await page
      .getByRole("button", { name: QUEST_CONVERSATION_COPY.undoStartDay })
      .click();
    expect(changeDayAction).toHaveBeenLastCalledWith({
      op: "undo",
      questId: FOX_QUEST.id,
      chatId: FOX_CONVERSATION.id,
    });
    await view.rerender(await questPage("days"));
    await expect
      .element(page.getByRole("link", { name: QUEST_OVERVIEW_COPY.back }))
      .toBeVisible();
  });
});

test("use_case_tailored_quest_overviews", async () => {
  const view = await render(await questPage());
  vi.mocked(getQuest).mockResolvedValue({
    ...FOX_QUEST,
    name: "Morning work",
    dailies: true,
  });
  await view.rerender(await questPage());
  await expect
    .element(
      page.getByRole("button", { name: QUEST_CONVERSATION_COPY.startDay }),
    )
    .toBeVisible();
  await expect
    .element(page.getByRole("link", { name: QUEST_SIDEBAR_COPY.dayGrid }))
    .toBeVisible();

  vi.mocked(getQuest).mockResolvedValue({
    ...FOX_QUEST,
    dailies: true,
    status: "abandoned",
  });
  await view.rerender(await questPage());
  await expect
    .element(page.getByText(QUEST_SIDEBAR_COPY.restoreDay))
    .toBeVisible();
  await expect
    .element(
      page.getByRole("button", { name: QUEST_CONVERSATION_COPY.startDay }),
    )
    .not.toBeInTheDocument();

  vi.mocked(getQuest).mockResolvedValue({ ...FOX_QUEST, name: "Dailies" });
  await view.rerender(await questPage());
  await expect
    .element(page.getByRole("heading", { name: QUEST_SIDEBAR_COPY.nextTask }))
    .toBeVisible();
  await expect
    .element(page.getByRole("link", { name: QUEST_SIDEBAR_COPY.dayGrid }))
    .not.toBeInTheDocument();
});

test("casting opens the composer and stopping removes the whole conversation", async () => {
  vi.mocked(changeQuestSpellAction).mockResolvedValue({ kind: "saved" });
  const view = await render(await questPage("spells"));
  await expect.element(composer()).not.toBeInTheDocument();
  await page
    .getByRole("button", { name: SPELLBOOK_COPY.castNamed("Brainstorm") })
    .click();
  expect(changeQuestSpellAction).toHaveBeenLastCalledWith({
    questId: FOX_QUEST.id,
    spell: "brainstorm",
  });
  vi.mocked(findConversation).mockResolvedValue({
    ...FOX_CONVERSATION,
    spellStartedAt: "2026-11-18T12:00:00Z",
    activeSpell: getSpell("brainstorm"),
  });
  await view.rerender(await questPage("tasks"));
  await expect.element(composer()).toBeVisible();
  await expect
    .element(page.getByRole("button", { name: TASKS_COPY.addPlaceholder }))
    .toBeEnabled();
  await page
    .getByRole("button", { name: SPELL_MODE_COPY.stop("Brainstorm") })
    .click();
  expect(changeQuestSpellAction).toHaveBeenLastCalledWith({
    questId: FOX_QUEST.id,
  });
  vi.mocked(findConversation).mockResolvedValue(FOX_CONVERSATION);
  await view.rerender(await questPage("tasks"));
  await expect.element(composer()).not.toBeInTheDocument();
  await expect
    .element(page.getByRole("list", { name: CHAT_COPY.conversationLabel }))
    .not.toBeInTheDocument();
});

describe("use_case_timer_quest_panel", () => {
  for (const viewport of [LAPTOP_VIEWPORT, NARROWEST_VIEWPORT]) {
    for (const active of [true, false]) {
      test(`starts in place at ${viewport.width} px with spell ${active}`, async () => {
        await setViewport(viewport);
        applyTheme("parchment", "dark");
        if (active) {
          vi.mocked(findConversation).mockResolvedValue({
            ...FOX_CONVERSATION,
            spellStartedAt: "2026-11-18T12:00:00Z",
            activeSpell: getSpell("tasks"),
          });
        }
        await render(await questPage());
        if (viewport === NARROWEST_VIEWPORT) {
          await page
            .getByRole("button", { name: TIMER_COPY.panel.expand })
            .click();
        }
        const panel = page.getByRole("dialog", {
          name: TIMER_COPY.panel.label,
        });
        await panel.getByLabelText(TIMER_COPY.workLabel).selectOptions("25");
        await panel.getByLabelText(TIMER_COPY.breakLabel).selectOptions("10");
        await panel
          .getByRole("button", { name: TIMER_COPY.start, exact: true })
          .click();
        await expect
          .element(
            panel.getByRole("heading", { name: TIMER_COPY.phase("work") }),
          )
          .toBeVisible();
        await expect
          .element(
            panel.getByRole("timer", { name: TIMER_COPY.remainingLabel }),
          )
          .toBeVisible();
        const nextPhase = panel
          .getByText(TIMER_COPY.nextWithMinutes(TIMER_COPY.next("break"), 10))
          .element()
          .getBoundingClientRect();
        const reset = panel
          .getByRole("button", { name: TIMER_COPY.startAgain })
          .element()
          .getBoundingClientRect();
        expect(nextPhase.bottom).toBeLessThanOrEqual(reset.top);
        expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
          viewport.width,
        );
        await panel
          .getByRole("button", { name: TIMER_COPY.panel.collapse })
          .click();
        await expect
          .element(page.getByRole("heading", { name: FOX_QUEST.name }))
          .toBeVisible();
      });
    }
  }
});
