import {
  BUDDY_IDS,
  type Buddy,
  type BuddyId,
  type BuddySnapshot,
} from "@/buddies/buddy.ts";
import { lumen } from "@/buddies/lumen.ts";
import { vellum } from "@/buddies/vellum.ts";

const BUDDY_ID_SET: ReadonlySet<string> = new Set<string>(BUDDY_IDS);

const buddiesById: Readonly<Record<BuddyId, Buddy>> = {
  vellum,
  lumen,
};

export type {
  Buddy,
  BuddyDefinition,
  BuddyId,
  BuddySnapshot,
} from "@/buddies/buddy.ts";

export const DEFAULT_BUDDY_ID: BuddyId = "vellum";

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
