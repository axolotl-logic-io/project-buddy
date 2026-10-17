// For the replyToChat tests of the answer-now call (answer-now.ts): a model
// that plays Claude's observed steps, then answers in the answer-now call,
// and readers for the saved reply and its diagnostics line. It builds on
// reply-test-kit.ts, which a test file mocks the reply's modules with.
import type { UIMessage } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { withClaudeParts } from "@/tutor/claude-parts-test-kit.ts";
import { mockTutorModel } from "@/tutor/mock-model.ts";
import type {
  MockConversation,
  MockScript,
  MockStep,
} from "@/tutor/mock-script.ts";
import { replyToChat } from "@/tutor/reply.ts";
import {
  BEVEL_SECTION,
  CHAT_ID,
  NEW_MESSAGE,
  OWNER,
  replyStepsLog,
  savedReply,
  tutorModel,
} from "@/tutor/reply-test-kit.ts";
import { CITE_MANUAL_TOOL } from "@/tutor/tools/cite-manual-contract.ts";
import { SEARCH_MANUAL_TOOL } from "@/tutor/tools/search-manual-contract.ts";

// The answer the model gives in the answer-now call.
const ANSWER = "Select the edges, then press Ctrl+B and drag.";

const SEARCH: MockStep = {
  text: "",
  toolCalls: [{ toolName: SEARCH_MANUAL_TOOL, input: { query: "bevel" } }],
};
const CITE: MockStep = {
  text: "",
  toolCalls: [
    { toolName: CITE_MANUAL_TOOL, input: { urls: [BEVEL_SECTION.url] } },
  ],
};
const EMPTY: MockStep = { text: "", toolCalls: [] };

// The Stage 2 smoke test's sequence: searches, signature-only thinking,
// cite_manual, then an empty call.
const OBSERVED_SEQUENCE: readonly MockStep[] = [SEARCH, SEARCH, CITE, EMPTY];

// Plays `steps` for the user's question, and answers with ANSWER in the
// answer-now call.
function scriptAnsweringNote(steps: readonly MockStep[]): MockScript {
  return (
    _userText: string,
    { answerNow }: MockConversation,
  ): readonly MockStep[] => {
    if (answerNow) {
      return [{ text: ANSWER, toolCalls: [] }];
    }
    return steps;
  };
}

// Has the model play script, with Claude's padding parts, and records its
// calls.
function claudePlaying(script: MockScript): MockLanguageModelV4 {
  const model = new MockLanguageModelV4({
    doStream: withClaudeParts(mockTutorModel(script)).doStream,
  });
  tutorModel.mockReturnValue(model);
  return model;
}

// The reply to NEW_MESSAGE.
function reply(): Promise<Response> {
  return replyToChat(OWNER, { chatId: CHAT_ID, message: NEW_MESSAGE });
}

function savedPartTypes(): string[] {
  return (savedReply()?.parts ?? []).map((part) => part.type);
}

function savedText(): string {
  return (savedReply()?.parts ?? [])
    .flatMap((part: UIMessage["parts"][number]) => {
      if (part.type === "text") {
        return [part.text];
      }
      return [];
    })
    .join("");
}

// The reply's diagnostics line, parsed.
function loggedReply(): unknown {
  const [, json] = replyStepsLog.mock.calls[0] ?? [];
  return JSON.parse(String(json));
}

export {
  ANSWER,
  CITE,
  claudePlaying,
  EMPTY,
  loggedReply,
  OBSERVED_SEQUENCE,
  reply,
  SEARCH,
  savedPartTypes,
  savedText,
  scriptAnsweringNote,
};
