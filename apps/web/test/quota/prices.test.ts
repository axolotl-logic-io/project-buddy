import { describe, expect, test } from "vitest";
import { type CallTokens, callCost } from "@/quota/prices.ts";

const NO_TOKENS: CallTokens = {
  input: 0,
  cacheRead: 0,
  cacheWrite5m: 0,
  cacheWrite1h: 0,
  output: 0,
};

// Each case: the tokens of one kind, and their cost worked out by hand from
// the dollars per million tokens on Anthropic's pricing page.
describe("callCost for Sonnet 5.5", () => {
  test.each([
    // 1,000 × $2 / 1M = $0.002
    { kind: "input", tokens: { input: 1000 }, microUsd: 2000 },
    // 1,000 × $0.10 / 1M = $0.0001
    { kind: "cache read", tokens: { cacheRead: 1000 }, microUsd: 100 },
    // 1,000 × $2.50 / 1M = $0.0025
    { kind: "5-minute write", tokens: { cacheWrite5m: 1000 }, microUsd: 2500 },
    // 1,000 × $4 / 1M = $0.004
    { kind: "1-hour write", tokens: { cacheWrite1h: 1000 }, microUsd: 4000 },
    // 1,000 × $10 / 1M = $0.01
    { kind: "output", tokens: { output: 1000 }, microUsd: 10_000 },
  ])("charges $kind tokens", ({ tokens, microUsd }) => {
    expect(callCost("claude-sonnet-5-5", { ...NO_TOKENS, ...tokens })).toBe(
      microUsd,
    );
  });
});

describe("callCost for Haiku 5.5", () => {
  test.each([
    // 1,000 × $0.10 / 1M = $0.0001
    { kind: "input", tokens: { input: 1000 }, microUsd: 100 },
    // 1,000 × $0.01 / 1M = $0.00001
    { kind: "cache read", tokens: { cacheRead: 1000 }, microUsd: 10 },
    // 1,000 × $0.125 / 1M = $0.000125
    { kind: "5-minute write", tokens: { cacheWrite5m: 1000 }, microUsd: 125 },
    // 1,000 × $0.20 / 1M = $0.0002
    { kind: "1-hour write", tokens: { cacheWrite1h: 1000 }, microUsd: 200 },
    // 1,000 × $0.50 / 1M = $0.0005
    { kind: "output", tokens: { output: 1000 }, microUsd: 500 },
  ])("charges $kind tokens", ({ tokens, microUsd }) => {
    expect(callCost("claude-haiku-5-5", { ...NO_TOKENS, ...tokens })).toBe(
      microUsd,
    );
  });
});

describe("callCost", () => {
  test("adds up every kind of token in one call", () => {
    // $0.002 + $0.0001 + $0.0025 + $0.004 + $0.01, from the cases above.
    const sonnetThousandOfEach = 18_600;

    expect(
      callCost("claude-sonnet-5-5", {
        input: 1000,
        cacheRead: 1000,
        cacheWrite5m: 1000,
        cacheWrite1h: 1000,
        output: 1000,
      }),
    ).toBe(sonnetThousandOfEach);
  });

  test("rounds a fraction of a micro-USD up", () => {
    // 1 × $0.01 / 1M = 0.01 micro-USD
    expect(callCost("claude-haiku-5-5", { ...NO_TOKENS, cacheRead: 1 })).toBe(
      1,
    );
  });

  test("charges nothing for no tokens", () => {
    expect(callCost("claude-sonnet-5-5", NO_TOKENS)).toBe(0);
  });
});
