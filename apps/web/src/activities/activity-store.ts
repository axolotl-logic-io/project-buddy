import type { ActivityDefinition } from "@/activities/activity.ts";
import {
  parseActivityDefinition,
  storedActivityPrompt,
} from "@/activities/activity-definition.ts";
import { getActivity, isActivityId } from "@/activities/index.ts";
import type { Transaction } from "@/db/client.ts";
import type { OwnPromptId, UserId } from "@/ids.ts";
import {
  type BoughtPrompt,
  cloneOwnPrompt,
  createOwnPrompt,
  type DefinitionEdit,
  type DefinitionStore,
  deleteOwnPrompt,
  getOwnPrompt,
  listOwnPrompts,
  type OwnPrompt,
  saveBoughtPrompt,
  updateOwnPrompt,
} from "@/prompts/own-prompt-store.ts";
import type { NamedDefinition } from "@/prompts/prompt.ts";

type OwnActivity = OwnPrompt<ActivityDefinition>;

type ActivityEdit = DefinitionEdit<ActivityDefinition>;

const ACTIVITY_STORE: DefinitionStore<ActivityDefinition> = {
  kind: "activity",
  encodeDefinition: storedActivityPrompt,
  parseDefinition: parseActivityDefinition,
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

export function saveBoughtActivity(
  transaction: Transaction,
  owner: UserId,
  bought: BoughtPrompt,
): Promise<OwnPromptId | undefined> {
  return saveBoughtPrompt(ACTIVITY_STORE, transaction, owner, bought);
}

export type { ActivityEdit, OwnActivity };
