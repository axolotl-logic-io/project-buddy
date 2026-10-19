import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { getBuddy } from "@/buddies/index.ts";
import type { Chat } from "@/chats/chat-rows.ts";
import { ChatList } from "@/components/chat-list.tsx";
import { chatNameFixture } from "../chats/chat-name-fixtures.ts";
import { chatIdFixture, projectIdFixture } from "../id-fixtures.ts";
import { CENTRAL_CHAT, PROJECT_CHAT } from "./chat-list-fixtures.ts";

const MR_TEE_NAME: string = getBuddy("mr-tee").name;
const MR_TEE = new RegExp(escapeForRegExp(MR_TEE_NAME), "iu");
const HIPPY = new RegExp(escapeForRegExp(getBuddy("hippy").name), "iu");
const NO_CHATS_YET = /no chats yet/iu;
const MR_TEE_STARTED = new RegExp(
  `^${escapeForRegExp(MR_TEE_NAME)} started oct \\d+, 2026`,
  "iu",
);
const NAMED_WITH_MR_TEE_STARTED = new RegExp(
  `^beveling the donut with ${escapeForRegExp(MR_TEE_NAME)} started oct \\d+, 2026`,
  "iu",
);
const CENTRAL_CHAT_STARTED = new RegExp(
  `^${escapeForRegExp(CENTRAL_CHAT.buddy.name)} started oct \\d+, 2026, \\d{2}:\\d{2} [ap]m$`,
  "iu",
);
const PROJECT_LIST_CHAT_STARTED = new RegExp(
  `^bevels with ${escapeForRegExp(MR_TEE_NAME)} started oct \\d+, 2026, \\d{2}:\\d{2} [ap]m$`,
  "iu",
);
const PROJECT_ID = projectIdFixture();
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
  test("links each chat by its buddy's name", () => {
    render(
      <ChatList
        chats={[
          {
            id: MR_TEE_CHAT_ID,
            projectId: PROJECT_ID,
            buddy: getBuddy("mr-tee"),
            name: undefined,
            renamedByHand: false,
            createdAt: new Date("2026-10-09T12:00:00Z"),
          },
          {
            id: HIPPY_CHAT_ID,
            projectId: PROJECT_ID,
            buddy: getBuddy("hippy"),
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

  test("says when each chat started, after its buddy's name", () => {
    render(
      <ChatList
        chats={[
          {
            id: MR_TEE_CHAT_ID,
            projectId: PROJECT_ID,
            buddy: getBuddy("mr-tee"),
            name: undefined,
            renamedByHand: false,
            createdAt: new Date("2026-10-09T12:00:00Z"),
          },
        ]}
      />,
    );

    expect(screen.getByRole("listitem")).toHaveTextContent(MR_TEE_STARTED);
  });
});

// A chat with the mr-tee buddy, named name.
function namedChat(name: string): Chat {
  return {
    id: MR_TEE_CHAT_ID,
    projectId: PROJECT_ID,
    buddy: getBuddy("mr-tee"),
    name: chatNameFixture(name),
    renamedByHand: false,
    createdAt: new Date("2026-10-09T12:00:00Z"),
  };
}

describe("ChatList supplied project names", () => {
  test("shows each supplied project name on its own card, preserving links and times", () => {
    vi.stubEnv("TZ", "UTC");
    const cases = [
      {
        chat: { ...PROJECT_CHAT, projectName: "Donut" },
        started: "Oct 09, 2026, 12:00 PM",
      },
      {
        chat: {
          ...PROJECT_CHAT,
          id: chatIdFixture(),
          projectId: projectIdFixture(),
          projectName: "Spaceship",
          name: chatNameFixture("Launch plan"),
          createdAt: CENTRAL_CHAT.createdAt,
        },
        started: "Oct 10, 2026, 12:00 PM",
      },
    ];
    render(
      <ChatList
        chats={cases.map(({ chat }) => chat)}
        showProjectNames={true}
      />,
    );

    const cards = screen.getAllByRole("listitem");
    expect(cards).toHaveLength(cases.length);
    for (const { chat, started } of cases) {
      const link = screen.getByRole("link", {
        name: `${chat.name} with ${chat.buddy.name}`,
      });
      expect(link).toHaveAttribute("href", `/chats/${chat.id}`);
      const card = cards.find((item) => item.contains(link));
      if (card === undefined) {
        throw new Error("Conversation link must be inside its chat card");
      }
      expect(within(card).getByText(chat.projectName)).toBeVisible();
      expect(card).toHaveTextContent(`started ${started}`);
    }
  });
});

describe("ChatList opt-in project badges", () => {
  test.each([
    { label: "omitted", props: {} },
    { label: "false", props: { showProjectNames: false } },
  ])("hides project names when the option is $label", ({ props }) => {
    vi.stubEnv("TZ", "UTC");
    render(<ChatList chats={[PROJECT_CHAT]} {...props} />);

    expect(
      screen.queryByText(PROJECT_CHAT.projectName),
    ).not.toBeInTheDocument();
    const title = `${PROJECT_CHAT.name} with ${PROJECT_CHAT.buddy.name}`;
    expect(screen.getByRole("link")).toHaveAccessibleName(title);
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      `/chats/${PROJECT_CHAT.id}`,
    );
    expect(screen.getByRole("listitem").textContent).toBe(
      `${title} started Oct 09, 2026, 12:00 PM`,
    );
  });
});

describe("ChatList project badge links", () => {
  test.each([
    {
      name: PROJECT_CHAT.name,
      linkName: `${PROJECT_CHAT.name} with ${PROJECT_CHAT.buddy.name}`,
    },
    { name: undefined, linkName: PROJECT_CHAT.buddy.name },
  ])(
    "shows the project name outside the conversation link $linkName",
    ({ name, linkName }) => {
      render(
        <ChatList chats={[{ ...PROJECT_CHAT, name }]} showProjectNames={true} />,
      );

      const badge = screen.getByText(PROJECT_CHAT.projectName);
      const link = screen.getByRole("link", {
        name: linkName,
      });
      expect(badge).toBeVisible();
      expect(badge.closest("a")).toBeNull();
      expect(screen.getByRole("listitem")).toContainElement(badge);
      expect(link).toHaveAttribute("href", `/chats/${PROJECT_CHAT.id}`);
      expect(link).not.toHaveTextContent(PROJECT_CHAT.projectName);
    },
  );
});

describe("ChatList chats without project names", () => {
  test("shows no project badge for a central chat", () => {
    render(
      <ChatList chats={[PROJECT_CHAT, CENTRAL_CHAT]} showProjectNames={true} />,
    );

    const centralLink = screen.getByRole("link", {
      name: CENTRAL_CHAT.buddy.name,
    });
    expect(centralLink).toHaveAttribute("href", `/chats/${CENTRAL_CHAT.id}`);
    expect(centralLink.closest("li")).toHaveTextContent(CENTRAL_CHAT_STARTED);
    expect(screen.getAllByText(PROJECT_CHAT.projectName)).toHaveLength(1);
  });

  test("accepts project-list data without looking up a project name", () => {
    const chat = namedChat("Bevels");
    render(<ChatList chats={[chat]} showProjectNames={true} />);

    expect(screen.getByRole("listitem")).toHaveTextContent(
      PROJECT_LIST_CHAT_STARTED,
    );
  });
});

describe("ChatList names", () => {
  test("links a named chat by its name and buddy, then says when it started", () => {
    render(
      <ChatList
        chats={[
          {
            id: MR_TEE_CHAT_ID,
            projectId: PROJECT_ID,
            buddy: getBuddy("mr-tee"),
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

    const link = screen.getByRole("link", {
      name: `Beveling the donut with ${MR_TEE_NAME}`,
    });
    const extra = link.querySelector('[data-extra="chat-names"]');
    expect(extra).toHaveTextContent("Beveling the donut");
    expect(extra).not.toHaveTextContent(MR_TEE_NAME);
    extra?.remove();
    expect(link).toHaveAccessibleName(MR_TEE_NAME);
  });

  test("says so when the project has no chats", () => {
    render(<ChatList chats={[]} />);

    expect(screen.getByText(NO_CHATS_YET)).toBeInTheDocument();
  });
});
