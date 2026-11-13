// Provider options mark the shared instructions and tools as reusable prefixes.
// The local command engine makes no external provider request.
import type { SharedV4ProviderOptions } from "@ai-sdk/provider";

export const PROMPT_CACHE_BREAKPOINT: SharedV4ProviderOptions = {
  anthropic: { cacheControl: { type: "ephemeral" } },
};
