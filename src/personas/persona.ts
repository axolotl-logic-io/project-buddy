export const PERSONA_IDS = [
  "hippy",
  "mr-tee",
  "fjord-tines",
  "span-tines",
  "argon-sprangler",
  "roland-dustchain",
] as const;

export type PersonaId = (typeof PERSONA_IDS)[number];

// Every static part of the tutor's prompt, by name, as text. A persona is its
// full set of parts; persona-parts.ts gives each part's default. The prompt
// adds the dynamic parts, such as the project's name and memory, in code.
export interface PersonaParts {
  // The tutor's role, which opens the prompt.
  readonly role: string;
  // How the tutor looks things up in the manual and cites it.
  readonly citation: string;
  // The project interview.
  readonly interview: string;
  // The line before the project's memory, which the prompt puts between
  // locked tags.
  readonly memoryIntro: string;
  // The line the prompt gives instead while the memory is empty.
  readonly emptyMemory: string;
  // The persona's voice: its heading, description and sample lines.
  readonly voice: string;
  // The rules every persona starts with, so no voice can bend the facts, as
  // a Markdown list.
  readonly sharedRules: string;
  // The persona's own teaching rules, after the shared ones, as a Markdown
  // list.
  readonly teachingRules: string;
  // The tools' descriptions; their input fields' descriptions are fixed.
  readonly searchManualTool: string;
  readonly citeManualTool: string;
  readonly updateMemoryTool: string;
  // The user's side of a chat before the tutor's opening: the request for
  // the opening, and the neutral turn every other call starts with.
  readonly openingKickoff: string;
  readonly neutralKickoff: string;
  // The note that asks for the answer when a reply's calls end without one.
  readonly answerNow: string;
}

// A persona is a written voice for the tutor, and the rest of the tutor's
// prompt as text. Its voice changes tone, never facts.
export interface Persona {
  readonly id: PersonaId;
  readonly name: string;
  readonly parts: PersonaParts;
}
