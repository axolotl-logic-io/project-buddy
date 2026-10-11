import type { UIMessage } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { MR_T_CHAT } from "@/app/(workspace)/page-fixtures.ts";
import { CHAT_NAME_MAX_LENGTH } from "@/chats/chat-name.ts";
import type {
  getChat,
  listMessages,
  saveAutomaticChatName,
} from "@/chats/store.ts";
import { spyOnErrorLog } from "@/errors/error-log-spy.ts";
import { messageIdFixture } from "@/id-fixtures.ts";
import { nameChatIfDue } from "@/tutor/chat-naming.ts";
import { mockTutorModel } from "@/tutor/mock-model.ts";
import type {
  MockConversation,
  MockScript,
  MockStep,
} from "@/tutor/mock-script.ts";
import type { chatNameModel } from "@/tutor/model.ts";

const store = vi.hoisted(() => ({
  getChat: vi.fn<typeof getChat>(),
  listMessages: vi.fn<typeof listMessages>(),
  saveAutomaticChatName: vi.fn<typeof saveAutomaticChatName>(),
}));
vi.mock("@/chats/store.ts", () => store);

const model = vi.hoisted(() => ({
  chatNameModel: vi.fn<typeof chatNameModel>(),
}));
vi.mock("@/tutor/model.ts", () => model);

// Her messages after which the chat is named, and the counts in between.
const NAMED_AFTER = {
  first: 1,
  third: 3,
  fifth: 5,
  seventh: 7,
  fourteenth: 14,
} as const;
const NAMING_COUNTS: readonly number[] = Object.values(NAMED_AFTER);
const LAST_COUNT = 15;
const OTHER_COUNTS = Array.from(
  { length: LAST_COUNT },
  (_unused, index) => index + 1,
).filter((count) => !NAMING_COUNTS.includes(count));
const SECRET_NAME = "My private\nchat name";

// Her nth message's id.
function herMessageId(count: number): ReturnType<typeof messageIdFixture> {
  return messageIdFixture(`her-${count}`);
}

// A chat of `count` exchanges: each of her messages, then the reply to it.
function exchanges(count: number): UIMessage[] {
  return Array.from({ length: count }, (_unused, index) => index + 1).flatMap(
    (number): UIMessage[] => [
      {
        id: herMessageId(number),
        role: "user",
        parts: [{ type: "text", text: `Question ${number}` }],
      },
      {
        id: `reply-${number}`,
        role: "assistant",
        parts: [{ type: "text", text: `Answer ${number}` }],
      },
    ],
  );
}

// Names the chat after her nth message, in a chat of `messages`.
async function nameAfter(
  count: number,
  messages: UIMessage[] = exchanges(count),
): Promise<void> {
  store.listMessages.mockResolvedValue(messages);
  await nameChatIfDue(MR_T_CHAT.id, herMessageId(count));
}

// A naming model that answers `answer` and records what it was asked.
function namingModelAnswering(answer: string): {
  asked: string[][];
} {
  const asked: string[][] = [];
  const script: MockScript = (
    userText: string,
    { earlierTexts }: MockConversation,
  ): MockStep[] => {
    asked.push([...earlierTexts, userText]);
    return [{ text: answer, toolCalls: [] }];
  };
  model.chatNameModel.mockReturnValue(mockTutorModel(script));
  return { asked };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  store.getChat.mockResolvedValue(MR_T_CHAT);
  store.saveAutomaticChatName.mockResolvedValue();
});

describe("chat naming schedule", () => {
  test.each(NAMING_COUNTS)(
    "names the chat after her message %i",
    async (count) => {
      namingModelAnswering("Beveling a donut");

      await nameAfter(count);

      expect(store.saveAutomaticChatName).toHaveBeenCalledExactlyOnceWith(
        MR_T_CHAT.id,
        "Beveling a donut",
      );
    },
  );

  test.each(OTHER_COUNTS)(
    "leaves the name and asks Haiku nothing after her message %i",
    async (count) => {
      namingModelAnswering("Beveling a donut");

      await nameAfter(count);

      expect(model.chatNameModel).not.toHaveBeenCalled();
      expect(store.saveAutomaticChatName).not.toHaveBeenCalled();
    },
  );

  test("counts her messages up to the one answered, though she sent more since", async () => {
    namingModelAnswering("Beveling a donut");

    await nameAfter(NAMED_AFTER.third, exchanges(NAMED_AFTER.third + 1));

    expect(store.saveAutomaticChatName).toHaveBeenCalledTimes(1);
  });

  test("never renames a chat she renamed by hand, nor asks Haiku", async () => {
    namingModelAnswering("Beveling a donut");
    store.getChat.mockResolvedValue({ ...MR_T_CHAT, renamedByHand: true });

    await nameAfter(1);

    expect(model.chatNameModel).not.toHaveBeenCalled();
    expect(store.saveAutomaticChatName).not.toHaveBeenCalled();
  });

  test("does nothing for a message the chat doesn't have", async () => {
    namingModelAnswering("Beveling a donut");
    store.listMessages.mockResolvedValue(exchanges(NAMED_AFTER.first));

    await nameChatIfDue(MR_T_CHAT.id, messageIdFixture("elsewhere"));

    expect(model.chatNameModel).not.toHaveBeenCalled();
  });
});

describe("chat naming asks Haiku", () => {
  test("with the conversation's text up to the reply, then the request", async () => {
    const { asked } = namingModelAnswering("Beveling a donut");
    const messages: UIMessage[] = [
      ...exchanges(NAMED_AFTER.third - 1),
      {
        id: herMessageId(NAMED_AFTER.third),
        role: "user",
        parts: [{ type: "text", text: "Question 3" }],
      },
      {
        id: "reply-3",
        role: "assistant",
        parts: [
          { type: "step-start" },
          { type: "text", text: "Answer 3" },
          { type: "text", text: "More of answer 3" },
        ],
      },
      { id: "reply-3b", role: "assistant", parts: [{ type: "step-start" }] },
      {
        id: herMessageId(NAMED_AFTER.third + 1),
        role: "user",
        parts: [{ type: "text", text: "Question 4" }],
      },
    ];

    await nameAfter(NAMED_AFTER.third, messages);

    expect(asked).toEqual([
      [
        "Question 1",
        "Answer 1",
        "Question 2",
        "Answer 2",
        "Question 3",
        "Answer 3\n\nMore of answer 3",
        "Name this chat.",
      ],
    ]);
  });

  test("and saves its answer trimmed", async () => {
    namingModelAnswering("  Beveling a donut \n");

    await nameAfter(1);

    expect(store.saveAutomaticChatName).toHaveBeenCalledWith(
      MR_T_CHAT.id,
      "Beveling a donut",
    );
  });
});

describe("chat naming failures", () => {
  test.each([
    ["an empty answer", ""],
    ["two lines", SECRET_NAME],
    ["too long an answer", "a".repeat(CHAT_NAME_MAX_LENGTH + 1)],
  ])(
    "keeps the old name for %s, logging it once without the answer",
    async (_description, answer) => {
      namingModelAnswering(answer);
      const log = spyOnErrorLog();

      await nameAfter(1);

      expect(store.saveAutomaticChatName).not.toHaveBeenCalled();
      expect(log).toHaveBeenCalledTimes(1);
      expect(log).toHaveBeenCalledWith(
        "[app-error] unknown in name chat",
        expect.any(String),
      );
      expect(JSON.stringify(log.mock.calls)).not.toContain("My private");
    },
  );

  test("keeps the old name when Haiku fails, logging it once", async () => {
    model.chatNameModel.mockReturnValue(
      new MockLanguageModelV4({
        doGenerate: (): Promise<never> =>
          Promise.reject(new Error("Overloaded")),
      }),
    );
    const log = spyOnErrorLog();

    await expect(nameAfter(1)).resolves.toBeUndefined();

    expect(store.saveAutomaticChatName).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledTimes(1);
  });

  test("never rejects when the store fails, logging it once", async () => {
    namingModelAnswering("Beveling a donut");
    store.listMessages.mockRejectedValue(new Error("Unreachable"));
    const log = spyOnErrorLog();

    await expect(
      nameChatIfDue(MR_T_CHAT.id, herMessageId(1)),
    ).resolves.toBeUndefined();

    expect(log).toHaveBeenCalledTimes(1);
  });
});
