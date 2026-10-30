// The buddy page's fields: its parts, in the page's order, as
// PromptPartFields shows them.
import type { BuddyParts } from "@/buddies/index.ts";
import { BUDDY_PART_KEYS } from "@/buddies/part-defaults.ts";
import type { PromptPartField } from "@/prompts/prompt-part-field.ts";
import { BUDDY_PARTS_COPY } from "@/ui/copy/buddies.ts";

// A buddy's parts as fields, in the page's order.
export function buddyPartFields(parts: BuddyParts): PromptPartField[] {
  return BUDDY_PART_KEYS.map((key) => ({
    key,
    label: BUDDY_PARTS_COPY[key].label,
    help: BUDDY_PARTS_COPY[key].help,
    text: parts[key],
  }));
}
