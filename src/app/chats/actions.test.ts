import { beforeEach, describe, expect, test, vi } from "vitest";
import { startChatAction } from "@/app/chats/actions.ts";

const store = vi.hoisted(() => ({ createChat: vi.fn() }));
vi.mock("@/chats/store.ts", () => store);

const navigation = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
}));
vi.mock("next/navigation", () => navigation);

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    data.set(key, value);
  }
  return data;
}

const PROJECT_ID = "0b6f3c2e-8d4a-4f1b-9c7e-5a2d1e3f4b6c";
const CHAT_ID = "7d2e9a41-3c5b-4e8f-a1d6-9b0c2f4e6a8d";
const CHOOSE_PERSONA = "Choose a persona for the chat.";
const CHOOSE_PROJECT = "Choose a project for the chat.";

describe("startChatAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    store.createChat.mockResolvedValue({ id: CHAT_ID });
  });

  test("creates a chat for the chosen project and persona and opens it", async () => {
    await expect(
      startChatAction(form({ projectId: PROJECT_ID, personaId: "mr-t" })),
    ).rejects.toThrow(`NEXT_REDIRECT /chats/${CHAT_ID}`);

    expect(store.createChat).toHaveBeenCalledWith({
      projectId: PROJECT_ID,
      personaId: "mr-t",
    });
  });

  test("passes the project id on in lowercase", async () => {
    await expect(
      startChatAction(
        form({ projectId: PROJECT_ID.toUpperCase(), personaId: "hippy" }),
      ),
    ).rejects.toThrow(`NEXT_REDIRECT /chats/${CHAT_ID}`);

    expect(store.createChat).toHaveBeenCalledWith({
      projectId: PROJECT_ID,
      personaId: "hippy",
    });
  });

  test("rejects an unknown or missing persona", async () => {
    await expect(
      startChatAction(form({ projectId: PROJECT_ID, personaId: "coach" })),
    ).rejects.toThrow(CHOOSE_PERSONA);
    await expect(
      startChatAction(form({ projectId: PROJECT_ID })),
    ).rejects.toThrow(CHOOSE_PERSONA);

    expect(store.createChat).not.toHaveBeenCalled();
  });

  test("rejects a missing project or one whose id is not a UUID", async () => {
    await expect(
      startChatAction(form({ projectId: "", personaId: "hippy" })),
    ).rejects.toThrow(CHOOSE_PROJECT);
    await expect(
      startChatAction(form({ projectId: "project-1", personaId: "hippy" })),
    ).rejects.toThrow(CHOOSE_PROJECT);
    await expect(startChatAction(form({ personaId: "hippy" }))).rejects.toThrow(
      CHOOSE_PROJECT,
    );

    expect(store.createChat).not.toHaveBeenCalled();
  });
});
