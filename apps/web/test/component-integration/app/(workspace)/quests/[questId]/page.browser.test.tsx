import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import QuestLayout from "@/app/(stream)/(site)/(workspace)/quests/[questId]/(overview)/layout.tsx";
import QuestPage from "@/app/(stream)/(site)/(workspace)/quests/[questId]/(overview)/page.tsx";
import type { QuestActionResult } from "@/components/use-quest-action.ts";
import { ITEM_LIST_TYPE, LIST_ID, type ListType } from "@/lists/list.ts";
import { saveListAction } from "@/lists/list-actions.ts";
import { changeListItemAction } from "@/lists/list-item-actions.ts";
import { readNextTasks } from "@/lists/list-item-store.ts";
import { type List, readLists } from "@/lists/list-store.ts";
import { startPerformanceAction } from "@/performances/performance-actions.ts";
import { listPerformances } from "@/performances/performance-store.ts";
import { listQuestPeople } from "@/quests/membership-store.ts";
import { getQuest, type Quest } from "@/quests/store.ts";
import { BUILT_IN_RITES } from "@/rites/rite.ts";
import { listRites } from "@/rites/rite-store.ts";
import { readTaskHistory } from "@/streaks/streak-store.ts";
import type { TaskHistory } from "@/streaks/streaks.ts";
import { LIST_PAGE_COPY } from "@/ui/copy/list-page.ts";
import { LISTS_COPY } from "@/ui/copy/lists.ts";
import { PERFORMANCE_COPY } from "@/ui/copy/performances.ts";
import { QUEST_MEMBERS_COPY } from "@/ui/copy/quest-members.ts";
import { QUEST_OVERVIEW_COPY } from "@/ui/copy/quest-overview.ts";
import { QUEST_SIDEBAR_COPY } from "@/ui/copy/quest-sidebar.ts";
import { QUEST_STATUS_COPY } from "@/ui/copy/quest-status.ts";
import { TIMER_COPY } from "@/ui/copy/timer.ts";
import { ZOTERO_COPY } from "@/ui/copy/zotero.ts";
import {
  SIGNED_IN_USER,
  signInAs,
} from "../../../../auth/current-user-test-kit.ts";
import { replace } from "../../../../components/router-test-kit.ts";
import { PERFORMANCE } from "../../../../performances/performance-test-kit.tsx";
import {
  DONE_TASK,
  FOURTH_TASK,
  mockQuestOverview,
  NEXT_TASK,
  OWN_RITE,
  PHRASES,
  TASKS,
} from "../../../../quests/quest-overview-fixtures.ts";
import {
  SKETCH,
  SKETCH_ID,
} from "../../../../streaks/streak-quest-fixtures.ts";
import { applyTheme } from "../../../../themes/theme-test-kit.ts";
import {
  LAPTOP_VIEWPORT,
  NARROWEST_VIEWPORT,
  setViewport,
} from "../../../../viewports-test-kit.ts";
import { inWorkspace } from "../../../workspace-test-kit.tsx";
import { FOX_QUEST } from "../../page-fixtures.ts";

vi.mock(
  "@/auth/current-user.ts",
  () => import("../../../../auth/current-user-test-kit.ts"),
);
vi.mock("@/quests/store.ts", () => ({ getQuest: vi.fn() }));
vi.mock(
  "next/navigation",
  () => import("../../../../components/router-test-kit.ts"),
);

const LIST: List = {
  id: LIST_ID.parse("a0c7c952-9f82-4640-9584-45e01b0c2513"),
  position: 0,
  name: "Bench",
  type: "task",
  version: 0,
};

beforeEach(async () => {
  await setViewport(LAPTOP_VIEWPORT);
  signInAs(SIGNED_IN_USER);
  vi.mocked(readLists).mockResolvedValue([LIST]);
  vi.mocked(listQuestPeople).mockResolvedValue(undefined);
  vi.mocked(listPerformances).mockResolvedValue([]);
  vi.mocked(readTaskHistory).mockResolvedValue(HISTORY);
  vi.mocked(readNextTasks).mockResolvedValue([]);
  vi.mocked(listRites).mockResolvedValue([]);
});

afterEach(async () => {
  await setViewport(LAPTOP_VIEWPORT);
});

// A quest's check-offs of its stretch: a day missed on 2026-11-14 and
// 2026-11-16, and today, 2026-11-18, with the stretch not done yet.
const HISTORY: TaskHistory = {
  today: "2026-11-18",
  timeZone: "UTC",
  checkOffs: [
    {
      number: 1,
      dates: [
        "2026-11-10",
        "2026-11-11",
        "2026-11-12",
        "2026-11-13",
        "2026-11-15",
        "2026-11-17",
      ],
    },
  ],
};

// The quest page with and without an active performance.
const PERFORMANCE_STATES = [
  { name: "with an active performance", performances: [PERFORMANCE] },
  { name: "with no active performance", performances: [] },
] as const;

async function questView(
  quest: Quest,
  section?: string,
): Promise<React.JSX.Element> {
  vi.mocked(getQuest).mockResolvedValue(quest);
  const params = Promise.resolve({ questId: quest.id });
  const content = await QuestPage({
    params,
    searchParams: Promise.resolve({ section }),
  });
  return inWorkspace(<QuestLayout params={params}>{content}</QuestLayout>);
}

async function open(quest: Quest, section?: string): ReturnType<typeof render> {
  return render(await questView(quest, section));
}

// The quest panel's link to the quest's Members, named and then hinted.
const MEMBERS_LINK = new RegExp(`^${QUEST_MEMBERS_COPY.heading}`, "u");
// The section for the list Tasks, named and then sized.
const TASKS_SECTION = new RegExp(`^${TASKS.name} `, "u");

test("use_case_open_quest", async () => {
  vi.mocked(listRites).mockResolvedValue([...BUILT_IN_RITES]);
  await open(FOX_QUEST);
  await expect
    .element(page.getByRole("link", { name: `${LIST.name} 0 open` }))
    .toHaveAttribute("href", `/quests/${FOX_QUEST.id}?section=${LIST.id}`);
  await expect
    .element(
      page.getByRole("button", {
        name: QUEST_OVERVIEW_COPY.performRiteOn(LIST.name),
      }),
    )
    .toBeVisible();
  await expect
    .element(page.getByRole("link", { name: MEMBERS_LINK }))
    .toHaveAttribute("href", `/quests/${FOX_QUEST.id}?section=members`);
  await expect
    .element(page.getByRole("textbox", { name: "Message" }))
    .not.toBeInTheDocument();
});

// Holds the list item action's next change unsaved until the returned
// function saves it.
function holdListItemAction(): () => void {
  let finish: (result: QuestActionResult) => void = () => undefined;
  vi.mocked(changeListItemAction)
    .mockReset()
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
  return (): void => finish({ kind: "saved" });
}

test("use_case_open_quest: a list section checks off its next task and hides it", async () => {
  mockQuestOverview();
  const finish = holdListItemAction();
  await open(FOX_QUEST);
  const section = page.getByRole("region", { name: TASKS_SECTION });
  await expect.element(section.getByText("5 open")).toBeVisible();
  await expect
    .element(
      section
        .getByRole("listitem")
        .filter({ hasText: NEXT_TASK.text })
        .getByRole("img", { name: QUEST_SIDEBAR_COPY.nextTask }),
    )
    .toBeVisible();
  await expect
    .element(section.getByText(DONE_TASK.text))
    .not.toBeInTheDocument();
  await expect
    .element(section.getByText(FOURTH_TASK.text))
    .not.toBeInTheDocument();
  await expect
    .element(
      section.getByRole("link", {
        name: QUEST_OVERVIEW_COPY.more(1, TASKS.name),
      }),
    )
    .toHaveAttribute("href", `/quests/${FOX_QUEST.id}?section=${TASKS.id}`);
  await section
    .getByRole("listitem")
    .filter({ hasText: NEXT_TASK.text })
    .getByRole("checkbox", { name: LISTS_COPY.checkOff })
    .click();
  // Until the saved check-off comes back with the page without the task.
  await expect
    .element(section.getByText(NEXT_TASK.text))
    .not.toBeInTheDocument();
  await expect.element(section.getByText(FOURTH_TASK.text)).toBeVisible();
  await expect.element(section.getByText("4 open")).toBeVisible();
  expect(changeListItemAction).toHaveBeenLastCalledWith({
    questId: FOX_QUEST.id,
    listId: TASKS.id,
    change: { kind: "check", id: NEXT_TASK.id, checkedOff: true },
  });
  finish();
});

// The heading the overview no longer has: recurring tasks show in their lists.
const TODAY_HEADING = /^Today/u;
// The stretch's streak: done today, after a day missed on 2026-11-20.
const STRETCH_STREAK = "4-day streak";

test("use_case_open_quest: a list section checks off recurring tasks in place, with their streaks", async () => {
  mockQuestOverview();
  const finish = holdListItemAction();
  await open(FOX_QUEST);
  await expect
    .element(page.getByRole("heading", { name: TODAY_HEADING }))
    .not.toBeInTheDocument();
  const section = page.getByRole("region", { name: TASKS_SECTION });
  await expect.element(section.getByText(STRETCH_STREAK)).toBeVisible();
  const sketch = section.getByRole("listitem").filter({ hasText: SKETCH });
  await sketch.getByRole("checkbox", { name: LISTS_COPY.checkOff }).click();
  await expect
    .element(sketch.getByRole("checkbox", { name: LISTS_COPY.uncheck }))
    .toBeChecked();
  await expect.element(section.getByText("4 open")).toBeVisible();
  expect(changeListItemAction).toHaveBeenLastCalledWith({
    questId: FOX_QUEST.id,
    listId: TASKS.id,
    change: { kind: "check", id: SKETCH_ID, checkedOff: true },
  });
  finish();
});

describe("use_case_open_quest: the add box", () => {
  const AddBox = QUEST_OVERVIEW_COPY.addBox;

  function addBox(): ReturnType<typeof page.getByRole> {
    return page.getByRole("form", { name: AddBox.label });
  }

  beforeEach(() => {
    mockQuestOverview();
    vi.mocked(changeListItemAction)
      .mockReset()
      .mockResolvedValue({ kind: "saved" });
  });

  test("adds to the first task list and stays ready for the next", async () => {
    await open(FOX_QUEST);
    const field = addBox().getByRole("searchbox", {
      name: LIST_PAGE_COPY.searchIn("task", TASKS.name),
    });
    await expect
      .element(addBox().getByRole("radio", { name: TASKS.name }))
      .toBeChecked();
    await field.fill("Order the textbook");
    await userEvent.keyboard("{Enter}");
    expect(changeListItemAction).toHaveBeenLastCalledWith({
      questId: FOX_QUEST.id,
      listId: TASKS.id,
      change: { kind: "add", text: "Order the textbook" },
    });
    await expect.element(field).toHaveValue("");
    await expect.element(field).toHaveFocus();
    await expect
      .element(
        addBox().getByText(AddBox.added("Order the textbook", TASKS.name)),
      )
      .toBeVisible();
  });

  test("adds to the list chosen under it", async () => {
    await open(FOX_QUEST);
    await addBox().getByRole("radio", { name: PHRASES.name }).click();
    const field = addBox().getByRole("searchbox", {
      name: LIST_PAGE_COPY.searchIn("quick-note", PHRASES.name),
    });
    await expect.element(field).toHaveFocus();
    await expect
      .element(
        page.getByRole("region", {
          name: new RegExp(`^${PHRASES.name} `, "u"),
        }),
      )
      .toHaveAttribute("data-target", "true");
    await field.fill("¿Dónde está la estación?");
    await userEvent.keyboard("{Enter}");
    expect(changeListItemAction).toHaveBeenLastCalledWith({
      questId: FOX_QUEST.id,
      listId: PHRASES.id,
      change: { kind: "add", text: "¿Dónde está la estación?" },
    });
  });

  test("searches every list's section as it is typed in, and Escape clears it", async () => {
    await open(FOX_QUEST);
    const field = addBox().getByRole("searchbox", {
      name: LIST_PAGE_COPY.searchIn("task", TASKS.name),
    });
    await expect
      .element(addBox().getByText(LIST_PAGE_COPY.hint("task")))
      .toBeVisible();
    const tasks = page.getByRole("region", { name: TASKS_SECTION });
    const phrases = page.getByRole("region", {
      name: new RegExp(`^${PHRASES.name} `, "u"),
    });
    await field.fill("SUBTITLES");
    await expect
      .element(
        tasks.getByRole("listitem").filter({ hasText: FOURTH_TASK.text }),
      )
      .toBeVisible();
    await expect
      .element(tasks.getByText("subtitles", { exact: true }))
      .toHaveClass("editable-match");
    await expect
      .element(tasks.getByText(NEXT_TASK.text))
      .not.toBeInTheDocument();
    await expect
      .element(
        tasks.getByRole("link", {
          name: QUEST_OVERVIEW_COPY.more(1, TASKS.name),
        }),
      )
      .not.toBeInTheDocument();
    await expect
      .element(
        phrases.getByText(LIST_PAGE_COPY.noMatch("quick-note", "SUBTITLES")),
      )
      .toBeVisible();
    await expect
      .element(
        addBox().getByText(LIST_PAGE_COPY.matches("task", 1, "SUBTITLES")),
      )
      .toBeVisible();
    await userEvent.keyboard("{Escape}");
    await expect.element(field).toHaveValue("");
    await expect.element(tasks.getByText(NEXT_TASK.text)).toBeVisible();
    await expect
      .element(tasks.getByText(FOURTH_TASK.text))
      .not.toBeInTheDocument();
  });

  test("won't add a task its list already has", async () => {
    await open(FOX_QUEST);
    const field = addBox().getByRole("searchbox", {
      name: LIST_PAGE_COPY.searchIn("task", TASKS.name),
    });
    await field.fill(DONE_TASK.text.toUpperCase());
    await expect
      .element(addBox().getByText(LIST_PAGE_COPY.already(DONE_TASK.text, true)))
      .toBeVisible();
    await userEvent.keyboard("{Enter}");
    expect(changeListItemAction).not.toHaveBeenCalled();
    await expect.element(field).toHaveValue(DONE_TASK.text.toUpperCase());
  });
});

// The New list dialog's title on either step.
const NEW_LIST_TITLE = /^New /u;

describe("use_case_set_up_list: New list", () => {
  const dialogCopy = QUEST_OVERVIEW_COPY.newList;

  // The dialog, named New list on its first step and for the kind chosen
  // on its second.
  function dialog(): ReturnType<typeof page.getByRole> {
    return page.getByRole("dialog", { name: NEW_LIST_TITLE });
  }

  async function openNewList(quest: Quest): Promise<void> {
    await open(quest);
    await page
      .getByRole("form", { name: QUEST_OVERVIEW_COPY.addBox.label })
      .getByRole("button", { name: QUEST_OVERVIEW_COPY.addBox.newList })
      .click();
    await vi.waitFor(() => dialog().element());
  }

  // A kind's tile, named for the kind and then what it is for.
  function typeChoice(type: ListType): ReturnType<typeof page.getByRole> {
    return dialog().getByRole("radio", {
      name: new RegExp(`^${LISTS_COPY.types[type]} `, "u"),
    });
  }

  // Chooses the kind on the first step, then goes on with Next.
  async function chooseKind(type: ListType): Promise<void> {
    await typeChoice(type).click();
    await dialog().getByRole("button", { name: dialogCopy.next }).click();
  }

  // The step the dialog is on, as its step marks say.
  function currentStep(): string | undefined {
    const steps = dialog()
      .getByRole("list", { name: dialogCopy.steps })
      .query();
    return steps?.querySelector('[aria-current="step"]')?.textContent;
  }

  beforeEach(() => {
    mockQuestOverview();
    vi.mocked(replace).mockReset();
  });

  test("makes a list of the chosen kind, and the add box moves to it", async () => {
    vi.mocked(saveListAction).mockReset().mockResolvedValue({ saved: true });
    await openNewList(FOX_QUEST);
    await expect
      .element(page.getByRole("dialog", { name: dialogCopy.title }))
      .toBeVisible();
    await expect.poll(currentStep).toContain(dialogCopy.kind);
    await expect.element(typeChoice("task")).toBeChecked();
    await chooseKind("tally");
    await expect
      .element(page.getByRole("dialog", { name: dialogCopy.titleOf("tally") }))
      .toBeVisible();
    await expect.poll(currentStep).toContain(dialogCopy.details);
    const name = dialog().getByRole("textbox", {
      name: LISTS_COPY.fields.name,
    });
    await expect.element(name).toHaveFocus();
    await name.fill("Words");
    await dialog().getByRole("button", { name: dialogCopy.create }).click();
    const form = vi.mocked(saveListAction).mock.lastCall?.[1];
    expect(form?.get("questId")).toBe(FOX_QUEST.id);
    expect(form?.get("name")).toBe("Words");
    expect(form?.get("type")).toBe("tally");
    expect(changeListItemAction).not.toHaveBeenCalled();
    await expect.element(dialog()).not.toBeInTheDocument();
    await expect
      .element(page.getByText(QUEST_OVERVIEW_COPY.addBox.made("Words")))
      .toBeVisible();
  });

  test("Back returns to the kinds with the chosen kind still chosen", async () => {
    await openNewList(FOX_QUEST);
    await chooseKind("plain");
    await dialog().getByRole("button", { name: dialogCopy.back }).click();
    await expect.poll(currentStep).toContain(dialogCopy.kind);
    await expect.element(typeChoice("plain")).toBeChecked();
    await expect.element(typeChoice("plain")).toHaveFocus();
  });

  test("a refused name keeps the dialog open with the reason", async () => {
    vi.mocked(saveListAction)
      .mockReset()
      .mockResolvedValue({ error: LISTS_COPY.unavailable });
    await openNewList(FOX_QUEST);
    await chooseKind("task");
    await dialog()
      .getByRole("textbox", { name: LISTS_COPY.fields.name })
      .fill("Reading");
    await dialog().getByRole("button", { name: dialogCopy.create }).click();
    await expect
      .element(dialog().getByRole("alert"))
      .toHaveTextContent(LISTS_COPY.unavailable);
    await expect
      .element(dialog().getByRole("textbox", { name: LISTS_COPY.fields.name }))
      .toHaveValue("Reading");
  });

  test("Zotero Collection opens Zotero setup, for the quest's owner alone", async () => {
    await openNewList(FOX_QUEST);
    await chooseKind("zotero-collection");
    expect(replace).toHaveBeenCalledWith(
      `/quests/${FOX_QUEST.id}?section=zotero`,
      { scroll: false },
    );
    await expect
      .element(
        page.getByRole("dialog", {
          name: dialogCopy.titleOf("zotero-collection"),
        }),
      )
      .toBeVisible();
    await expect
      .element(dialog().getByText(dialogCopy.loadingZotero))
      .toBeVisible();
  });

  test("a quest member's New list offers no Zotero Collection", async () => {
    await openNewList({
      ...FOX_QUEST,
      sharing: { kind: "joined", owner: "Rowan Owner" },
    });
    await expect
      .element(dialog().getByRole("radio"))
      .toHaveLength(ITEM_LIST_TYPE.options.length);
    await expect
      .element(typeChoice("zotero-collection"))
      .not.toBeInTheDocument();
  });

  test("Zotero's return opens the dialog on its setup, and closing leaves it", async () => {
    await open(FOX_QUEST, "zotero");
    await expect
      .element(
        page.getByRole("dialog", {
          name: dialogCopy.titleOf("zotero-collection"),
        }),
      )
      .toBeVisible();
    await expect.poll(currentStep).toContain(dialogCopy.details);
    await expect
      .element(
        dialog().getByRole("button", { name: ZOTERO_COPY.setup.connect }),
      )
      .toBeVisible();
    await dialog().getByRole("button", { name: dialogCopy.close }).click();
    expect(replace).toHaveBeenCalledWith(`/quests/${FOX_QUEST.id}`, {
      scroll: false,
    });
  });
});

test("use_case_open_quest: a list section's Add opens an editor under its items", async () => {
  mockQuestOverview();
  vi.mocked(changeListItemAction)
    .mockReset()
    .mockResolvedValue({ kind: "saved" });
  await open(FOX_QUEST);
  const section = page.getByRole("region", { name: TASKS_SECTION });
  const label = QUEST_OVERVIEW_COPY.addTo("task", TASKS.name);
  const opener = section.getByRole("button", { name: label });
  await opener.click();
  const field = section.getByRole("textbox", { name: label });
  await expect.element(field).toHaveFocus();
  await field.fill("Read a chapter aloud");
  await userEvent.keyboard("{Enter}");
  expect(changeListItemAction).toHaveBeenLastCalledWith({
    questId: FOX_QUEST.id,
    listId: TASKS.id,
    change: { kind: "add", text: "Read a chapter aloud" },
  });
  await expect.element(field).toHaveValue("");
  await expect.element(field).toHaveFocus();
  await userEvent.keyboard("{Escape}");
  await expect.element(field).not.toBeInTheDocument();
  await expect.element(opener).toHaveFocus();
});

// The rite dialog's choices, named for the rite and then its first message.
const OWN_RITE_CHOICE = new RegExp(`^${OWN_RITE.name}`, "u");
const BRAINSTORM_CHOICE = /^Brainstorm/u;

describe("use_case_perform_rite", () => {
  function riteDialog(): ReturnType<typeof page.getByRole> {
    return page.getByRole("dialog", { name: QUEST_OVERVIEW_COPY.performRite });
  }

  async function openRiteDialog(): ReturnType<typeof render> {
    mockQuestOverview();
    const view = await open(FOX_QUEST);
    await page
      .getByRole("button", {
        name: QUEST_OVERVIEW_COPY.performRiteOn(TASKS.name),
      })
      .click();
    await vi.waitFor(() => riteDialog().element());
    return view;
  }

  test("performs the chosen rite on the section's list", async () => {
    vi.mocked(startPerformanceAction).mockReset().mockResolvedValue(undefined);
    const view = await openRiteDialog();
    const dialog = riteDialog();
    await expect
      .element(dialog.getByText(QUEST_OVERVIEW_COPY.rite.on(TASKS.name)))
      .toBeVisible();
    await expect
      .element(
        dialog
          .getByRole("group", { name: QUEST_OVERVIEW_COPY.rite.own })
          .getByRole("radio", { name: OWN_RITE_CHOICE }),
      )
      .toBeVisible();
    await dialog.getByRole("radio", { name: BRAINSTORM_CHOICE }).click();
    await dialog
      .getByRole("button", { name: PERFORMANCE_COPY.start, exact: true })
      .click();
    expect(startPerformanceAction).toHaveBeenLastCalledWith({
      questId: FOX_QUEST.id,
      riteId: "brainstorm",
      listId: TASKS.id,
    });
    await expect.element(dialog).toBeVisible();
    vi.mocked(listPerformances).mockResolvedValue([PERFORMANCE]);
    await view.rerender(await questView(FOX_QUEST));
    await expect.element(dialog).not.toBeInTheDocument();
    await expect
      .element(page.getByRole("heading", { name: PERFORMANCE.rite.name }))
      .toHaveFocus();
  });

  test("keeps the dialog open and says why when the performance is refused", async () => {
    vi.mocked(startPerformanceAction)
      .mockReset()
      .mockResolvedValue(PERFORMANCE_COPY.unavailable);
    await openRiteDialog();
    const dialog = riteDialog();
    await dialog
      .getByRole("button", { name: PERFORMANCE_COPY.start, exact: true })
      .click();
    await expect
      .element(dialog.getByRole("alert"))
      .toHaveTextContent(PERFORMANCE_COPY.unavailable);
    await dialog
      .getByRole("button", { name: QUEST_OVERVIEW_COPY.rite.cancel })
      .click();
    await expect.element(dialog).not.toBeInTheDocument();
    expect(startPerformanceAction).toHaveBeenCalledOnce();
  });
});

test("use_case_quest_panel", async () => {
  await open(FOX_QUEST);
  await expect
    .element(page.getByRole("link", { name: MEMBERS_LINK }))
    .toHaveTextContent(
      `${QUEST_MEMBERS_COPY.heading} ${QUEST_OVERVIEW_COPY.membersHint(1)}`,
    );
  const status = page.getByRole("region", { name: QUEST_OVERVIEW_COPY.status });
  await expect
    .element(status.getByRole("button", { name: QUEST_STATUS_COPY.complete }))
    .toBeVisible();
  await expect
    .element(status.getByRole("button", { name: QUEST_STATUS_COPY.abandon }))
    .toBeVisible();
});

test("use_case_quest_panel on Life has no status controls", async () => {
  await open({ ...FOX_QUEST, life: true });
  await expect
    .element(page.getByRole("link", { name: MEMBERS_LINK }))
    .toBeVisible();
  await expect
    .element(page.getByRole("region", { name: QUEST_OVERVIEW_COPY.status }))
    .not.toBeInTheDocument();
});

test("use_case_tailored_quest_overviews", async () => {
  await open({ ...FOX_QUEST, name: "Morning", status: "completed" });
  await expect
    .element(page.getByRole("button", { name: "Start Day" }))
    .not.toBeInTheDocument();
  await expect
    .element(page.getByRole("button", { name: QUEST_STATUS_COPY.restore }))
    .toBeVisible();
});

test("use_case_tasks_panel", async () => {
  await open(FOX_QUEST, LIST.id);
  await expect
    .element(page.getByRole("heading", { name: "Bench" }))
    .toBeVisible();
  await expect
    .element(
      page.getByRole("searchbox", { name: "Search or add a task to Bench" }),
    )
    .toBeVisible();
  await expect
    .element(page.getByRole("link", { name: `Back to ${FOX_QUEST.name}` }))
    .toHaveAttribute("href", `/quests/${FOX_QUEST.id}`);
});

describe("use_case_timer_quest_panel", () => {
  for (const viewport of [LAPTOP_VIEWPORT, NARROWEST_VIEWPORT]) {
    for (const { name, performances } of PERFORMANCE_STATES) {
      test(`starts in place at ${viewport.width} px, ${name}`, async () => {
        await setViewport(viewport);
        applyTheme("parchment", "dark");
        vi.mocked(listPerformances).mockResolvedValue([...performances]);
        await open(FOX_QUEST);
        expect(
          page
            .getByRole("textbox", { name: PERFORMANCE_COPY.message })
            .elements(),
        ).toHaveLength(performances.length);
        if (viewport === NARROWEST_VIEWPORT) {
          await page
            .getByRole("button", { name: QUEST_OVERVIEW_COPY.panel.expand })
            .click();
        }
        const panel = page.getByRole("dialog", {
          name: QUEST_OVERVIEW_COPY.panel.label,
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
          .getByRole("button", { name: QUEST_OVERVIEW_COPY.panel.collapse })
          .click();
        await expect
          .element(page.getByRole("heading", { name: FOX_QUEST.name }))
          .toBeVisible();
      });
    }
  }
});
