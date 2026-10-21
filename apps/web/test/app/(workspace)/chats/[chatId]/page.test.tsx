import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import ChatPage, { viewport } from "@/app/(workspace)/chats/[chatId]/page.tsx";
import type { getChat, listMessages } from "@/chats/store.ts";
import { CHAT_COPY, CHAT_NAME_COPY } from "@/ui/copy/chat.ts";
import {
  SIGNED_IN_USER,
  signInAs,
} from "../../../../auth/current-user-test-kit.ts";
import { chatNameFixture } from "../../../../chats/chat-name-fixtures.ts";
import { CENTRAL_CHAT, FOX_CHAT } from "../../page-fixtures.ts";

const BUDDY_NAME: string = FOX_CHAT.buddy.name;

vi.mock(
  "@/auth/current-user.ts",
  () => import("../../../../auth/current-user-test-kit.ts"),
);

const store = vi.hoisted(() => ({
  getChat: vi.fn<typeof getChat>(),
  listMessages: vi.fn<typeof listMessages>(),
}));
vi.mock("@/chats/store.ts", () => store);

vi.mock("next/navigation", async () => ({
  ...(await import("../../../../components/router-test-kit.ts")),
  notFound: (): never => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

vi.mock("@/app/(workspace)/chats/[chatId]/actions.ts", () => ({
  renameChatAction: vi.fn(),
}));

function pageFor(chatId: string): ReturnType<typeof ChatPage> {
  return ChatPage({
    params: Promise.resolve({ chatId }),
    searchParams: Promise.resolve({}),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  signInAs(SIGNED_IN_USER);
  store.getChat.mockResolvedValue(FOX_CHAT);
  store.listMessages.mockResolvedValue([
    { id: "m1", role: "user", parts: [{ type: "text", text: "Hi" }] },
  ]);
});

describe("Chat page", () => {
  test("pins a link back to the project and a heading with a fallback name and the buddy", async () => {
    render(await pageFor(FOX_CHAT.id));

    const backLink = screen.getByRole("link", { name: FOX_CHAT.projectName });
    expect(backLink).toHaveAttribute("href", `/projects/${FOX_CHAT.projectId}`);
    const heading = screen.getByRole("heading", {
      level: 1,
      name: `${CHAT_NAME_COPY.fallback} ${CHAT_COPY.heading(BUDDY_NAME)}`,
    });
    // One header holds both, the extra the pinned-chat-header flag unpins.
    expect(
      heading.closest('[data-extra="pinned-chat-header"]'),
    ).toContainElement(backLink);
    expect(screen.getByText("Hi")).toBeInTheDocument();
  });

  test("links a standalone conversation back to the chat list", async () => {
    store.getChat.mockResolvedValue(CENTRAL_CHAT);

    render(await pageFor(CENTRAL_CHAT.id));

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: `${CHAT_NAME_COPY.fallback} ${CHAT_COPY.heading(BUDDY_NAME)}`,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: CHAT_COPY.headerLink }),
    ).toHaveAttribute("href", "/chat");
    expect(
      screen.getByRole("button", { name: CHAT_NAME_COPY.rename }),
    ).toBeInTheDocument();
    expect(screen.getByText("Hi")).toBeInTheDocument();
  });
});

describe("Named chat page", () => {
  test("heads a named chat with its name, and offers it for renaming", async () => {
    store.getChat.mockResolvedValue({
      ...FOX_CHAT,
      name: chatNameFixture("Beveling the donut"),
    });

    render(await pageFor(FOX_CHAT.id));

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: `Beveling the donut ${CHAT_COPY.heading(BUDDY_NAME)}`,
      }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: CHAT_NAME_COPY.rename }),
    );
    expect(
      screen.getByRole("textbox", { name: CHAT_NAME_COPY.label }),
    ).toHaveValue("Beveling the donut");
  });
});

describe("Chat page lookups", () => {
  test("reads the signed-in user's chat and its messages", async () => {
    render(await pageFor(FOX_CHAT.id));

    expect(store.getChat).toHaveBeenCalledWith(SIGNED_IN_USER.id, FOX_CHAT.id);
    expect(store.listMessages).toHaveBeenCalledWith(
      SIGNED_IN_USER.id,
      FOX_CHAT.id,
    );
  });
});

describe("use_case_breadcrumbs_in_long_chat", () => {
  test("only the chat page has a phone's keyboard shrink the page", async () => {
    // The project's page and the workspace's layouts set no viewport, so
    // the keyboard covers the project's page, the browser's default.
    const projectSegments = await Promise.all([
      import("@/app/(workspace)/projects/[projectId]/(overview)/page.tsx"),
      import("@/app/(workspace)/projects/[projectId]/(overview)/layout.tsx"),
      import("@/app/(workspace)/layout.tsx"),
    ]);

    expect(viewport.interactiveWidget).toBe("resizes-content");
    expect(
      projectSegments.flatMap((segment) =>
        Object.keys(segment).filter(
          (name) => name === "viewport" || name === "generateViewport",
        ),
      ),
    ).toEqual([]);
  });
});
