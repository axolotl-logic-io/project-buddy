// An activity as the user or the buddy picks it, by id: a built-in
// activity, or one of the user's own.
import type { ActivityId, ActivitySnapshot } from "@/activities/activity.ts";
import { getOwnActivity } from "@/activities/activity-store.ts";
import {
  activitySnapshotOf,
  getActivity,
  isActivityId,
} from "@/activities/index.ts";
import type { OwnPromptId, UserId } from "@/ids.ts";

// An activity a chat can enter: its id, a built-in activity's or an own
// activity's, and its snapshot as it is now.
interface ChatActivity extends ActivitySnapshot {
  readonly id: ActivityId | OwnPromptId;
}

// The built-in activity with this id, as a chat enters it.
function builtInActivity(id: ActivityId): ChatActivity {
  return { id, ...activitySnapshotOf(getActivity(id)) };
}

// The owner's activity with this id, built in or her own, as a chat enters
// it now; undefined if the id is neither, such as another user's activity.
async function chosenActivity(
  owner: UserId,
  activityId: string,
): Promise<ChatActivity | undefined> {
  if (isActivityId(activityId)) {
    return builtInActivity(activityId);
  }
  const own = await getOwnActivity(owner, activityId);
  if (own === undefined) {
    return undefined;
  }
  return { id: own.id, name: own.name, parts: own.parts };
}

export type { ChatActivity };
export { builtInActivity, chosenActivity };
