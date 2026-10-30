// The activity page's fields: its parts, in the page's order, as
// PromptPartFields shows them.
import type { ActivityParts } from "@/activities/activity.ts";
import { ACTIVITY_PART_KEYS } from "@/activities/part-defaults.ts";
import type { PromptPartField } from "@/prompts/prompt-part-field.ts";
import { ACTIVITY_PARTS_COPY } from "@/ui/copy/activities.ts";

// An activity's parts as fields, in the page's order.
export function activityPartFields(parts: ActivityParts): PromptPartField[] {
  return ACTIVITY_PART_KEYS.map((key) => ({
    key,
    label: ACTIVITY_PARTS_COPY[key].label,
    help: ACTIVITY_PARTS_COPY[key].help,
    text: parts[key],
  }));
}
