import type { ActivityDefinition } from "@/activities/activity.ts";
import {
  parseActivityDefinition,
  storedActivityPrompt,
} from "@/activities/activity-definition.ts";
import { getActivity, isActivityId } from "@/activities/index.ts";
import type { UserId } from "@/ids.ts";
import {
  currentActivityText,
  earlierActivityText,
} from "@/prompts/earlier-built-in-texts.ts";
import {
  cloneOwnPrompt,
  createOwnPrompt,
  type DefinitionEdit,
  type DefinitionStore,
  deleteOwnPrompt,
  getOwnPrompt,
  listOwnPrompts,
  type OwnPrompt,
  updateOwnPrompt,
} from "@/prompts/own-prompt-store.ts";
import type { NamedDefinition } from "@/prompts/prompt.ts";

type OwnActivity = OwnPrompt<ActivityDefinition>;

type ActivityEdit = DefinitionEdit<ActivityDefinition>;

const ACTIVITY_STORE: DefinitionStore<ActivityDefinition> = {
  kind: "activity",
  encodeDefinition: (text: ActivityDefinition): unknown =>
    storedActivityPrompt(earlierActivityText(text)),
  parseDefinition: (stored: unknown): ActivityDefinition | undefined => {
    const text = parseActivityDefinition(stored);
    if (text === undefined) {
      return;
    }
    return currentActivityText(text);
  },
  builtIn: (id: string) => {
    if (!isActivityId(id)) {
      return;
    }
    return getActivity(id);
  },
};

export function listOwnActivities(owner: UserId): Promise<OwnActivity[]> {
  return listOwnPrompts(ACTIVITY_STORE, owner);
}

export function getOwnActivity(
  owner: UserId,
  id: string,
): Promise<OwnActivity | undefined> {
  return getOwnPrompt(ACTIVITY_STORE, owner, id);
}

export function createActivity(
  owner: UserId,
  activity: NamedDefinition<ActivityDefinition>,
): Promise<OwnActivity> {
  return createOwnPrompt(ACTIVITY_STORE, owner, activity);
}

export function cloneActivity(
  owner: UserId,
  sourceId: string,
): Promise<OwnActivity | undefined> {
  return cloneOwnPrompt(ACTIVITY_STORE, owner, sourceId);
}

export function updateActivity(
  owner: UserId,
  id: string,
  edit: ActivityEdit,
): Promise<OwnActivity | undefined> {
  return updateOwnPrompt(ACTIVITY_STORE, owner, id, edit);
}

export function deleteActivity(owner: UserId, id: string): Promise<boolean> {
  return deleteOwnPrompt(ACTIVITY_STORE, owner, id);
}

export type { ActivityEdit, OwnActivity };
