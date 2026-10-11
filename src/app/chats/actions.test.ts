import { beforeEach, describe, expect, test, vi } from "vitest";
import { startChatAction } from "@/app/chats/actions.ts";
import { projectIdFixture } from "@/projects/project-fixtures.ts";

const store = vi.hoisted(() => ({ createChat: vi.fn() }));
vi.mock("@/chats/store", () => store);

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

const PROJECT_ID = projectIdFixture();
const NAMES_PERSONA = /persona/iu;
const NAMES_PROJECT = /project/iu;

describe("startChatAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    store.createChat.mockResolvedValue({ id: "chat-1" });
  });

  test("creates a chat for the chosen project and persona and opens it", async () => {
    await expect(
      startChatAction(form({ projectId: PROJECT_ID, personaId: "mr-t" })),
    ).rejects.toThrow("NEXT_REDIRECT /chats/chat-1");

    expect(store.createChat).toHaveBeenCalledWith({
      projectId: PROJECT_ID,
      personaId: "mr-t",
    });
  });

  test("rejects an unknown persona", async () => {
    await expect(
      startChatAction(form({ projectId: PROJECT_ID, personaId: "coach" })),
    ).rejects.toThrow(NAMES_PERSONA);

    expect(store.createChat).not.toHaveBeenCalled();
  });

  test("rejects a missing project", async () => {
    await expect(
      startChatAction(form({ projectId: "", personaId: "hippy" })),
    ).rejects.toThrow(NAMES_PROJECT);

    expect(store.createChat).not.toHaveBeenCalled();
  });
});
