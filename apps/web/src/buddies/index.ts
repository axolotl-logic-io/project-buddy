import { argonSprangler } from "@/buddies/argon-sprangler.ts";
import {
  BUDDY_IDS,
  type Buddy,
  type BuddyId,
  type BuddySnapshot,
} from "@/buddies/buddy.ts";
import { fjordTines } from "@/buddies/fjord-tines.ts";
import { hippy } from "@/buddies/hippy.ts";
import { mrTee } from "@/buddies/mr-tee.ts";
import { rolandDustchain } from "@/buddies/roland-dustchain.ts";
import { spanTines } from "@/buddies/span-tines.ts";

const BUDDY_ID_SET: ReadonlySet<string> = new Set<string>(BUDDY_IDS);

const buddiesById: Readonly<Record<BuddyId, Buddy>> = {
  hippy,
  "mr-tee": mrTee,
  "fjord-tines": fjordTines,
  "span-tines": spanTines,
  "argon-sprangler": argonSprangler,
  "roland-dustchain": rolandDustchain,
};

export type {
  Buddy,
  BuddyId,
  BuddyParts,
  BuddySnapshot,
} from "@/buddies/buddy.ts";

export const DEFAULT_BUDDY_ID: BuddyId = "hippy";

export function isBuddyId(id: string): id is BuddyId {
  return BUDDY_ID_SET.has(id);
}

export function listBuddies(): Buddy[] {
  return BUDDY_IDS.map((id) => buddiesById[id]);
}

export function getBuddy(id: BuddyId): Buddy {
  return buddiesById[id];
}

// The buddy as a chat keeps it: its name and parts alone.
export function snapshotOf({ name, parts }: BuddySnapshot): BuddySnapshot {
  return { name, parts };
}

// The system-prompt fragment that sets the tutor's voice for a chat: the
// buddy's voice, then its rules, the shared ones first.
export function renderBuddyPrompt({ parts }: BuddySnapshot): string {
  const rules = [parts.sharedRules, parts.teachingRules].filter(
    (text) => text !== "",
  );
  return [parts.voice, "## Rules", rules.join("\n")].join("\n\n");
}
