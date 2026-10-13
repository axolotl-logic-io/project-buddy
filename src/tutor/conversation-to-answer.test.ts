import type { UIMessage } from "ai";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { MR_TEE_CHAT } from "@/app/(workspace)/page-fixtures.ts";
import type { listMessages, saveMessage } from "@/chats/store.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import { messageIdFixture, userIdFixture } from "@/id-fixtures.ts";
import type { checkQuota } from "@/quota/quota.ts";
import { quotaGrantFixture } from "@/quota/quota-test-kit.ts";
import type { ChatRequest } from "@/tutor/chat-protocol.ts";
import {
  type ConversationToAnswer,
  conversationToAnswer,
} from "@/tutor/conversation-to-answer.ts";

const store = vi.hoisted(() => ({
  listMessages: vi.fn<typeof listMessages>(),
  saveMessage: vi.fn<typeof saveMessage>(),
}));
vi.mock("@/chats/store.ts", () => store);

const quota = vi.hoisted(() => ({
  checkQuota: vi.fn<typeof checkQuota>(),
}));
vi.mock("@/quota/quota.ts", () => quota);

const OWNER = userIdFixture();
const GRANT = quotaGrantFixture(OWNER);

const EARLIER: UIMessage[] = [
  { id: "m1", role: "user", parts: [{ type: "text", text: "Hi" }] },
  {
    id: "m2",
    role: "assistant",
    parts: [{ type: "text", text: "Hello, fool." }],
  },
];

const NEW_MESSAGE: ChatRequest["message"] = {
  id: messageIdFixture("m3"),
  role: "user",
  parts: [{ type: "text", text: "How do I bevel an edge?" }],
};

const LATER_REPLY: UIMessage = {
  id: "m4",
  role: "assistant",
  parts: [{ type: "text", text: "Select the edge first, fool." }],
};

function answer(): Promise<ConversationToAnswer> {
  return conversationToAnswer(OWNER, MR_TEE_CHAT, NEW_MESSAGE);
}

// The refusal's status and body, or undefined for a reply.
async function refusal(
  result: ConversationToAnswer,
): Promise<{ status: number; body: string } | undefined> {
  if (result.kind !== "refused") {
    return undefined;
  }
  return { status: result.response.status, body: await result.response.text() };
}

beforeEach(() => {
  vi.clearAllMocks();
  store.listMessages.mockResolvedValue(EARLIER);
  store.saveMessage.mockResolvedValue("inserted");
  quota.checkQuota.mockResolvedValue({ kind: "withinQuota", grant: GRANT });
});

// The owner's quota is used up.
function quotaUsedUp(): void {
  quota.checkQuota.mockResolvedValue({
    kind: "usedUp",
    resetsOn: new Date("2026-11-01T00:00:00Z"),
  });
}

describe("conversationToAnswer for a new message", () => {
  test("saves the message in the owner's chat and answers the history with it last", async () => {
    expect(await answer()).toEqual({
      kind: "reply",
      conversation: [...EARLIER, NEW_MESSAGE],
      grant: GRANT,
    });
    expect(store.listMessages).toHaveBeenCalledWith(OWNER, MR_TEE_CHAT.id);
    expect(store.saveMessage).toHaveBeenCalledWith(
      OWNER,
      MR_TEE_CHAT.id,
      NEW_MESSAGE,
    );
  });

  test("refuses with 400 and the unknown case a message whose id another chat's message has", async () => {
    store.saveMessage.mockResolvedValue("id-taken");

    expect(await refusal(await answer())).toEqual({
      status: HTTP_STATUS.badRequest,
      body: "unknown",
    });
  });

  test("refuses with 409 and the already-answered case a message another request saved after the history was read", async () => {
    store.saveMessage.mockResolvedValue("already-saved");

    expect(await refusal(await answer())).toEqual({
      status: HTTP_STATUS.conflict,
      body: "already-answered",
    });
    expect(store.saveMessage).toHaveBeenCalledTimes(1);
  });
});

describe("conversationToAnswer's reply", () => {
  test("carries the grant of the owner's one quota check, for every model call it makes", async () => {
    const reply = await answer();

    expect(quota.checkQuota).toHaveBeenCalledExactlyOnceWith(OWNER);
    expect(reply.kind === "reply" && reply.grant).toBe(GRANT);
  });
});

describe("conversationToAnswer for a resent message", () => {
  test("answers the history again, saving nothing, when the message is last", async () => {
    store.listMessages.mockResolvedValue([...EARLIER, NEW_MESSAGE]);

    expect(await answer()).toEqual({
      kind: "reply",
      conversation: [...EARLIER, NEW_MESSAGE],
      grant: GRANT,
    });
    expect(store.saveMessage).not.toHaveBeenCalled();
  });

  test("refuses with 409 and the already-answered case, saving nothing, when anything follows it", async () => {
    store.listMessages.mockResolvedValue([
      ...EARLIER,
      NEW_MESSAGE,
      LATER_REPLY,
    ]);

    expect(await refusal(await answer())).toEqual({
      status: HTTP_STATUS.conflict,
      body: "already-answered",
    });
    expect(store.saveMessage).not.toHaveBeenCalled();
  });
});

describe("conversationToAnswer once the owner's quota is used up", () => {
  test("refuses a new message with 429 and the quota-used-up case, naming the quota's reset, saving nothing", async () => {
    quotaUsedUp();

    expect(await refusal(await answer())).toEqual({
      status: HTTP_STATUS.tooManyRequests,
      body: "quota-used-up\n2026-11-01T00:00:00.000Z",
    });
    expect(quota.checkQuota).toHaveBeenCalledWith(OWNER);
    expect(store.saveMessage).not.toHaveBeenCalled();
  });

  test("refuses to answer a resent unanswered message again", async () => {
    quotaUsedUp();
    store.listMessages.mockResolvedValue([...EARLIER, NEW_MESSAGE]);

    expect((await refusal(await answer()))?.body).toBe(
      "quota-used-up\n2026-11-01T00:00:00.000Z",
    );
  });

  test("still says an answered message is answered", async () => {
    quotaUsedUp();
    store.listMessages.mockResolvedValue([
      ...EARLIER,
      NEW_MESSAGE,
      LATER_REPLY,
    ]);

    expect((await refusal(await answer()))?.body).toBe("already-answered");
  });
});

describe("conversationToAnswer refusals", () => {
  test.each([
    [
      "already answered",
      (): void => {
        store.listMessages.mockResolvedValue([
          ...EARLIER,
          NEW_MESSAGE,
          LATER_REPLY,
        ]);
      },
    ],
    [
      "id taken",
      (): void => {
        store.saveMessage.mockResolvedValue("id-taken");
      },
    ],
    [
      "saved meanwhile",
      (): void => {
        store.saveMessage.mockResolvedValue("already-saved");
      },
    ],
    ["quota used up", quotaUsedUp],
  ])(
    "gives each %s request its own readable response",
    async (_name, arrange) => {
      arrange();

      const first = await refusal(await answer());
      const second = await refusal(await answer());

      expect(first?.body).not.toBe("");
      expect(second).toEqual(first);
    },
  );
});
