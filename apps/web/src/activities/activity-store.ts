// The user's own activities, in the own prompt store
// (src/prompts/own-prompt-store.ts), which keeps each its owner's alone.
import type { ActivityParts } from "@/activities/activity.ts";
import { parseActivityParts } from "@/activities/activity-parts-schema.ts";
import { getActivity, isActivityId } from "@/activities/index.ts";
import type { UserId } from "@/ids.ts";
import {
  cloneOwnPrompt,
  deleteOwnPrompt,
  getOwnPrompt,
  listOwnPrompts,
  type OwnPrompt,
  type PromptEdit,
  type PromptKindStore,
  updateOwnPrompt,
} from "@/prompts/own-prompt-store.ts";

// An activity of the user's own.
type OwnActivity = OwnPrompt<ActivityParts>;

// What an edit changes: the name, the parts, or both.
type ActivityEdit = PromptEdit<ActivityParts>;

const ACTIVITY_STORE: PromptKindStore<ActivityParts> = {
  kind: "activity",
  parseParts: parseActivityParts,
  builtIn: (id: string) => {
    if (!isActivityId(id)) {
      return;
    }
    return getActivity(id);
  },
};

// The owner's activities, oldest first.
export function listOwnActivities(owner: UserId): Promise<OwnActivity[]> {
  return listOwnPrompts(ACTIVITY_STORE, owner);
}

// The owner's activity with this id, or undefined if the id is malformed,
// unknown or another user's.
export function getOwnActivity(
  owner: UserId,
  id: string,
): Promise<OwnActivity | undefined> {
  return getOwnPrompt(ACTIVITY_STORE, owner, id);
}

// A new activity of the owner's, a copy of the activity with the id
// sourceId, named as it is with " (clone)" after: a built-in activity, or
// one of the owner's own. Undefined, saving nothing, if the source is none
// of those.
export function cloneActivity(
  owner: UserId,
  sourceId: string,
): Promise<OwnActivity | undefined> {
  return cloneOwnPrompt(ACTIVITY_STORE, owner, sourceId);
}

// The owner's activity with this id, edited, or undefined, changing
// nothing, if the id is malformed, unknown or another user's.
export function updateActivity(
  owner: UserId,
  id: string,
  edit: ActivityEdit,
): Promise<OwnActivity | undefined> {
  return updateOwnPrompt(ACTIVITY_STORE, owner, id, edit);
}

// Deletes the owner's activity with this id. False, deleting nothing, if
// the id is malformed, unknown or another user's.
export function deleteActivity(owner: UserId, id: string): Promise<boolean> {
  return deleteOwnPrompt(ACTIVITY_STORE, owner, id);
}

export type { ActivityEdit, OwnActivity };
