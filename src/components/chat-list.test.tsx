import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { chatIdFixture, chatNameFixture } from "@/chats/chat-fixtures.ts";
import { ChatList } from "@/components/chat-list.tsx";
import { projectIdFixture } from "@/projects/project-fixtures.ts";

const MR_T = /mr\. t/iu;
const HIPPY = /hippy/iu;
const NO_CHATS_YET = /no chats yet/iu;
const MR_T_STARTED = /^mr\. t started oct \d+, 2026/iu;
const NAMED_WITH_MR_T =
  /^beveling the donut with mr\. t, started oct \d+, 2026/iu;
const PROJECT_ID = projectIdFixture();
const MR_T_CHAT_ID = chatIdFixture();
const HIPPY_CHAT_ID = chatIdFixture();

describe("ChatList", () => {
  test("links each chat by its persona's name", () => {
    render(
      <ChatList
        chats={[
          {
            id: MR_T_CHAT_ID,
            projectId: PROJECT_ID,
            personaId: "mr-t",
            name: undefined,
            renamedByHand: false,
            createdAt: new Date("2026-10-09T12:00:00Z"),
          },
          {
            id: HIPPY_CHAT_ID,
            projectId: PROJECT_ID,
            personaId: "hippy",
            name: undefined,
            renamedByHand: false,
            createdAt: new Date("2026-10-10T12:00:00Z"),
          },
        ]}
      />,
    );

    expect(screen.getByRole("link", { name: MR_T })).toHaveAttribute(
      "href",
      `/chats/${MR_T_CHAT_ID}`,
    );
    expect(screen.getByRole("link", { name: HIPPY })).toHaveAttribute(
      "href",
      `/chats/${HIPPY_CHAT_ID}`,
    );
  });

  test("says when each chat started, after its persona's name", () => {
    render(
      <ChatList
        chats={[
          {
            id: MR_T_CHAT_ID,
            projectId: PROJECT_ID,
            personaId: "mr-t",
            name: undefined,
            renamedByHand: false,
            createdAt: new Date("2026-10-09T12:00:00Z"),
          },
        ]}
      />,
    );

    expect(screen.getByRole("listitem")).toHaveTextContent(MR_T_STARTED);
  });
});

describe("ChatList names", () => {
  test("links a named chat by its name, then names its persona and start", () => {
    render(
      <ChatList
        chats={[
          {
            id: MR_T_CHAT_ID,
            projectId: PROJECT_ID,
            personaId: "mr-t",
            name: chatNameFixture("Beveling the donut"),
            renamedByHand: false,
            createdAt: new Date("2026-10-09T12:00:00Z"),
          },
        ]}
      />,
    );

    expect(
      screen.getByRole("link", { name: "Beveling the donut" }),
    ).toHaveAttribute("href", `/chats/${MR_T_CHAT_ID}`);
    expect(screen.getByRole("listitem")).toHaveTextContent(NAMED_WITH_MR_T);
  });

  test("says so when the project has no chats", () => {
    render(<ChatList chats={[]} />);

    expect(screen.getByText(NO_CHATS_YET)).toBeInTheDocument();
  });
});
