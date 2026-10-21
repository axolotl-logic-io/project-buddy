// @vitest-environment node
// The spend meter on calls that finish with their usage.
// spend-meter-stopped.test.ts tests streams that stop without it.
import { wrapLanguageModel } from "ai";
import { convertArrayToReadableStream, MockLanguageModelV4 } from "ai/test";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  type MockInstance,
  test,
  vi,
} from "vitest";
import { AppError } from "@/errors/app-error.ts";
import type { ClaudeModelId } from "@/quota/prices.ts";
import { spendMeter } from "@/quota/spend-meter.ts";
import { recordSpend } from "@/quota/spend-store.ts";
import {
  ANTHROPIC_USAGE,
  charges,
  finishPart,
  meteredStreamModel,
  OWNER,
  SONNET,
  spendLog,
  spyOnSpendLog,
  storeSpends,
  streamAll,
  TEXT_PARTS,
  USAGE,
  USAGE_WITHOUT_SPLIT,
} from "./spend-meter-test-kit.ts";

vi.mock("@/quota/spend-store.ts");

const HAIKU: ClaudeModelId = "claude-haiku-5-5";

// At Sonnet's prices: 12 × $2, 3400 × $0.10, 500 × $2.50, 60 × $4 and
// 200 × $10 per million tokens.
const SONNET_COST = 3854;
// With every cache write priced as a 5-minute one: 560 × $2.50.
const SONNET_COST_WITHOUT_SPLIT = 3764;
// At Haiku's prices: 1.2 + 34 + 62.5 + 12 + 100, rounded up.
const HAIKU_COST = 210;

let infoLog: MockInstance<typeof console.info>;

beforeEach(() => {
  storeSpends();
  infoLog = spyOnSpendLog();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("spendMeter on a stream that finishes", () => {
  test("charges the owner the finished usage once, with the split Anthropic sent, and passes every part on", async () => {
    const parts = [...TEXT_PARTS, finishPart(ANTHROPIC_USAGE)];

    expect(await streamAll(parts)).toEqual(parts);
    expect(charges()).toEqual([{ owner: OWNER, microUsd: SONNET_COST }]);
    expect(spendLog(infoLog)).toEqual([
      [
        "[model-call-spend]",
        {
          kind: "stream",
          modelId: SONNET,
          finished: true,
          cacheCreationReported: true,
          tokens: {
            input: 12,
            cacheRead: 3400,
            output: 200,
            cacheWrite5m: 500,
            cacheWrite1h: 60,
          },
          microUsd: SONNET_COST,
        },
      ],
    ]);
  });

  test("prices every cache write as a 5-minute one when Anthropic sends no split", async () => {
    await streamAll([...TEXT_PARTS, finishPart(USAGE_WITHOUT_SPLIT)]);

    expect(charges()).toEqual([
      { owner: OWNER, microUsd: SONNET_COST_WITHOUT_SPLIT },
    ]);
    expect(spendLog(infoLog)).toEqual([
      [
        "[model-call-spend]",
        expect.objectContaining({ cacheCreationReported: false }),
      ],
    ]);
  });
});

describe("spendMeter on a stream that finishes, storing its cost", () => {
  test("stores the cost before passing finish on", async () => {
    const { stream } = await meteredStreamModel(
      convertArrayToReadableStream([finishPart(ANTHROPIC_USAGE)]),
    ).doStream({ prompt: [] });

    const reader = stream.getReader();
    expect((await reader.read()).value?.type).toBe("finish");
    expect(charges()).toEqual([{ owner: OWNER, microUsd: SONNET_COST }]);
  });

  test("passes every part on when the cost can't be stored", async () => {
    vi.mocked(recordSpend).mockRejectedValue(
      new AppError("database-unreachable", new Error("fetch failed")),
    );
    const parts = [...TEXT_PARTS, finishPart(ANTHROPIC_USAGE)];

    expect(await streamAll(parts)).toEqual(parts);
  });
});

describe("spendMeter on a generated call", () => {
  test("charges the owner the call's usage at its model's prices once it returns", async () => {
    const model = wrapLanguageModel({
      model: new MockLanguageModelV4({
        doGenerate: {
          content: [{ type: "text", text: "Beveling a donut" }],
          finishReason: { unified: "stop", raw: "end_turn" },
          usage: USAGE,
          warnings: [],
          providerMetadata: { anthropic: { usage: ANTHROPIC_USAGE } },
        },
      }),
      middleware: spendMeter({ owner: OWNER, modelId: HAIKU }),
    });

    await model.doGenerate({ prompt: [] });

    expect(charges()).toEqual([{ owner: OWNER, microUsd: HAIKU_COST }]);
    expect(spendLog(infoLog)).toEqual([
      [
        "[model-call-spend]",
        expect.objectContaining({
          kind: "generate",
          modelId: HAIKU,
          finished: true,
          microUsd: HAIKU_COST,
        }),
      ],
    ]);
  });
});
