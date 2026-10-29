// The activities a user can choose, built in and her own
// (activity-choice.ts).
import type { ActivityChoice } from "@/activities/activity-choice.ts";
import { listOwnActivities } from "@/activities/activity-store.ts";
import { listActivities } from "@/activities/index.ts";
import type { UserId } from "@/ids.ts";

// The owner's activities: the built-in ones, then her own, oldest first.
async function activityChoices(owner: UserId): Promise<ActivityChoice[]> {
  const own = await listOwnActivities(owner);
  return [
    ...listActivities().map(({ id, name, description }) => ({
      id,
      name,
      description,
    })),
    ...own.map(({ id, name }) => ({ id, name, description: undefined })),
  ];
}

export { activityChoices };
