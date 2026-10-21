import { screen, waitFor } from "@testing-library/react";
import type { UIMessage } from "ai";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { getBuddy } from "@/buddies/index.ts";
import { CITE_MANUAL_TOOL } from "@/tutor/tools/cite-manual-contract.ts";
import { CHAT_COPY, CITATIONS_COPY } from "@/ui/copy/chat.ts";
import {
  answerChat,
  holdBeforeChunk,
  holdResponse,
  replyChunks,
} from "../chat-stream-test-kit.ts";
import { renderChat, sendMessage } from "../chat-view-test-kit.tsx";
import {
  NOTE_MAKING_TOOL,
  stubToolParts,
  UNDER_TOOL,
} from "./tool-part-fixtures.tsx";

const BUDDY_NAME: string = getBuddy("mr-tee").name;

// ChatView refreshes the page through the App Router.
vi.mock("next/navigation", () => import("../router-test-kit.ts"));

const MARKED_TEXT = "Is **x** bold?";
const ANSWER = "Select the edges and press Ctrl+B.";
const BEVEL_URL =
  "https://docs.blender.org/manual/en/latest/modeling/meshes/editing/edge/bevel.html#usage";
const CITATION_PART: UIMessage["parts"][number] = {
  type: `tool-${CITE_MANUAL_TOOL}`,
  toolCallId: "call-cite",
  state: "output-available",
  input: { urls: [BEVEL_URL] },
  output: { citations: [{ label: "Bevel › Usage", url: BEVEL_URL }] },
};
const ANSWER_PART: UIMessage["parts"][number] = { type: "text", text: ANSWER };

// A finished call of toolName, with no input or output.
function toolPart(toolName: string): UIMessage["parts"][number] {
  return {
    type: `tool-${toolName}`,
    toolCallId: `call-${toolName}`,
    state: "output-available",
    input: {},
    output: {},
  };
}
function renderSavedMessage(role: UIMessage["role"]): void {
  renderChat([
    { id: "m1", role, parts: [{ type: "text", text: MARKED_TEXT }] },
  ]);
}
function renderSavedReply(parts: UIMessage["parts"]): void {
  renderChat([{ id: "r1", role: "assistant", parts }]);
}
function heldReply(firstWords: string): {
  response: Response;
  finish: () => void;
} {
  const chunks = replyChunks(firstWords);
  const held = holdBeforeChunk(chunks, chunks.length - 2);
  return { response: held.response, finish: held.release };
}
function sendFromComposer(): void {
  renderSavedMessage("user");
  sendMessage();
}

// Where the citations are in the page relative to the answer's text.
function citationsPosition(): number {
  const answer = screen.getByText(ANSWER);
  const citations = screen.getByRole("region", {
    name: CITATIONS_COPY.heading,
  });
  return answer.compareDocumentPosition(citations);
}

// Where the text is in the page relative to the answer's text.
function positionOf(text: string): number {
  return screen
    .getByText(ANSWER)
    .compareDocumentPosition(screen.getByText(text));
}

describe("ChatMessage citations", () => {
  test("shows the citations under the prose when they arrived first", () => {
    renderSavedReply([CITATION_PART, ANSWER_PART]);

    expect(screen.getByRole("link", { name: "Bevel › Usage" })).toBeVisible();
    expect(citationsPosition()).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  test("shows the citations under the prose when they arrived last", () => {
    renderSavedReply([ANSWER_PART, CITATION_PART]);

    expect(citationsPosition()).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });
});

describe("ChatMessage tool placement", () => {
  beforeEach(() => {
    stubToolParts();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("shows a part whose entry is placed under the prose after it", () => {
    renderSavedReply([toolPart(UNDER_TOOL), ANSWER_PART]);

    expect(positionOf(UNDER_TOOL)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  test("shows a part whose entry is placed inline where it arrived", () => {
    renderSavedReply([toolPart(NOTE_MAKING_TOOL), ANSWER_PART]);

    expect(positionOf(NOTE_MAKING_TOOL)).toBe(Node.DOCUMENT_POSITION_PRECEDING);
  });
});

describe("ChatMessage", () => {
  test("shows the user's own text exactly as typed, marks included", () => {
    renderSavedMessage("user");

    expect(screen.getByText(MARKED_TEXT)).toBeInTheDocument();
    expect(screen.queryByText("x", { selector: "strong" })).toBeNull();
  });
});

describe("ChatMessage while the tutor replies", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("says the buddy is thinking until the reply starts", async () => {
    holdResponse();
    sendFromComposer();

    const thinking = await screen.findByText(CHAT_COPY.thinking(BUDDY_NAME));
    expect(thinking.closest("[aria-busy]")).toHaveAttribute(
      "aria-busy",
      "true",
    );
  });

  test("marks the reply busy until the tutor has finished it", async () => {
    const reply = heldReply("Working on it");
    answerChat(reply.response);
    sendFromComposer();

    const message = (await screen.findByText("Working on it")).closest(
      "[aria-busy]",
    );
    expect(message).toHaveAttribute("aria-busy", "true");

    reply.finish();
    await waitFor(() => {
      expect(message).toHaveAttribute("aria-busy", "false");
    });
  });
});

test("a saved call to an unregistered tool shows no tool line", () => {
  renderSavedReply([toolPart("unregistered_tool")]);
  expect(
    screen.getByRole("list", { name: CHAT_COPY.conversationLabel }),
  ).not.toHaveTextContent("unregistered_tool");
  expect(screen.queryByRole("note")).not.toBeInTheDocument();
});
