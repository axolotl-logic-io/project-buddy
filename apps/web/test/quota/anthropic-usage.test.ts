import { describe, expect, test } from "vitest";
import { readAnthropicUsage } from "@/quota/anthropic-usage.ts";

// providerMetadata.anthropic as @ai-sdk/anthropic passes it on `finish`,
// with the usage Anthropic's message_start and message_delta sent, less the
// usage fields the app doesn't read (output_tokens, service_tier), whose
// names only Anthropic's spelling allows.
const FINISH_METADATA = {
  anthropic: {
    usage: {
      input_tokens: 12,
      cache_creation_input_tokens: 560,
      cache_read_input_tokens: 3400,
      cache_creation: {
        ephemeral_5m_input_tokens: 500,
        ephemeral_1h_input_tokens: 60,
      },
    },
    stopSequence: null,
    iterations: null,
    container: null,
    contextManagement: null,
  },
};

describe("readAnthropicUsage", () => {
  test("reads the tokens and the split of cache writes Anthropic sends", () => {
    expect(readAnthropicUsage(FINISH_METADATA)).toEqual({
      input: 12,
      cacheRead: 3400,
      cacheWrite: 560,
      cacheWriteSplit: { cacheWrite5m: 500, cacheWrite1h: 60 },
    });
  });

  test("has no split when Anthropic sends no cache_creation", () => {
    expect(
      readAnthropicUsage({
        anthropic: {
          usage: {
            input_tokens: 12,
            cache_creation_input_tokens: 0,
            cache_read_input_tokens: 0,
          },
        },
      }),
    ).toEqual({
      input: 12,
      cacheRead: 0,
      cacheWrite: 0,
      cacheWriteSplit: undefined,
    });
  });

  test("is undefined for metadata without Anthropic's usage, or with a malformed one", () => {
    expect(readAnthropicUsage(undefined)).toBeUndefined();
    expect(readAnthropicUsage({ mock: { usage: {} } })).toBeUndefined();
    expect(
      readAnthropicUsage({
        anthropic: {
          usage: {
            input_tokens: "12",
            cache_creation: { ephemeral_5m_input_tokens: 500 },
          },
        },
      }),
    ).toBeUndefined();
  });
});
