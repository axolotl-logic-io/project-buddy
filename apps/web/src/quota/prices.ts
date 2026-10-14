// What Claude charges for a model call, in millionths of a US dollar
// (micro-USD), from Anthropic's prices for the models the tutor uses
// (src/tutor/model.ts). Prices read 2026-10-12 from Anthropic's pricing page.
// A new model id fails to compile until it has its prices here.

// The Claude models the tutor calls.
type ClaudeModelId = "claude-sonnet-5-5" | "claude-haiku-5-5";

// The tokens of one model call, by how Anthropic prices them. Input tokens
// are those neither read from nor written to the prompt cache.
interface CallTokens {
  readonly input: number;
  readonly cacheRead: number;
  // Written to the cache for 5 minutes, and for 1 hour.
  readonly cacheWrite5m: number;
  readonly cacheWrite1h: number;
  readonly output: number;
}

// Micro-USD per million tokens, so every price is a whole number.
type TokenPrices = Readonly<Record<keyof CallTokens, number>>;

const TOKENS_PER_PRICE = 1_000_000;

const PRICES: Readonly<Record<ClaudeModelId, TokenPrices>> = {
  // Sonnet 5.5: $2 input, $2.50 5-minute write, $4 1-hour write, $0.10
  // read and $10 output per million tokens.
  "claude-sonnet-5-5": {
    input: 2_000_000,
    cacheWrite5m: 2_500_000,
    cacheWrite1h: 4_000_000,
    cacheRead: 100_000,
    output: 10_000_000,
  },
  // Haiku 5.5 with a prompt of at most 100k tokens, which a chat-naming call
  // never exceeds (src/tutor/chat-naming.ts bounds what it reads): $0.10
  // input, $0.125 5-minute write, $0.20 1-hour write, $0.01 read and $0.50
  // output per million tokens.
  "claude-haiku-5-5": {
    input: 100_000,
    cacheWrite5m: 125_000,
    cacheWrite1h: 200_000,
    cacheRead: 10_000,
    output: 500_000,
  },
};

// What a call of modelId with these tokens costs, in micro-USD, rounded up
// to a whole micro-USD.
function callCost(modelId: ClaudeModelId, tokens: CallTokens): number {
  const prices = PRICES[modelId];
  const perMillion =
    tokens.input * prices.input +
    tokens.cacheRead * prices.cacheRead +
    tokens.cacheWrite5m * prices.cacheWrite5m +
    tokens.cacheWrite1h * prices.cacheWrite1h +
    tokens.output * prices.output;
  return Math.ceil(perMillion / TOKENS_PER_PRICE);
}

export type { CallTokens, ClaudeModelId };
export { callCost };
