import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { MR_T_CHAT } from "@/app/(workspace)/page-fixtures.ts";
import { chatNameFixture } from "@/chats/chat-name-fixtures.ts";
import type { getChat, listMessages } from "@/chats/store.ts";
import ChatPage from "./page.tsx";

const store = vi.hoisted(() => ({
  getChat: vi.fn<typeof getChat>(),
  listMessages: vi.fn<typeof listMessages>(),
}));
vi.mock("@/chats/store.ts", () => store);

const navigation = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));
vi.mock("next/navigation", () => navigation);

vi.mock("./actions.ts", () => ({ renameChatAction: vi.fn() }));

function pageFor(chatId: string): ReturnType<typeof ChatPage> {
  return ChatPage({
    params: Promise.resolve({ chatId }),
    searchParams: Promise.resolve({}),
  });
}

describe("Chat page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    store.getChat.mockResolvedValue(MR_T_CHAT);
    store.listMessages.mockResolvedValue([
      { id: "m1", role: "user", parts: [{ type: "text", text: "Hi" }] },
    ]);
  });

  test("links back to the project and heads the chat with a fallback name and the persona", async () => {
    render(await pageFor(MR_T_CHAT.id));

    expect(screen.getByRole("link", { name: "Low-poly fox" })).toHaveAttribute(
      "href",
      `/projects/${MR_T_CHAT.projectId}`,
    );
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "New chat Chat with Mr. T",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Hi")).toBeInTheDocument();
  });

  test("heads a named chat with its name, and offers it for renaming", async () => {
    store.getChat.mockResolvedValue({
      ...MR_T_CHAT,
      name: chatNameFixture("Beveling the donut"),
    });

    render(await pageFor(MR_T_CHAT.id));

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Beveling the donut Chat with Mr. T",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Chat name" })).toHaveValue(
      "Beveling the donut",
    );
  });

  test("is not found for an unknown chat", async () => {
    store.getChat.mockResolvedValue(undefined);

    await expect(pageFor("missing")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(navigation.notFound).toHaveBeenCalled();
  });
});
