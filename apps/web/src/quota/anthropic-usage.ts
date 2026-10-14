// Anthropic's own usage of a model call, which its AI SDK provider passes
// in providerMetadata.anthropic.usage as Anthropic's API sends it: on a
// stream's message_start part, before the standard usage arrives with
// `finish`, and on `finish` with the split of cache writes into 5-minute
// and 1-hour ones that the standard usage leaves out.
import type { SharedV4ProviderMetadata } from "@ai-sdk/provider";
import { z } from "zod";

const ANTHROPIC_USAGE = z.object({
  anthropic: z.object({
    usage: z.object({
      input_tokens: z.number().nullish(),
      cache_read_input_tokens: z.number().nullish(),
      cache_creation_input_tokens: z.number().nullish(),
      cache_creation: z
        .object({
          ephemeral_5m_input_tokens: z.number(),
          ephemeral_1h_input_tokens: z.number(),
        })
        .nullish(),
    }),
  }),
});

// Anthropic's usage, in tokens. Input tokens are those neither read from
// nor written to the prompt cache.
interface AnthropicUsage {
  readonly input: number;
  readonly cacheRead: number;
  readonly cacheWrite: number;
  // The cache writes by how long they last, when Anthropic splits them.
  readonly cacheWriteSplit:
    | { readonly cacheWrite5m: number; readonly cacheWrite1h: number }
    | undefined;
}

// The usage in providerMetadata, or undefined when it has none or none of
// the shape Anthropic sends.
function readAnthropicUsage(
  providerMetadata: SharedV4ProviderMetadata | undefined,
): AnthropicUsage | undefined {
  const parsed = ANTHROPIC_USAGE.safeParse(providerMetadata);
  if (!parsed.success) {
    return undefined;
  }
  const { usage } = parsed.data.anthropic;
  let cacheWriteSplit: AnthropicUsage["cacheWriteSplit"];
  if (usage.cache_creation !== undefined && usage.cache_creation !== null) {
    cacheWriteSplit = {
      cacheWrite5m: usage.cache_creation.ephemeral_5m_input_tokens,
      cacheWrite1h: usage.cache_creation.ephemeral_1h_input_tokens,
    };
  }
  return {
    input: usage.input_tokens ?? 0,
    cacheRead: usage.cache_read_input_tokens ?? 0,
    cacheWrite: usage.cache_creation_input_tokens ?? 0,
    cacheWriteSplit,
  };
}

export type { AnthropicUsage };
export { readAnthropicUsage };
