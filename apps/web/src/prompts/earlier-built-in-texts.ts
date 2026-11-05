// An own copy of a built-in construct, activity or spell is stored in the
// text the build before the rename from buddies gives that built-in one, and
// read back in today's text. That build, live while a release migrates and
// again after a rollback, knows a copy is unchanged only when its text is
// exactly its own (docs/prompts.md#storage-compatibility): then it keeps the
// copy's prepared openings and refuses to list it in the Marketplace. Only a
// whole definition equal to a built-in one's is translated, so text the user
// has edited is stored and read exactly as written.
import type { ActivityDefinition } from "@/activities/activity.ts";
import { ACTIVITY_IDS } from "@/activities/activity.ts";
import { getActivity } from "@/activities/index.ts";
import type { ConstructDefinition } from "@/constructs/construct.ts";
import { listConstructs } from "@/constructs/index.ts";
import { EARLIER_BUILT_INS } from "@/prompts/earlier-built-ins.ts";
import { listSpells } from "@/spells/index.ts";
import type { SpellDefinition } from "@/spells/spell.ts";

interface TextPair<Definition> {
  readonly current: Definition;
  readonly earlier: Definition;
}

function pairs<Definition>(
  builtIns: readonly { readonly id: string; readonly definition: Definition }[],
  earlier: Readonly<Record<string, Definition>>,
): TextPair<Definition>[] {
  return builtIns.flatMap((builtIn) => {
    const text = earlier[builtIn.id];
    if (text === undefined) {
      return [];
    }
    return [{ current: builtIn.definition, earlier: text }];
  });
}

function sameConstruct(
  a: ConstructDefinition,
  b: ConstructDefinition,
): boolean {
  return a.prompt === b.prompt;
}

function sameActivity(a: ActivityDefinition, b: ActivityDefinition): boolean {
  return a.prompt === b.prompt && a.openingRequest === b.openingRequest;
}

function sameSpell(a: SpellDefinition, b: SpellDefinition): boolean {
  return a.prompt === b.prompt && a.whenToUse === b.whenToUse;
}

function toEarlier<Definition>(
  text: Definition,
  known: readonly TextPair<Definition>[],
  same: (a: Definition, b: Definition) => boolean,
): Definition {
  return known.find((pair) => same(pair.current, text))?.earlier ?? text;
}

function fromEarlier<Definition>(
  text: Definition,
  known: readonly TextPair<Definition>[],
  same: (a: Definition, b: Definition) => boolean,
): Definition {
  return known.find((pair) => same(pair.earlier, text))?.current ?? text;
}

function constructPairs(): TextPair<ConstructDefinition>[] {
  return pairs(listConstructs(), EARLIER_BUILT_INS.constructs);
}

function activityPairs(): TextPair<ActivityDefinition>[] {
  return pairs(ACTIVITY_IDS.map(getActivity), EARLIER_BUILT_INS.activities);
}

function spellPairs(): TextPair<SpellDefinition>[] {
  return pairs(listSpells(), EARLIER_BUILT_INS.spells);
}

export function earlierConstructText(
  text: ConstructDefinition,
): ConstructDefinition {
  return {
    ...text,
    prompt: toEarlier(text, constructPairs(), sameConstruct).prompt,
  };
}

export function currentConstructText(
  text: ConstructDefinition,
): ConstructDefinition {
  return {
    ...text,
    prompt: fromEarlier(text, constructPairs(), sameConstruct).prompt,
  };
}

export function earlierActivityText(
  text: ActivityDefinition,
): ActivityDefinition {
  return toEarlier(text, activityPairs(), sameActivity);
}

export function currentActivityText(
  text: ActivityDefinition,
): ActivityDefinition {
  return fromEarlier(text, activityPairs(), sameActivity);
}

export function earlierSpellText(text: SpellDefinition): SpellDefinition {
  return toEarlier(text, spellPairs(), sameSpell);
}

export function currentSpellText(text: SpellDefinition): SpellDefinition {
  return fromEarlier(text, spellPairs(), sameSpell);
}
