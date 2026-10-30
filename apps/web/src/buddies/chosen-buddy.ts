import { getOwnBuddy } from "@/buddies/buddy-store.ts";
import {
  type BuddyId,
  DEFAULT_BUDDY_ID,
  getBuddy,
  isBuddyId,
} from "@/buddies/index.ts";
import type { NewChatBuddy } from "@/chats/new-chat-store.ts";
import type { OwnPromptId, UserId } from "@/ids.ts";

interface ChosenBuddy {
  readonly id: BuddyId | OwnPromptId;
  readonly buddy: NewChatBuddy;
}

// Resolves a form's buddy choice to a snapshot. A missing choice means the
// default buddy; unknown ids and another user's buddies are not found.
async function chosenBuddy(
  owner: UserId,
  buddyId: string | undefined,
): Promise<ChosenBuddy | undefined> {
  if (buddyId === undefined) {
    return { id: DEFAULT_BUDDY_ID, buddy: getBuddy(DEFAULT_BUDDY_ID) };
  }
  if (isBuddyId(buddyId)) {
    return { id: buddyId, buddy: getBuddy(buddyId) };
  }
  const own = await getOwnBuddy(owner, buddyId);
  if (own === undefined) {
    return undefined;
  }
  return {
    id: own.id,
    buddy: { id: DEFAULT_BUDDY_ID, name: own.name, parts: own.parts },
  };
}

export { chosenBuddy };
