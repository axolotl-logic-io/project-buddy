import type { ActivityDefinition } from "@/activities/activity.ts";
import { DEFAULT_ACTIVITY_ID } from "@/activities/activity.ts";
import { getActivity, isActivityId } from "@/activities/index.ts";
export function defaultActivityPrompt(source: string | undefined): string {
  if (source !== undefined && isActivityId(source)) {
    return getActivity(source).definition.prompt;
  }
  return getActivity(DEFAULT_ACTIVITY_ID).definition.prompt;
}
export function starterActivityDefinition(): ActivityDefinition {
  return { ...getActivity(DEFAULT_ACTIVITY_ID).definition };
}
