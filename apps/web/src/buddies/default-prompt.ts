import type { BuddyDefinition } from "@/buddies/buddy.ts";
import { DEFAULT_BUDDY_ID, getBuddy, isBuddyId } from "@/buddies/index.ts";
import type { ResetPrompt } from "@/prompts/prompt.ts";

// What resetting a buddy cloned from source restores: the built-in buddy's
// prompt it was customized from, or else the default buddy's.
export function buddyResetPrompt(source: string | undefined): ResetPrompt {
  let buddy = getBuddy(DEFAULT_BUDDY_ID);
  if (source !== undefined && isBuddyId(source)) {
    buddy = getBuddy(source);
  }
  return { source: buddy.name, prompt: buddy.definition.prompt };
}
export function starterBuddyDefinition(): BuddyDefinition {
  return { prompt: buddyResetPrompt(undefined).prompt };
}
