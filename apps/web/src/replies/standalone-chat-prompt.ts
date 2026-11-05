// What the construct is told in a standalone chat, which belongs to no project,
// where a project chat names its project: the user talks an idea through
// before it is a project, so the prompt has no project or memory.
const STANDALONE_CHAT_PROMPT: string = [
  "This chat belongs to no quest.",
  "Here the user talks an idea through with you, and together you decide whether it should become a quest. Help them shape the idea: what they want to make or learn, and whether it is one quest or several.",
  "This chat has no quest memory, so nothing you learn here is saved to a quest.",
].join("\n");

export { STANDALONE_CHAT_PROMPT };
