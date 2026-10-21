import { screen } from "@testing-library/react";
import type { UIMessage, UIMessageChunk } from "ai";
import { afterEach, describe, expect, test, vi } from "vitest";
import { SEARCH_MANUAL_TOOL } from "@/tutor/tools/search-manual-contract.ts";
import { CHAT_COPY, CITATIONS_COPY } from "@/ui/copy/chat.ts";
import { holdReply } from "../chat-stream-test-kit.ts";
import { renderChat, sendMessage } from "../chat-view-test-kit.tsx";

// ChatView refreshes the page through the App Router.
vi.mock("next/navigation", () => import("../router-test-kit.ts"));

const NOTE = "I need the Bevel tool page first.";
const ANSWER = "Select the edges and press Ctrl+B.";
const QUERY = "bevel";

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
function sendForReply(): Promise<
  ReadableStreamDefaultController<UIMessageChunk>
> {
  const reply = holdReply();
  sendMessage();
  return reply;
}

describe("TextRun in a saved reply", () => {
  test("shows text before a search as a labelled note where it arrived", () => {
    renderSavedReply([NOTE_PART, SEARCH_PART, ANSWER_PART]);

    const [note] = workingNotes();
    expect(note).toHaveTextContent(NOTE);
    expect(note).toHaveAttribute("data-extra", "working-notes");
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
