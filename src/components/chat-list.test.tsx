import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChatList } from "@/components/chat-list";

describe("ChatList", () => {
  it("links each chat by its persona's name", () => {
    render(
      <ChatList
        chats={[
          {
            id: "c1",
            projectId: "p1",
            personaId: "mr-t",
            createdAt: new Date("2026-10-09T12:00:00Z"),
          },
          {
            id: "c2",
            projectId: "p1",
            personaId: "hippy",
            createdAt: new Date("2026-10-10T12:00:00Z"),
          },
        ]}
      />,
    );

    expect(screen.getByRole("link", { name: /mr\. t/i })).toHaveAttribute(
      "href",
      "/chats/c1",
    );
    expect(screen.getByRole("link", { name: /hippy/i })).toHaveAttribute(
      "href",
      "/chats/c2",
    );
  });

  it("says so when the project has no chats", () => {
    render(<ChatList chats={[]} />);

    expect(screen.getByText(/no chats yet/i)).toBeInTheDocument();
  });
});
