import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { chatNameFixture } from "@/chats/chat-name-fixtures.ts";
import type { Chat } from "@/chats/chat-rows.ts";
import { ChatList } from "@/components/chat-list.tsx";
import { chatIdFixture, projectIdFixture } from "@/id-fixtures.ts";
import { getPersona } from "@/personas/index.ts";
import { CHAT_NAME_COPY } from "@/ui/copy/chat.ts";
import { PROJECT_COPY } from "@/ui/copy/projects.ts";

const MR_TEE_NAME: string = getPersona("mr-tee").name;
const MR_TEE = new RegExp(escapeForRegExp(MR_TEE_NAME), "iu");
const HIPPY = new RegExp(escapeForRegExp(getPersona("hippy").name), "iu");
const NO_CHATS_YET = /no chats yet/iu;
const MR_TEE_STARTED = new RegExp(
  `^${escapeForRegExp(MR_TEE_NAME)} started oct \\d+, 2026`,
  "iu",
);
const NAMED_WITH_MR_TEE_STARTED = new RegExp(
  `^beveling the donut with ${escapeForRegExp(MR_TEE_NAME)} started oct \\d+, 2026`,
  "iu",
);
const PROJECT_ID = projectIdFixture();
// 20:16 on October 12 in New York (EDT), and already October 13 in UTC.
const EVENING_IN_NEW_YORK = new Date("2026-10-13T00:16:00Z");
const MR_TEE_CHAT_ID = chatIdFixture();
const HIPPY_CHAT_ID = chatIdFixture();

// text as a pattern that matches it literally.
function escapeForRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

afterEach(() => {
  vi.unstubAllEnvs();
});

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

// A chat with the mr-tee persona, named name.
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

describe("ChatList times", () => {
  test("says when each chat started in the browser's zone", () => {
    vi.stubEnv("TZ", "America/New_York");

    render(
      <ChatList
        chats={[{ ...namedChat("Bevels"), createdAt: EVENING_IN_NEW_YORK }]}
      />,
    );

    expect(screen.getByRole("listitem")).toHaveTextContent(
      PROJECT_COPY.chatStarted("Oct 12, 2026, 8:16 PM"),
    );
  });
});

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
      screen.getByRole("link", {
        name: `Beveling the donut with ${MR_TEE_NAME}`,
      }),
    ).toHaveAttribute("href", `/chats/${MR_TEE_CHAT_ID}`);
    expect(screen.getByRole("listitem")).toHaveTextContent(
      NAMED_WITH_MR_TEE_STARTED,
    );
  });

  test("reads as listTitle, with the name's part tagged as the chat-names extra", () => {
    render(<ChatList chats={[namedChat("Beveling the donut")]} />);

    const title = CHAT_NAME_COPY.listTitle("Beveling the donut", MR_TEE_NAME);
    const link = screen.getByRole("link", { name: title });
    expect(link.textContent).toBe(title);
    const extra = link.querySelector('[data-extra="chat-names"]');
    expect(extra?.textContent).toBe(
      CHAT_NAME_COPY.listNamePrefix("Beveling the donut"),
    );
    expect(link.lastChild?.textContent).toBe(MR_TEE_NAME);
  });

  test("says so when the project has no chats", () => {
    render(<ChatList chats={[]} />);

    expect(screen.getByText(NO_CHATS_YET)).toBeInTheDocument();
  });
});
