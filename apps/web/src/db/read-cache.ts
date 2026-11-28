// Store reads keep their results in Next's cache ("use cache"), keyed by
// their arguments, the acting user first, and tagged by what they read, so a
// signed-in navigation can come from the prefetched App Shell. A store write
// expires the tags of everything it changed, for every user who reads it, in
// the same request: a Server Action's own page re-renders with the change
// and every other reader gets it on their next render.
//
// Tags identify what a read depends on:
//   the account tag  everything of one user's own, and which quests and
//                    invitations are open to them. Every cached read has
//                    its reader's.
//   a quest tag      everything reached through one quest, for everyone it
//                    is open to.
//   the wide tag     reads across too many quests to tag individually.
// The store modules build both through quest-reads.ts and the functions
// here; nothing else names a tag.
//
// The browser's router keeps a page it prefetched for READ_STALE_SECONDS,
// the least an App Shell can be kept for. A Server Action that expires a tag
// clears the acting browser's router cache at once. Another member's browser
// can show a page it prefetched before the change for up to that long, and
// every render after it reads the change.

import { cacheLife, cacheTag, revalidateTag } from "next/cache";
import { isNextServer } from "@/env.ts";
import type { QuestId, UserId } from "@/ids.ts";

const READ_STALE_SECONDS = 300;
// Reads change only through the app's writes, which expire them, so a kept
// read is recomputed in the background after this long only to pick up a
// change made outside the app, such as a migration.
const READ_REVALIDATE_SECONDS = 3600;
// Next keeps up to this many tags on one cache entry.
const MAX_TAGS = 128;
const WIDE_READ_TAG = "wide-quest-reads";

function accountTag(user: UserId): string {
  return `account:${user}`;
}

function questTag(quest: QuestId): string {
  return `quest:${quest}`;
}

// Tags the read in progress with its reader's account and the quests it
// reads through, and keeps it until secondsLeft, when it depends on the
// date, such as which tasks are checked off today. Called from inside a
// "use cache" function. Outside the Next server, as in a system test
// seeding data, nothing is kept.
function keepRead(
  user: UserId,
  quests: readonly QuestId[],
  secondsLeft?: number,
): void {
  if (!isNextServer()) {
    return;
  }
  const tags = new Set([accountTag(user), ...quests.map(questTag)]);
  if (tags.size > MAX_TAGS) {
    cacheTag(accountTag(user), WIDE_READ_TAG);
  } else {
    cacheTag(...tags);
  }
  if (secondsLeft === undefined) {
    cacheLife({
      stale: READ_STALE_SECONDS,
      revalidate: READ_REVALIDATE_SECONDS,
    });
    return;
  }
  cacheLife({
    stale: Math.min(READ_STALE_SECONDS, secondsLeft),
    revalidate: secondsLeft,
    expire: secondsLeft,
  });
}

// What a write changed: the accounts and quests whose reads it expires.
interface Changed {
  readonly accounts?: readonly UserId[];
  readonly quests?: readonly QuestId[];
}

// Expires every kept read of the changed accounts and quests. Inside a
// Server Action this is updateTag's immediate expiry, so the action's own
// re-render reads the change; it also works in route handlers, where
// updateTag is not allowed. Outside the Next server, as in a script or a
// system test seeding data, there is no Next cache to expire.
function expireReads({ accounts = [], quests = [] }: Changed): void {
  if (!isNextServer()) {
    return;
  }
  const tags = new Set([...accounts.map(accountTag), ...quests.map(questTag)]);
  if (quests.length > 0) {
    tags.add(WIDE_READ_TAG);
  }
  for (const tag of tags) {
    revalidateTag(tag, { expire: 0 });
  }
}

export type { Changed };
export { expireReads, keepRead };
