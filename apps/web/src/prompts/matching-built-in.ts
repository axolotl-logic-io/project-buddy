import type { Activity, ActivityDefinition } from "@/activities/activity.ts";
import { listActivities } from "@/activities/index.ts";
import {
  type Construct,
  type ConstructDefinition,
  listConstructs,
} from "@/constructs/index.ts";
import { listSpells } from "@/spells/index.ts";
import type { Spell, SpellDefinition } from "@/spells/spell.ts";

const CONSTRUCT_WORD = /construct/gu;
const CONSTRUCT_TITLE = /Construct/gu;

// A built-in text as it read before constructs were renamed from buddies,
// when each "construct" in it said "buddy". Copies saved from a built-in one
// before then, and by the build still live during a release, hold that text,
// and still match the built-in one they came from.
function beforeRename(text: string): string {
  return text
    .replace(CONSTRUCT_TITLE, "Buddy")
    .replace(CONSTRUCT_WORD, "buddy");
}

// Whether saved is builtIn, as it reads now or read before the rename.
function sameBuiltInText(builtIn: string, saved: string): boolean {
  return saved === builtIn || saved === beforeRename(builtIn);
}

export function matchingBuiltInConstruct(
  text: ConstructDefinition,
): Construct | undefined {
  return listConstructs().find((construct) =>
    sameBuiltInText(construct.definition.prompt, text.prompt),
  );
}
export function matchingBuiltInActivity(
  text: ActivityDefinition,
): Activity | undefined {
  return listActivities().find(
    (activity) =>
      sameBuiltInText(activity.definition.prompt, text.prompt) &&
      sameBuiltInText(activity.definition.openingRequest, text.openingRequest),
  );
}
export function matchingBuiltInSpell(text: SpellDefinition): Spell | undefined {
  return listSpells().find(
    (spell) =>
      sameBuiltInText(spell.definition.prompt, text.prompt) &&
      sameBuiltInText(spell.definition.whenToUse, text.whenToUse),
  );
}
