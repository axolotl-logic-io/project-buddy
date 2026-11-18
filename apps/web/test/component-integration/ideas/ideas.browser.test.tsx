// A quest's Ideas in Chromium and WebKit. Each control sends its command
// to the quest's conversation, here a mock; ideas.server.test.ts checks
// what the commands change.
import type { JSX } from "react";
import { describe, expect, type Mock, test } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import type { ChatSend, ChatSendResult } from "@/components/chat/chat-send.ts";
import { QuestIdeas } from "@/components/quest-ideas.tsx";
import { IDEA, type Idea } from "@/ideas/idea.ts";
import { PANEL_COMMANDS_COPY } from "@/ui/copy/commands.ts";
import { IDEAS_COPY } from "@/ui/copy/ideas.ts";
import {
  chatSendMock,
  inConversation,
  sentTexts,
} from "../components/chat/chat-send-test-kit.tsx";

const ACTIONS_NAME = /Actions for/u;
const OUTSIDE_LIST = "Outside the list";
const IDEA_FIXTURE = IDEA.parse({
  id: "11111111-1111-4111-8111-111111111111",
  text: "Try watercolours",
});
const SECOND_IDEA = IDEA.parse({
  id: "22222222-2222-4222-8222-222222222222",
  text: "Try charcoal",
});

function noted(note: string): ChatSendResult {
  return { sent: true, note };
}

function ideasPanel({
  send,
  ideas,
  embedded,
  outside,
}: {
  readonly send: Mock<ChatSend>;
  readonly ideas: readonly Idea[];
  readonly embedded?: boolean;
  readonly outside?: boolean;
}): JSX.Element {
  return inConversation(
    send,
    <>
      <QuestIdeas embedded={embedded === true} ideas={ideas} />
      {outside === true && <input aria-label={OUTSIDE_LIST} />}
    </>,
  );
}

describe("use_case_quest_ideas", () => {
  test("the visible Move to Tasks action keeps a refused idea and moves it with feedback and focus on success", async () => {
    const send = chatSendMock().mockResolvedValueOnce({
      sent: false,
      problem: IDEAS_COPY.tasksFull,
    });
    await render(ideasPanel({ send, ideas: [IDEA_FIXTURE] }));
    const move = page.getByRole("button", { name: IDEAS_COPY.move });
    await expect.element(move).toBeVisible();
    await move.click();
    await expect
      .element(page.getByRole("alert"))
      .toHaveTextContent(IDEAS_COPY.tasksFull);
    await expect.element(page.getByText(IDEA_FIXTURE.text)).toBeVisible();
    send.mockResolvedValueOnce(
      noted(PANEL_COMMANDS_COPY.notes.ideaToTasks(IDEA_FIXTURE.text)),
    );
    await move.click();
    expect(sentTexts(send)).toEqual(["/idea-to-tasks 1", "/idea-to-tasks 1"]);
    await expect.element(page.getByText(IDEAS_COPY.emptyHeading)).toBeVisible();
    await expect
      .element(page.getByRole("status"))
      .toHaveTextContent(
        PANEL_COMMANDS_COPY.notes.ideaToTasks(IDEA_FIXTURE.text),
      );
    await expect
      .element(page.getByRole("heading", { name: IDEAS_COPY.heading }))
      .toHaveFocus();
  });

  test("Add idea sends /idea with the text", async () => {
    const send = chatSendMock().mockResolvedValue(
      noted(PANEL_COMMANDS_COPY.notes.idea("Try charcoal")),
    );
    await render(ideasPanel({ send, ideas: [] }));
    await page
      .getByRole("button", { name: IDEAS_COPY.add, exact: true })
      .click();
    await page
      .getByRole("textbox", { name: IDEAS_COPY.label, exact: true })
      .fill("Try charcoal");
    await page.getByRole("button", { name: IDEAS_COPY.add }).click();

    expect(sentTexts(send)).toEqual(["/idea Try charcoal"]);
    await expect
      .element(page.getByRole("status"))
      .toHaveTextContent(PANEL_COMMANDS_COPY.notes.idea("Try charcoal"));
  });

  test("an idea can be edited and moved, with feedback and retained focus", async () => {
    const send = chatSendMock()
      .mockResolvedValueOnce(
        noted(PANEL_COMMANDS_COPY.notes.editIdea(1, "Try ink")),
      )
      .mockResolvedValueOnce(
        noted(PANEL_COMMANDS_COPY.notes.ideaToTasks("Try ink")),
      );
    await render(ideasPanel({ send, ideas: [IDEA_FIXTURE] }));
    await page.getByRole("button", { name: IDEAS_COPY.edit }).click();
    await page
      .getByRole("textbox", { name: IDEAS_COPY.label, exact: true })
      .first()
      .fill("Try ink");
    await page.getByRole("button", { name: IDEAS_COPY.save }).click();
    expect(sentTexts(send)).toEqual(["/edit-idea 1 Try ink"]);
    await expect
      .element(page.getByRole("status"))
      .toHaveTextContent(PANEL_COMMANDS_COPY.notes.editIdea(1, "Try ink"));
    await page.getByRole("button", { name: ACTIONS_NAME }).click();
    await page.getByRole("menuitem", { name: IDEAS_COPY.move }).click();
    expect(sentTexts(send)).toEqual([
      "/edit-idea 1 Try ink",
      "/idea-to-tasks 1",
    ]);
    await expect
      .element(page.getByRole("status"))
      .toHaveTextContent(PANEL_COMMANDS_COPY.notes.ideaToTasks("Try ink"));
    await expect
      .element(page.getByRole("heading", { name: IDEAS_COPY.heading }))
      .toHaveFocus();
    await expect.element(page.getByText(IDEAS_COPY.empty)).toBeVisible();
  });

  test("Remove idea sends /drop-idea with its place", async () => {
    const send = chatSendMock();
    await render(ideasPanel({ send, ideas: [IDEA_FIXTURE, SECOND_IDEA] }));
    await page.getByRole("button", { name: ACTIONS_NAME }).nth(1).click();
    await page.getByRole("menuitem", { name: IDEAS_COPY.remove }).click();

    expect(sentTexts(send)).toEqual(["/drop-idea 2"]);
    await expect
      .element(page.getByText(SECOND_IDEA.text))
      .not.toBeInTheDocument();
    await expect.element(page.getByText(IDEA_FIXTURE.text)).toBeVisible();
  });

  test("a refused add keeps the draft and a refused move keeps the idea, each saying why", async () => {
    const send = chatSendMock().mockResolvedValue({
      sent: false,
      problem: PANEL_COMMANDS_COPY.problems.failed,
    });
    await render(ideasPanel({ send, ideas: [IDEA_FIXTURE] }));
    await page
      .getByRole("button", { name: IDEAS_COPY.add, exact: true })
      .click();
    const input = page
      .getByRole("textbox", { name: IDEAS_COPY.label, exact: true })
      .last();
    await input.fill("Try charcoal");
    await page.getByRole("button", { name: IDEAS_COPY.add }).click();
    await expect
      .element(page.getByRole("alert"))
      .toHaveTextContent(PANEL_COMMANDS_COPY.problems.failed);
    await expect.element(input).toHaveValue("Try charcoal");
    // Clicking elsewhere would save the draft again, so it is discarded first.
    await userEvent.keyboard("{Escape}");
    await page.getByRole("button", { name: ACTIONS_NAME }).click();
    await page.getByRole("menuitem", { name: IDEAS_COPY.move }).click();
    await expect.element(page.getByText(IDEA_FIXTURE.text)).toBeVisible();
    expect(sentTexts(send)).toEqual(["/idea Try charcoal", "/idea-to-tasks 1"]);
  });

  test("an all-space idea shows validation feedback without sending", async () => {
    const send = chatSendMock();
    await render(ideasPanel({ send, ideas: [] }));
    await page
      .getByRole("button", { name: IDEAS_COPY.add, exact: true })
      .click();
    await page
      .getByRole("textbox", { name: IDEAS_COPY.label, exact: true })
      .fill("   ");
    await page.getByRole("button", { name: IDEAS_COPY.add }).click();
    await expect
      .element(page.getByRole("alert"))
      .toHaveTextContent(IDEAS_COPY.invalid);
    expect(send).not.toHaveBeenCalled();
  });

  test("saved ideas stay readable until edited and cancelling keeps their text", async () => {
    const send = chatSendMock();
    await render(ideasPanel({ embedded: true, send, ideas: [IDEA_FIXTURE] }));
    await expect.element(page.getByText(IDEA_FIXTURE.text)).toBeVisible();
    expect(page.getByRole("textbox").all()).toHaveLength(0);
    await page.getByRole("button", { name: IDEAS_COPY.edit }).click();
    const edit = page
      .getByRole("textbox", { name: IDEAS_COPY.label, exact: true })
      .first();
    await expect.element(edit).toHaveFocus();
    await edit.fill("Discard this edit");
    await page.getByRole("button", { name: IDEAS_COPY.cancel }).click();
    await expect.element(page.getByText(IDEA_FIXTURE.text)).toBeVisible();
    await expect
      .element(page.getByRole("button", { name: IDEAS_COPY.edit }))
      .toHaveFocus();
    expect(send).not.toHaveBeenCalled();
  });

  test.each(["pointer", "keyboard"])(
    "reorders ideas with the shared %s handle, sending /move-idea",
    async (method) => {
      const send = chatSendMock();
      const screen = await render(
        ideasPanel({ send, ideas: [IDEA_FIXTURE, SECOND_IDEA] }),
      );
      const handle = page.getByRole("button", {
        name: `Reorder “${SECOND_IDEA.text}”`,
      });
      if (method === "pointer") {
        await userEvent.dragAndDrop(
          handle,
          page
            .getByRole("button", { name: IDEAS_COPY.edit, exact: true })
            .first(),
          { targetPosition: { x: 1, y: 1 } },
        );
      } else {
        handle.element().focus();
        await userEvent.keyboard("{ArrowUp}");
      }
      expect(sentTexts(send)).toEqual(["/move-idea 2 1"]);
      // The route refresh that comes with the command brings the new order.
      await screen.rerender(
        ideasPanel({ send, ideas: [SECOND_IDEA, IDEA_FIXTURE] }),
      );
      await expect
        .element(
          page
            .getByRole("list", { name: IDEAS_COPY.heading })
            .getByRole("listitem")
            .first(),
        )
        .toMatchTextContent(SECOND_IDEA.text);
      await expect.element(handle).toHaveFocus();
    },
  );

  test("clicking another idea saves the old edit and hands off focus; clicking outside saves and closes the new edit", async () => {
    const saved = Promise.withResolvers<ChatSendResult>();
    const send = chatSendMock().mockReturnValueOnce(saved.promise);
    await render(
      ideasPanel({ outside: true, send, ideas: [IDEA_FIXTURE, SECOND_IDEA] }),
    );
    await page
      .getByRole("button", { name: IDEAS_COPY.edit, exact: true })
      .first()
      .click();
    await page
      .getByRole("textbox", { name: IDEAS_COPY.label, exact: true })
      .fill("Try ink");
    await page
      .getByRole("button", { name: IDEAS_COPY.edit, exact: true })
      .click();
    expect(sentTexts(send)).toEqual(["/edit-idea 1 Try ink"]);
    saved.resolve({ sent: true });
    const editor = page.getByRole("textbox", {
      name: IDEAS_COPY.label,
      exact: true,
    });
    await expect.element(editor).toHaveValue(SECOND_IDEA.text);
    await expect.element(editor).toHaveFocus();
    await editor.fill("Try pastels");
    const outside = page.getByRole("textbox", { name: OUTSIDE_LIST });
    await outside.click();
    await expect.element(editor).not.toBeInTheDocument();
    expect(sentTexts(send)).toEqual([
      "/edit-idea 1 Try ink",
      "/edit-idea 2 Try pastels",
    ]);
    await expect.element(outside).toHaveFocus();
  });

  test("clicking outside an unchanged idea closes it without a redundant send", async () => {
    const send = chatSendMock();
    await render(ideasPanel({ outside: true, send, ideas: [IDEA_FIXTURE] }));
    await page
      .getByRole("button", { name: IDEAS_COPY.edit, exact: true })
      .click();
    await page.getByRole("textbox", { name: OUTSIDE_LIST }).click();
    await expect
      .element(
        page.getByRole("textbox", { name: IDEAS_COPY.label, exact: true }),
      )
      .not.toBeInTheDocument();
    expect(send).not.toHaveBeenCalled();
  });

  test("a send already in progress does not reclaim focus after clicking outside", async () => {
    const saved = Promise.withResolvers<ChatSendResult>();
    const send = chatSendMock().mockReturnValue(saved.promise);
    await render(ideasPanel({ outside: true, send, ideas: [IDEA_FIXTURE] }));
    await page
      .getByRole("button", { name: IDEAS_COPY.edit, exact: true })
      .click();
    await page
      .getByRole("textbox", { name: IDEAS_COPY.label, exact: true })
      .fill("Try ink");
    await userEvent.keyboard("{Enter}");
    const outside = page.getByRole("textbox", { name: OUTSIDE_LIST });
    await outside.click();
    saved.resolve({ sent: true });
    await expect
      .element(
        page.getByRole("textbox", { name: IDEAS_COPY.label, exact: true }),
      )
      .not.toBeInTheDocument();
    await expect.element(outside).toHaveFocus();
    expect(send).toHaveBeenCalledTimes(1);
  });
});
