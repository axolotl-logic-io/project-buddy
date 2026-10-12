import { fireEvent, render, screen } from "@testing-library/react";
import {
  createUIMessageStreamResponse,
  type UIMessage,
  type UIMessageChunk,
} from "ai";
import { afterEach, describe, expect, test, vi } from "vitest";
import { ChatView } from "@/components/chat-view.tsx";
import { chatIdFixture } from "@/id-fixtures.ts";
import { CITE_MANUAL_TOOL } from "@/tutor/tools/cite-manual-contract.ts";
import { SEARCH_MANUAL_TOOL } from "@/tutor/tools/search-manual-contract.ts";
import { CHAT_COPY, CITATIONS_COPY } from "@/ui/copy/chat.ts";

const NOTE = "I need the Bevel tool page first.";
const ANSWER = "Select the edges and press Ctrl+B.";
const QUERY = "bevel";
const BEVEL_URL =
  "https://docs.blender.org/manual/en/latest/modeling/meshes/editing/edge/bevel.html";

type Part = UIMessage["parts"][number];

const NOTE_PART: Part = { type: "text", text: NOTE };
const ANSWER_PART: Part = { type: "text", text: ANSWER };
// A finished search of the manual, which shows where it arrived.
const SEARCH_PART: Part = {
  type: `tool-${SEARCH_MANUAL_TOOL}`,
  toolCallId: "call-search",
  state: "output-available",
  input: { query: QUERY },
  output: { sections: [] },
};
// The citations, which show under the rest of the reply.
const CITATION_PART: Part = {
  type: `tool-${CITE_MANUAL_TOOL}`,
  toolCallId: "call-cite",
  state: "output-available",
  input: { urls: [BEVEL_URL] },
  output: { citations: [{ label: "Bevel", url: BEVEL_URL }] },
};

// A chat with these saved messages.
function renderChat(messages: UIMessage[]): void {
  render(
    <ChatView
      chatId={chatIdFixture()}
      initialMessages={messages}
      personaName="Mr. Tee"
    />,
  );
}

// One saved reply from the tutor, made of parts in this order.
function renderSavedReply(parts: Part[]): void {
  renderChat([{ id: "r1", role: "assistant", parts }]);
}

// The working notes on the page.
function workingNotes(): HTMLElement[] {
  return screen.queryAllByRole("note", { name: CHAT_COPY.workingNote });
}

// Where the text is in the page relative to the answer's text.
function positionOf(text: string): number {
  return screen
    .getByText(ANSWER)
    .compareDocumentPosition(screen.getByText(text));
}

// Sends a message from the composer, and resolves with the controller of
// the reply's stream once the chat has asked for the reply.
function sendForReply(): Promise<
  ReadableStreamDefaultController<UIMessageChunk>
> {
  const opened =
    Promise.withResolvers<ReadableStreamDefaultController<UIMessageChunk>>();
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(() =>
      Promise.resolve(
        createUIMessageStreamResponse({
          stream: new ReadableStream<UIMessageChunk>({ start: opened.resolve }),
        }),
      ),
    ),
  );
  fireEvent.change(
    screen.getByRole("textbox", { name: CHAT_COPY.messageLabel }),
    {
      target: { value: "How do I bevel?" },
    },
  );
  fireEvent.click(screen.getByRole("button", { name: CHAT_COPY.send }));
  return opened.promise;
}

describe("TextRun in a saved reply", () => {
  test("shows text before a search as a labelled note where it arrived", () => {
    renderSavedReply([NOTE_PART, SEARCH_PART, ANSWER_PART]);

    const [note] = workingNotes();
    expect(note).toHaveTextContent(NOTE);
    expect(note).not.toHaveTextContent(ANSWER);
    expect(positionOf(NOTE)).toBe(Node.DOCUMENT_POSITION_PRECEDING);
    expect(positionOf(CITATIONS_COPY.searched(QUERY))).toBe(
      Node.DOCUMENT_POSITION_PRECEDING,
    );
  });

  test("shows consecutive text parts before a search as one note", () => {
    renderSavedReply([
      NOTE_PART,
      { type: "text", text: "Then its shortcut." },
      SEARCH_PART,
      ANSWER_PART,
    ]);

    expect(workingNotes()).toHaveLength(1);
    expect(workingNotes()[0]).toHaveTextContent("Then its shortcut.");
  });

  test("shows text before the citations only as prose", () => {
    renderSavedReply([ANSWER_PART, CITATION_PART]);

    expect(screen.getByText(ANSWER)).toBeVisible();
    expect(workingNotes()).toHaveLength(0);
  });

  test("counts only the searches of the text's own message", () => {
    renderChat([
      { id: "m1", role: "user", parts: [NOTE_PART] },
      { id: "r1", role: "assistant", parts: [NOTE_PART] },
      { id: "m2", role: "user", parts: [NOTE_PART] },
      { id: "r2", role: "assistant", parts: [SEARCH_PART, ANSWER_PART] },
    ]);

    expect(screen.getByText(ANSWER)).toBeVisible();
    expect(workingNotes()).toHaveLength(0);
  });
});

describe("TextRun while the tutor replies", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("shows streaming text as prose until a search arrives after it", async () => {
    renderChat([]);
    const stream = await sendForReply();

    stream.enqueue({ type: "start", messageId: "r1" });
    stream.enqueue({ type: "text-start", id: "t1" });
    stream.enqueue({ type: "text-delta", id: "t1", delta: "Looking it up." });
    expect(await screen.findByText("Looking it up.")).toBeVisible();
    expect(workingNotes()).toHaveLength(0);

    stream.enqueue({ type: "text-end", id: "t1" });
    stream.enqueue({
      type: "tool-input-available",
      toolCallId: "call-search",
      toolName: SEARCH_MANUAL_TOOL,
      input: { query: QUERY },
    });
    expect(
      await screen.findByRole("note", { name: CHAT_COPY.workingNote }),
    ).toHaveTextContent("Looking it up.");
  });
});
