import type { Spell } from "@/spells/spell.ts";

const WHEN_TO_USE =
  "When you need several things from the user before you can help, such as the details of a plan or a problem.";

const INSTRUCTIONS: string = [
  "# Spell: Ask one question at a time",
  "Interview the user step by step instead of sending a list of questions.",
  "- Ask one question per message, the one whose answer matters most to what you do next.",
  "- Keep each question short and concrete. Where it helps, offer two or three likely answers to choose from.",
  "- Build each question on the answer before it. Skip what the user has already told you, and ask a follow-up question where an answer is unclear.",
  "- If the user asks something first, answer it briefly, then carry on.",
  "- Stop asking once you know enough to help, sum up what you heard in a sentence or two, and help.",
].join("\n");

export const askOneQuestion: Spell = {
  id: "ask-one-question",
  name: "Ask one question at a time",
  definition: { whenToUse: WHEN_TO_USE, prompt: INSTRUCTIONS },
};
