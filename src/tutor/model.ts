// The one place the tutor's models are chosen: Claude, or the deterministic
// mock when TUTOR_MODEL=mock. Sonnet replies in chats; the smaller Haiku names
// them.
import { createAnthropic } from "@ai-sdk/anthropic";
import { type LanguageModelV4, LoadAPIKeyError } from "@ai-sdk/provider";
import { readAnthropicApiKeyIfSet, readTutorModel } from "@/env.ts";
import { mockChatNameScript } from "@/tutor/mock-chat-name.ts";
import { mockTutorModel } from "@/tutor/mock-model.ts";
import { defaultMockScript, type MockScript } from "@/tutor/mock-script.ts";

const TUTOR_MODEL_ID = "claude-sonnet-5-5";
const CHAT_NAME_MODEL_ID = "claude-haiku-5-5";

function claudeModel(modelId: string): LanguageModelV4 {
  const apiKey = readAnthropicApiKeyIfSet();
  if (apiKey === undefined) {
    // The error Anthropic's provider raises for a missing key, so the chat
    // shows the invalid-api-key message.
    throw new LoadAPIKeyError({ message: "ANTHROPIC_API_KEY is not set." });
  }
  return createAnthropic({ apiKey })(modelId);
}

// Claude's model `claudeModelId`, or the mock playing `mockScript`, as the
// environment says on this call.
function chooseModel(
  claudeModelId: string,
  mockScript: MockScript,
): LanguageModelV4 {
  const choice = readTutorModel();
  switch (choice) {
    case "claude":
      return claudeModel(claudeModelId);
    case "mock":
      return mockTutorModel(mockScript);
    default: {
      const unreachable: never = choice;
      return unreachable;
    }
  }
}

// The model for one chat reply, read from the environment on every call.
function tutorModel(): LanguageModelV4 {
  return chooseModel(TUTOR_MODEL_ID, defaultMockScript);
}

// The model that names a chat, read from the environment on every call. The
// mock names it from the conversation's first message (mock-chat-name.ts).
function chatNameModel(): LanguageModelV4 {
  return chooseModel(CHAT_NAME_MODEL_ID, mockChatNameScript);
}

export { CHAT_NAME_MODEL_ID, chatNameModel, TUTOR_MODEL_ID, tutorModel };
