import { LoadAPIKeyError } from "@ai-sdk/provider";
import { MockLanguageModelV4 } from "ai/test";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { ChatWithProject } from "@/chats/store.ts";
import { AppError } from "@/errors/app-error.ts";
import { anthropicHttpError } from "@/errors/error-fixtures.ts";
import { spyOnErrorLog } from "@/errors/error-log-spy.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import { MEMORY_VERSION_NUMBER } from "@/memory/memory.ts";
import { getPersona, renderPersonaPrompt } from "@/personas/index.ts";
import { writeChatOpening } from "@/tutor/chat-opening.ts";
import { mockTutorModel } from "@/tutor/mock-model.ts";
import {
  CHAT_ID,
  PROJECT_ID,
  readMemory,
  resetReplyTestKit,
  tutorModel,
} from "@/tutor/reply-test-kit.ts";
import { COPY } from "@/ui/copy.ts";

vi.mock("@/tutor/model.ts", () => import("@/tutor/reply-test-kit.ts"));
vi.mock("@/memory/memory-store.ts", () => import("@/tutor/reply-test-kit.ts"));

const QUESTION = "What would you like to make, fool?";

const SAVED_MEMORY = {
  text: "## Goals\n\n- A low-poly fox for a game",
  version: MEMORY_VERSION_NUMBER.parse(1),
};

const CHAT: ChatWithProject = {
  id: CHAT_ID,
  projectId: PROJECT_ID,
  projectName: "Low-poly fox",
  personaId: "mr-tee",
  createdAt: new Date("2026-10-11T12:00:00Z"),
  name: undefined,
  renamedByHand: false,
};

function chatPersonaPrompt(): string {
  const persona = getPersona("mr-tee");
  return renderPersonaPrompt(persona);
}

beforeEach(() => {
  resetReplyTestKit();
  tutorModel.mockReturnValue(
    mockTutorModel(() => [{ text: QUESTION, toolCalls: [] }]),
  );
});

// Makes the next model call fail as Claude does when the account is out of
// credits.
function outOfCredits(): void {
  tutorModel.mockReturnValue(
    new MockLanguageModelV4({
      doStream: (): ReturnType<MockLanguageModelV4["doStream"]> =>
        Promise.reject(
          anthropicHttpError(
            HTTP_STATUS.badRequest,
            "invalid_request_error",
            "Your credit balance is too low to access the Anthropic API.",
          ),
        ),
    }),
  );
}

describe("writeChatOpening asking Claude", () => {
  test("is the tutor's first message, as a message from the tutor", async () => {
    const opening = await writeChatOpening(CHAT);

    expect(opening.role).toBe("assistant");
    expect(opening.id).not.toBe("");
    expect(opening.parts).toEqual([{ type: "text", text: QUESTION }]);
  });

  test("asks the model once, with the chat's prompt and the kickoff alone", async () => {
    const recorder = new MockLanguageModelV4({
      doStream: mockTutorModel(() => [{ text: QUESTION, toolCalls: [] }])
        .doStream,
    });
    tutorModel.mockReturnValue(recorder);
    readMemory.mockResolvedValue(SAVED_MEMORY);

    await writeChatOpening(CHAT);

    expect(readMemory).toHaveBeenCalledWith(PROJECT_ID);
    expect(recorder.doStreamCalls).toHaveLength(1);
    const [shared, chat, ...conversation] =
      recorder.doStreamCalls[0]?.prompt ?? [];
    expect(shared?.content).toContain("Blender tutor");
    expect(shared?.content).toContain("# The project interview");
    expect(chat?.content).toContain(SAVED_MEMORY.text);
    expect(chat?.content).toContain(chatPersonaPrompt());
    expect(conversation.map((message) => message.role)).toEqual(["user"]);
  });
});

describe("writeChatOpening falling back", () => {
  test("falls back to the interview's first question, logged once, when Claude fails", async () => {
    const errorLog = spyOnErrorLog();
    outOfCredits();

    const opening = await writeChatOpening(CHAT);

    expect(opening.role).toBe("assistant");
    expect(opening.parts).toEqual([
      { type: "text", text: COPY.opening.firstQuestion },
    ]);
    expect(errorLog).toHaveBeenCalledTimes(1);
    expect(errorLog.mock.calls[0]?.[0]).toBe(
      "[app-error] out-of-credits in chat opening",
    );
  });

  test("falls back to asking what to work on once the memory holds something", async () => {
    const errorLog = spyOnErrorLog();
    outOfCredits();
    readMemory.mockResolvedValue(SAVED_MEMORY);

    const opening = await writeChatOpening(CHAT);

    expect(opening.parts).toEqual([
      { type: "text", text: COPY.opening.whatNext },
    ]);
    expect(errorLog).toHaveBeenCalledTimes(1);
  });

  test("falls back when Claude fails mid-stream, logged once", async () => {
    const errorLog = spyOnErrorLog();
    tutorModel.mockReturnValue(
      mockTutorModel(() => [
        {
          text: "What",
          error: { type: "overloaded_error", message: "Overloaded" },
        },
      ]),
    );

    const opening = await writeChatOpening(CHAT);

    expect(opening.parts).toEqual([
      { type: "text", text: COPY.opening.firstQuestion },
    ]);
    expect(errorLog).toHaveBeenCalledTimes(1);
  });
});

describe("writeChatOpening falling back without Claude's text", () => {
  test("falls back when the model can't be made, logged once", async () => {
    const errorLog = spyOnErrorLog();
    tutorModel.mockImplementation(() => {
      throw new LoadAPIKeyError({ message: "ANTHROPIC_API_KEY is not set." });
    });

    const opening = await writeChatOpening(CHAT);

    expect(opening.parts).toEqual([
      { type: "text", text: COPY.opening.firstQuestion },
    ]);
    expect(errorLog).toHaveBeenCalledTimes(1);
  });

  test("falls back when Claude writes nothing, logged once", async () => {
    const errorLog = spyOnErrorLog();
    tutorModel.mockReturnValue(
      mockTutorModel(() => [{ text: " \n", toolCalls: [] }]),
    );

    const opening = await writeChatOpening(CHAT);

    expect(opening.parts).toEqual([
      { type: "text", text: COPY.opening.firstQuestion },
    ]);
    expect(errorLog).toHaveBeenCalledTimes(1);
  });
});

describe("writeChatOpening without the memory", () => {
  test("throws a failure to read the memory, asking Claude nothing", async () => {
    const failure = new AppError("database-unreachable", new Error("x"));
    readMemory.mockRejectedValue(failure);

    await expect(writeChatOpening(CHAT)).rejects.toBe(failure);
    expect(tutorModel).not.toHaveBeenCalled();
  });
});
