// What each part of a persona is to its editor: the order the parts are
// shown in, which are mechanics that the app depends on, and the text each
// part resets to.
import {
  DEFAULT_PERSONA_ID,
  getPersona,
  isPersonaId,
} from "@/personas/index.ts";
import type { PersonaParts } from "@/personas/persona.ts";

type PersonaPartKey = keyof PersonaParts;

// Every part, in the order the persona page shows them: the persona's own
// voice and teaching rules first, then the parts every persona starts with,
// in the prompt's order.
const PERSONA_PART_KEYS: readonly PersonaPartKey[] = [
  "voice",
  "teachingRules",
  "role",
  "sharedRules",
  "citation",
  "interview",
  "memoryIntro",
  "emptyMemory",
  "searchManualTool",
  "citeManualTool",
  "updateMemoryTool",
  "openingKickoff",
  "neutralKickoff",
  "answerNow",
];

// The parts that citations, the memory, search or the mock tutor rely on, so
// that an edit can break them.
const MECHANICS_PARTS: ReadonlySet<PersonaPartKey> = new Set<PersonaPartKey>([
  "citation",
  "interview",
  "memoryIntro",
  "emptyMemory",
  "searchManualTool",
  "citeManualTool",
  "updateMemoryTool",
  "openingKickoff",
  "neutralKickoff",
  "answerNow",
  "sharedRules",
]);

// The parts the tutor's system prompt reads (src/tutor/system-prompt.ts),
// where every {{name}} becomes the user's name. The tools, the kickoffs and
// answer-now are sent as written.
const SYSTEM_PROMPT_PARTS: ReadonlySet<PersonaPartKey> =
  new Set<PersonaPartKey>([
    "role",
    "citation",
    "interview",
    "memoryIntro",
    "emptyMemory",
    "voice",
    "sharedRules",
    "teachingRules",
  ]);

const PART_KEY_SET: ReadonlySet<string> = new Set<string>(PERSONA_PART_KEYS);

function isPersonaPartKey(key: string): key is PersonaPartKey {
  return PART_KEY_SET.has(key);
}

// Whether an edit to this part can break citations, the memory or search.
function isMechanicsPart(key: PersonaPartKey): boolean {
  return MECHANICS_PARTS.has(key);
}

// The text this part of a persona cloned from clonedFrom resets to: the
// part as the built-in persona it was cloned from has it, or as Hippy has it
// when that is not a built-in persona, such as a persona of the user's own.
// Only the voice and teaching rules differ between built-in personas; every
// other part is the default every persona starts with.
function defaultPart(
  key: PersonaPartKey,
  clonedFrom: string | undefined,
): string {
  if (clonedFrom !== undefined && isPersonaId(clonedFrom)) {
    return getPersona(clonedFrom).parts[key];
  }
  return getPersona(DEFAULT_PERSONA_ID).parts[key];
}

export type { PersonaPartKey };
export {
  defaultPart,
  isMechanicsPart,
  isPersonaPartKey,
  PERSONA_PART_KEYS,
  SYSTEM_PROMPT_PARTS,
};
