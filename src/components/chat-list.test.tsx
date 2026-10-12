import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { chatNameFixture } from "@/chats/chat-name-fixtures.ts";
import type { Chat } from "@/chats/chat-rows.ts";
import { ChatList } from "@/components/chat-list.tsx";
import { chatIdFixture, projectIdFixture } from "@/id-fixtures.ts";
import { CHAT_NAME_COPY } from "@/ui/copy/chat.ts";

const MR_TEE = /mr\. tee/iu;
const HIPPY = /hippy/iu;
const NO_CHATS_YET = /no chats yet/iu;
const MR_TEE_STARTED = /^mr\. tee started oct \d+, 2026/iu;
const NAMED_WITH_MR_TEE_STARTED =
  /^beveling the donut with mr\. tee started oct \d+, 2026/iu;
const PROJECT_ID = projectIdFixture();
const MR_TEE_CHAT_ID = chatIdFixture();
const HIPPY_CHAT_ID = chatIdFixture();

describe("ChatList", () => {
  test("links each chat by its persona's name", () => {
    render(
      <ChatList
        chats={[
          {
            id: MR_TEE_CHAT_ID,
            projectId: PROJECT_ID,
            personaId: "mr-tee",
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

    expect(screen.getByRole("link", { name: MR_TEE })).toHaveAttribute(
      "href",
      `/chats/${MR_TEE_CHAT_ID}`,
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
            id: MR_TEE_CHAT_ID,
            projectId: PROJECT_ID,
            personaId: "mr-tee",
            name: undefined,
            renamedByHand: false,
            createdAt: new Date("2026-10-09T12:00:00Z"),
          },
        ]}
      />,
    );

    expect(screen.getByRole("listitem")).toHaveTextContent(MR_TEE_STARTED);
    expect(screen.getByRole("listitem")).toHaveClass("link-card");
  });
});

// A chat with Mr. Tee, named name.
function namedChat(name: string): Chat {
  return {
    id: MR_TEE_CHAT_ID,
    projectId: PROJECT_ID,
    personaId: "mr-tee",
    name: chatNameFixture(name),
    renamedByHand: false,
    createdAt: new Date("2026-10-09T12:00:00Z"),
  };
}

describe("ChatList names", () => {
  test("links a named chat by its name and persona, then says when it started", () => {
    render(
      <ChatList
        chats={[
          {
            id: MR_TEE_CHAT_ID,
            projectId: PROJECT_ID,
            personaId: "mr-tee",
            name: chatNameFixture("Beveling the donut"),
            renamedByHand: false,
            createdAt: new Date("2026-10-09T12:00:00Z"),
          },
        ]}
      />,
    );

    expect(
      screen.getByRole("link", { name: "Beveling the donut with Mr. Tee" }),
    ).toHaveAttribute("href", `/chats/${MR_TEE_CHAT_ID}`);
    expect(screen.getByRole("listitem")).toHaveTextContent(
      NAMED_WITH_MR_TEE_STARTED,
    );
  });

  test("reads as listTitle, with the name's part tagged as the chat-names extra", () => {
    render(<ChatList chats={[namedChat("Beveling the donut")]} />);

    const title = CHAT_NAME_COPY.listTitle("Beveling the donut", "Mr. Tee");
    const link = screen.getByRole("link", { name: title });
    expect(link.textContent).toBe(title);
    const extra = link.querySelector('[data-extra="chat-names"]');
    expect(extra?.textContent).toBe(
      CHAT_NAME_COPY.listNamePrefix("Beveling the donut"),
    );
    expect(link.lastChild?.textContent).toBe("Mr. Tee");
  });

  test("says so when the project has no chats", () => {
    render(<ChatList chats={[]} />);

    expect(screen.getByText(NO_CHATS_YET)).toBeInTheDocument();
  });
});
