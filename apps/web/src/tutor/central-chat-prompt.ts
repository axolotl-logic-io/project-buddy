// The user's central chat, which belongs to no project: where they talk an
// idea through before it is a project, so its prompt has no project, memory
// or interview, and asks the tutor to create the project when they want one.

// The centralChat part's default. It opens the central chat's own part of
// the system prompt, where a project chat names its project.
const CENTRAL_CHAT_PROMPT: string = [
  "This is the user's central chat, which belongs to no project.",
  "Here the user talks an idea through with you, and together you decide whether it should become a project. Help them shape the idea: what they want to make or learn, and whether it is one project or several.",
  "This chat has no project memory, so nothing you learn here is saved to a project.",
  "When the user asks for a new project, or asks to make the idea a project, call `create_project` with a short name for it; the user then follows the link it shows to the project's first chat.",
].join("\n");

export { CENTRAL_CHAT_PROMPT };
