// The four ways to start a quest, in Chromium and WebKit
// ("use_case_browse_premade_quests"): each starting point says what it is
// for; choosing one shows its details, filled in, in its place, and going
// back starts nothing. The user's Dailies opens instead of starting again,
// and a preset Journal, as from Chat, isn't offered to Dailies. Each
// starting point sends its own start, so Learn, Make and Do make quests of
// their own and Dailies goes to its one quest. What the
// action makes is projects/actions.server.test.ts's.
import { afterEach, describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import type { startQuestAction } from "@/app/(workspace)/projects/actions.ts";
import { QuestStartChoices } from "@/components/quest-start.tsx";
import { PREMADE_QUESTS } from "@/projects/premade-quests.ts";
import type { QuestCreationChoices } from "@/projects/quest-creation-choices.ts";
import { PROJECTS_COPY, QUEST_START_COPY } from "@/ui/copy/projects.ts";
import { projectIdFixture } from "../../support/id-fixtures.ts";

const actions = vi.hoisted(() => ({
  startQuestAction: vi.fn<typeof startQuestAction>(),
}));
vi.mock("@/app/(workspace)/projects/actions.ts", () => actions);

const CHOICES: QuestCreationChoices = {
  userConstructs: [],
  preferredConstructId: "vellum",
};

const DAILIES_ID = projectIdFixture("1f2e3d4c-5b6a-4987-8a6b-5c4d3e2f1a0b");

function choose(name: string): ReturnType<typeof page.getByRole> {
  return page.getByRole("button", { name: QUEST_START_COPY.chooseLabel(name) });
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("use_case_browse_premade_quests", () => {
  test("the four starting points show their details in place, and going back starts nothing", async () => {
    await render(<QuestStartChoices choices={CHOICES} />);

    await Promise.all(
      PREMADE_QUESTS.map((quest) =>
        expect.element(page.getByText(quest.description)).toBeVisible(),
      ),
    );
    await choose("Learn a thing").click();

    const details = page.getByRole("region", { name: "Learn a thing" });
    await expect
      .element(details.getByRole("heading", { name: "Learn a thing" }))
      .toHaveFocus();
    await expect
      .element(details.getByRole("textbox", { name: PROJECTS_COPY.nameLabel }))
      .toHaveValue("Learn a thing");
    await expect
      .element(
        details.getByRole("textbox", { name: QUEST_START_COPY.journalLabel }),
      )
      .toHaveValue(PREMADE_QUESTS[1]?.journal ?? "");

    await page.getByRole("button", { name: QUEST_START_COPY.back }).click();

    await expect
      .element(page.getByRole("heading", { name: QUEST_START_COPY.heading }))
      .toHaveFocus();
    await expect.element(choose("Make a thing")).toBeVisible();
    expect(actions.startQuestAction).not.toHaveBeenCalled();
  });

  test.each([
    ["Dailies", "dailies"],
    ["Learn a thing", "learn"],
    ["Make a thing", "make"],
    ["Do a thing", "do"],
  ] as const)(
    "starting %s sends its own starting point and no activity, once",
    async (name, premadeId) => {
      actions.startQuestAction.mockResolvedValue({ kind: "idle" });
      await render(<QuestStartChoices choices={CHOICES} />);
      await choose(name).click();
      await page
        .getByRole("region", { name })
        .getByRole("textbox", { name: PROJECTS_COPY.nameLabel })
        .fill(`My ${name}`);

      await page.getByRole("button", { name: QUEST_START_COPY.start }).click();

      await expect
        .poll(() => actions.startQuestAction.mock.calls.length)
        .toBe(1);
      const sent = actions.startQuestAction.mock.calls[0]?.[1];
      expect(sent?.get("premadeId")).toBe(premadeId);
      expect(sent?.has("activityId")).toBe(false);
      expect(sent?.get("name")).toBe(`My ${name}`);
    },
  );

  test("the user's Dailies opens instead of starting again", async () => {
    await render(
      <QuestStartChoices choices={CHOICES} dailiesId={DAILIES_ID} />,
    );

    await expect
      .element(page.getByRole("link", { name: QUEST_START_COPY.openDailies }))
      .toHaveAttribute("href", `/projects/${DAILIES_ID}`);
    await expect.element(choose("Dailies")).not.toBeInTheDocument();
  });

  test("a preset Journal opens its choice at once, and isn't offered to Dailies", async () => {
    const summary = "- a balcony herb garden";
    await render(
      <QuestStartChoices
        choices={CHOICES}
        initialChoice="do"
        preset={{ journal: summary }}
      />,
    );

    const details = page.getByRole("region", { name: "Do a thing" });
    await expect
      .element(
        details.getByRole("textbox", { name: QUEST_START_COPY.journalLabel }),
      )
      .toHaveValue(summary);
    await page.getByRole("button", { name: QUEST_START_COPY.back }).click();
    await expect.element(choose("Do a thing")).toBeVisible();
    await expect.element(choose("Dailies")).not.toBeInTheDocument();
  });
});
