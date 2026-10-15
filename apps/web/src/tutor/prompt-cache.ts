// Anthropic prompt caching, as AI SDK provider options. Other providers
// ignore them. The tutor marks three cache breakpoints:
// - the last tool, which covers the tools, so they stay cached when a
//   buddy's parts in the system prompt change;
// - the end of the shared system prompt, which covers the tools and the text
//   that is the same in every chat with the same buddy parts, so those
//   chats read one cached prefix;
// - the whole request, which turns on Anthropic's automatic caching: it marks
//   the conversation's last block, so each turn and each tool step reads the
//   previous one's prefix.
// Anthropic caches only prefixes above a minimum length and allows four
// breakpoints per request.
import type { SharedV4ProviderOptions } from "@ai-sdk/provider";

export const PROMPT_CACHE_BREAKPOINT: SharedV4ProviderOptions = {
  anthropic: { cacheControl: { type: "ephemeral" } },
};
