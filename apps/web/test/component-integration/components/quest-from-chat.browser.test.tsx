// "use_case_project_from_standalone_chat" in use-cases/chats.md, in Chromium
// and WebKit: Chat's Start a quest from this opens the quest start on Do a
// thing with the Chat's draft summary as the Journal to edit. Closing sends
// nothing; starting sends exactly what the user confirmed, and Dailies, the
// one ongoing quest, isn't offered for a Chat's summary.
import { describe, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { startQuestAction } from "@/app/(workspace)/projects/actions.ts";
import { QuestFromChat } from "@/components/quest-from-chat.tsx";
import { QUEST_START_COPY } from "@/ui/copy/projects.ts";
import { QUEST_FROM_CHAT_COPY } from "@/ui/copy/start-work.ts";

vi.mock("@/app/(workspace)/projects/actions.ts", () => ({
  startQuestAction: vi.fn<typeof startQuestAction>(),
}));

const SUMMARY = "- a balcony herb garden\n- one sunny shelf";
const EDITED = "Grow basil and thyme on the morning-sun shelf.";
const CHOICES = {
  activities: [],
  userConstructs: [],
  preferredConstructId: "vellum",
} as const;

describe("use_case_project_from_standalone_chat", () => {
  test("Start a quest from this opens Do a thing with the summary, and closing sends nothing", async () => {
    await render(<QuestFromChat choices={CHOICES} summary={SUMMARY} />);
    const open = page.getByRole("button", { name: QUEST_FROM_CHAT_COPY.open });

    await open.click();
    const doIt = page.getByRole("region", { name: "Do a thing" });
    const journal = doIt.getByRole("textbox", {
      name: QUEST_START_COPY.journalLabel,
    });
    await expect.element(journal).toHaveValue(SUMMARY);
    await expect
      .element(
        page.getByRole("button", {
          name: QUEST_START_COPY.chooseLabel("Dailies"),
        }),
      )
      .not.toBeInTheDocument();

    // The starting point takes focus as it opens; Escape closes the dialog
    // holding focus.
    await expect
      .poll(() => doIt.element().contains(document.activeElement))
      .toBe(true);
    await userEvent.keyboard("{Escape}");
    await expect.element(doIt).not.toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    await expect
      .element(page.getByRole("dialog", { name: QUEST_FROM_CHAT_COPY.heading }))
      .not.toBeInTheDocument();
    await expect.element(open).toHaveFocus();
    expect(startQuestAction).not.toHaveBeenCalled();
  });

  test("starting sends the Journal as the user edited it", async () => {
    const submitted = Promise.withResolvers<FormData>();
    vi.mocked(startQuestAction).mockImplementation((_state, form) => {
      submitted.resolve(form);
      return new Promise<never>(() => undefined);
    });
    await render(<QuestFromChat choices={CHOICES} summary={SUMMARY} />);

    await page.getByRole("button", { name: QUEST_FROM_CHAT_COPY.open }).click();
    const doIt = page.getByRole("region", { name: "Do a thing" });
    await doIt
      .getByRole("textbox", { name: QUEST_START_COPY.journalLabel })
      .fill(EDITED);
    await doIt
      .getByRole("button", { name: QUEST_START_COPY.start, exact: true })
      .click();

    const sent = await submitted.promise;
    expect(sent.get("premadeId")).toBe("do");
    expect(sent.get("journal")).toBe(EDITED);
  });
});
