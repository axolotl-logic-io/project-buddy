export const BUDDY_IDS = [
  "hippy",
  "mr-tee",
  "fjord-tines",
  "span-tines",
  "argon-sprangler",
  "roland-dustchain",
] as const;

export type BuddyId = (typeof BUDDY_IDS)[number];

// Every static part of the buddy's prompt, by name, as text. A buddy is its
// full set of parts; buddy-parts.ts gives each part's default. The prompt
// adds the dynamic parts, such as the project's name and memory, in code.
export interface BuddyParts {
  // The buddy's role, which opens the prompt.
  readonly role: string;
  // How the buddy looks things up in the manual and cites it.
  readonly citation: string;
  // The project interview.
  readonly interview: string;
  // Conversational skills, independently enabled in Settings.
  readonly brainstorming: string;
  readonly projectBreakdown: string;
  // What the buddy is told in the user's central chat, which belongs to no
  // project, where a project chat names its project.
  readonly centralChat: string;
  // The line before the project's memory, which the prompt puts between
  // locked tags.
  readonly memoryIntro: string;
  // The line the prompt gives instead while the memory is empty.
  readonly emptyMemory: string;
  // The buddy's voice: its heading, description and sample lines.
  readonly voice: string;
  // The rules every buddy starts with, so no voice can bend the facts, as
  // a Markdown list.
  readonly sharedRules: string;
  // The buddy's own teaching rules, after the shared ones, as a Markdown
  // list.
  readonly teachingRules: string;
  // The tools' descriptions; their input fields' descriptions are fixed.
  readonly searchManualTool: string;
  readonly citeManualTool: string;
  readonly updateMemoryTool: string;
  readonly createProjectTool: string;
  // The user's side of a chat before the buddy's opening: the request for
  // the opening, and the neutral turn every other call starts with.
  readonly openingKickoff: string;
  readonly neutralKickoff: string;
  // The note that asks for the answer when a reply's calls end without one.
  readonly answerNow: string;
}

// A buddy as a chat keeps it: its name and parts as they were when the
// chat started, whether it was built in or the user's own.
export interface BuddySnapshot {
  readonly name: string;
  readonly parts: BuddyParts;
}

// A buddy is a written voice for the buddy, and the rest of the buddy's
// prompt as text. Its voice changes tone, never facts.
export interface Buddy extends BuddySnapshot {
  readonly id: BuddyId;
  // One sentence about the buddy for someone choosing one, which the
  // buddy's prompt never reads.
  readonly description: string;
}
