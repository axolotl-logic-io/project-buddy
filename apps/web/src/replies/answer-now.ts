// Ensures a reply has visible text after its final tool result.
import type { LanguageModelV4Message } from "@ai-sdk/provider";
import type { ModelMessage, StepResult, ToolSet } from "ai";

// Continues the current reply after its tools have finished.
const ANSWER_NOW_NOTE = [
  "(A note from the app, not from the user.)",
  "Your reply to the user's last message, above this note, has no text after its last tool call, so the user has no answer yet.",
  "Carry on with that same reply now and write the whole answer.",
  "Call no tools.",
  "If the results don't cover part of the question, say so plainly.",
].join(" ");

// Whether there is no visible text after the final tool result.
function endsWithoutText<Tools extends ToolSet>(
  steps: readonly Pick<StepResult<Tools>, "content" | "text">[],
): boolean {
  const lastToolStep = steps.findLastIndex((step) =>
    step.content.some(
      (part) => part.type === "tool-result" || part.type === "tool-error",
    ),
  );
  return steps.slice(lastToolStep + 1).every((step) => step.text === "");
}

// The answer-now call's messages: conversation, which ends with the reply's
// calls so far, then note, the answer-now note.
function withAnswerNowNote(
  conversation: readonly ModelMessage[],
  note: string,
): ModelMessage[] {
  return [...conversation, { role: "user", content: note }];
}

// Whether message, as the model receives it, is the answer-now note's
// default text. The local protocol adapter recognizes this note.
function isAnswerNowNote(message: LanguageModelV4Message): boolean {
  if (message.role !== "user") {
    return false;
  }
  const texts = message.content.flatMap((part) => {
    if (part.type === "text") {
      return [part.text];
    }
    return [];
  });
  return (
    texts.length === message.content.length &&
    texts.join("") === ANSWER_NOW_NOTE
  );
}

export { ANSWER_NOW_NOTE, endsWithoutText, isAnswerNowNote, withAnswerNowNote };
