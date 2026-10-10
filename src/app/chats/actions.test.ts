import { beforeEach, describe, expect, it, vi } from "vitest";
import { startChatAction } from "@/app/chats/actions";

const store = vi.hoisted(() => ({ createChat: vi.fn() }));
vi.mock("@/chats/store", () => store);

const navigation = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
}));
vi.mock("next/navigation", () => navigation);

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

describe("startChatAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    store.createChat.mockResolvedValue({ id: "chat-1" });
  });

  it("creates a chat for the chosen project and persona and opens it", async () => {
    await expect(
      startChatAction(form({ projectId: "project-1", personaId: "mr-t" })),
    ).rejects.toThrow("NEXT_REDIRECT /chats/chat-1");

    expect(store.createChat).toHaveBeenCalledWith({
      projectId: "project-1",
      personaId: "mr-t",
    });
  });

  it("rejects an unknown persona", async () => {
    await expect(
      startChatAction(form({ projectId: "project-1", personaId: "coach" })),
    ).rejects.toThrow(/persona/i);

    expect(store.createChat).not.toHaveBeenCalled();
  });

  it("rejects a missing project", async () => {
    await expect(
      startChatAction(form({ projectId: "", personaId: "hippy" })),
    ).rejects.toThrow(/project/i);

    expect(store.createChat).not.toHaveBeenCalled();
  });
});
