import { afterEach, describe, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { listActivities } from "@/activities/index.ts";
import type { startPremadeQuestAction } from "@/app/(workspace)/projects/premade-actions.ts";
import {
  ActivityQuestEntry,
  QuestLibrary,
} from "@/components/quest-library.tsx";
import { QuestStatusTabs } from "@/components/quest-status-tabs.tsx";
import { PREMADE_QUESTS } from "@/projects/premade-quests.ts";
import type { QuestCreationChoices } from "@/projects/quest-creation-choices.ts";
import { PROJECTS_COPY, QUEST_LIBRARY_COPY } from "@/ui/copy/projects.ts";
import { FOX_PROJECT } from "../app/(workspace)/page-fixtures.ts";

const actions = vi.hoisted(() => ({
  startPremadeQuestAction: vi.fn<typeof startPremadeQuestAction>(),
}));
vi.mock("@/app/(workspace)/projects/premade-actions.ts", () => actions);
const CHOICES: QuestCreationChoices = {
  activities: listActivities().map(({ id, name, description }) => ({
    id,
    name,
    description,
  })),
  userConstructs: [],
  preferredConstructId: "lumen",
};
afterEach(() => {
  vi.clearAllMocks();
});

describe("use_case_browse_premade_quests", () => {
  test.each(PREMADE_QUESTS)(
    "$name previews its Journal and suggested activity without starting",
    async (quest) => {
      await render(<QuestLibrary choices={CHOICES} />);
      const explore = page.getByRole("button", {
        name: QUEST_LIBRARY_COPY.exploreLabel(quest.name),
      });
      await explore.click();
      const dialog = page.getByRole("dialog", { name: quest.name });
      await expect
        .element(
          dialog.getByRole("textbox", {
            name: QUEST_LIBRARY_COPY.journalLabel,
          }),
        )
        .toHaveValue(quest.journal);
      await expect
        .element(dialog.getByRole("combobox"))
        .toHaveValue(quest.activityId);
      await dialog.getByRole("button", { name: "Close", exact: true }).click();
      await expect.element(explore).toHaveFocus();
      expect(actions.startPremadeQuestAction).not.toHaveBeenCalled();
    },
  );
});

test("failed creation preserves every edit and prevents a second pending submission", async () => {
  let finish:
    | ((state: { kind: "claudeUnavailable"; message: string }) => void)
    | undefined;
  actions.startPremadeQuestAction.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  await render(<QuestLibrary choices={CHOICES} />);
  await page
    .getByRole("button", {
      name: QUEST_LIBRARY_COPY.exploreLabel("Start without inspiration"),
    })
    .click();
  const dialog = page.getByRole("dialog");
  const name = dialog.getByRole("textbox", { name: PROJECTS_COPY.nameLabel });
  const journal = dialog.getByRole("textbox", {
    name: QUEST_LIBRARY_COPY.journalLabel,
  });
  const motivation = dialog.getByRole("textbox", {
    name: PROJECTS_COPY.motivationLabel,
  });
  await name.fill("My small experiment");
  await journal.fill("My edited plan");
  await motivation.fill("For fun");
  await dialog.getByRole("combobox").selectOptions("brainstorming");
  const start = dialog.getByRole("button", {
    name: QUEST_LIBRARY_COPY.start,
    exact: true,
  });
  await start.click();
  await expect.element(start).toBeDisabled();
  expect(actions.startPremadeQuestAction).toHaveBeenCalledTimes(1);
  finish?.({ kind: "claudeUnavailable", message: "Opening unavailable" });
  await expect
    .element(dialog.getByRole("alert"))
    .toHaveTextContent("Opening unavailable");
  await expect.element(name).toHaveValue("My small experiment");
  await expect.element(journal).toHaveValue("My edited plan");
  await expect.element(motivation).toHaveValue("For fun");
  await expect
    .element(dialog.getByRole("combobox"))
    .toHaveValue("brainstorming");
  const [, sent] = actions.startPremadeQuestAction.mock.lastCall ?? [];
  expect(sent?.get("constructId")).toBe("lumen");
  expect(sent?.get("journal")).toBe("My edited plan");
  await expect.element(start).toBeEnabled();
});

describe("use_case_activity_premade_quest_entry", () => {
  test("the discovery activity opens an editable quest preview without creating", async () => {
    await render(
      <ActivityQuestEntry
        activityId="find-something-to-make"
        choices={CHOICES}
      />,
    );
    await page
      .getByRole("button", {
        name: QUEST_LIBRARY_COPY.exploreLabel("Start without inspiration"),
      })
      .click();
    await expect
      .element(
        page
          .getByRole("dialog")
          .getByRole("textbox", { name: PROJECTS_COPY.nameLabel }),
      )
      .toHaveValue("Start without inspiration");
    expect(actions.startPremadeQuestAction).not.toHaveBeenCalled();
  });
});

describe("unified quest index", () => {
  test("saved quests appear first; the premade tab previews without creating", async () => {
    await render(
      <QuestStatusTabs
        projects={[FOX_PROJECT]}
        premade={<QuestLibrary choices={CHOICES} />}
      />,
    );
    await expect
      .element(page.getByRole("link", { name: FOX_PROJECT.name }))
      .toBeVisible();
    const explore = page.getByRole("button", {
      name: QUEST_LIBRARY_COPY.exploreLabel("Start without inspiration"),
    });
    await expect.element(explore).not.toBeInTheDocument();
    await page.getByRole("tab", { name: "Active", exact: true }).click();
    await userEvent.keyboard("{End}");
    await expect
      .element(
        page.getByRole("tab", {
          name: QUEST_LIBRARY_COPY.heading,
          exact: true,
        }),
      )
      .toHaveAttribute("aria-selected", "true");
    expect(new URL(globalThis.location.href).searchParams.get("status")).toBe(
      "premade",
    );
    await expect
      .element(page.getByRole("link", { name: FOX_PROJECT.name }))
      .not.toBeInTheDocument();
    await explore.click();
    await expect
      .element(page.getByRole("dialog", { name: "Start without inspiration" }))
      .toBeVisible();
    expect(actions.startPremadeQuestAction).not.toHaveBeenCalled();
  });
  test("Find a starting point selects the tab and preserves keyboard focus", async () => {
    await render(
      <QuestStatusTabs
        projects={[]}
        premade={<QuestLibrary choices={CHOICES} />}
      />,
    );
    await page
      .getByRole("button", { name: PROJECTS_COPY.findStartingPoint })
      .click();
    await expect
      .element(
        page.getByRole("tab", {
          name: QUEST_LIBRARY_COPY.heading,
          exact: true,
        }),
      )
      .toHaveFocus();
    await expect
      .element(
        page.getByRole("button", { name: PROJECTS_COPY.findStartingPoint }),
      )
      .not.toBeInTheDocument();
    await expect
      .element(page.getByText(PROJECTS_COPY.exploreFirst))
      .toBeVisible();
  });
  test("a bookmarked premade selection opens the library directly", async () => {
    await render(
      <QuestStatusTabs
        projects={[FOX_PROJECT]}
        initialStatus="premade"
        premade={<QuestLibrary choices={CHOICES} />}
      />,
    );
    await expect
      .element(
        page.getByRole("tab", {
          name: QUEST_LIBRARY_COPY.heading,
          exact: true,
        }),
      )
      .toHaveAttribute("aria-selected", "true");
    await expect
      .element(
        page.getByRole("button", {
          name: QUEST_LIBRARY_COPY.exploreLabel("Start without inspiration"),
        }),
      )
      .toBeVisible();
  });
});
