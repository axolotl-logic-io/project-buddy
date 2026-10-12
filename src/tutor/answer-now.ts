// The answer-now call: one more model call for a reply whose model calls end
// with no text the user can see after their last tool result, such as an
// empty final call after the searches, or the step limit reached while still
// searching. It sends the same prompt and tools as the reply's other calls,
// so it reads their prompt cache, and the conversation so far, with every
// tool call and result of the reply, then a note from the app that asks for
// the answer from what the searches found. The note is sent to the model
// only, never shown or saved.
import type { LanguageModelV4Message } from "@ai-sdk/provider";
import type { ModelMessage, StepResult, ToolSet } from "ai";
import { CITE_MANUAL_TOOL } from "@/tutor/tools/cite-manual-contract.ts";
import { SEARCH_MANUAL_TOOL } from "@/tutor/tools/search-manual-contract.ts";

// It arrives as a new user message, so it says that the same reply goes on
// and that the reply's searches are the lookups the citation rules ask for,
// rather than leaving the model to choose between those rules and calling no
// tools.
const ANSWER_NOW_NOTE = [
  "(A note from the app, not from the user.)",
  "Your reply to the user's last message, above this note, has no text after its last tool call, so the user has no answer yet.",
  "Carry on with that same reply now and write the whole answer.",
  `Any \`${SEARCH_MANUAL_TOOL}\` results above are your lookups for this reply: take the steps, menu paths, shortcuts and settings from them, as your rules ask.`,
  `Sections you passed to \`${CITE_MANUAL_TOOL}\` already show under the reply.`,
  "Call no tools: don't search or cite again.",
  "If the results don't cover part of the question, say so plainly.",
].join(" ");

// Whether the steps after the last tool result, or every step when no tool
// ran, hold no text the user can see.
function endsWithoutText<Tools extends ToolSet>(
  steps: readonly StepResult<Tools>[],
): boolean {
  const lastToolStep = steps.findLastIndex((step) =>
    step.content.some(
      (part) => part.type === "tool-result" || part.type === "tool-error",
    ),
  );
  return steps.slice(lastToolStep + 1).every((step) => step.text === "");
}

// The answer-now call's messages: conversation, which ends with the reply's
// calls so far, then the note.
function withAnswerNowNote(
  conversation: readonly ModelMessage[],
): ModelMessage[] {
  return [...conversation, { role: "user", content: ANSWER_NOW_NOTE }];
}

// Whether message, as the model receives it, is the answer-now note. The
// mock model reads the note this way, as Claude reads its text.
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

export { endsWithoutText, isAnswerNowNote, withAnswerNowNote };
