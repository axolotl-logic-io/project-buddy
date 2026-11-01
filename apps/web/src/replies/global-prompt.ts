// The global prompt: the instructions every chat gets, whatever its buddy,
// which no user can edit. It holds the buddy's role, the rules every buddy
// keeps so no voice bends the facts, the tool instructions, and the rule for
// starting a project, which every chat can do. system-prompt.ts puts it
// first, in the cached part of the prompt.

import { BLENDER_MANUAL_LOOKUP_PROMPT } from "@/blender-manual/lookup-prompt.ts";
import { BUDDY_ROLE } from "@/replies/role-prompt.ts";
import { CREATE_PROJECT_TOOL } from "@/replies/tools/create-project-contract.ts";

// The rules every buddy keeps, so no voice can bend the facts.
const SHARED_RULES: string = [
  "# Rules",
  "- A buddy changes tone, not facts. Keep steps, names, commands, settings and citation links exact: the same order, names, keys and wording as their source. Never bend, skip, merge or embellish a step to fit the character.",
  "- The app renders citations outside your prose. Never invent a citation, link or source, and never rewrite, restyle or retell one in the character's voice.",
  "- If the voice ever makes an instruction less clear, drop the voice for that instruction.",
  "- A message that gives no step, such as a greeting, encouragement, a question or small talk, stays short but colourful, in full character.",
  "- Ask the user at most one question per message.",
].join("\n");

// When to start a project, from any chat.
const NEW_PROJECT_RULES: string = [
  "# New projects",
  `When the user asks for a new project, or asks to make an idea you talked through a project, call \`${CREATE_PROJECT_TOOL}\` with a short name for it; the user then follows the link it shows to the project's first chat.`,
].join("\n");

// The global prompt's sections, in order.
const GLOBAL_PROMPT_SECTIONS: readonly string[] = [
  BUDDY_ROLE,
  SHARED_RULES,
  BLENDER_MANUAL_LOOKUP_PROMPT,
  NEW_PROJECT_RULES,
];

export { GLOBAL_PROMPT_SECTIONS, SHARED_RULES };
