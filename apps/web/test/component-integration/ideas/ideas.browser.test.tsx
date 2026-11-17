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
      problem: "Tasks is full. Make room first.",
    });
    await render(ideasPanel({ send, ideas: [IDEA_FIXTURE] }));
    const move = page.getByRole("button", { name: "Move to Tasks" });
    await expect.element(move).toBeVisible();
    await move.click();
    await expect
      .element(page.getByRole("alert"))
      .toHaveTextContent("Tasks is full. Make room first.");
    await expect.element(page.getByText(IDEA_FIXTURE.text)).toBeVisible();
    send.mockResolvedValueOnce(noted("Moved the idea to Tasks."));
    await move.click();
    expect(sentTexts(send)).toEqual(["/idea-to-tasks 1", "/idea-to-tasks 1"]);
    await expect.element(page.getByText("0 saved · Uncommitted")).toBeVisible();
    await expect
      .element(page.getByRole("status"))
      .toHaveTextContent("Moved the idea to Tasks.");
    await expect
      .element(page.getByRole("heading", { name: "Ideas" }))
      .toHaveFocus();
  });

  test("Add idea sends /idea with the text", async () => {
    const send = chatSendMock().mockResolvedValue(
      noted("Added the idea “Try charcoal” to Ideas."),
    );
    await render(ideasPanel({ send, ideas: [] }));
    await page.getByRole("button", { name: "Add idea", exact: true }).click();
    await page
      .getByRole("textbox", { name: "Idea", exact: true })
      .fill("Try charcoal");
    await page.getByRole("button", { name: "Add idea" }).click();

    expect(sentTexts(send)).toEqual(["/idea Try charcoal"]);
    await expect
      .element(page.getByRole("status"))
      .toHaveTextContent("Added the idea “Try charcoal” to Ideas.");
  });

  test("an idea can be edited and moved, with feedback and retained focus", async () => {
    const send = chatSendMock()
      .mockResolvedValueOnce(noted("Changed idea 1 to “Try ink”."))
      .mockResolvedValueOnce(noted("Moved the idea “Try ink” to the Tasks."));
    await render(ideasPanel({ send, ideas: [IDEA_FIXTURE] }));
    await page.getByRole("button", { name: "Edit idea" }).click();
    await page
      .getByRole("textbox", { name: "Idea", exact: true })
      .first()
      .fill("Try ink");
    await page.getByRole("button", { name: "Save idea" }).click();
    expect(sentTexts(send)).toEqual(["/edit-idea 1 Try ink"]);
    await expect
      .element(page.getByRole("status"))
      .toHaveTextContent("Changed idea 1 to “Try ink”.");
    await page.getByRole("button", { name: ACTIONS_NAME }).click();
    await page.getByRole("menuitem", { name: "Move to Tasks" }).click();
    expect(sentTexts(send)).toEqual([
      "/edit-idea 1 Try ink",
      "/idea-to-tasks 1",
    ]);
    await expect
      .element(page.getByRole("status"))
      .toHaveTextContent("Moved the idea “Try ink” to the Tasks.");
    await expect
      .element(page.getByRole("heading", { name: "Ideas" }))
      .toHaveFocus();
    await expect
      .element(page.getByText("No ideas yet.", { exact: false }))
      .toBeVisible();
  });

  test("Remove idea sends /drop-idea with its place", async () => {
    const send = chatSendMock();
    await render(ideasPanel({ send, ideas: [IDEA_FIXTURE, SECOND_IDEA] }));
    await page.getByRole("button", { name: ACTIONS_NAME }).nth(1).click();
    await page.getByRole("menuitem", { name: "Remove idea" }).click();

    expect(sentTexts(send)).toEqual(["/drop-idea 2"]);
    await expect
      .element(page.getByText(SECOND_IDEA.text))
      .not.toBeInTheDocument();
    await expect.element(page.getByText(IDEA_FIXTURE.text)).toBeVisible();
  });

  test("a refused add keeps the draft and a refused move keeps the idea, each saying why", async () => {
    const send = chatSendMock().mockResolvedValue({
      sent: false,
      problem: "Please try again.",
    });
    await render(ideasPanel({ send, ideas: [IDEA_FIXTURE] }));
    await page.getByRole("button", { name: "Add idea", exact: true }).click();
    const input = page
      .getByRole("textbox", { name: "Idea", exact: true })
      .last();
    await input.fill("Try charcoal");
    await page.getByRole("button", { name: "Add idea" }).click();
    await expect
      .element(page.getByRole("alert"))
      .toHaveTextContent("Please try again.");
    await expect.element(input).toHaveValue("Try charcoal");
    // Clicking elsewhere would save the draft again, so it is discarded first.
    await userEvent.keyboard("{Escape}");
    await page.getByRole("button", { name: ACTIONS_NAME }).click();
    await page.getByRole("menuitem", { name: "Move to Tasks" }).click();
    await expect.element(page.getByText(IDEA_FIXTURE.text)).toBeVisible();
    expect(sentTexts(send)).toEqual(["/idea Try charcoal", "/idea-to-tasks 1"]);
  });

  test("an all-space idea shows validation feedback without sending", async () => {
    const send = chatSendMock();
    await render(ideasPanel({ send, ideas: [] }));
    await page.getByRole("button", { name: "Add idea", exact: true }).click();
    await page.getByRole("textbox", { name: "Idea", exact: true }).fill("   ");
    await page.getByRole("button", { name: "Add idea" }).click();
    await expect
      .element(page.getByRole("alert"))
      .toHaveTextContent("Enter an idea of 1 to 200 characters.");
    expect(send).not.toHaveBeenCalled();
  });

  test("saved ideas stay readable until edited and cancelling keeps their text", async () => {
    const send = chatSendMock();
    await render(ideasPanel({ embedded: true, send, ideas: [IDEA_FIXTURE] }));
    await expect.element(page.getByText(IDEA_FIXTURE.text)).toBeVisible();
    expect(page.getByRole("textbox").all()).toHaveLength(0);
    await page.getByRole("button", { name: "Edit idea" }).click();
    const edit = page
      .getByRole("textbox", { name: "Idea", exact: true })
      .first();
    await expect.element(edit).toHaveFocus();
    await edit.fill("Discard this edit");
    await page.getByRole("button", { name: "Cancel idea edit" }).click();
    await expect.element(page.getByText(IDEA_FIXTURE.text)).toBeVisible();
    await expect
      .element(page.getByRole("button", { name: "Edit idea" }))
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
          page.getByRole("button", { name: "Edit idea", exact: true }).first(),
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
            .getByRole("list", { name: "Ideas" })
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
      .getByRole("button", { name: "Edit idea", exact: true })
      .first()
      .click();
    await page
      .getByRole("textbox", { name: "Idea", exact: true })
      .fill("Try ink");
    await page.getByRole("button", { name: "Edit idea", exact: true }).click();
    expect(sentTexts(send)).toEqual(["/edit-idea 1 Try ink"]);
    saved.resolve({ sent: true });
    const editor = page.getByRole("textbox", { name: "Idea", exact: true });
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
    await page.getByRole("button", { name: "Edit idea", exact: true }).click();
    await page.getByRole("textbox", { name: OUTSIDE_LIST }).click();
    await expect
      .element(page.getByRole("textbox", { name: "Idea", exact: true }))
      .not.toBeInTheDocument();
    expect(send).not.toHaveBeenCalled();
  });

  test("a send already in progress does not reclaim focus after clicking outside", async () => {
    const saved = Promise.withResolvers<ChatSendResult>();
    const send = chatSendMock().mockReturnValue(saved.promise);
    await render(ideasPanel({ outside: true, send, ideas: [IDEA_FIXTURE] }));
    await page.getByRole("button", { name: "Edit idea", exact: true }).click();
    await page
      .getByRole("textbox", { name: "Idea", exact: true })
      .fill("Try ink");
    await userEvent.keyboard("{Enter}");
    const outside = page.getByRole("textbox", { name: OUTSIDE_LIST });
    await outside.click();
    saved.resolve({ sent: true });
    await expect
      .element(page.getByRole("textbox", { name: "Idea", exact: true }))
      .not.toBeInTheDocument();
    await expect.element(outside).toHaveFocus();
    expect(send).toHaveBeenCalledTimes(1);
  });
});
