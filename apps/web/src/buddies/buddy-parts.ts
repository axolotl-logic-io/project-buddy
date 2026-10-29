// Each prompt part's default text, from the module that uses the part. A
// built-in buddy is its own voice and teaching rules, with every other
// part at its default.
import type { BuddyParts } from "@/buddies/buddy.ts";
import { ANSWER_NOW_NOTE } from "@/replies/answer-now.ts";
import { CENTRAL_CHAT_PROMPT } from "@/replies/central-chat-prompt.ts";
import { NEUTRAL_KICKOFF, OPENING_KICKOFF } from "@/replies/chat-kickoff.ts";
import { CITATION_RULES } from "@/replies/citation-prompt.ts";
import { INTERVIEW_PROMPT } from "@/replies/interview-prompt.ts";
import {
  EMPTY_MEMORY_PROMPT,
  MEMORY_PROMPT_INTRO,
} from "@/replies/memory-prompt.ts";
import {
  BRAINSTORMING_PROMPT,
  PROJECT_BREAKDOWN_PROMPT,
} from "@/replies/planning-prompts.ts";
import { BUDDY_ROLE } from "@/replies/role-prompt.ts";
import { CITE_MANUAL_DESCRIPTION } from "@/replies/tools/cite-manual-contract.ts";
import { CREATE_PROJECT_DESCRIPTION } from "@/replies/tools/create-project-contract.ts";
import { SEARCH_MANUAL_DESCRIPTION } from "@/replies/tools/search-manual-contract.ts";
import { UPDATE_MEMORY_DESCRIPTION } from "@/replies/tools/update-memory-contract.ts";

// The rules every buddy starts with, so no voice can bend the facts.
export const BUDDY_SHARED_RULES = [
  "- A buddy changes tone, not facts. Keep steps, menu paths, shortcuts and citation links exact: the same order, names, keys and wording as the Blender Reference Manual. Never bend, skip, merge or embellish a step to fit the character.",
  "- The app renders citations outside your prose. Never invent a citation, link or manual section, and never rewrite, restyle or retell one in the character's voice.",
  "- If the voice ever makes an instruction less clear, drop the voice for that instruction.",
  "- A message that teaches no step, such as a greeting, encouragement, a question or small talk, stays short but colourful, in full character.",
  "- Ask the user at most one question per message.",
].join("\n");

// The parts of a buddy with this voice and these teaching rules, and every
// other part at its default.
export function buddyParts({
  voice,
  teachingRules,
}: Pick<BuddyParts, "voice" | "teachingRules">): BuddyParts {
  return {
    role: BUDDY_ROLE,
    citation: CITATION_RULES,
    interview: INTERVIEW_PROMPT,
    brainstorming: BRAINSTORMING_PROMPT,
    projectBreakdown: PROJECT_BREAKDOWN_PROMPT,
    centralChat: CENTRAL_CHAT_PROMPT,
    memoryIntro: MEMORY_PROMPT_INTRO,
    emptyMemory: EMPTY_MEMORY_PROMPT,
    voice,
    sharedRules: BUDDY_SHARED_RULES,
    teachingRules,
    searchManualTool: SEARCH_MANUAL_DESCRIPTION,
    citeManualTool: CITE_MANUAL_DESCRIPTION,
    updateMemoryTool: UPDATE_MEMORY_DESCRIPTION,
    createProjectTool: CREATE_PROJECT_DESCRIPTION,
    openingKickoff: OPENING_KICKOFF,
    neutralKickoff: NEUTRAL_KICKOFF,
    answerNow: ANSWER_NOW_NOTE,
  };
}
