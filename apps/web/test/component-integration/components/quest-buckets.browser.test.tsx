import type { JSX } from "react";
import { beforeAll, describe, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { QuestIdeas } from "@/components/quest-ideas.tsx";
import { QuestNotes } from "@/components/quest-notes.tsx";
import { SiteHeader } from "@/components/site-header.tsx";
import type { TasksActions } from "@/components/tasks/use-tasks.ts";
import type { WorkspaceSection } from "@/components/workspace-section.ts";
import { IDEA } from "@/ideas/idea.ts";
import { NOTE_ID } from "@/notes/note.ts";
import type { TasksState } from "@/tasks/tasks.ts";
import { THEME_MODES } from "@/themes/themes.ts";
import { IDEAS_COPY } from "@/ui/copy/ideas.ts";
import { QUEST_NOTES_COPY, QUICK_NOTE_COPY } from "@/ui/copy/notes.ts";
import { TASKS_COPY } from "@/ui/copy/tasks.ts";
import { questIdFixture } from "../../support/id-fixtures.ts";
import { QuestTasks } from "../app/(workspace)/quests/[questId]/task-rows-test-kit.tsx";
import {
  changeTasksAction,
  runChatCommandAction,
  undoTasksChangeAction,
} from "../tasks/tasks-actions-test-kit.ts";
import {
  installThemeFonts,
  loadFonts,
} from "../themes/theme-fonts-test-kit.ts";
import { applyTheme } from "../themes/theme-test-kit.ts";
import {
  measureTargets,
  pageScrollWidth,
  smallTargets,
} from "../touch-targets-test-kit.ts";
import {
  LAPTOP_VIEWPORT,
  NARROWEST_VIEWPORT,
  setViewport,
} from "../viewports-test-kit.ts";
import { chatSendMock, inConversation } from "./chat/chat-send-test-kit.tsx";
import { QuestSidebar } from "./quest-panel-test-kit.tsx";
import { openBucket } from "./quest-sidebar-test-kit.ts";

const QUEST_ID = questIdFixture();
const CONVERSATION = "Conversation";
const LONG_TEXT = "Unbroken".repeat(24);
const NOTE_TEXT = `${LONG_TEXT}\nKeep the next step small.`;
vi.mock("@/notes/note-actions.ts", () => ({ saveNoteAction: vi.fn() }));
const TASKS: TasksState = {
  version: 1,
  tasks: {
    items: [{ number: 1, text: LONG_TEXT, done: false, recurring: true }],
    nextNumber: 2,
  },
  undone: [],
};
const IDEA_FIXTURE = IDEA.parse({ id: crypto.randomUUID(), text: LONG_TEXT });
const ACTIONS: TasksActions = {
  change: changeTasksAction,
  undo: undoTasksChangeAction,
  command: runChatCommandAction,
};

function sections(): WorkspaceSection[] {
  return [
    {
      id: "tasks",
      label: TASKS_COPY.heading,
      bucket: true,
      content: (
        <QuestTasks
          questId={QUEST_ID}
          tasks={TASKS}
          actions={ACTIONS}
          days={[]}
        />
      ),
    },
    {
      id: "ideas",
      label: IDEAS_COPY.heading,
      bucket: true,
      content: <QuestIdeas ideas={[IDEA_FIXTURE]} embedded={true} />,
    },
    {
      id: "notes",
      label: QUEST_NOTES_COPY.heading,
      bucket: true,
      content: (
        <QuestNotes
          quest={{ id: QUEST_ID, status: "active" }}
          notes={[
            {
              id: NOTE_ID.parse(crypto.randomUUID()),
              text: NOTE_TEXT,
              savedAt: new Date("2026-11-16T12:00:00Z"),
            },
          ]}
        />
      ),
    },
  ];
}

function buckets(sidebar: boolean): JSX.Element {
  const entries = sections();
  if (sidebar) {
    return inConversation(
      chatSendMock(),
      <>
        <SiteHeader />
        <QuestSidebar sideSections={entries} initialSection="tasks">
          <p>{CONVERSATION}</p>
        </QuestSidebar>
      </>,
    );
  }
  return inConversation(
    chatSendMock(),
    <div className="page-slot p-4">
      {entries.map((entry) => (
        <section key={entry.id} aria-label={entry.label}>
          {entry.content}
        </section>
      ))}
    </div>,
  );
}

beforeAll(installThemeFonts);

describe.each(THEME_MODES)("Control desk in %s", (mode) => {
  test("empty buckets keep their add editors usable at 320 px", async () => {
    applyTheme("parchment", mode);
    await setViewport(NARROWEST_VIEWPORT);
    await loadFonts();
    await render(
      inConversation(
        chatSendMock(),
        <div className="page-slot p-4">
          <QuestTasks
            questId={QUEST_ID}
            tasks={{ ...TASKS, tasks: { items: [], nextNumber: 1 } }}
            actions={ACTIONS}
          />
          <QuestIdeas ideas={[]} />
          <QuestNotes quest={{ id: QUEST_ID, status: "active" }} notes={[]} />
        </div>,
      ),
    );
    await expect.element(page.getByText(TASKS_COPY.emptyHeading)).toBeVisible();
    await expect.element(page.getByText(IDEAS_COPY.emptyHeading)).toBeVisible();
    await expect
      .element(page.getByText(QUEST_NOTES_COPY.emptyHeading))
      .toBeVisible();
    expect(pageScrollWidth()).toBeLessThanOrEqual(NARROWEST_VIEWPORT.width);
    expect(smallTargets(await measureTargets())).toEqual([]);
    await page.getByRole("button", { name: TASKS_COPY.addPlaceholder }).click();
    await expect
      .element(page.getByRole("textbox", { name: TASKS_COPY.addLabel }))
      .toHaveFocus();
    expect(pageScrollWidth()).toBeLessThanOrEqual(NARROWEST_VIEWPORT.width);
    await page
      .getByRole("button", { name: TASKS_COPY.cancel, exact: true })
      .click();
    await page
      .getByRole("button", { name: IDEAS_COPY.add, exact: true })
      .click();
    await expect
      .element(
        page.getByRole("textbox", { name: IDEAS_COPY.label, exact: true }),
      )
      .toHaveFocus();
    expect(pageScrollWidth()).toBeLessThanOrEqual(NARROWEST_VIEWPORT.width);
  });

  for (const viewport of [NARROWEST_VIEWPORT, LAPTOP_VIEWPORT]) {
    test.each([false, true])(
      `fits at ${viewport.width} px with sidebar %s, including editors and menus`,
      async (sidebar) => {
        applyTheme("parchment", mode);
        await setViewport(viewport);
        await loadFonts();
        await render(buckets(sidebar));
        await expect
          .element(
            page.getByRole("button", { name: TASKS_COPY.addPlaceholder }),
          )
          .toBeVisible();
        expect(pageScrollWidth()).toBeLessThanOrEqual(viewport.width);
        expect(smallTargets(await measureTargets())).toEqual([]);
        await page
          .getByRole("button", { name: TASKS_COPY.addPlaceholder })
          .click();
        await expect
          .element(page.getByRole("textbox", { name: TASKS_COPY.addLabel }))
          .toBeVisible();
        expect(pageScrollWidth()).toBeLessThanOrEqual(viewport.width);
        await page
          .getByRole("button", { name: TASKS_COPY.cancel, exact: true })
          .click();
        if (sidebar) {
          await openBucket(IDEAS_COPY.heading);
        }
        await expect
          .element(page.getByRole("button", { name: IDEAS_COPY.move }))
          .toBeVisible();
        expect(pageScrollWidth()).toBeLessThanOrEqual(viewport.width);
        expect(smallTargets(await measureTargets())).toEqual([]);
        await page.getByRole("button", { name: IDEAS_COPY.edit }).click();
        await expect
          .element(page.getByRole("textbox", { name: IDEAS_COPY.label }))
          .toHaveValue(LONG_TEXT);
        await expect
          .element(page.getByRole("button", { name: IDEAS_COPY.move }))
          .not.toBeInTheDocument();
        expect(pageScrollWidth()).toBeLessThanOrEqual(viewport.width);
        await page.getByRole("button", { name: IDEAS_COPY.cancel }).click();
        await page
          .getByRole("list", { name: IDEAS_COPY.heading, exact: true })
          .getByRole("button", { name: IDEAS_COPY.actions(LONG_TEXT) })
          .click();
        await expect
          .element(page.getByRole("menuitem", { name: IDEAS_COPY.move }))
          .toBeVisible();
        expect(pageScrollWidth()).toBeLessThanOrEqual(viewport.width);
        await userEvent.keyboard("{Escape}");
        if (sidebar) {
          await openBucket(QUEST_NOTES_COPY.heading);
        }
        const notes = page.getByRole("list", {
          name: QUEST_NOTES_COPY.heading,
        });
        await expect.element(notes.getByText("Nov 16, 2026")).toBeVisible();
        await expect
          .element(notes.getByRole("button", { name: QUEST_NOTES_COPY.edit }))
          .toHaveTextContent(NOTE_TEXT, { normalizeWhitespace: false });
        expect(pageScrollWidth()).toBeLessThanOrEqual(viewport.width);
        expect(smallTargets(await measureTargets())).toEqual([]);
        await notes
          .getByRole("button", { name: QUEST_NOTES_COPY.edit })
          .click();
        await expect
          .element(
            notes.getByRole("textbox", { name: QUICK_NOTE_COPY.textLabel }),
          )
          .toHaveValue(NOTE_TEXT);
        expect(pageScrollWidth()).toBeLessThanOrEqual(viewport.width);
        await notes
          .getByRole("button", { name: QUEST_NOTES_COPY.cancel })
          .click();
        await expect.element(notes.getByText("Nov 16, 2026")).toBeVisible();
      },
    );
  }
});
