import { render, screen } from "@testing-library/react";
import type { UIMessage } from "ai";
import { describe, expect, test } from "vitest";
import { chatIdFixture } from "@/chats/chat-fixtures.ts";
import { ChatView } from "@/components/chat-view.tsx";

const MARKED_TEXT = "Is **x** bold?";

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
