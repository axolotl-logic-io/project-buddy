import { render, screen } from "@testing-library/react";
import type { UIMessage } from "ai";
import { describe, expect, test } from "vitest";
import { ChatView } from "@/components/chat-view.tsx";
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

// One saved message, shown in a chat with the tutor.
function renderSavedMessage(role: UIMessage["role"]): void {
  render(
    <ChatView
      chatId="chat-1"
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
      chatId="chat-1"
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
