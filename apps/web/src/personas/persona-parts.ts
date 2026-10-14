// Each prompt part's default text, from the module that uses the part. A
// built-in persona is its own voice and teaching rules, with every other
// part at its default.
import type { PersonaParts } from "@/personas/persona.ts";
import { ANSWER_NOW_NOTE } from "@/tutor/answer-now.ts";
import { NEUTRAL_KICKOFF, OPENING_KICKOFF } from "@/tutor/chat-kickoff.ts";
import { CITATION_RULES } from "@/tutor/citation-prompt.ts";
import { INTERVIEW_PROMPT } from "@/tutor/interview-prompt.ts";
import {
  EMPTY_MEMORY_PROMPT,
  MEMORY_PROMPT_INTRO,
} from "@/tutor/memory-prompt.ts";
import { TUTOR_ROLE } from "@/tutor/role-prompt.ts";
import { CITE_MANUAL_DESCRIPTION } from "@/tutor/tools/cite-manual-contract.ts";
import { SEARCH_MANUAL_DESCRIPTION } from "@/tutor/tools/search-manual-contract.ts";
import { UPDATE_MEMORY_DESCRIPTION } from "@/tutor/tools/update-memory-contract.ts";

// The rules every persona starts with, so no voice can bend the facts.
export const PERSONA_SHARED_RULES = [
  "- A buddy changes tone, not facts. Keep steps, menu paths, shortcuts and citation links exact: the same order, names, keys and wording as the Blender Reference Manual. Never bend, skip, merge or embellish a step to fit the character.",
  "- The app renders citations outside your prose. Never invent a citation, link or manual section, and never rewrite, restyle or retell one in the character's voice.",
  "- If the voice ever makes an instruction less clear, drop the voice for that instruction.",
  "- A message that teaches no step, such as a greeting, encouragement, a question or small talk, stays short but colourful, in full character.",
  "- Ask the user at most one question per message.",
].join("\n");

// The parts of a persona with this voice and these teaching rules, and every
// other part at its default.
export function personaParts({
  voice,
  teachingRules,
}: Pick<PersonaParts, "voice" | "teachingRules">): PersonaParts {
  return {
    role: TUTOR_ROLE,
    citation: CITATION_RULES,
    interview: INTERVIEW_PROMPT,
    memoryIntro: MEMORY_PROMPT_INTRO,
    emptyMemory: EMPTY_MEMORY_PROMPT,
    voice,
    sharedRules: PERSONA_SHARED_RULES,
    teachingRules,
    searchManualTool: SEARCH_MANUAL_DESCRIPTION,
    citeManualTool: CITE_MANUAL_DESCRIPTION,
    updateMemoryTool: UPDATE_MEMORY_DESCRIPTION,
    openingKickoff: OPENING_KICKOFF,
    neutralKickoff: NEUTRAL_KICKOFF,
    answerNow: ANSWER_NOW_NOTE,
  };
}
