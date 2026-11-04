import type { ActivityDefinition } from "@/activities/activity.ts";
import { DEFAULT_ACTIVITY_ID } from "@/activities/activity.ts";
import { getActivity, isActivityId } from "@/activities/index.ts";
import type { ResetPrompt } from "@/prompts/prompt.ts";

// What resetting an activity cloned from source restores: the built-in
// activity's prompt it was customized from, or else the open chat's.
export function activityResetPrompt(source: string | undefined): ResetPrompt {
  let activity = getActivity(DEFAULT_ACTIVITY_ID);
  if (source !== undefined && isActivityId(source)) {
    activity = getActivity(source);
  }
  return { source: activity.name, prompt: activity.definition.prompt };
}
export function starterActivityDefinition(): ActivityDefinition {
  return { ...getActivity(DEFAULT_ACTIVITY_ID).definition };
}
