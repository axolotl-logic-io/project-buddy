import type { Activity, ActivityDefinition } from "@/activities/activity.ts";
import { listActivities } from "@/activities/index.ts";
import {
  type Buddy,
  type BuddyDefinition,
  listBuddies,
} from "@/buddies/index.ts";
import { listSpells } from "@/spells/index.ts";
import type { Spell, SpellDefinition } from "@/spells/spell.ts";
export function matchingBuiltInBuddy(text: BuddyDefinition): Buddy | undefined {
  return listBuddies().find((buddy) => buddy.definition.prompt === text.prompt);
}
export function matchingBuiltInActivity(
  text: ActivityDefinition,
): Activity | undefined {
  return listActivities().find(
    (activity) =>
      activity.definition.prompt === text.prompt &&
      activity.definition.openingRequest === text.openingRequest,
  );
}
export function matchingBuiltInSpell(text: SpellDefinition): Spell | undefined {
  return listSpells().find(
    (spell) =>
      spell.definition.prompt === text.prompt &&
      spell.definition.whenToUse === text.whenToUse,
  );
}
