import type { BuddyDefinition } from "@/buddies/buddy.ts";
import { DEFAULT_BUDDY_ID, getBuddy, isBuddyId } from "@/buddies/index.ts";
export function defaultBuddyPrompt(source: string | undefined): string {
  if (source !== undefined && isBuddyId(source)) {
    return getBuddy(source).definition.prompt;
  }
  return getBuddy(DEFAULT_BUDDY_ID).definition.prompt;
}
export function starterBuddyDefinition(): BuddyDefinition {
  return { prompt: defaultBuddyPrompt(undefined) };
}
