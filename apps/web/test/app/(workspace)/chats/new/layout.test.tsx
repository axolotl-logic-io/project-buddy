import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import NewChatLayout from "@/app/(workspace)/chats/new/layout.tsx";
import NewChatLoading from "@/app/(workspace)/chats/new/loading.tsx";

describe("New chat layout", () => {
  test("links back to all projects and shows the Start a chat heading", () => {
    render(
      <NewChatLayout params={Promise.resolve({})}>
        <NewChatLoading />
      </NewChatLayout>,
    );

    expect(screen.getByRole("link", { name: "All projects" })).toHaveAttribute(
      "href",
      "/projects",
    );
    const heading = screen.getByRole("heading", {
      level: 1,
      name: "Start a chat",
    });
    expect(
      heading.compareDocumentPosition(screen.getByText("Loading projects…")),
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });
});
