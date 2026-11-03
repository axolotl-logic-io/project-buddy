// Which built-in prompt an own prompt's parts are, if any, for each kind. An own prompt
// whose parts are still a built-in one's, part for part, such as a copy the
// user has only renamed, is that built-in prompt in all but name: it opens
// a chat as the built-in one does (src/activities/prepared-openings.ts),
// and it isn't the user's own work to sell (src/marketplace/).

import type { Activity, ActivityParts } from "@/activities/activity.ts";
import { listActivities } from "@/activities/index.ts";
import { ACTIVITY_PART_KEYS } from "@/activities/part-defaults.ts";
import { type Buddy, type BuddyParts, listBuddies } from "@/buddies/index.ts";
import { BUDDY_PART_KEYS } from "@/buddies/part-defaults.ts";
import { listSpells } from "@/spells/index.ts";
import { SPELL_PART_KEYS } from "@/spells/part-defaults.ts";
import type { Spell, SpellParts } from "@/spells/spell.ts";

// Whether two prompts' parts hold the same text, part by part.
function sameParts<Parts>(
  keys: readonly (keyof Parts)[],
  left: Parts,
  right: Parts,
): boolean {
  return keys.every((key) => left[key] === right[key]);
}

// The built-in buddy whose parts these are, or undefined if none's are.
function builtInBuddyWithParts(parts: BuddyParts): Buddy | undefined {
  return listBuddies().find((buddy) =>
    sameParts(BUDDY_PART_KEYS, buddy.parts, parts),
  );
}

// The built-in activity whose parts these are, or undefined if none's are.
function builtInActivityWithParts(parts: ActivityParts): Activity | undefined {
  return listActivities().find((activity) =>
    sameParts(ACTIVITY_PART_KEYS, activity.parts, parts),
  );
}

// The built-in spell whose parts these are, or undefined if none's are.
function builtInSpellWithParts(parts: SpellParts): Spell | undefined {
  return listSpells().find((spell) =>
    sameParts(SPELL_PART_KEYS, spell.parts, parts),
  );
}

export {
  builtInActivityWithParts,
  builtInBuddyWithParts,
  builtInSpellWithParts,
};
