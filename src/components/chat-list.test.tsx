import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { ChatList } from "@/components/chat-list.tsx";

const MR_T = /mr\. t/iu;
const HIPPY = /hippy/iu;
const NO_CHATS_YET = /no chats yet/iu;
const MR_T_STARTED = /^mr\. t started oct \d+, 2026/iu;

describe("ChatList", () => {
  test("links each chat by its persona's name", () => {
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

    expect(screen.getByRole("link", { name: MR_T })).toHaveAttribute(
      "href",
      "/chats/c1",
    );
    expect(screen.getByRole("link", { name: HIPPY })).toHaveAttribute(
      "href",
      "/chats/c2",
    );
  });

  test("says when each chat started, after its persona's name", () => {
    render(
      <ChatList
        chats={[
          {
            id: "c1",
            projectId: "p1",
            personaId: "mr-t",
            createdAt: new Date("2026-10-09T12:00:00Z"),
          },
        ]}
      />,
    );

    expect(screen.getByRole("listitem")).toHaveTextContent(MR_T_STARTED);
  });

  test("says so when the project has no chats", () => {
    render(<ChatList chats={[]} />);

    expect(screen.getByText(NO_CHATS_YET)).toBeInTheDocument();
  });
});
