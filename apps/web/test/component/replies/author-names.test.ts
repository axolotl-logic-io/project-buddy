// How a conversation reaches the buddy when several people write in a chat:
// each user message starts with its author's name, before its text or, for
// a message that starts with an image, as a text of its own; the buddy's
// messages are unchanged. A conversation with one author goes as it is. The
// prompt's rules for several people are checked in system-prompt.test.ts.
import { describe, expect, test } from "vitest";
import {
  type ChatMessage,
  type MessageAuthor,
  withAuthor,
} from "@/chats/message-author.ts";
import { withAuthorNames } from "@/replies/author-names.ts";
import { userIdFixture } from "../../support/id-fixtures.ts";

const SAM: MessageAuthor = {
  id: userIdFixture("1a2b3c4d-5e6f-4a1b-8c2d-3e4f5a6b7c8d"),
  name: "Sam",
};
const ALEX: MessageAuthor = {
  id: userIdFixture("2b3c4d5e-6f7a-4b2c-9d3e-4f5a6b7c8d9e"),
  name: "Alex",
};
const IMAGE_URL = "/api/images/0f1e2d3c-4b5a-4968-8776-655443322110";

function said(id: string, author: MessageAuthor, text: string): ChatMessage {
  return withAuthor(
    { id, role: "user", parts: [{ type: "text", text }] },
    author,
  );
}

function reply(id: string, text: string): ChatMessage {
  return { id, role: "assistant", parts: [{ type: "text", text }] };
}

describe("author names", () => {
  test("a conversation with one author goes as it is", () => {
    const conversation = [
      said("m1", SAM, "The flipper loops are fixed."),
      reply("r1", "Great work."),
      said("m2", SAM, "Can we look at the shell next?"),
    ];

    expect(withAuthorNames(conversation)).toStrictEqual({
      messages: conversation,
      severalAuthors: false,
    });
  });

  test("with several authors, each user turn starts with its author's name", () => {
    const { messages, severalAuthors } = withAuthorNames([
      said("m1", ALEX, "The flipper loops are fixed."),
      reply("r1", "Great work, Alex."),
      said("m2", SAM, "Can we look at the shell next?"),
    ]);

    expect(severalAuthors).toBe(true);
    expect(messages.map(({ parts }) => parts)).toStrictEqual([
      [{ type: "text", text: "Alex: The flipper loops are fixed." }],
      [{ type: "text", text: "Great work, Alex." }],
      [{ type: "text", text: "Sam: Can we look at the shell next?" }],
    ]);
  });

  test("a message that starts with an image gets its name as a text of its own", () => {
    const image = withAuthor(
      {
        id: "m2",
        role: "user",
        parts: [
          { type: "file", mediaType: "image/png", url: IMAGE_URL },
          { type: "text", text: "Like this?" },
        ],
      },
      SAM,
    );

    const { messages } = withAuthorNames([
      said("m1", ALEX, "Show me the shell."),
      image,
    ]);

    expect(messages.at(-1)?.parts).toStrictEqual([
      { type: "text", text: "Sam:" },
      { type: "file", mediaType: "image/png", url: IMAGE_URL },
      { type: "text", text: "Like this?" },
    ]);
  });
});
