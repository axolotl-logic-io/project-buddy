// Regression coverage for saved working note rendering.
// the parts the mock construct's `/mock-working-note zibble` streams, a note, a
// search of the manual for "zibble", then the answer. The note shows quiet
// (smaller, in another colour) and labelled before the search, and the answer
// as prose after it, as the reply streams and once it is saved. That the
// chat saves the parts in that order, which a reload reads, is
// test/component-integration/app/api/chat/reply-failures.server.test.ts's.
// A note before a spell cast, which changes the conversation’s spell,
// shows the same way.
// The site's stylesheet comes from vitest.browser-setup.ts.

import {
  createUIMessageStreamResponse,
  simulateReadableStream,
  type UIMessage,
  type UIMessageChunk,
} from "ai";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { type Locator, page } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import { ChatView } from "@/components/chat-view.tsx";
import { getConstruct } from "@/constructs/index.ts";
import { CAST_SPELL_TOOL } from "@/spells/cast-spell-contract.ts";
import { DEFAULT_THEME_ATTRIBUTES } from "@/themes/theme-choice.ts";
import { CAST_SPELL_COPY, CHAT_COPY } from "@/ui/copy/chat.ts";
import { chatIdFixture, userIdFixture } from "../../../support/id-fixtures.ts";

// ChatView refreshes the page through the App Router.
vi.mock("next/navigation", () => import("../router-test-kit.ts"));

const TOPIC = "zibble";
const NOTE = "Let me cast Brainstorm first.";
const ANSWER = `The saved answer about ${TOPIC}.`;
const SEARCH_INPUT = { spellId: "brainstorm" };
const SEARCH_OUTPUT = {
  status: "cast",
  spellId: "brainstorm",
  name: "Brainstorm",
};

// The reply as it streams.
const STREAMED_REPLY: UIMessageChunk[] = [
  { type: "start", messageId: "r1" },
  { type: "start-step" },
  { type: "text-start", id: "t1" },
  { type: "text-delta", id: "t1", delta: NOTE },
  { type: "text-end", id: "t1" },
  {
    type: "tool-input-available",
    toolCallId: "call-search",
    toolName: CAST_SPELL_TOOL,
    input: SEARCH_INPUT,
  },
  {
    type: "tool-output-available",
    toolCallId: "call-search",
    output: SEARCH_OUTPUT,
  },
  { type: "finish-step" },
  { type: "start-step" },
  { type: "text-start", id: "t2" },
  { type: "text-delta", id: "t2", delta: ANSWER },
  { type: "text-end", id: "t2" },
  { type: "finish-step" },
  { type: "finish" },
];

// The same reply as the chat saved it.
const SAVED_REPLY: UIMessage = {
  id: "r1",
  role: "assistant",
  parts: [
    { type: "step-start" },
    { type: "text", text: NOTE },
    {
      type: `tool-${CAST_SPELL_TOOL}`,
      toolCallId: "call-search",
      state: "output-available",
      input: SEARCH_INPUT,
      output: SEARCH_OUTPUT,
    },
    { type: "step-start" },
    { type: "text", text: ANSWER },
  ],
};

// How a text looks: its font size in pixels, and its colour.
interface TextLook {
  readonly fontSize: number;
  readonly color: string;
}

function textLook(element: Element): TextLook {
  const style = getComputedStyle(element);
  return { fontSize: Number.parseFloat(style.fontSize), color: style.color };
}

// Whether later comes after earlier in the page.
function follows(earlier: Element, later: Element): boolean {
  return (
    earlier.compareDocumentPosition(later) === Node.DOCUMENT_POSITION_FOLLOWING
  );
}

async function renderChat(initialMessages: UIMessage[]): Promise<void> {
  await render(
    <ChatView
      viewer={userIdFixture()}
      chatId={chatIdFixture()}
      initialMessages={initialMessages}
      constructName={getConstruct("lumen").name}
    />,
  );
}

// Where the reply's parts sit, as booleans, so a test compares them whole.
interface ReplyOrder {
  readonly oneNote: boolean;
  readonly noteHoldsAnswer: boolean;
  readonly noteBeforeSearch: boolean;
  readonly searchBeforeAnswer: boolean;
}

// The page's reply: where its parts sit, and how its note and answer look.
interface ReplyShape {
  readonly order: ReplyOrder;
  readonly note: TextLook;
  readonly answer: TextLook;
}

// The note labelled as one, and the answer, each a single locator.
function noteText(): Locator {
  return page
    .getByRole("note", { name: CHAT_COPY.workingNote })
    .getByText(NOTE);
}

function answerText(): Locator {
  return page.getByText(ANSWER);
}

// Reads the page's reply once its note and answer show.
function readReply(): ReplyShape {
  const notes = page
    .getByRole("note", { name: CHAT_COPY.workingNote })
    .elements();
  const note = noteText().element();
  const answer = answerText().element();
  const search = page.getByText(CAST_SPELL_COPY.cast("Brainstorm")).element();
  return {
    order: {
      oneNote: notes.length === 1,
      noteHoldsAnswer: notes.some((element) =>
        element.textContent.includes(ANSWER),
      ),
      noteBeforeSearch: follows(note, search),
      searchBeforeAnswer: follows(search, answer),
    },
    note: textLook(note),
    answer: textLook(answer),
  };
}

// One note, without the answer, before the search, and the answer after it.
const NOTE_THEN_ANSWER: ReplyOrder = {
  oneNote: true,
  noteHoldsAnswer: false,
  noteBeforeSearch: true,
  searchBeforeAnswer: true,
};

beforeEach(() => {
  for (const [name, value] of Object.entries(DEFAULT_THEME_ATTRIBUTES)) {
    document.documentElement.setAttribute(name, value);
  }
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("saved working note rendering", () => {
  test("the note shows quiet and labelled before the search, live and saved alike", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(() =>
        Promise.resolve(
          createUIMessageStreamResponse({
            stream: simulateReadableStream({ chunks: STREAMED_REPLY }),
          }),
        ),
      ),
    );
    await renderChat([]);
    await page
      .getByRole("textbox", { name: CHAT_COPY.messageLabel })
      .fill("cast brainstorm");
    await page.getByRole("button", { name: CHAT_COPY.send }).click();
    await expect.element(noteText()).toBeVisible();
    await expect.element(answerText()).toBeVisible();
    const live = readReply();
    expect(live.order).toEqual(NOTE_THEN_ANSWER);
    expect(live.note.fontSize).toBeLessThan(live.answer.fontSize);
    expect(live.note.color).not.toBe(live.answer.color);

    // The saved chat replaces the live one on the page.
    await cleanup();
    await renderChat([SAVED_REPLY]);
    await expect.element(answerText()).toBeVisible();
    const saved = readReply();

    expect(saved).toEqual(live);
  });

  test("a note before a spell cast shows quiet and labelled, and the answer after it as prose", async () => {
    const spellNote = "Let me cast Brainstorm first.";
    const spellAnswer = "Here is the answer, after the cast.";
    await renderChat([
      {
        id: "r2",
        role: "assistant",
        parts: [
          { type: "step-start" },
          { type: "text", text: spellNote },
          {
            type: `tool-${CAST_SPELL_TOOL}`,
            toolCallId: "call-cast",
            state: "output-available",
            input: { spellId: "brainstorm" },
            output: {
              status: "cast",
              spellId: "brainstorm",
              name: "Brainstorm",
            },
          },
          { type: "step-start" },
          { type: "text", text: spellAnswer },
        ],
      },
    ]);

    const note = page.getByRole("note", { name: CHAT_COPY.workingNote });
    await expect.element(note.getByText(spellNote)).toBeVisible();
    await expect.element(page.getByText(spellAnswer)).toBeVisible();
    const cast = page.getByText(CAST_SPELL_COPY.cast("Brainstorm")).element();

    expect(note.elements()).toHaveLength(1);
    expect(note.element().textContent).not.toContain(spellAnswer);
    expect(follows(note.getByText(spellNote).element(), cast)).toBe(true);
    expect(follows(cast, page.getByText(spellAnswer).element())).toBe(true);
  });
});
