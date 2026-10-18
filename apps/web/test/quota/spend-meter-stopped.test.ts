// @vitest-environment node
// The spend meter on streams that stop without their usage: they end, fail
// or are cancelled before `finish`, and are charged an estimate.
import type { LanguageModelV4StreamPart } from "@ai-sdk/provider";
import { convertReadableStreamToArray } from "ai/test";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  type MockInstance,
  test,
  vi,
} from "vitest";
import { FAKE_DATABASE_URL } from "../db/fake-neon-http.ts";
import {
  meteredStreamModel,
  spendDatabase,
  spendLog,
  spyOnSpendLog,
  storedCosts,
  streamAll,
  TEXT_PARTS,
} from "./spend-meter-test-kit.ts";

// The input Anthropic counted as the message started, at Sonnet's prices,
// and the streamed "Press Ctrl" as 3 output tokens: 24 + 340 + 1250 + 240 +
// 30.
const SONNET_ESTIMATE = 1884;

// Reads count parts from reader, one after another.
async function readParts(
  reader: ReadableStreamDefaultReader<LanguageModelV4StreamPart>,
  count: number,
): Promise<void> {
  if (count === 0) {
    return;
  }
  await reader.read();
  await readParts(reader, count - 1);
}

// The model's stream of TEXT_PARTS, failing with failure once they are read:
// an errored stream drops the parts not yet read.
function failingAfterParts(
  failure: Error,
): ReadableStream<LanguageModelV4StreamPart> {
  const parts = [...TEXT_PARTS];
  return new ReadableStream<LanguageModelV4StreamPart>({
    pull(
      controller: ReadableStreamDefaultController<LanguageModelV4StreamPart>,
    ): void {
      const part = parts.shift();
      if (part === undefined) {
        controller.error(failure);
        return;
      }
      controller.enqueue(part);
    },
  });
}

// The model's stream of TEXT_PARTS, then nothing more until it is
// cancelled, which calls cancelled.
function endlessAfterParts(
  cancelled: (reason: unknown) => void,
): ReadableStream<LanguageModelV4StreamPart> {
  return new ReadableStream<LanguageModelV4StreamPart>({
    start(
      controller: ReadableStreamDefaultController<LanguageModelV4StreamPart>,
    ): void {
      for (const part of TEXT_PARTS) {
        controller.enqueue(part);
      }
    },
    cancel: cancelled,
  });
}

let infoLog: MockInstance<typeof console.info>;

beforeEach(() => {
  vi.stubEnv("DATABASE_URL", FAKE_DATABASE_URL);
  infoLog = spyOnSpendLog();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("spendMeter on a stream that stops without finish", () => {
  test("charges an estimate once it ends: the input counted at its start, and four characters an output token", async () => {
    const neonHttp = spendDatabase();

    await streamAll(TEXT_PARTS);

    expect(storedCosts(neonHttp)).toEqual([String(SONNET_ESTIMATE)]);
    expect(spendLog(infoLog)).toEqual([
      [
        "[model-call-spend]",
        expect.objectContaining({ finished: false, microUsd: SONNET_ESTIMATE }),
      ],
    ]);
  });

  test("charges the estimate when the model's stream fails, then fails", async () => {
    const neonHttp = spendDatabase();
    const failure = new Error("connection reset");
    const { stream } = await meteredStreamModel(
      failingAfterParts(failure),
    ).doStream({
      prompt: [],
    });

    await expect(convertReadableStreamToArray(stream)).rejects.toBe(failure);
    expect(storedCosts(neonHttp)).toEqual([String(SONNET_ESTIMATE)]);
  });

  test("cancels the model's stream and charges the estimate when the reader cancels", async () => {
    const neonHttp = spendDatabase();
    const cancelled = vi.fn<(reason: unknown) => void>();
    const { stream } = await meteredStreamModel(
      endlessAfterParts(cancelled),
    ).doStream({
      prompt: [],
    });
    const reader = stream.getReader();
    await readParts(reader, TEXT_PARTS.length);

    await reader.cancel("disconnected");

    expect(cancelled).toHaveBeenCalledWith("disconnected");
    expect(storedCosts(neonHttp)).toEqual([String(SONNET_ESTIMATE)]);
  });
});
