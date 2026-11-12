// The Continue card at the top of Quests, in Chromium and WebKit
// ("use_case_continue_quest"): the quest to pick up again, its next step
// when it has one, and Continue, which opens its conversation. Which quest
// it is is quests/current-quest.server.test.ts's.

import { describe, expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import type { ChatQuest } from "@/chats/chat-rows.ts";
import { CurrentQuestCard } from "@/components/current-quest.tsx";
import { CURRENT_QUEST_COPY } from "@/ui/copy/quests.ts";
import { FOX_QUEST } from "../app/(workspace)/page-fixtures.ts";

const QUEST: ChatQuest = { id: FOX_QUEST.id, name: FOX_QUEST.name };

describe("use_case_continue_quest", () => {
  test("names the quest and its next step, and Continue opens its conversation", async () => {
    await render(
      <CurrentQuestCard
        quest={{ quest: QUEST, nextStep: "Sketch the ears" }}
      />,
    );

    const card = page.getByRole("region", { name: CURRENT_QUEST_COPY.label });
    await expect.element(card.getByText(QUEST.name)).toBeVisible();
    await expect
      .element(card.getByText(CURRENT_QUEST_COPY.nextStep("Sketch the ears")))
      .toBeVisible();
    await expect
      .element(
        card.getByRole("link", {
          name: CURRENT_QUEST_COPY.continueLabel(QUEST.name),
        }),
      )
      .toHaveAttribute("href", `/quests/${QUEST.id}`);
  });

  test("a quest with no next step shows none", async () => {
    await render(
      <CurrentQuestCard quest={{ quest: QUEST, nextStep: undefined }} />,
    );

    const card = page.getByRole("region", { name: CURRENT_QUEST_COPY.label });
    await expect.element(card.getByText(QUEST.name)).toBeVisible();
    await expect
      .element(card.getByText(CURRENT_QUEST_COPY.nextStep("")))
      .not.toBeInTheDocument();
  });

  test("with no Active quest, there is no card", async () => {
    await render(<CurrentQuestCard quest={undefined} />);

    await expect
      .element(page.getByRole("region", { name: CURRENT_QUEST_COPY.label }))
      .not.toBeInTheDocument();
    await expect
      .element(page.getByRole("link", { name: CURRENT_QUEST_COPY.continue }))
      .not.toBeInTheDocument();
  });
});
