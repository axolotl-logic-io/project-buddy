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
  BuddyDefinition,
  BuddyId,
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

export function snapshotOf({
  name,
  definition: parts,
}: BuddySnapshot): BuddySnapshot {
  return { name, definition: parts };
}

export function renderBuddyPrompt({
  definition: parts,
}: BuddySnapshot): string {
  return parts.prompt;
}
