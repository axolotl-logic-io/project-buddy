import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { MR_T_CHAT } from "@/app/(workspace)/page-fixtures.ts";
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

  test("links back to the project and names the persona", async () => {
    render(await pageFor(MR_T_CHAT.id));

    expect(screen.getByRole("link", { name: "Low-poly fox" })).toHaveAttribute(
      "href",
      `/projects/${MR_T_CHAT.projectId}`,
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "Chat with Mr. T" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Hi")).toBeInTheDocument();
  });

  test("is not found for an unknown chat", async () => {
    store.getChat.mockResolvedValue(undefined);

    await expect(pageFor("missing")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(navigation.notFound).toHaveBeenCalled();
  });
});
