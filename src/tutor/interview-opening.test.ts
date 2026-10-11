import { LoadAPIKeyError } from "@ai-sdk/provider";
import { MockLanguageModelV4 } from "ai/test";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { ChatWithProject } from "@/chats/store.ts";
import { anthropicHttpError } from "@/errors/error-fixtures.ts";
import { spyOnErrorLog } from "@/errors/error-log-spy.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import { getPersona, renderPersonaPrompt } from "@/personas/index.ts";
import { writeInterviewOpening } from "@/tutor/interview-opening.ts";
import { mockTutorModel } from "@/tutor/mock-model.ts";
import {
  CHAT_ID,
  PROJECT_ID,
  resetReplyTestKit,
  tutorModel,
} from "@/tutor/reply-test-kit.ts";
import { COPY } from "@/ui/copy.ts";

vi.mock("@/tutor/model.ts", () => import("@/tutor/reply-test-kit.ts"));
vi.mock("@/memory/memory-store.ts", () => import("@/tutor/reply-test-kit.ts"));

const QUESTION = "What would you like to make, fool?";

const CHAT: ChatWithProject = {
  id: CHAT_ID,
  projectId: PROJECT_ID,
  projectName: "Low-poly fox",
  personaId: "mr-t",
  createdAt: new Date("2026-10-11T12:00:00Z"),
  name: undefined,
  renamedByHand: false,
};

function chatPersonaPrompt(): string {
  const persona = getPersona("mr-t");
  return renderPersonaPrompt(persona);
}

beforeEach(() => {
  resetReplyTestKit();
  tutorModel.mockReturnValue(
    mockTutorModel(() => [{ text: QUESTION, toolCalls: [] }]),
  );
});

describe("writeInterviewOpening asking Claude", () => {
  test("is the tutor's first question, as a message from the tutor", async () => {
    const opening = await writeInterviewOpening(CHAT);

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

    await writeInterviewOpening(CHAT);

    expect(recorder.doStreamCalls).toHaveLength(1);
    const [shared, chat, ...conversation] =
      recorder.doStreamCalls[0]?.prompt ?? [];
    expect(shared?.content).toContain("Blender tutor");
    expect(chat?.content).toContain("# The project interview");
    expect(chat?.content).toContain(chatPersonaPrompt());
    expect(conversation.map((message) => message.role)).toEqual(["user"]);
  });
});

describe("writeInterviewOpening falling back", () => {
  test("falls back to a fixed question, logged once, when Claude fails", async () => {
    const errorLog = spyOnErrorLog();
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

    const opening = await writeInterviewOpening(CHAT);

    expect(opening.role).toBe("assistant");
    expect(opening.parts).toEqual([
      { type: "text", text: COPY.interview.fallbackOpening },
    ]);
    expect(errorLog).toHaveBeenCalledTimes(1);
    expect(errorLog.mock.calls[0]?.[0]).toBe(
      "[app-error] out-of-credits in interview opening",
    );
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

    const opening = await writeInterviewOpening(CHAT);

    expect(opening.parts).toEqual([
      { type: "text", text: COPY.interview.fallbackOpening },
    ]);
    expect(errorLog).toHaveBeenCalledTimes(1);
  });
});

describe("writeInterviewOpening falling back without Claude's text", () => {
  test("falls back when the model can't be made, logged once", async () => {
    const errorLog = spyOnErrorLog();
    tutorModel.mockImplementation(() => {
      throw new LoadAPIKeyError({ message: "ANTHROPIC_API_KEY is not set." });
    });

    const opening = await writeInterviewOpening(CHAT);

    expect(opening.parts).toEqual([
      { type: "text", text: COPY.interview.fallbackOpening },
    ]);
    expect(errorLog).toHaveBeenCalledTimes(1);
  });

  test("falls back when Claude writes nothing, logged once", async () => {
    const errorLog = spyOnErrorLog();
    tutorModel.mockReturnValue(
      mockTutorModel(() => [{ text: " \n", toolCalls: [] }]),
    );

    const opening = await writeInterviewOpening(CHAT);

    expect(opening.parts).toEqual([
      { type: "text", text: COPY.interview.fallbackOpening },
    ]);
    expect(errorLog).toHaveBeenCalledTimes(1);
  });
});
