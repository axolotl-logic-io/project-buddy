// Quest starting dialogs and the inline start used inside Chat.

import { afterEach, describe, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import type { startQuestAction } from "@/app/(workspace)/quests/actions.ts";
import { QuestStartChoices } from "@/components/quest-start.tsx";
import { PREMADE_QUESTS } from "@/quests/premade-quests.ts";
import type { QuestCreationChoices } from "@/quests/quest-creation-choices.ts";
import { QUEST_START_COPY, QUESTS_COPY } from "@/ui/copy/quests.ts";
import { questIdFixture } from "../../support/id-fixtures.ts";

const actions = vi.hoisted(() => ({
  startQuestAction: vi.fn<typeof startQuestAction>(),
}));
vi.mock("@/app/(workspace)/quests/actions.ts", () => actions);

const CHOICES: QuestCreationChoices = {
  userConstructs: [],
  preferredConstructId: "vellum",
};

const DAILIES_ID = questIdFixture("1f2e3d4c-5b6a-4987-8a6b-5c4d3e2f1a0b");

function choose(name: string): ReturnType<typeof page.getByRole> {
  return page.getByRole("button", { name, exact: true });
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("use_case_browse_premade_quests", () => {
  test("the four starting points open a modal, and cancelling restores focus without starting", async () => {
    await render(<QuestStartChoices choices={CHOICES} />);

    await Promise.all(
      PREMADE_QUESTS.map((quest) =>
        expect
          .element(choose(quest.name))
          .toHaveAccessibleDescription(quest.tagline),
      ),
    );
    await choose("Learn a thing").click();

    const details = page.getByRole("dialog", { name: "Learn a thing" });
    await expect
      .element(details.getByText(PREMADE_QUESTS[1]?.description ?? ""))
      .toBeVisible();
    await expect
      .element(
        details.getByRole("textbox", { name: QUESTS_COPY.motivationLabel }),
      )
      .toBeVisible();
    await expect
      .element(details.getByRole("textbox"))
      .toHaveAccessibleName(QUESTS_COPY.motivationLabel);
    await expect
      .element(details.getByRole("textbox", { name: QUESTS_COPY.nameLabel }))
      .not.toBeInTheDocument();

    await userEvent.keyboard("{Escape}");

    await expect.element(details).not.toBeInTheDocument();
    await expect.element(choose("Learn a thing")).toHaveFocus();
    await expect.element(choose("Make a thing")).toBeVisible();
    expect(actions.startQuestAction).not.toHaveBeenCalled();
  });

  test.each([
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
        .getByRole("textbox", { name: QUESTS_COPY.motivationLabel })
        .fill("This matters to me.");
      await page.getByRole("button", { name: QUEST_START_COPY.start }).click();

      await expect
        .poll(() => actions.startQuestAction.mock.calls.length)
        .toBe(1);
      const sent = actions.startQuestAction.mock.calls[0]?.[1];
      expect(sent?.get("premadeId")).toBe(premadeId);
      expect(sent?.has("activityId")).toBe(false);
      expect(sent?.get("name")).toBe(name);
      expect(sent?.get("constructId")).toBe("vellum");
      expect(sent?.get("context")).toBe(
        PREMADE_QUESTS.find((quest) => quest.id === premadeId)?.context,
      );
      expect(sent?.get("motivation")).toBe("This matters to me.");
    },
  );

  test("the first Dailies start asks only for a construct, without Why", async () => {
    actions.startQuestAction.mockResolvedValue({ kind: "idle" });
    await render(<QuestStartChoices choices={CHOICES} />);
    await choose("Dailies").click();
    const dialog = page.getByRole("dialog", { name: "Dailies" });
    await expect
      .element(
        dialog.getByRole("textbox", { name: QUESTS_COPY.motivationLabel }),
      )
      .not.toBeInTheDocument();
    await dialog.getByRole("button", { name: QUEST_START_COPY.start }).click();

    await expect.poll(() => actions.startQuestAction.mock.calls.length).toBe(1);
    const sent = actions.startQuestAction.mock.calls[0]?.[1];
    expect(sent?.get("premadeId")).toBe("dailies");
    expect(sent?.get("name")).toBe("Dailies");
    expect(sent?.get("constructId")).toBe("vellum");
    expect(sent?.get("context")).toBe("");
    expect(sent?.has("motivation")).toBe(false);
  });

  test("a refused start keeps the Why in the dialog", async () => {
    actions.startQuestAction.mockResolvedValue({
      kind: "claudeUnavailable",
      message: "Try again later.",
    });
    await render(<QuestStartChoices choices={CHOICES} />);
    await choose("Learn a thing").click();
    const dialog = page.getByRole("dialog", { name: "Learn a thing" });
    const why = dialog.getByRole("textbox", {
      name: QUESTS_COPY.motivationLabel,
    });
    await why.fill("Read with my family.");
    await dialog.getByRole("button", { name: QUEST_START_COPY.start }).click();
    await expect
      .element(dialog.getByRole("alert"))
      .toHaveTextContent("Try again later.");
    await expect.element(why).toHaveValue("Read with my family.");
    await dialog.getByRole("button", { name: QUEST_START_COPY.close }).click();
    await expect.element(choose("Learn a thing")).toHaveFocus();
    await choose("Learn a thing").click();
    await expect
      .element(page.getByRole("textbox", { name: QUESTS_COPY.motivationLabel }))
      .toHaveValue("");
  });

  test("the user's Dailies opens instead of starting again", async () => {
    await render(
      <QuestStartChoices choices={CHOICES} dailiesId={DAILIES_ID} />,
    );

    await expect
      .element(page.getByRole("link", { name: "Dailies", exact: true }))
      .toHaveAttribute("href", `/quests/${DAILIES_ID}`);
    await expect.element(choose("Dailies")).not.toBeInTheDocument();
  });

  test("a preset Journal opens its choice at once, and isn't offered to Dailies", async () => {
    const summary = "- a balcony herb garden";
    await render(
      <QuestStartChoices
        choices={CHOICES}
        initialChoice="do"
        presentation="inline"
        preset={{ context: summary }}
      />,
    );

    const details = page.getByRole("region", { name: "Do a thing" });
    await expect
      .element(
        details.getByRole("textbox", { name: QUESTS_COPY.motivationLabel }),
      )
      .toBeVisible();
    await page.getByRole("button", { name: QUEST_START_COPY.back }).click();
    await expect.element(choose("Do a thing")).toBeVisible();
    await expect.element(choose("Dailies")).not.toBeInTheDocument();
  });
});
