import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import NewChatLayout from "@/app/(workspace)/chats/new/layout.tsx";
import NewChatLoading from "@/app/(workspace)/chats/new/loading.tsx";
import { NEW_CHAT_COPY } from "@/ui/copy/chat.ts";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";

describe("New chat layout", () => {
  test("links back to all projects and shows the Start a chat heading", () => {
    render(
      <NewChatLayout params={Promise.resolve({})}>
        <NewChatLoading />
      </NewChatLayout>,
    );

    expect(
      screen.getByRole("link", { name: PROJECTS_COPY.allProjectsLink }),
    ).toHaveAttribute("href", "/projects");
    const heading = screen.getByRole("heading", {
      level: 1,
      name: NEW_CHAT_COPY.heading,
    });
    expect(
      heading.compareDocumentPosition(screen.getByText(NEW_CHAT_COPY.loading)),
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });
});
