import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import ChatPage from "./page.tsx";

const store = vi.hoisted(() => ({ getChat: vi.fn(), listMessages: vi.fn() }));
vi.mock("@/chats/store", () => store);

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
    store.getChat.mockResolvedValue({
      id: "c1",
      projectId: "p1",
      projectName: "Low-poly fox",
      personaId: "mr-t",
      createdAt: new Date(),
    });
    store.listMessages.mockResolvedValue([
      { id: "m1", role: "user", parts: [{ type: "text", text: "Hi" }] },
    ]);
  });

  test("links back to the project and names the persona", async () => {
    render(await pageFor("c1"));

    expect(screen.getByRole("link", { name: "Low-poly fox" })).toHaveAttribute(
      "href",
      "/projects/p1",
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
