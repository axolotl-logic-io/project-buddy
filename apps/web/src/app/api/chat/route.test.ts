import { beforeEach, describe, expect, test, vi } from "vitest";
import { maxDuration, POST } from "@/app/api/chat/route.ts";
import {
  currentUser,
  SIGNED_IN_USER,
  signInAs,
  signOut,
} from "@/auth/current-user-test-kit.ts";
import { REPLY_CLAIM_SECONDS } from "@/chats/chat-rows.ts";
import { AppError } from "@/errors/app-error.ts";
import { spyOnErrorLog } from "@/errors/error-log-spy.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import type { replyToChat } from "@/tutor/reply.ts";

const tutor = vi.hoisted(() => ({ replyToChat: vi.fn<typeof replyToChat>() }));
vi.mock("@/tutor/reply.ts", () => tutor);

vi.mock(
  "@/auth/current-user.ts",
  () => import("@/auth/current-user-test-kit.ts"),
);

const CHAT_ID = "6F1C0B52-1C6E-4F3A-9A52-0D3C2B7E8A10";
const NEW_MESSAGE = {
  id: "m3",
  role: "user",
  parts: [{ type: "text", text: "How do I bevel an edge?" }],
};

function post(body: string): Promise<Response> {
  return POST(
    new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    }),
  );
}

const log = spyOnErrorLog();

beforeEach(() => {
  vi.clearAllMocks();
  signInAs(SIGNED_IN_USER);
  tutor.replyToChat.mockResolvedValue(new Response("reply"));
});

describe("POST /api/chat", () => {
  test("hands the signed-in user's chat request to the tutor and returns its response", async () => {
    const response = await post(
      JSON.stringify({ id: CHAT_ID, message: NEW_MESSAGE }),
    );

    expect(await response.text()).toBe("reply");
    expect(tutor.replyToChat).toHaveBeenCalledWith(SIGNED_IN_USER.id, {
      chatId: CHAT_ID.toLowerCase(),
      message: NEW_MESSAGE,
    });
  });

  test.each([
    ["a body that is not JSON", "not json"],
    ["a malformed chat id", JSON.stringify({ id: "1", message: NEW_MESSAGE })],
    ["a missing message", JSON.stringify({ id: CHAT_ID })],
  ])(
    "answers 400 with the unknown case, unlogged, for %s",
    async (_name, body) => {
      const response = await post(body);

      expect(response.status).toBe(HTTP_STATUS.badRequest);
      expect(await response.text()).toBe("unknown");
      expect(tutor.replyToChat).not.toHaveBeenCalled();
      expect(log).not.toHaveBeenCalled();
    },
  );
});

describe("POST /api/chat signed out", () => {
  test("answers 401 with the signed-out case, unlogged, asking the tutor nothing", async () => {
    signOut();

    const response = await post(
      JSON.stringify({ id: CHAT_ID, message: NEW_MESSAGE }),
    );

    expect(response.status).toBe(HTTP_STATUS.unauthorized);
    expect(await response.text()).toBe("signed-out");
    expect(tutor.replyToChat).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
  });

  test("answers 500 with the failure's case when reading the user fails", async () => {
    currentUser.mockRejectedValue(
      new AppError("database-unreachable", new Error("down")),
    );

    const response = await post(
      JSON.stringify({ id: CHAT_ID, message: NEW_MESSAGE }),
    );

    expect(response.status).toBe(HTTP_STATUS.internalServerError);
    expect(await response.text()).toBe("database-unreachable");
    expect(tutor.replyToChat).not.toHaveBeenCalled();
  });
});

describe("POST /api/chat's duration", () => {
  // A reply's claim on its message lapses only once no reply can still run.
  test("lets a reply run as long as its claim on the message lasts", () => {
    expect(maxDuration).toBe(REPLY_CLAIM_SECONDS);
  });
});
