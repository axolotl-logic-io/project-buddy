import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { CENTRAL_CHAT } from "@/app/(workspace)/page-fixtures.ts";
import { SIGNED_IN_USER, signInAs } from "@/auth/current-user-test-kit.ts";
import type { getOrCreateCentralChat } from "@/chats/central-chat.ts";
import type { listMessages } from "@/chats/store.ts";
import CentralChatPage, { viewport } from "./page.tsx";

const BUDDY_NAME: string = CENTRAL_CHAT.buddy.name;

vi.mock(
  "@/auth/current-user.ts",
  () => import("@/auth/current-user-test-kit.ts"),
);

const centralChat = vi.hoisted(() => ({
  getOrCreateCentralChat: vi.fn<typeof getOrCreateCentralChat>(),
}));
vi.mock("@/chats/central-chat.ts", () => centralChat);

const store = vi.hoisted(() => ({
  listMessages: vi.fn<typeof listMessages>(),
}));
vi.mock("@/chats/store.ts", () => store);

vi.mock("next/navigation", () => ({
  // ChatView refreshes the page through the App Router.
  useRouter: (): { refresh: () => void } => ({ refresh: vi.fn() }),
}));

vi.mock("@/app/(workspace)/chats/[chatId]/actions.ts", () => ({
  renameChatAction: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  signInAs(SIGNED_IN_USER);
  centralChat.getOrCreateCentralChat.mockResolvedValue(CENTRAL_CHAT);
  store.listMessages.mockResolvedValue([
    { id: "m1", role: "user", parts: [{ type: "text", text: "Hi" }] },
  ]);
});

describe("Central chat page", () => {
  test("shows the central chat's heading, rename form and messages, with no link back", async () => {
    render(await CentralChatPage());

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: `New chat Chat with ${BUDDY_NAME}`,
      }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Rename chat" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Hi")).toBeInTheDocument();
  });

  test("opens the signed-in user's central chat and its messages", async () => {
    render(await CentralChatPage());

    expect(centralChat.getOrCreateCentralChat).toHaveBeenCalledWith(
      SIGNED_IN_USER.id,
    );
    expect(store.listMessages).toHaveBeenCalledWith(
      SIGNED_IN_USER.id,
      CENTRAL_CHAT.id,
    );
  });

  test("lets an on-screen keyboard shrink the page", () => {
    expect(viewport.interactiveWidget).toBe("resizes-content");
  });
});
