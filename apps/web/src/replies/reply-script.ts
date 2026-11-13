// A tool call a local script requests, with the input the tool's schema should accept.
interface ScriptToolCall {
  readonly toolName: string;
  readonly input: unknown;
}

// One local command step, followed by any tool calls it needs.
interface ScriptStep {
  readonly text: string;
  readonly toolCalls: readonly ScriptToolCall[];
}

// What a tool answered: its output, or the error it failed with.
interface ScriptToolResult {
  readonly toolName: string;
  readonly failed: boolean;
  readonly output: unknown;
}

// What the harness supplied besides the user's last message. The app's
// answer-now note is not a message from the user: in the answer-now call,
// the user's last message is the one before the note.
interface ScriptConversation {
  // The system prompt's texts, in order.
  readonly systemTexts: readonly string[];
  // What the tools answered since the user's last message, in call order.
  readonly toolResults: readonly ScriptToolResult[];
}

// The steps of one reply, chosen from the text of the user's last message
// and the conversation so far. It is called again for every step, so later
// steps may read the tool results of earlier ones.
type ReplyScript = (
  userText: string,
  conversation: ScriptConversation,
) => readonly ScriptStep[];

export type {
  ReplyScript,
  ScriptConversation,
  ScriptStep,
  ScriptToolCall,
  ScriptToolResult,
};
