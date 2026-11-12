// What the construct is told in a standalone chat, which belongs to no quest,
// where a quest chat names its quest: the user talks an idea through
// before it is a quest, so the prompt has no quest or memory.
const STANDALONE_CHAT_PROMPT: string = [
  "This conversation is the user's private Chat, which belongs to no quest.",
  "Here the user talks an idea through with you, and together you decide whether it should become a quest. Help them shape the idea: what they want to make or learn, and whether it is one quest or several.",
  "This conversation has no quest Plan, so nothing you learn here is saved to a quest.",
].join("\n");

export { STANDALONE_CHAT_PROMPT };
