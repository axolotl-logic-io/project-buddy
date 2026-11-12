// A tool call a local script requests, with the input the tool's schema should accept.
interface ScriptToolCall {
  readonly toolName: string;
  readonly input: unknown;
}

// One model call. Usually text to stream, then tool calls: a step with tool
// calls makes the AI SDK run them and call the model again for the next
// step, and a step without them ends the reply. A step with an error streams
// its text, then fails mid-stream with the error, as a provider does. A step
// with delayMs streams nothing until that many milliseconds have passed.
type ScriptStep =
  | {
      readonly text: string;
      readonly toolCalls: readonly ScriptToolCall[];
      readonly delayMs?: number;
    }
  | { readonly text: string; readonly error: unknown };

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
  // The text of every message before the user's last one, in order.
  readonly earlierTexts: readonly string[];
  // The author's header the user's last message starts with, in a chat
  // with several authors (src/replies/author-names.ts); left out of the
  // message's text.
  readonly authorHeader?: string | undefined;
  // What the tools answered since the user's last message, in call order.
  readonly toolResults: readonly ScriptToolResult[];
  // Whether this is the answer-now call (answer-now.ts), which asks for the
  // reply's text after its earlier calls ended without any. It plays the
  // script's first step.
  readonly answerNow: boolean;
  readonly images?: readonly {
    readonly mediaType: string | undefined;
    readonly bytes: readonly number[];
  }[];
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
