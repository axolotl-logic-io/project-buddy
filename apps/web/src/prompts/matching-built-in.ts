// The built-in construct, activity or spell a text is an unchanged copy of.
// Own copies saved in a built-in one's earlier text are read back in its
// current text (src/prompts/earlier-built-in-texts.ts), so only exact
// matches count.
import type { Activity, ActivityDefinition } from "@/activities/activity.ts";
import { listActivities } from "@/activities/index.ts";
import {
  type Construct,
  type ConstructDefinition,
  listConstructs,
} from "@/constructs/index.ts";
import { listSpells } from "@/spells/index.ts";
import type { Spell, SpellDefinition } from "@/spells/spell.ts";

export function matchingBuiltInConstruct(
  text: ConstructDefinition,
): Construct | undefined {
  return listConstructs().find(
    (construct) => construct.definition.prompt === text.prompt,
  );
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
