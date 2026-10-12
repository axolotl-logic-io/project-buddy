/// <reference types="vite/client" />
// @vitest-environment node
import { APICallError } from "ai";
import { afterEach, describe, expect, test, vi } from "vitest";
import {
  ANTHROPIC_URL,
  anthropicHttpError,
  postgresError,
  REQUEST_ID,
} from "@/errors/error-fixtures.ts";
import {
  logAppError,
  logModelCallSpend,
  logReplySteps,
} from "@/errors/error-log.ts";
import { spyOnErrorLog } from "@/errors/error-log-spy.ts";
import { HTTP_STATUS } from "@/http-status.ts";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("logAppError", () => {
  test("logs the case with the status, upstream message and request id", () => {
    const log = spyOnErrorLog();

    logAppError(
      "out-of-credits",
      "chat reply",
      anthropicHttpError(
        HTTP_STATUS.badRequest,
        "invalid_request_error",
        "Your credit balance is too low to access the Anthropic API.",
      ),
    );

    expect(log).toHaveBeenCalledTimes(1);
    const line = log.mock.calls[0]?.join(" ");
    expect(line).toContain("[app-error] out-of-credits in chat reply");
    expect(line).toContain('"statusCode":400');
    expect(line).toContain("Your credit balance is too low");
    expect(line).toContain(`"requestId":"${REQUEST_ID}"`);
    expect(line).toContain('"type":"invalid_request_error"');
  });

  test("logs the Postgres code and the query, but not the query parameters", () => {
    const log = spyOnErrorLog();

    logAppError(
      "database-query-failed",
      "getChat",
      postgresError("22P02", "invalid input syntax"),
    );

    const line = log.mock.calls[0]?.join(" ");
    expect(line).toContain("[app-error] database-query-failed in getChat");
    expect(line).toContain('"code":"22P02"');
    expect(line).toContain("invalid input syntax");
    expect(line).toContain('from \\"chats\\"');
    expect(line).not.toContain("not-a-uuid");
  });

  test("logs nothing of the request body sent to the model", () => {
    const log = spyOnErrorLog();
    const error = new APICallError({
      message: "Overloaded",
      url: ANTHROPIC_URL,
      requestBodyValues: { system: "persona prompt", messages: ["secret"] },
      statusCode: HTTP_STATUS.overloaded,
    });

    logAppError("overloaded", "chat reply", error);

    const line = log.mock.calls[0]?.join(" ");
    expect(line).not.toContain("persona prompt");
    expect(line).not.toContain("secret");
  });
});

const SECRET_TEXT = "Press Ctrl+B to bevel";
const SECRET_QUERY = "bevel the fox's ears";

function usage(
  input: number,
  output: number,
): Parameters<typeof logReplySteps>[0][number]["usage"] {
  return {
    inputTokens: input,
    inputTokenDetails: {
      noCacheTokens: input,
      cacheReadTokens: 1,
      cacheWriteTokens: 0,
    },
    outputTokens: output,
    outputTokenDetails: { textTokens: output, reasoningTokens: 0 },
    totalTokens: input + output,
  };
}

const SEARCH_STEP_TOKENS = { input: 100, output: 10 };
const ANSWER_STEP_TOKENS = { input: 200, output: 20 };

type ReplyStep = Parameters<typeof logReplySteps>[0][number];

// A model call that searched the manual after an empty thinking block.
const SEARCH_STEP: ReplyStep = {
  finishReason: "tool-calls",
  rawFinishReason: "tool_use",
  content: [
    { type: "custom", kind: "anthropic.message_start" },
    { type: "reasoning", text: "" },
    {
      type: "tool-call",
      toolCallId: "call-1",
      toolName: "search_manual",
      input: { query: SECRET_QUERY },
    },
    {
      type: "tool-result",
      toolCallId: "call-1",
      toolName: "search_manual",
      input: { query: SECRET_QUERY },
      output: { sections: [] },
    },
  ],
  usage: usage(SEARCH_STEP_TOKENS.input, SEARCH_STEP_TOKENS.output),
};

// A model call that answered.
const ANSWER_STEP: ReplyStep = {
  finishReason: "stop",
  rawFinishReason: "end_turn",
  content: [{ type: "text", text: SECRET_TEXT }],
  usage: usage(ANSWER_STEP_TOKENS.input, ANSWER_STEP_TOKENS.output),
};

describe("logReplySteps", () => {
  test("logs each model call's finish reasons, input tokens and part types, and the reply's totals", () => {
    const log = vi.spyOn(console, "info").mockImplementation(() => {
      // The test reads the recorded call.
    });

    logReplySteps([SEARCH_STEP, ANSWER_STEP], {
      answerNow: true,
      stoppedAtStepLimit: false,
      calledCiteManual: false,
    });

    expect(log).toHaveBeenCalledTimes(1);
    const [prefix, json] = log.mock.calls[0] ?? [];
    expect(prefix).toBe("[tutor-steps]");
    expect(JSON.parse(String(json))).toEqual({
      answerNow: true,
      stoppedAtStepLimit: false,
      calledCiteManual: false,
      textChars: SECRET_TEXT.length,
      tokens: {
        input: SEARCH_STEP_TOKENS.input + ANSWER_STEP_TOKENS.input,
        // One cache-read token per step.
        cacheRead: 2,
        cacheWrite: 0,
        output: SEARCH_STEP_TOKENS.output + ANSWER_STEP_TOKENS.output,
      },
      steps: [
        {
          finish: "tool-calls",
          raw: "tool_use",
          input: SEARCH_STEP_TOKENS.input,
          parts: [
            "custom:anthropic.message_start",
            "reasoning:empty",
            "tool-call:search_manual",
            "tool-result:search_manual",
          ],
        },
        {
          finish: "stop",
          raw: "end_turn",
          input: ANSWER_STEP_TOKENS.input,
          parts: ["text"],
        },
      ],
    });
    const line = log.mock.calls[0]?.join(" ");
    expect(line).not.toContain(SECRET_TEXT);
    expect(line).not.toContain(SECRET_QUERY);
    expect(line).not.toContain("call-1");
  });
});

// The JSON that logReplySteps logs for steps and facts.
function loggedLine(
  steps: readonly ReplyStep[],
  facts: Parameters<typeof logReplySteps>[1],
): unknown {
  const log = vi.spyOn(console, "info").mockImplementation(() => {
    // The test reads the recorded call.
  });
  logReplySteps(steps, facts);
  const [, json] = log.mock.calls[0] ?? [];
  return JSON.parse(String(json));
}

describe("logReplySteps facts", () => {
  test("logs the facts it is given, not facts read from the steps", () => {
    const line = loggedLine([SEARCH_STEP, SEARCH_STEP], {
      answerNow: false,
      stoppedAtStepLimit: true,
      calledCiteManual: true,
    });

    expect(line).toMatchObject({
      answerNow: false,
      stoppedAtStepLimit: true,
      calledCiteManual: true,
    });
  });
});

// Every module in src/errors/, tests included, as text.
const ERRORS_SOURCES = import.meta.glob<string>("./*.ts", {
  query: "?raw",
  import: "default",
  eager: true,
});

const TUTOR_IMPORT = /from "@\/tutor\//u;

describe("the errors folder", () => {
  // Every store and error path imports the error log, so the tutor passes it
  // facts about a reply rather than the log knowing the tutor's tools.
  test("imports nothing from the tutor", () => {
    const files = Object.keys(ERRORS_SOURCES);
    const importers = files.filter((file) =>
      TUTOR_IMPORT.test(ERRORS_SOURCES[file] ?? ""),
    );

    expect(files).toContain("./error-log.ts");
    expect(importers).toEqual([]);
  });
});

describe("logModelCallSpend", () => {
  test("logs the call's kind, model, tokens and cost as one line", () => {
    const log = vi.spyOn(console, "info").mockImplementation(() => {
      // The test reads the recorded call.
    });
    const spend = {
      kind: "stream",
      modelId: "claude-sonnet-5-5",
      finished: true,
      cacheCreationReported: true,
      tokens: {
        input: 12,
        cacheRead: 3400,
        cacheWrite5m: 560,
        cacheWrite1h: 0,
        output: 78,
      },
      microUsd: 2544,
    } as const;

    logModelCallSpend(spend);

    expect(log).toHaveBeenCalledTimes(1);
    const [prefix, json] = log.mock.calls[0] ?? [];
    expect(prefix).toBe("[model-call-spend]");
    expect(JSON.parse(String(json))).toEqual(spend);
  });
});
