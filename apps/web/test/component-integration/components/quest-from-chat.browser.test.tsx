// "use_case_project_from_standalone_chat" in use-cases/chats.md, in Chromium
// and WebKit: Turn Chat into a quest, from Chat's button or the construct's
// offer, opens the shared quest start on Do a thing with the draft as the
// Journal to edit. Closing sends nothing; starting sends exactly what the
// user confirmed, and Dailies, the one ongoing quest, isn't offered for a
// Chat's summary. Outside Chat an offer has nothing to open.
import type { JSX } from "react";
import { describe, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { startQuestAction } from "@/app/(workspace)/projects/actions.ts";
import { CreateProjectPart } from "@/components/chat/create-project-part.tsx";
import {
  ChatQuestChoices,
  QuestFromChat,
} from "@/components/quest-from-chat.tsx";
import { CREATE_PROJECT_COPY } from "@/ui/copy/chat.ts";
import { PROJECTS_COPY, QUEST_START_COPY } from "@/ui/copy/projects.ts";
import { QUEST_FROM_CHAT_COPY } from "@/ui/copy/start-work.ts";

vi.mock("@/app/(workspace)/projects/actions.ts", () => ({
  startQuestAction: vi.fn<typeof startQuestAction>(),
}));

const SUMMARY = "- a balcony herb garden\n- one sunny shelf";
const EDITED = "Grow basil and thyme on the morning-sun shelf.";
const CHOICES = {
  userConstructs: [],
  preferredConstructId: "vellum",
} as const;

// The element as Chat holds it.
function inChat(element: JSX.Element): JSX.Element {
  return <ChatQuestChoices choices={CHOICES}>{element}</ChatQuestChoices>;
}

describe("use_case_project_from_standalone_chat", () => {
  test("Turn Chat into a quest opens Do a thing with the summary, and closing sends nothing", async () => {
    await render(inChat(<QuestFromChat journal={SUMMARY} />));
    const open = page.getByRole("button", { name: QUEST_FROM_CHAT_COPY.open });

    await open.click();
    const doIt = page.getByRole("region", { name: "Do a thing" });
    const journal = doIt.getByRole("textbox", {
      name: QUEST_START_COPY.journalLabel,
    });
    await expect.element(journal).toHaveValue(SUMMARY);
    await doIt.getByRole("button", { name: QUEST_START_COPY.back }).click();
    await expect
      .element(page.getByRole("button", { name: "Make a thing", exact: true }))
      .toBeVisible();
    await expect
      .element(page.getByRole("button", { name: "Dailies", exact: true }))
      .not.toBeInTheDocument();

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
    await render(inChat(<QuestFromChat journal={SUMMARY} />));

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

  test("the construct's offer opens the same form, filled in, and creates nothing until confirmed", async () => {
    vi.mocked(startQuestAction).mockClear();
    const submitted = Promise.withResolvers<FormData>();
    vi.mocked(startQuestAction).mockImplementation((_state, form) => {
      submitted.resolve(form);
      return new Promise<never>(() => undefined);
    });
    await render(
      inChat(
        <CreateProjectPart
          part={{
            result: {
              status: "proposed",
              name: "Balcony herbs",
              summary: SUMMARY,
              motivation: "Fresh basil.",
            },
          }}
        />,
      ),
    );

    const open = page.getByRole("button", {
      name: QUEST_FROM_CHAT_COPY.openOffer("Balcony herbs"),
    });
    await open.click();
    const doIt = page.getByRole("region", { name: "Do a thing" });
    await expect
      .element(doIt.getByRole("textbox", { name: PROJECTS_COPY.nameLabel }))
      .toHaveValue("Balcony herbs");
    await expect
      .element(
        doIt.getByRole("textbox", { name: QUEST_START_COPY.journalLabel }),
      )
      .toHaveValue(`${SUMMARY}\n\n## Motivation\nFresh basil.`);
    await userEvent.keyboard("{Escape}");
    await expect.element(open).toHaveFocus();
    expect(startQuestAction).not.toHaveBeenCalled();

    await open.click();
    await doIt
      .getByRole("button", { name: QUEST_START_COPY.start, exact: true })
      .click();
    const sent = await submitted.promise;
    expect(sent.get("premadeId")).toBe("do");
    expect(sent.get("name")).toBe("Balcony herbs");
  });

  test("an offer outside Chat, as in an older quest conversation, has nothing to open", async () => {
    await render(
      <CreateProjectPart
        part={{
          result: {
            status: "proposed",
            proposalId: crypto.randomUUID(),
            name: "Balcony herbs",
            summary: SUMMARY,
            motivation: "",
          },
        }}
      />,
    );

    await expect
      .element(page.getByText(CREATE_PROJECT_COPY.offered("Balcony herbs")))
      .toBeVisible();
    await expect.element(page.getByRole("button")).not.toBeInTheDocument();
  });
});
