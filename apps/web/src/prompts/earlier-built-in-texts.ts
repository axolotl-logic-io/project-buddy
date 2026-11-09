// An unchanged own copy of a built-in is stored in its oldest recorded
// compatible text and read back in today's text (docs/prompts.md#storage-compatibility).
// Prefer the record from before the rename from buddies, so that build keeps
// prepared openings and Marketplace restrictions during a rollout or rollback.
// Find something to make has no pre-rename record: its oldest compatible text
// is in the named-heading record. Only whole definitions equal to a recorded
// built-in are translated; edited text is stored and read exactly as written.
import type { ActivityDefinition } from "@/activities/activity.ts";
import { ACTIVITY_IDS } from "@/activities/activity.ts";
import { getActivity } from "@/activities/index.ts";
import type { ConstructDefinition } from "@/constructs/construct.ts";
import { listConstructs } from "@/constructs/index.ts";
import { EARLIER_BUILT_INS } from "@/prompts/earlier-built-ins.ts";
import { NAMED_SHEET_BUILT_INS } from "@/prompts/named-sheet-built-ins.ts";
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

// Keep the oldest compatible text first for writes. Reads accept every
// recorded version, including unchanged copies saved with named headings.
function constructPairs(): TextPair<ConstructDefinition>[] {
  return [
    ...pairs(listConstructs(), EARLIER_BUILT_INS.constructs),
    ...pairs(listConstructs(), NAMED_SHEET_BUILT_INS.constructs),
  ];
}

function activityPairs(): TextPair<ActivityDefinition>[] {
  return [
    ...pairs(ACTIVITY_IDS.map(getActivity), EARLIER_BUILT_INS.activities),
    ...pairs(ACTIVITY_IDS.map(getActivity), NAMED_SHEET_BUILT_INS.activities),
  ];
}

function spellPairs(): TextPair<SpellDefinition>[] {
  return [
    ...pairs(listSpells(), EARLIER_BUILT_INS.spells),
    ...pairs(listSpells(), NAMED_SHEET_BUILT_INS.spells),
  ];
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
