import { render, screen } from "@testing-library/react";
import type { UIMessage } from "ai";
import type { JSX } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { TOOL_PARTS, type ToolPart } from "@/components/chat/tool-parts.tsx";
import { ChatView } from "@/components/chat-view.tsx";
import { chatIdFixture } from "@/id-fixtures.ts";
import { CITE_MANUAL_TOOL } from "@/tutor/tools/cite-manual-contract.ts";
import { COPY } from "@/ui/copy.ts";

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

const INLINE_TOOL = "test_inline_tool";
const INLINE_TEXT = "Shown where it arrived.";
const UNDER_TOOL = "test_under_tool";
const UNDER_TEXT = "Shown under the prose.";

// Two tools only these tests know, one registered for each placement, so the
// tests show that the entry's placement, not the tool, decides where a part
// goes.
const PLACED_TOOL_PARTS: ReadonlyMap<string, ToolPart> = new Map([
  [
    INLINE_TOOL,
    {
      render: (): JSX.Element => <p>{INLINE_TEXT}</p>,
      failure: "",
      placement: "inline",
    },
  ],
  [
    UNDER_TOOL,
    {
      render: (): JSX.Element => <p>{UNDER_TEXT}</p>,
      failure: "",
      placement: "under",
    },
  ],
]);

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

// One saved message, shown in a chat with the tutor.
function renderSavedMessage(role: UIMessage["role"]): void {
  render(
    <ChatView
      chatId={chatIdFixture()}
      initialMessages={[
        { id: "m1", role, parts: [{ type: "text", text: MARKED_TEXT }] },
      ]}
      personaName="Mr. T"
    />,
  );
}

// One saved reply from the tutor, made of parts in this order.
function renderSavedReply(parts: UIMessage["parts"]): void {
  render(
    <ChatView
      chatId={chatIdFixture()}
      initialMessages={[{ id: "r1", role: "assistant", parts }]}
      personaName="Mr. T"
    />,
  );
}

// Where the citations are in the page relative to the answer's text.
function citationsPosition(): number {
  const answer = screen.getByText(ANSWER);
  const citations = screen.getByRole("region", {
    name: COPY.citations.heading,
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
    vi.spyOn(TOOL_PARTS, "get").mockImplementation(
      (toolName: string): ToolPart | undefined =>
        PLACED_TOOL_PARTS.get(toolName),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("shows a part whose entry is placed under the prose after it", () => {
    renderSavedReply([toolPart(UNDER_TOOL), ANSWER_PART]);

    expect(positionOf(UNDER_TEXT)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  test("shows a part whose entry is placed inline where it arrived", () => {
    renderSavedReply([toolPart(INLINE_TOOL), ANSWER_PART]);

    expect(positionOf(INLINE_TEXT)).toBe(Node.DOCUMENT_POSITION_PRECEDING);
  });
});

describe("ChatMessage", () => {
  test("shows the user's own text exactly as typed, marks included", () => {
    renderSavedMessage("user");

    expect(screen.getByText(MARKED_TEXT)).toBeInTheDocument();
    expect(screen.queryByText("x", { selector: "strong" })).toBeNull();
  });

  test("renders the tutor's text as Markdown", () => {
    renderSavedMessage("assistant");

    expect(document.body).toHaveTextContent("Is x bold?");
    expect(document.body).not.toHaveTextContent("**");
  });
});
