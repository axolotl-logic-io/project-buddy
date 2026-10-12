// What the spend meter's tests share: a call's usage as Anthropic and the
// AI SDK count it, the stream parts that carry it, a database to store its
// cost in, and a metered model to stream it from.
import type {
  JSONObject,
  LanguageModelV4,
  LanguageModelV4StreamPart,
  LanguageModelV4Usage,
} from "@ai-sdk/provider";
import { wrapLanguageModel } from "ai";
import {
  convertArrayToReadableStream,
  convertReadableStreamToArray,
  MockLanguageModelV4,
} from "ai/test";
import { type MockInstance, vi } from "vitest";
import { type FakeNeonHttp, fakeNeonHttp } from "@/db/fake-neon-http.ts";
import { userIdFixture } from "@/id-fixtures.ts";
import type { ClaudeModelId } from "@/quota/prices.ts";
import { spendMeter } from "@/quota/spend-meter.ts";

const OWNER = userIdFixture();
const SONNET: ClaudeModelId = "claude-sonnet-5-5";

// A call's usage as Anthropic sends it: 12 uncached input tokens, 3400 read
// from the cache, 560 written to it (500 for 5 minutes, 60 for an hour) and
// 200 output tokens.
const USAGE_WITHOUT_SPLIT: JSONObject = {
  input_tokens: 12,
  cache_read_input_tokens: 3400,
  cache_creation_input_tokens: 560,
};

const ANTHROPIC_USAGE: JSONObject = {
  ...USAGE_WITHOUT_SPLIT,
  cache_creation: {
    ephemeral_5m_input_tokens: 500,
    ephemeral_1h_input_tokens: 60,
  },
};

// The same usage as the AI SDK counts it.
const USAGE: LanguageModelV4Usage = {
  inputTokens: { total: 3972, noCache: 12, cacheRead: 3400, cacheWrite: 560 },
  outputTokens: { total: 200, text: 200, reasoning: undefined },
};

// A stream's parts up to its finish: the usage counted as the message
// started, and "Press Ctrl" streamed.
const TEXT_PARTS: LanguageModelV4StreamPart[] = [
  { type: "stream-start", warnings: [] },
  {
    type: "custom",
    kind: "anthropic.message_start",
    providerMetadata: { anthropic: { usage: ANTHROPIC_USAGE } },
  },
  { type: "text-start", id: "t" },
  { type: "text-delta", id: "t", delta: "Press Ctrl" },
];

// The stream's finish, with USAGE and Anthropic's own count of it.
function finishPart(anthropicUsage: JSONObject): LanguageModelV4StreamPart {
  return {
    type: "finish",
    usage: USAGE,
    finishReason: { unified: "stop", raw: "end_turn" },
    providerMetadata: { anthropic: { usage: anthropicUsage } },
  };
}

// The database the meter stores costs in, which answers the month's total.
function spendDatabase(): FakeNeonHttp {
  const neonHttp = fakeNeonHttp({
    kind: "rows",
    columns: [{ name: "micro_usd", type: "int4" }],
    rows: [["1"]],
  });
  vi.stubGlobal("fetch", neonHttp.fetch);
  return neonHttp;
}

// The costs the meter stored, in micro-USD.
function storedCosts(neonHttp: FakeNeonHttp): unknown[] {
  return neonHttp.queries.map(({ params }) => params[2]);
}

// console.info, which the meter logs each charge to, silenced.
function spyOnSpendLog(): MockInstance<typeof console.info> {
  return vi.spyOn(console, "info").mockImplementation(() => {
    // Read back through spendLog.
  });
}

// The meter's log lines, each as its tag and its parsed JSON.
function spendLog(infoLog: MockInstance<typeof console.info>): unknown[] {
  return infoLog.mock.calls.map(([tag, json]: unknown[]) => [
    tag,
    JSON.parse(String(json)),
  ]);
}

// A model streaming stream, charged to OWNER at Sonnet's prices.
function meteredStreamModel(
  stream: ReadableStream<LanguageModelV4StreamPart>,
): LanguageModelV4 {
  return wrapLanguageModel({
    model: new MockLanguageModelV4({ doStream: { stream } }),
    middleware: spendMeter({ owner: OWNER, modelId: SONNET }),
  });
}

// Every part the metered model passes on when its model streams parts.
async function streamAll(
  parts: readonly LanguageModelV4StreamPart[],
): Promise<LanguageModelV4StreamPart[]> {
  const { stream } = await meteredStreamModel(
    convertArrayToReadableStream([...parts]),
  ).doStream({ prompt: [] });
  return convertReadableStreamToArray(stream);
}

export {
  ANTHROPIC_USAGE,
  finishPart,
  meteredStreamModel,
  OWNER,
  SONNET,
  spendDatabase,
  spendLog,
  spyOnSpendLog,
  storedCosts,
  streamAll,
  TEXT_PARTS,
  USAGE,
  USAGE_WITHOUT_SPLIT,
};
