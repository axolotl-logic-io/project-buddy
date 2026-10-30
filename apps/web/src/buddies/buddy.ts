import type { PromptSnapshot } from "@/prompts/prompt.ts";

export const BUDDY_IDS = [
  "hippy",
  "mr-tee",
  "fjord-tines",
  "span-tines",
  "argon-sprangler",
  "roland-dustchain",
] as const;

export type BuddyId = (typeof BUDDY_IDS)[number];

// A buddy's parts, by name, as text: who the buddy is, and how it works
// with the user. The rest of the prompt is the global prompt
// (src/replies/system-prompt.ts) and the chat's activity, which no buddy
// changes. {{name}} in a part becomes the user's name.
export interface BuddyParts {
  // The buddy's voice: how it talks, with its heading, description and
  // sample lines.
  readonly voice: string;
  // The buddy's habits: how it works with the user, in every activity, as a
  // Markdown list.
  readonly habits: string;
}

// A buddy as a chat keeps it: its name and parts as they were when the
// chat started, whether it was built in or the user's own.
export type BuddySnapshot = PromptSnapshot<BuddyParts>;

// A buddy is a written voice for the buddy, and the rest of the buddy's
// prompt as text. Its voice changes tone, never facts.
export interface Buddy extends BuddySnapshot {
  readonly id: BuddyId;
  // One sentence about the buddy for someone choosing one, which the
  // buddy's prompt never reads.
  readonly description: string;
}
