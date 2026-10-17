// The user's central chat, which belongs to no project: where they talk an
// idea through before it is a project, so its prompt has no project, memory
// or interview.

// The centralChat part's default. It opens the central chat's own part of
// the system prompt, where a project chat names its project.
const CENTRAL_CHAT_PROMPT: string = [
  "This is the user's central chat, which belongs to no project.",
  "Here the user talks an idea through with you, and together you decide whether it should become a project. Help them shape the idea: what they want to make or learn, and whether it is one project or several.",
  "This chat has no project memory, so nothing you learn here is saved to a project.",
].join("\n");

export { CENTRAL_CHAT_PROMPT };
