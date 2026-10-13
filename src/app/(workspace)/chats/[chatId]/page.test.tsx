import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { FOX_CHAT } from "@/app/(workspace)/page-fixtures.ts";
import { SIGNED_IN_USER, signInAs } from "@/auth/current-user-test-kit.ts";
import { chatNameFixture } from "@/chats/chat-name-fixtures.ts";
import type { getChat, listMessages } from "@/chats/store.ts";
import { getPersona } from "@/personas/index.ts";
import ChatPage from "./page.tsx";

const PERSONA_NAME: string = getPersona(FOX_CHAT.personaId).name;

vi.mock(
  "@/auth/current-user.ts",
  () => import("@/auth/current-user-test-kit.ts"),
);

const store = vi.hoisted(() => ({
  getChat: vi.fn<typeof getChat>(),
  listMessages: vi.fn<typeof listMessages>(),
}));
vi.mock("@/chats/store.ts", () => store);

const navigation = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  // ChatView refreshes the page through the App Router.
  useRouter: (): { refresh: () => void } => ({ refresh: vi.fn() }),
}));
vi.mock("next/navigation", () => navigation);

vi.mock("./actions.ts", () => ({ renameChatAction: vi.fn() }));

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
  test("pins a link back to the project and a heading with a fallback name and the persona", async () => {
    render(await pageFor(FOX_CHAT.id));

    const backLink = screen.getByRole("link", { name: "Low-poly fox" });
    expect(backLink).toHaveAttribute("href", `/projects/${FOX_CHAT.projectId}`);
    const heading = screen.getByRole("heading", {
      level: 1,
      name: `New chat Chat with ${PERSONA_NAME}`,
    });
    // One header holds both, the extra the pinned-chat-header flag unpins.
    expect(
      heading.closest('[data-extra="pinned-chat-header"]'),
    ).toContainElement(backLink);
    expect(screen.getByText("Hi")).toBeInTheDocument();
  });

  test("heads a named chat with its name, and offers it for renaming", async () => {
    store.getChat.mockResolvedValue({
      ...FOX_CHAT,
      name: chatNameFixture("Beveling the donut"),
    });

    render(await pageFor(FOX_CHAT.id));

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: `Beveling the donut Chat with ${PERSONA_NAME}`,
      }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Rename chat" }));
    expect(screen.getByRole("textbox", { name: "Chat name" })).toHaveValue(
      "Beveling the donut",
    );
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

  test("is not found for a chat that is unknown or another user's", async () => {
    store.getChat.mockResolvedValue(undefined);

    await expect(pageFor("missing")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(navigation.notFound).toHaveBeenCalled();
  });
});
